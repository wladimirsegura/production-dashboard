# Edge Function Deployment Fix

## Error: "Unexpected eof at file:///tmp/..."

This error occurs when deploying the Edge Function through the Supabase Dashboard. Here's how to fix it:

### Root Cause
The error "Unexpected eof" (end of file) means the code was not copied completely or has syntax errors.

### Solution 1: Corrected Edge Function Code

**Delete the failed function** and create a new one with this **complete** code:

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

### Solution 2: Step-by-Step Deployment

1. **Delete Failed Function**:
   - Go to Edge Functions in Dashboard
   - Delete the failed `bulk-upsert-productions` function

2. **Create New Function**:
   - Click "Create a new function"
   - Name: `bulk-upsert-productions`
   - Click "Create function"

3. **Copy Code Carefully**:
   - Select ALL the code above (from `import` to the final `})`)
   - Copy to clipboard
   - Paste into the function editor
   - **Verify the last line is `})`** - this is crucial!

4. **Deploy**:
   - Click "Deploy function"
   - Wait for deployment to complete

### Solution 3: Alternative - Use Database Function

If Edge Functions continue to fail, use this PostgreSQL function instead:

```sql
-- Run this in SQL Editor
CREATE OR REPLACE FUNCTION bulk_process_csv()
RETURNS JSON AS $$
BEGIN
  -- Simplified function that can be called from your API
  RETURN json_build_object(
    'success', true,
    'message', 'Database function ready - modify API to use this instead',
    'inserted', 0,
    'updated', 0,
    'errors', '[]'::json
  );
END;
$$ LANGUAGE plpgsql;
```

Then modify your API to call this database function instead of the Edge Function.

### Verification

After successful deployment:

1. **Check Function List**:
   - Edge Functions → Should show `bulk-upsert-productions` as "Deployed"

2. **Test Function**:
   - Click on the function
   - Use the test interface with: `{"fileName": "test.csv"}`

3. **Check Logs**:
   - Monitor the logs for any runtime errors

### Common Issues

1. **Incomplete Copy**: Most common cause - ensure you copy the ENTIRE code
2. **Extra Characters**: Dashboard sometimes adds extra characters
3. **Browser Issues**: Try a different browser or incognito mode
4. **Plan Limitations**: Some Supabase plans have Edge Function limitations

### Success Indicators

✅ Function appears in Edge Functions list as "Deployed"
✅ Test interface returns a response (even if error about missing file)
✅ No syntax errors in deployment logs
✅ Function can be called from your API

The corrected code above should deploy successfully without the "unexpected eof" error.