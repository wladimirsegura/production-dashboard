# Supabase Dashboard Deployment Guide

## Overview
This guide shows how to deploy the bulk processing system using only the Supabase Dashboard (no CLI or Docker required).

## Step 1: Database Migration via SQL Editor

1. **Open Supabase Dashboard** → Your Project → **SQL Editor**

2. **Run the Migration Script**:
   Copy and paste this SQL script:

```sql
-- Add unique constraint on production_order_number for UPSERT operations
ALTER TABLE productions 
ADD CONSTRAINT unique_production_order_number 
UNIQUE (production_order_number);

-- Add updated_at column for tracking changes
ALTER TABLE productions 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_productions_updated_at 
    BEFORE UPDATE ON productions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optimize indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_productions_order_number_btree 
ON productions USING btree (production_order_number);

-- Create storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-uploads', 'csv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for CSV uploads bucket
CREATE POLICY "Allow authenticated users to upload CSV files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to read CSV files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role full access to CSV files" ON storage.objects
FOR ALL USING (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'service_role'
);
```

3. **Click "Run"** to execute the migration

## Step 2: Deploy Edge Function via Dashboard

### Method 1: Create Edge Function in Dashboard

1. **Navigate to Edge Functions**:
   - Supabase Dashboard → Your Project → **Edge Functions**

2. **Create New Function**:
   - Click **"Create a new function"**
   - Function name: `bulk-upsert-productions`
   - Click **"Create function"**

3. **Replace the Default Code**:
   Delete the default code and paste this **CORRECTED** version:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BulkProcessResult {
  success: boolean
  inserted: number
  updated: number
  errors: string[]
  processingTime: number
  fileName: string
  totalRecords: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileName } = await req.json()
    
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'fileName is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const startTime = Date.now()
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('csv-uploads')
      .download(fileName)
    
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }
    
    const csvContent = await fileData.text()
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',')
    const dataRows = lines.slice(1)
    
    console.log(`Processing ${dataRows.length} records from ${fileName}`)
    
    const productions = dataRows.map(row => {
      const values = row.split(',')
      const production: any = {}
      
      headers.forEach((header, index) => {
        const cleanHeader = header.trim().replace(/"/g, '')
        let value = values[index]?.trim().replace(/"/g, '') || null
        
        if (!value || value === '0' || value === '') {
          value = null
        }
        
        if (['order_quantity', 'plating_capacity', 'bending_count', 'brazing_count'].includes(cleanHeader)) {
          production[cleanHeader] = value ? parseInt(value, 10) : null
        }
        else if (cleanHeader.includes('date')) {
          if (value && /^\d{8}$/.test(value)) {
            const year = value.substring(0, 4)
            const month = value.substring(4, 6)
            const day = value.substring(6, 8)
            production[cleanHeader] = `${year}-${month}-${day}`
          } else {
            production[cleanHeader] = value
          }
        }
        else {
          production[cleanHeader] = value
        }
      })
      
      return production
    })
    
    const BATCH_SIZE = 1000
    let totalInserted = 0
    const errors: string[] = []
    
    for (let i = 0; i < productions.length; i += BATCH_SIZE) {
      const batch = productions.slice(i, i + BATCH_SIZE)
      
      try {
        const { data, error } = await supabase
          .from('productions')
          .upsert(batch, {
            onConflict: 'production_order_number',
            count: 'exact'
          })
        
        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else {
          totalInserted += batch.length
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batch.length} records`)
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} exception:`, batchError)
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(batchError as Error).message}`)
      }
    }
    
    const processingTime = Date.now() - startTime
    
    await supabase.storage
      .from('csv-uploads')
      .remove([fileName])
    
    const result: BulkProcessResult = {
      success: errors.length === 0,
      inserted: totalInserted,
      updated: 0,
      errors,
      processingTime,
      fileName,
      totalRecords: productions.length
    }
    
    console.log('Bulk processing completed:', result)
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        processingTime: 0,
        inserted: 0,
        updated: 0,
        errors: [(error as Error).message]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

**Important**: Make sure to copy the entire code without any truncation. The error you encountered was likely due to incomplete copying.

4. **Deploy the Function**:
   - Click **"Deploy function"**
   - Wait for deployment to complete

### Method 2: Alternative - Use Database Function (If Edge Functions Not Available)

If Edge Functions are not available in your plan, you can create a PostgreSQL function instead:

1. **Go to SQL Editor** and run:

```sql
-- Create a PostgreSQL function for bulk processing
CREATE OR REPLACE FUNCTION bulk_upsert_from_json(json_data JSONB)
RETURNS JSON AS $$
DECLARE
  result JSON;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  record_data JSONB;
BEGIN
  -- Process each record in the JSON array
  FOR record_data IN SELECT * FROM jsonb_array_elements(json_data)
  LOOP
    -- Perform UPSERT
    INSERT INTO productions (
      arrangement_method, inspection_type, customer_name, part_number,
      production_order_number, line_code, work_area, operator_main,
      operator_plating, plating_type, plating_jig, issue_date,
      plating_payout_date, due_date, order_quantity, oohito_shipment_date,
      plating_process, tamagawa_receipt_date, operator_5x, shelf_number,
      plating_capacity, bending_count, brazing_count, machine_number,
      brazing_jig, subcontractor
    )
    VALUES (
      record_data->>'arrangement_method',
      record_data->>'inspection_type', 
      record_data->>'customer_name',
      record_data->>'part_number',
      record_data->>'production_order_number',
      record_data->>'line_code',
      record_data->>'work_area',
      record_data->>'operator_main',
      record_data->>'operator_plating',
      record_data->>'plating_type',
      record_data->>'plating_jig',
      CASE WHEN record_data->>'issue_date' = '' THEN NULL ELSE (record_data->>'issue_date')::DATE END,
      CASE WHEN record_data->>'plating_payout_date' = '' THEN NULL ELSE (record_data->>'plating_payout_date')::DATE END,
      CASE WHEN record_data->>'due_date' = '' THEN NULL ELSE (record_data->>'due_date')::DATE END,
      CASE WHEN record_data->>'order_quantity' = '' THEN NULL ELSE (record_data->>'order_quantity')::INTEGER END,
      CASE WHEN record_data->>'oohito_shipment_date' = '' THEN NULL ELSE (record_data->>'oohito_shipment_date')::DATE END,
      record_data->>'plating_process',
      CASE WHEN record_data->>'tamagawa_receipt_date' = '' THEN NULL ELSE (record_data->>'tamagawa_receipt_date')::DATE END,
      record_data->>'operator_5x',
      record_data->>'shelf_number',
      CASE WHEN record_data->>'plating_capacity' = '' THEN NULL ELSE (record_data->>'plating_capacity')::INTEGER END,
      CASE WHEN record_data->>'bending_count' = '' THEN NULL ELSE (record_data->>'bending_count')::INTEGER END,
      CASE WHEN record_data->>'brazing_count' = '' THEN NULL ELSE (record_data->>'brazing_count')::INTEGER END,
      record_data->>'machine_number',
      record_data->>'brazing_jig',
      record_data->>'subcontractor'
    )
    ON CONFLICT (production_order_number) DO UPDATE SET
      arrangement_method = EXCLUDED.arrangement_method,
      inspection_type = EXCLUDED.inspection_type,
      customer_name = EXCLUDED.customer_name,
      part_number = EXCLUDED.part_number,
      line_code = EXCLUDED.line_code,
      work_area = EXCLUDED.work_area,
      operator_main = EXCLUDED.operator_main,
      operator_plating = EXCLUDED.operator_plating,
      plating_type = EXCLUDED.plating_type,
      plating_jig = EXCLUDED.plating_jig,
      issue_date = EXCLUDED.issue_date,
      plating_payout_date = EXCLUDED.plating_payout_date,
      due_date = EXCLUDED.due_date,
      order_quantity = EXCLUDED.order_quantity,
      oohito_shipment_date = EXCLUDED.oohito_shipment_date,
      plating_process = EXCLUDED.plating_process,
      tamagawa_receipt_date = EXCLUDED.tamagawa_receipt_date,
      operator_5x = EXCLUDED.operator_5x,
      shelf_number = EXCLUDED.shelf_number,
      plating_capacity = EXCLUDED.plating_capacity,
      bending_count = EXCLUDED.bending_count,
      brazing_count = EXCLUDED.brazing_count,
      machine_number = EXCLUDED.machine_number,
      brazing_jig = EXCLUDED.brazing_jig,
      subcontractor = EXCLUDED.subcontractor,
      updated_at = NOW();
      
    inserted_count := inserted_count + 1;
  END LOOP;
  
  -- Return results
  SELECT json_build_object(
    'success', true,
    'inserted', inserted_count,
    'updated', 0,
    'total', inserted_count
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Step 3: Verify Deployment

### Check Edge Function
1. **Go to Edge Functions** in Dashboard
2. **Verify** `bulk-upsert-productions` is listed and deployed
3. **Test** by clicking on the function and using the test interface

### Check Database Changes
Run this in **SQL Editor** to verify:

```sql
-- Check unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'productions' 
AND constraint_name = 'unique_production_order_number';

-- Check updated_at column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'productions' 
AND column_name = 'updated_at';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'csv-uploads';

-- Check index
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'productions' 
AND indexname = 'idx_productions_order_number_btree';
```

## Step 4: Test the System

1. **Test the API endpoint**: `/api/test-upload`
2. **Test bulk upload**: `/api/upload-csv-bulk`
3. **Monitor logs** in Edge Functions dashboard

## Troubleshooting

### Edge Function Issues
- **Check logs** in Edge Functions → Your Function → Logs
- **Verify environment variables** are set correctly
- **Test function** using the built-in test interface

### Database Issues
- **Run verification queries** above
- **Check RLS policies** in Authentication → Policies
- **Verify storage bucket** in Storage → Buckets

The system is now ready for high-performance bulk CSV processing!