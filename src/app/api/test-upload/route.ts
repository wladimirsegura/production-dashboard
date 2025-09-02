import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  console.log('Test upload API called')
  
  try {
    // Create dummy production data
    const dummyData = [
      {
        arrangement_method: 'テスト手配',
        inspection_type: 'テスト検査',
        customer_name: 'テスト得意先A',
        part_number: 'TEST-001',
        production_order_number: 'PO-TEST-001',
        line_code: 'LINE-01',
        work_area: 'エリア1',
        operator_main: '作業者1',
        operator_plating: 'めっき作業者1',
        plating_type: 'ニッケル',
        plating_jig: '治具A',
        issue_date: '2025-01-01',
        plating_payout_date: '2025-01-02',
        due_date: '2025-01-10',
        order_quantity: 100,
        oohito_shipment_date: '2025-01-11',
        plating_process: 'プロセス1',
        tamagawa_receipt_date: '2025-01-03',
        operator_5x: '5X作業者1',
        shelf_number: 'A-001',
        plating_capacity: 50,
        bending_count: 3,
        brazing_count: 2,
        machine_number: 'M-001',
        brazing_jig: 'ろう付け治具1',
        subcontractor: '協力企業A'
      },
      {
        arrangement_method: 'テスト手配',
        inspection_type: 'テスト検査',
        customer_name: 'テスト得意先B',
        part_number: 'TEST-002',
        production_order_number: 'PO-TEST-002',
        line_code: 'LINE-02',
        work_area: 'エリア2',
        operator_main: '作業者2',
        operator_plating: 'めっき作業者2',
        plating_type: '亜鉛',
        plating_jig: '治具B',
        issue_date: '2025-01-02',
        plating_payout_date: '2025-01-03',
        due_date: '2025-01-12',
        order_quantity: 200,
        oohito_shipment_date: '2025-01-13',
        plating_process: 'プロセス2',
        tamagawa_receipt_date: '2025-01-04',
        operator_5x: '5X作業者2',
        shelf_number: 'B-001',
        plating_capacity: 100,
        bending_count: 5,
        brazing_count: 1,
        machine_number: 'M-002',
        brazing_jig: 'ろう付け治具2',
        subcontractor: '協力企業B'
      },
      {
        arrangement_method: 'テスト手配',
        inspection_type: 'テスト検査',
        customer_name: 'テスト得意先A',
        part_number: 'TEST-003',
        production_order_number: 'PO-TEST-003',
        line_code: 'LINE-01',
        work_area: 'エリア1',
        operator_main: '作業者3',
        operator_plating: 'めっき作業者3',
        plating_type: 'クロム',
        plating_jig: '治具C',
        issue_date: '2025-01-03',
        plating_payout_date: '2025-01-04',
        due_date: '2025-01-15',
        order_quantity: 150,
        oohito_shipment_date: '2025-01-16',
        plating_process: 'プロセス3',
        tamagawa_receipt_date: '2025-01-05',
        operator_5x: '5X作業者3',
        shelf_number: 'C-001',
        plating_capacity: 75,
        bending_count: 2,
        brazing_count: 4,
        machine_number: 'M-003',
        brazing_jig: 'ろう付け治具3',
        subcontractor: '協力企業C'
      }
    ]

    console.log('Dummy data prepared, count:', dummyData.length)

    // Test Supabase connection and upsert using admin client
    console.log('Testing Supabase connection with admin client...')
    const { data, error } = await supabaseAdmin
      .from('productions')
      .upsert(dummyData, {
        onConflict: 'production_order_number',
        count: 'exact'
      })
      .select()

    if (error) {
      console.error('Supabase test upsert error:', error)
      return NextResponse.json({
        success: false,
        error: 'データベースへのテストデータUPSERT中にエラーが発生しました',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('Test data upserted successfully, count:', data?.length)
    return NextResponse.json({
      success: true,
      message: `${data.length}件のテストデータを正常にUPSERTしました (新規追加または更新)`,
      count: data.length,
      data: data
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'テストアップロード中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}