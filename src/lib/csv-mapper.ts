// Flexible CSV column mapping to handle different header formats
export interface FlexibleCSVRow {
  [key: string]: string
}

// Column mapping configurations - maps various possible header names to our standard fields
export const COLUMN_MAPPINGS = {
  // Customer name variations
  customer_name: [
    '代表得意先', '得意先', 'customer', 'customer_name', 'client', '顧客名', '取引先',
    '\\Ӑ' // Corrupted encoding for 代表得意先
  ],
  
  // Part number variations
  part_number: [
    '部品番号', 'part_number', 'part_no', 'item_number', 'product_code', '品番',
    'iԍ' // Corrupted encoding for 部品番号
  ],
  
  // Due date variations
  due_date: [
    '製造納期', '納期', 'due_date', 'delivery_date', 'deadline', '完成予定日',
    '[' // Corrupted encoding for 製造納期
  ],
  
  // Order quantity variations
  order_quantity: [
    '製造指示数', '指示数', '数量', 'quantity', 'order_qty', 'amount', 'count',
    'w' // Corrupted encoding for 製造指示数
  ],
  
  // Bending count variations
  bending_count: [
    '曲げ数', '曲げ回数', 'bending_count', 'bend_count', 'bends',
    'Ȃ' // Corrupted encoding for 曲げ数
  ],
  
  // Brazing count variations
  brazing_count: [
    'ろう付け箇所数', 'ろう付け数', 'brazing_count', 'braze_count', 'brazing_spots',
    '낤tӏ' // Corrupted encoding for ろう付け箇所数
  ],
  
  // Production order number variations
  production_order_number: [
    '製造指示番号', '指示番号', 'order_number', 'production_order', 'work_order', '作業番号',
    'wԍ' // Corrupted encoding for 製造指示番号
  ],
  
  // Other common fields
  arrangement_method: [
    '手配方式', 'arrangement_method', 'method', '手配',
    'z' // Corrupted encoding for 手配方式
  ],
  
  inspection_type: [
    '検査区分', 'inspection_type', 'inspection', '検査',
    '敪' // Corrupted encoding for 検査区分
  ],
  
  line_code: [
    'ラインコード', 'line_code', 'line', 'ライン',
    'CR[h' // Corrupted encoding for ラインコード
  ],
  
  work_area: [
    '作業区', 'work_area', 'area', '作業エリア',
    'Ƌ' // Corrupted encoding for 作業区
  ],
  
  operator_main: [
    '曲げ/ろう付け作業者', '作業者', 'operator', 'worker', '担当者',
    'Ȃ/낤tƎ' // Corrupted encoding for 曲げ/ろう付け作業者
  ],
  
  operator_plating: [
    'めっき作業者', 'plating_operator', 'plating_worker',
    '߂Ǝ' // Corrupted encoding for めっき作業者
  ],
  
  plating_type: [
    'めっき種類', 'plating_type', 'plating', 'coating',
    '߂' // Corrupted encoding for めっき種類
  ],
  
  plating_jig: [
    'めっき冶具', 'plating_jig', 'jig',
    '߂_1' // Corrupted encoding for めっき冶具
  ],
  
  issue_date: [
    '発行日', 'issue_date', 'start_date', '開始日',
    's' // Corrupted encoding for 発行日
  ],
  
  plating_payout_date: [
    'めっき払出日', 'plating_date', 'payout_date',
    '߂o' // Corrupted encoding for めっき払出日
  ],
  
  oohito_shipment_date: [
    '大仁出荷', 'shipment_date', 'ship_date',
    'mo' // Corrupted encoding for 大仁出荷
  ],
  
  plating_process: [
    'めっき工程', 'plating_process', 'process',
    '߂H' // Corrupted encoding for めっき工程
  ],
  
  tamagawa_receipt_date: [
    '玉川受入', 'receipt_date', 'receive_date',
    'ʐ' // Corrupted encoding for 玉川受入
  ],
  
  operator_5x: [
    '5X作業者', '5x_operator', 'operator_5x',
    '5XƎ' // Corrupted encoding for 5X作業者
  ],
  
  shelf_number: [
    '棚番', 'shelf_number', 'shelf', '棚',
    'I' // Corrupted encoding for 棚番
  ],
  
  plating_capacity: [
    'めっき収容数', 'plating_capacity', 'capacity',
    '߂e' // Corrupted encoding for めっき収容数
  ],
  
  machine_number: [
    'NC_UNC機械番号', '機械番号', 'machine_number', 'machine', '設備番号',
    'NC_UNC@Bԍ' // Corrupted encoding for NC_UNC機械番号
  ],
  
  brazing_jig: [
    'ろう付け治具', 'brazing_jig', 'braze_jig',
    '낤t' // Corrupted encoding for ろう付け治具
  ],
  
  subcontractor: [
    '二次協力企業', '協力企業', 'subcontractor', 'vendor', '外注先',
    '񎟋͊' // Corrupted encoding for 二次協力企業
  ]
}

// Function to find the best matching column name
export function findColumnMatch(csvHeaders: string[], targetField: keyof typeof COLUMN_MAPPINGS): string | null {
  const possibleNames = COLUMN_MAPPINGS[targetField]
  
  // First try exact match (case insensitive)
  for (const header of csvHeaders) {
    for (const possibleName of possibleNames) {
      if (header.toLowerCase().trim() === possibleName.toLowerCase().trim()) {
        return header
      }
    }
  }
  
  // Then try partial match
  for (const header of csvHeaders) {
    for (const possibleName of possibleNames) {
      if (header.toLowerCase().includes(possibleName.toLowerCase()) || 
          possibleName.toLowerCase().includes(header.toLowerCase())) {
        return header
      }
    }
  }
  
  return null
}

// Function to map flexible CSV row to our production format
export function mapFlexibleCSVRow(row: FlexibleCSVRow, csvHeaders: string[]) {
  const mappedRow: any = {}
  
  // Map each field using flexible matching
  for (const targetField of Object.keys(COLUMN_MAPPINGS) as Array<keyof typeof COLUMN_MAPPINGS>) {
    const matchedColumn = findColumnMatch(csvHeaders, targetField)
    if (matchedColumn && row[matchedColumn]) {
      mappedRow[targetField] = row[matchedColumn].trim()
    } else {
      mappedRow[targetField] = null
    }
  }
  
  return mappedRow
}

// Helper function to safely parse integers
export function safeParseInt(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.trim(), 10)
  return isNaN(parsed) ? null : parsed
}

// Convert mapped row to production data format
export function flexibleCSVRowToProduction(mappedRow: any) {
  return {
    arrangement_method: mappedRow.arrangement_method || null,
    inspection_type: mappedRow.inspection_type || null,
    customer_name: mappedRow.customer_name || null,
    part_number: mappedRow.part_number || null,
    production_order_number: mappedRow.production_order_number || null,
    line_code: mappedRow.line_code || null,
    work_area: mappedRow.work_area || null,
    operator_main: mappedRow.operator_main || null,
    operator_plating: mappedRow.operator_plating || null,
    plating_type: mappedRow.plating_type || null,
    plating_jig: mappedRow.plating_jig || null,
    issue_date: mappedRow.issue_date || null,
    plating_payout_date: mappedRow.plating_payout_date || null,
    due_date: mappedRow.due_date || null,
    order_quantity: safeParseInt(mappedRow.order_quantity),
    oohito_shipment_date: mappedRow.oohito_shipment_date || null,
    plating_process: mappedRow.plating_process || null,
    tamagawa_receipt_date: mappedRow.tamagawa_receipt_date || null,
    operator_5x: mappedRow.operator_5x || null,
    shelf_number: mappedRow.shelf_number || null,
    plating_capacity: safeParseInt(mappedRow.plating_capacity),
    bending_count: safeParseInt(mappedRow.bending_count),
    brazing_count: safeParseInt(mappedRow.brazing_count),
    machine_number: mappedRow.machine_number || null,
    brazing_jig: mappedRow.brazing_jig || null,
    subcontractor: mappedRow.subcontractor || null,
  }
}