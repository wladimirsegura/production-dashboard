import { NextRequest, NextResponse } from 'next/server'
import { replaceCSVHeaders } from '@/lib/csv-header-replacer'
import { supabaseAdmin } from '@/lib/supabase'

interface ChunkProcessResult {
  success: boolean
  totalRecords: number
  totalInserted: number
  totalUpdated: number
  totalErrors: number
  processingTime: number
  fileName: string
  chunks: {
    chunkNumber: number
    records: number
    inserted: number
    updated: number
    errors: string[]
    processingTime: number
  }[]
}

// Handle streaming upload with real-time progress updates
async function handleStreamingUpload(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        
        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'ファイルが選択されていません' })}\n\n`))
          controller.close()
          return
        }

        if (!file.name.endsWith('.csv')) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'CSVファイルを選択してください' })}\n\n`))
          controller.close()
          return
        }

        // Send initial status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `ファイルを処理中: ${file.name}` })}\n\n`))

        // Read and process CSV content
        const arrayBuffer = await file.arrayBuffer()
        let fileContent: string

        try {
          fileContent = new TextDecoder('shift-jis').decode(arrayBuffer)
        } catch {
          try {
            fileContent = new TextDecoder('utf-8').decode(arrayBuffer)
          } catch {
            fileContent = await file.text()
          }
        }

        // Replace Japanese headers with English headers
        const modifiedContent = replaceCSVHeaders(fileContent)
        
        // Parse CSV into lines
        const lines = modifiedContent.split('\n').filter(line => line.trim())
        const headers = lines[0]
        const dataRows = lines.slice(1)
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `総レコード数: ${dataRows.length}` })}\n\n`))
        
        // Split into chunks of 8000 records each
        const CHUNK_SIZE = 8000
        const chunks: string[][] = []
        
        for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
          const chunkRows = dataRows.slice(i, i + CHUNK_SIZE)
          chunks.push([headers, ...chunkRows])
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `${chunks.length}個のチャンクに分割 (最大${CHUNK_SIZE}レコード/チャンク)` })}\n\n`))
        
        const startTime = Date.now()
        const chunkResults: ChunkProcessResult['chunks'] = []
        let totalInserted = 0
        let totalUpdated = 0
        let totalErrors = 0
        
        // Process each chunk sequentially
        for (let i = 0; i < chunks.length; i++) {
          const chunkNumber = i + 1
          const chunk = chunks[i]
          const chunkContent = chunk.join('\n')
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `チャンク ${chunkNumber}/${chunks.length} を処理中 (${chunk.length - 1}レコード)...` })}\n\n`))
          
          try {
            // Create a temporary file for this chunk
            const chunkFileName = `chunk-${Date.now()}-${chunkNumber}.csv`
            const chunkFile = new File([chunkContent], chunkFileName, { type: 'text/csv' })
            
            // Upload chunk to storage
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from('csv-uploads')
              .upload(chunkFileName, chunkFile, {
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) {
              throw new Error(`Failed to upload chunk ${chunkNumber}: ${uploadError.message}`)
            }

            // Process chunk via Edge Function
            const { data: functionData, error: functionError } = await supabaseAdmin.functions
              .invoke('bulk-upsert-productions', {
                body: { fileName: uploadData.path }
              })

            if (functionError) {
              throw new Error(`Edge Function failed for chunk ${chunkNumber}: ${functionError.message}`)
            }

            const chunkResult = functionData as {
              success: boolean
              inserted: number
              updated: number
              errors: string[]
              processingTime: number
              totalRecords: number
            }
            
            // Record chunk results
            chunkResults.push({
              chunkNumber,
              records: chunk.length - 1,
              inserted: chunkResult.inserted || 0,
              updated: chunkResult.updated || 0,
              errors: chunkResult.errors || [],
              processingTime: chunkResult.processingTime || 0
            })
            
            totalInserted += chunkResult.inserted || 0
            totalUpdated += chunkResult.updated || 0
            totalErrors += (chunkResult.errors || []).length
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `チャンク ${chunkNumber} 完了: ${chunkResult.inserted || 0}件処理, ${(chunkResult.errors || []).length}件エラー` })}\n\n`))
            
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 1000))
            
          } catch (error) {
            console.error(`Chunk ${chunkNumber} failed:`, error)
            
            chunkResults.push({
              chunkNumber,
              records: chunk.length - 1,
              inserted: 0,
              updated: 0,
              errors: [error instanceof Error ? error.message : 'Unknown error'],
              processingTime: 0
            })
            
            totalErrors += 1
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: `チャンク ${chunkNumber} エラー: ${error instanceof Error ? error.message : 'Unknown error'}` })}\n\n`))
          }
        }
        
        const totalProcessingTime = Date.now() - startTime
        
        const result: ChunkProcessResult = {
          success: totalErrors === 0,
          totalRecords: dataRows.length,
          totalInserted,
          totalUpdated,
          totalErrors,
          processingTime: totalProcessingTime,
          fileName: file.name,
          chunks: chunkResults
        }
        
        // Send final result
        if (result.success) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            complete: true,
            message: `${result.totalRecords}件のデータを正常に処理しました (新規: ${result.totalInserted}件, 更新: ${result.totalUpdated}件)`,
            details: {
              totalRecords: result.totalRecords,
              inserted: result.totalInserted,
              updated: result.totalUpdated,
              processingTime: result.processingTime,
              fileName: file.name,
              chunks: result.chunks.length
            }
          })}\n\n`))
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            complete: true,
            error: `処理中にエラーが発生しました (${result.totalErrors}個のエラー)`,
            details: {
              totalRecords: result.totalRecords,
              processed: result.totalInserted + result.totalUpdated,
              errors: result.totalErrors,
              processingTime: result.processingTime,
              chunks: result.chunks
            }
          })}\n\n`))
        }
        
      } catch (error) {
        console.error('Streaming upload error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: 'ファイルのアップロード中にエラーが発生しました',
          details: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST(request: NextRequest) {
  console.log('Chunked CSV Upload API called')
  
  // Check if client wants streaming updates
  const url = new URL(request.url)
  const streaming = url.searchParams.get('stream') === 'true'
  
  if (streaming) {
    return handleStreamingUpload(request)
  }
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'CSVファイルを選択してください' }, { status: 400 })
    }

    console.log('Processing file:', file.name, 'Size:', file.size)

    // Read and process CSV content
    const arrayBuffer = await file.arrayBuffer()
    let fileContent: string

    try {
      fileContent = new TextDecoder('shift-jis').decode(arrayBuffer)
      console.log('Successfully decoded as Shift-JIS')
    } catch {
      try {
        fileContent = new TextDecoder('utf-8').decode(arrayBuffer)
        console.log('Successfully decoded as UTF-8')
      } catch {
        fileContent = await file.text()
        console.log('Using default text() method as fallback')
      }
    }

    // Replace Japanese headers with English headers
    console.log('Replacing CSV headers with English headers...')
    const modifiedContent = replaceCSVHeaders(fileContent)
    
    // Parse CSV into lines
    const lines = modifiedContent.split('\n').filter(line => line.trim())
    const headers = lines[0]
    const dataRows = lines.slice(1)
    
    console.log(`Total records to process: ${dataRows.length}`)
    
    // Split into chunks of 8000 records each (optimized size for Edge Functions)
    const CHUNK_SIZE = 8000
    const chunks: string[][] = []
    
    for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
      const chunkRows = dataRows.slice(i, i + CHUNK_SIZE)
      chunks.push([headers, ...chunkRows]) // Include headers in each chunk
    }
    
    console.log(`Split into ${chunks.length} chunks of up to ${CHUNK_SIZE} records each`)
    
    const startTime = Date.now()
    const chunkResults: ChunkProcessResult['chunks'] = []
    let totalInserted = 0
    let totalUpdated = 0
    let totalErrors = 0
    
    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      const chunkNumber = i + 1
      const chunk = chunks[i]
      const chunkContent = chunk.join('\n')
      
      console.log(`Processing chunk ${chunkNumber}/${chunks.length} (${chunk.length - 1} records)...`)
      
      try {
        // Create a temporary file for this chunk
        const chunkFileName = `chunk-${Date.now()}-${chunkNumber}.csv`
        const chunkFile = new File([chunkContent], chunkFileName, { type: 'text/csv' })
        
        // Upload chunk to storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('csv-uploads')
          .upload(chunkFileName, chunkFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Failed to upload chunk ${chunkNumber}: ${uploadError.message}`)
        }

        // Process chunk via Edge Function
        const { data: functionData, error: functionError } = await supabaseAdmin.functions
          .invoke('bulk-upsert-productions', {
            body: { fileName: uploadData.path }
          })

        if (functionError) {
          throw new Error(`Edge Function failed for chunk ${chunkNumber}: ${functionError.message}`)
        }

        const chunkResult = functionData as {
          success: boolean
          inserted: number
          updated: number
          errors: string[]
          processingTime: number
          totalRecords: number
        }
        
        // Record chunk results
        chunkResults.push({
          chunkNumber,
          records: chunk.length - 1, // Subtract header row
          inserted: chunkResult.inserted || 0,
          updated: chunkResult.updated || 0,
          errors: chunkResult.errors || [],
          processingTime: chunkResult.processingTime || 0
        })
        
        totalInserted += chunkResult.inserted || 0
        totalUpdated += chunkResult.updated || 0
        totalErrors += (chunkResult.errors || []).length
        
        console.log(`Chunk ${chunkNumber} completed: ${chunkResult.inserted || 0} processed, ${(chunkResult.errors || []).length} errors`)
        
        // Small delay between chunks to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Chunk ${chunkNumber} failed:`, error)
        
        chunkResults.push({
          chunkNumber,
          records: chunk.length - 1,
          inserted: 0,
          updated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: 0
        })
        
        totalErrors += 1
      }
    }
    
    const totalProcessingTime = Date.now() - startTime
    
    const result: ChunkProcessResult = {
      success: totalErrors === 0,
      totalRecords: dataRows.length,
      totalInserted,
      totalUpdated,
      totalErrors,
      processingTime: totalProcessingTime,
      fileName: file.name,
      chunks: chunkResults
    }
    
    console.log('Chunked processing completed:', result)
    
    if (result.success) {
      return NextResponse.json({
        message: `${result.totalRecords}件のデータを正常に処理しました (新規: ${result.totalInserted}件, 更新: ${result.totalUpdated}件)`,
        details: {
          totalRecords: result.totalRecords,
          inserted: result.totalInserted,
          updated: result.totalUpdated,
          processingTime: result.processingTime,
          fileName: file.name,
          chunks: result.chunks.length
        }
      })
    } else {
      return NextResponse.json({
        error: `処理中にエラーが発生しました (${result.totalErrors}個のエラー)`,
        details: {
          totalRecords: result.totalRecords,
          processed: result.totalInserted + result.totalUpdated,
          errors: result.totalErrors,
          processingTime: result.processingTime,
          chunks: result.chunks
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Chunked upload error:', error)
    return NextResponse.json({
      error: 'ファイルのアップロード中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}