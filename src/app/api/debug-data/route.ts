import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  console.log('Debug data API called')
  
  try {
    // Get all data to see what's in the database
    const { data, error } = await supabaseAdmin
      .from('productions')
      .select('customer_name, due_date, order_quantity, bending_count, brazing_count, created_at')
      .limit(10)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Debug query error:', error)
      return NextResponse.json({ 
        error: 'データの取得中にエラーが発生しました',
        details: error.message 
      }, { status: 500 })
    }

    console.log('Debug data result:', data)

    // Get date range info
    const { data: dateRange, error: dateError } = await supabaseAdmin
      .from('productions')
      .select('due_date')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (dateError) {
      console.error('Date range query error:', dateError)
    }

    const dates = dateRange?.map((row: { due_date: string }) => row.due_date) || []
    const minDate = dates.length > 0 ? dates[0] : null
    const maxDate = dates.length > 0 ? dates[dates.length - 1] : null

    console.log('Date range:', { minDate, maxDate, totalRecords: dates.length })

    return NextResponse.json({ 
      success: true,
      sampleData: data,
      totalRecords: data?.length || 0,
      dateRange: {
        min: minDate,
        max: maxDate,
        totalWithDates: dates.length
      },
      allDates: [...new Set(dates)].sort()
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'デバッグ中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}