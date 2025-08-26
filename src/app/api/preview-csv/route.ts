import { NextRequest, NextResponse } from 'next/server'
import { replaceCSVHeaders } from '@/lib/csv-header-replacer'

// Dynamic import for papaparse
let Papa: typeof import('papaparse') | null = null
try {
  Papa = require('papaparse') as typeof import('papaparse')
} catch {
  console.warn('papaparse not installed')
}

export async function POST(request: NextRequest) {
  console.log('Preview CSV API called')
  
  try {
    if (!Papa) {
      return NextResponse.json({
        error: 'CSVパーサーが利用できません'
      }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    console.log('File info:', { name: file.name, size: file.size, type: file.type })

    // Read file with encoding detection
    const arrayBuffer = await file.arrayBuffer()
    
    // Try Shift-JIS first for Japanese CSV files
    let content: string
    let encoding = 'shift-jis'
    
    try {
      content = new TextDecoder('shift-jis').decode(arrayBuffer)
      console.log('Successfully decoded as Shift-JIS')
    } catch {
      try {
        content = new TextDecoder('utf-8').decode(arrayBuffer)
        encoding = 'utf-8'
        console.log('Successfully decoded as UTF-8')
      } catch {
        content = new TextDecoder().decode(arrayBuffer)
        encoding = 'default'
        console.log('Using default decoder')
      }
    }
    
    console.log(`Original content preview (first 100 chars):`, content.substring(0, 100))
    
    // Replace header line with English headers
    const modifiedContent = replaceCSVHeaders(content)
    console.log(`Modified content preview (first 100 chars):`, modifiedContent.substring(0, 100))
    
    // Parse with Papa
    const parseResult = Papa.parse(modifiedContent, {
      header: true,
      skipEmptyLines: true,
      preview: 5 // Only parse first 5 rows for preview
    })
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      console.log('Parse errors:', parseResult.errors)
    }
    
    const headers = parseResult.data.length > 0 ? Object.keys(parseResult.data[0] as Record<string, unknown>) : []
    
    return NextResponse.json({
      success: true,
      encoding: encoding,
      totalRows: parseResult.data.length,
      headers: headers,
      sampleData: parseResult.data.slice(0, 3),
      parseErrors: parseResult.errors || []
    })

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({
      error: 'プレビュー中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}