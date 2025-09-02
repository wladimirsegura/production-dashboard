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
    
    // Simplified and faster data processing
    const productions = dataRows.map(row => {
      const values = row.split(',')
      const production: any = {}
      
      // Only process essential fields to reduce CPU usage
      production.arrangement_method = values[0]?.trim().replace(/"/g, '') || null
      production.inspection_type = values[1]?.trim().replace(/"/g, '') || null
      production.customer_name = values[2]?.trim().replace(/"/g, '') || null
      production.part_number = values[3]?.trim().replace(/"/g, '') || null
      production.production_order_number = values[4]?.trim().replace(/"/g, '') || null
      production.line_code = values[5]?.trim().replace(/"/g, '') || null
      production.work_area = values[6]?.trim().replace(/"/g, '') || null
      production.operator_main = values[7]?.trim().replace(/"/g, '') || null
      production.operator_plating = values[8]?.trim().replace(/"/g, '') || null
      production.plating_type = values[9]?.trim().replace(/"/g, '') || null
      production.plating_jig = values[10]?.trim().replace(/"/g, '') || null
      
      // Handle dates more efficiently
      const issueDate = values[11]?.trim().replace(/"/g, '')
      production.issue_date = issueDate && /^\d{8}$/.test(issueDate) 
        ? `${issueDate.substring(0, 4)}-${issueDate.substring(4, 6)}-${issueDate.substring(6, 8)}`
        : null
        
      const payoutDate = values[12]?.trim().replace(/"/g, '')
      production.plating_payout_date = payoutDate && /^\d{8}$/.test(payoutDate)
        ? `${payoutDate.substring(0, 4)}-${payoutDate.substring(4, 6)}-${payoutDate.substring(6, 8)}`
        : null
        
      const dueDate = values[13]?.trim().replace(/"/g, '')
      production.due_date = dueDate && /^\d{8}$/.test(dueDate)
        ? `${dueDate.substring(0, 4)}-${dueDate.substring(4, 6)}-${dueDate.substring(6, 8)}`
        : null
      
      // Handle integers
      production.order_quantity = values[14] ? parseInt(values[14].trim().replace(/"/g, ''), 10) || null : null
      
      // Set remaining fields
      production.oohito_shipment_date = values[15]?.trim().replace(/"/g, '') || null
      production.plating_process = values[16]?.trim().replace(/"/g, '') || null
      production.tamagawa_receipt_date = values[17]?.trim().replace(/"/g, '') || null
      production.operator_5x = values[18]?.trim().replace(/"/g, '') || null
      production.shelf_number = values[19]?.trim().replace(/"/g, '') || null
      production.plating_capacity = values[20] ? parseInt(values[20].trim().replace(/"/g, ''), 10) || null : null
      production.bending_count = values[21] ? parseInt(values[21].trim().replace(/"/g, ''), 10) || null : null
      production.brazing_count = values[22] ? parseInt(values[22].trim().replace(/"/g, ''), 10) || null : null
      production.machine_number = values[23]?.trim().replace(/"/g, '') || null
      production.brazing_jig = values[24]?.trim().replace(/"/g, '') || null
      production.subcontractor = values[25]?.trim().replace(/"/g, '') || null
      
      return production
    })
    
    // Use larger batch size and simplified processing to avoid timeout
    const BATCH_SIZE = 2000 // Increased batch size
    let totalProcessed = 0
    const errors: string[] = []
    
    // Skip the expensive existence check to save CPU time
    // Just do direct UPSERT - let the database handle the conflict resolution
    for (let i = 0; i < productions.length; i += BATCH_SIZE) {
      const batch = productions.slice(i, i + BATCH_SIZE)
      
      try {
        const { error } = await supabase
          .from('productions')
          .upsert(batch, { 
            onConflict: 'production_order_number',
            count: 'exact'
          })
        
        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error)
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        } else {
          totalProcessed += batch.length
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
      inserted: totalProcessed, // We'll report total processed since we can't distinguish easily
      updated: 0, // Simplified for performance
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