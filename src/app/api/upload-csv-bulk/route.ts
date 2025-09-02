import { NextRequest, NextResponse } from 'next/server'
import { replaceCSVHeaders } from '@/lib/csv-header-replacer'
import { performBulkUpload } from '@/lib/storage-manager'

export async function POST(request: NextRequest) {
  console.log('Bulk CSV Upload API called')
  
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
      // Try Shift-JIS first (common for Japanese CSV files)
      fileContent = new TextDecoder('shift-jis').decode(arrayBuffer)
      console.log('Successfully decoded as Shift-JIS')
    } catch {
      try {
        // Fallback to UTF-8
        fileContent = new TextDecoder('utf-8').decode(arrayBuffer)
        console.log('Successfully decoded as UTF-8')
      } catch {
        // Final fallback
        fileContent = await file.text()
        console.log('Using default text() method as fallback')
      }
    }

    // Replace Japanese headers with English headers
    console.log('Replacing CSV headers with English headers...')
    const modifiedContent = replaceCSVHeaders(fileContent)

    // Perform bulk upload using storage manager
    console.log('Starting bulk upload process...')
    const result = await performBulkUpload(file, modifiedContent)
    
    if (!result.success) {
      return NextResponse.json({
        error: result.error,
        details: result.details
      }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      message: result.message,
      details: result.details
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({
      error: 'ファイルのアップロード中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}