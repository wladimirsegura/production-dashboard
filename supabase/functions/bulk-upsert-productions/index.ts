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
  // Handle CORS preflight requests
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
    
    // Download CSV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('csv-uploads')
      .download(fileName)
    
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }
    
    // Convert file to text
    const csvContent = await fileData.text()
    
    // Parse CSV content
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',')
    const dataRows = lines.slice(1)
    
    console.log(`Processing ${dataRows.length} records from ${fileName}`)
    
    // Convert CSV rows to production objects
    const productions = dataRows.map(row => {
      const values = row.split(',')
      const production: any = {}
      
      headers.forEach((header, index) => {
        const cleanHeader = header.trim().replace(/"/g, '')
        let value = values[index]?.trim().replace(/"/g, '') || null
        
        // Handle empty values and "0" as null
        if (!value || value === '0' || value === '') {
          value = null
        }
        
        // Parse integers for numeric fields
        if (['order_quantity', 'plating_capacity', 'bending_count', 'brazing_count'].includes(cleanHeader)) {
          production[cleanHeader] = value ? parseInt(value, 10) : null
        }
        // Parse dates for date fields
        else if (cleanHeader.includes('date')) {
          if (value && /^\d{8}$/.test(value)) {
            // Convert YYYYMMDD to YYYY-MM-DD
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
    
    // Process in batches using UPSERT
    const BATCH_SIZE = 1000
    let totalInserted = 0
    let totalUpdated = 0
    const errors: string[] = []
    
    for (let i = 0; i < productions.length; i += BATCH_SIZE) {
      const batch = productions.slice(i, i + BATCH_SIZE)
      
      try {
        // Use upsert with ON CONFLICT
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
          // Note: Supabase doesn't return separate insert/update counts
          // We'll count total operations for now
          totalInserted += batch.length
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completed: ${batch.length} records`)
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} exception:`, batchError)
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`)
      }
    }
    
    const processingTime = Date.now() - startTime
    
    // Clean up: delete the processed file from storage
    await supabase.storage
      .from('csv-uploads')
      .remove([fileName])
    
    const result: BulkProcessResult = {
      success: errors.length === 0,
      inserted: totalInserted,
      updated: totalUpdated,
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
        error: error.message,
        processingTime: 0,
        inserted: 0,
        updated: 0,
        errors: [error.message]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})