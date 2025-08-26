import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const customer = searchParams.get('customer')

    let query = supabase
      .from('productions')
      .select('*')
      .order('due_date', { ascending: true })

    // Add date filters if provided
    if (startDate) {
      query = query.gte('due_date', startDate)
    }
    if (endDate) {
      query = query.lte('due_date', endDate)
    }
    if (customer) {
      query = query.eq('customer_name', customer)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ 
        error: 'データの取得中にエラーが発生しました',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'データの取得中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}