import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { replaceCSVHeaders, englishCSVRowToProduction } from '@/lib/csv-header-replacer'

// Text encoder for response streaming
const encoder = new TextEncoder()

// Dynamic import for papaparse to handle potential missing dependency
let Papa: typeof import('papaparse') | null = null
try {
  Papa = require('papaparse') as typeof import('papaparse')
} catch {
  console.warn('papaparse not installed. Please run: npm install papaparse @types/papaparse')
}

export async function POST(request: NextRequest) {
  console.log('Upload CSV API called')
  try {
    // Check if papaparse is available
    if (!Papa) {
      console.log('Papa parse not available')
      return NextResponse.json({
        error: 'CSVパーサーが利用できません。papaparseライブラリをインストールしてください。',
        details: 'npm install papaparse @types/papaparse'
      }, { status: 500 })
    }

    console.log('Getting form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('No file provided')
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    console.log('File received:', file.name, 'Size:', file.size)

    // Check if file is CSV
    if (!file.name.endsWith('.csv')) {
      console.log('File is not CSV:', file.name)
      return NextResponse.json({ error: 'CSVファイルを選択してください' }, { status: 400 })
    }

    // Read file content with proper encoding for Japanese CSV
    console.log('Reading file content...')
    const arrayBuffer = await file.arrayBuffer()
    
    let fileContent: string
    try {
      // Try Shift-JIS first (common for Japanese CSV files from Excel)
      fileContent = new TextDecoder('shift-jis').decode(arrayBuffer)
      console.log('Successfully decoded as Shift-JIS')
    } catch (error) {
      try {
        // Fallback to UTF-8
        fileContent = new TextDecoder('utf-8').decode(arrayBuffer)
        console.log('Successfully decoded as UTF-8')
      } catch (error2) {
        // Final fallback
        fileContent = await file.text()
        console.log('Using default text() method as fallback')
      }
    }
    
    console.log('File content length:', fileContent.length)
    
    // Replace entire header line with English headers
    console.log('Replacing header line with English headers...')
    const modifiedContent = replaceCSVHeaders(fileContent)
    
    // Parse CSV with clean English headers
    console.log('Parsing CSV...')
    const parseResult = Papa.parse(modifiedContent, {
      header: true,
      skipEmptyLines: true
    })
    
    console.log('CSV parsed, rows:', parseResult.data?.length)
    
    if (parseResult.data && parseResult.data.length > 0) {
      console.log('First CSV row (headers check):', parseResult.data[0])
      console.log('CSV column headers:', Object.keys(parseResult.data[0] as Record<string, unknown>))
    }

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors)
      return NextResponse.json({
        error: 'CSVファイルの解析中にエラーが発生しました',
        details: parseResult.errors
      }, { status: 400 })
    }

    const csvData = parseResult.data as Record<string, unknown>[]
    
    if (!csvData || csvData.length === 0) {
      return NextResponse.json({ error: 'CSVファイルにデータがありません' }, { status: 400 })
    }

    // Convert CSV rows to production data using English headers
    console.log('Converting CSV data to production data...')
    const filteredData = csvData.filter((row: Record<string, unknown>) => row && Object.keys(row).length > 0)
    console.log('Filtered data count:', filteredData.length)
    
    // Get CSV headers (should now be English)
    const csvHeaders = filteredData.length > 0 ? Object.keys(filteredData[0]) : []
    console.log('CSV headers (after replacement):', csvHeaders)
    
    // Debug: Log a sample row
    if (filteredData.length > 0) {
      console.log('Sample CSV row with English headers:', filteredData[0])
    }
    
    // Convert to production data format
    const productionData = filteredData.map((row: Record<string, unknown>) => englishCSVRowToProduction(row))
    console.log('Production data prepared, count:', productionData.length)
    
    // Debug: Log a sample row after conversion
    if (productionData.length > 0) {
      console.log('Sample production data after conversion:', productionData[0])
    }

    // Process in batches to avoid timeout
    const BATCH_SIZE = 1000
    const batches: ReturnType<typeof englishCSVRowToProduction>[][] = []
    for (let i = 0; i < productionData.length; i += BATCH_SIZE) {
      batches.push(productionData.slice(i, i + BATCH_SIZE))
    }
    
    console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} records each...`)
    
    // Create a response object with a writable stream
    const responseStream = new TransformStream()
    const writer = responseStream.writable.getWriter()
    
    // Start the response
    const response = new NextResponse(responseStream.readable, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Process batches in the background
    const processBatches = async () => {
      let totalInserted = 0
      let success = true
      let errorMessage = ''
      
      try {
        for (let i = 0; i < batches.length; i++) {
          console.log(`Inserting batch ${i + 1}/${batches.length} (${batches[i].length} records)...`)
          
          try {
            // Add timeout for each batch operation (60 seconds for larger batches)
            const batchPromise = supabaseAdmin
              .from('productions')
              .insert(batches[i])
              .select('id')
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Batch timeout')), 60000)
            })
            
            const { data: batchData, error } = await Promise.race([batchPromise, timeoutPromise]) as { data: { id: string }[] | null; error: Error | null }
            
            if (error) {
              console.error(`Batch ${i + 1} insert error:`, error)
              success = false
              errorMessage = `バッチ ${i + 1} の保存中にエラーが発生しました: ${error.message}`
              break
            }
            
            totalInserted += batchData?.length || 0
            console.log(`Batch ${i + 1} completed. Total inserted so far: ${totalInserted}`)
            
            // Send batch progress update via partial response
             // This will be picked up by the client's readystatechange event handler
             try {
               await writer.write(encoder.encode(JSON.stringify({
                 currentBatch: i + 1,
                 totalBatches: batches.length,
                 recordsProcessed: totalInserted,
                 totalRecords: productionData.length
               }) + '\n'))  // Add newline to ensure proper streaming
             } catch (e) {
               console.error('Error sending progress update:', e)
             }
            
          } catch (error) {
            console.error(`Batch ${i + 1} timeout or error:`, error)
            success = false
            errorMessage = `バッチ ${i + 1} がタイムアウトしました (60秒): ${error instanceof Error ? error.message : 'Batch timeout'}`
            break
          }
        }
        
        // Write the final response
        if (success) {
          console.log('All batches completed successfully, total count:', totalInserted)
          await writer.write(encoder.encode(JSON.stringify({
            message: `${totalInserted}件のデータを正常に保存しました`,
            count: totalInserted
          })))
        } else {
          await writer.write(encoder.encode(JSON.stringify({
            error: errorMessage,
            insertedSoFar: totalInserted
          })))
        }
      } catch (error) {
        console.error('Batch processing error:', error)
        await writer.write(encoder.encode(JSON.stringify({
          error: 'バッチ処理中にエラーが発生しました',
          details: error instanceof Error ? error.message : 'Unknown error',
          insertedSoFar: totalInserted
        })))
      } finally {
        await writer.close()
      }
    }
    
    // Start processing batches without awaiting
    processBatches().catch(console.error)
    
    // Return the response immediately
     return response

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'ファイルのアップロード中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}