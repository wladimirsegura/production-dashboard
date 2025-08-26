import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  console.log('Cleanup data API called')
  
  try {
    // First, get count of records to be deleted
    const { count: beforeCount, error: countError } = await supabaseAdmin
      .from('productions')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count query error:', countError)
      return NextResponse.json({ 
        error: 'レコード数の取得中にエラーが発生しました',
        details: countError.message 
      }, { status: 500 })
    }

    console.log('Records to delete:', beforeCount)

    // Delete all records
    const { error: deleteError } = await supabaseAdmin
      .from('productions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // This will match all records since no ID will be this value

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        error: 'データの削除中にエラーが発生しました',
        details: deleteError.message 
      }, { status: 500 })
    }

    // Verify cleanup
    const { count: afterCount, error: verifyError } = await supabaseAdmin
      .from('productions')
      .select('*', { count: 'exact', head: true })

    if (verifyError) {
      console.error('Verify query error:', verifyError)
    }

    console.log('Cleanup completed. Records before:', beforeCount, 'Records after:', afterCount || 0)

    return NextResponse.json({ 
      success: true,
      message: `${beforeCount}件のレコードを削除しました`,
      deletedCount: beforeCount,
      remainingCount: afterCount || 0
    })

  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({ 
      error: 'クリーンアップ中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}