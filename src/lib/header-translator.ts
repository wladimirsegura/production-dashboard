// Japanese to English header translation mapping
export const JAPANESE_TO_ENGLISH_HEADERS: { [key: string]: string } = {
  // Core production fields - proper Japanese
  '手配方式': 'arrangement_method',
  '検査区分': 'inspection_type',
  '代表得意先': 'customer_name',
  '部品番号': 'part_number',
  '製造指示番号': 'production_order_number',
  'ラインコード': 'line_code',
  '作業区': 'work_area',
  '曲げ/ろう付け作業者': 'operator_main',
  'めっき作業者': 'operator_plating',
  'めっき種類': 'plating_type',
  'めっき冶具': 'plating_jig',
  '発行日': 'issue_date',
  'めっき払出日': 'plating_payout_date',
  '製造納期': 'due_date',
  '製造指示数': 'order_quantity',
  '大仁出荷': 'oohito_shipment_date',
  'めっき工程': 'plating_process',
  '玉川受入': 'tamagawa_receipt_date',
  '5X作業者': 'operator_5x',
  '棚番': 'shelf_number',
  'めっき収容数': 'plating_capacity',
  '曲げ数': 'bending_count',
  'ろう付け箇所数': 'brazing_count',
  'NC_UNC機械番号': 'machine_number',
  'ろう付け治具': 'brazing_jig',
  '二次協力企業': 'subcontractor',
  
  // Corrupted headers from your CSV file - exact matches
  'z': 'arrangement_method',
  '敪': 'inspection_type',
  '\\Ӑ': 'customer_name',
  'iԍ': 'part_number',
  'wԍ': 'production_order_number',
  'CR[h': 'line_code',
  'Ƌ': 'work_area',
  'Ȃ/낤tƎ': 'operator_main',
  '߂Ǝ': 'operator_plating',
  '߂': 'plating_type',
  '߂_1': 'plating_jig',
  's': 'issue_date',
  '߂o': 'plating_payout_date',
  '[': 'due_date',
  'w': 'order_quantity',
  'mo': 'oohito_shipment_date',
  '߂H': 'plating_process',
  'ʐ': 'tamagawa_receipt_date',
  '5XƎ': 'operator_5x',
  'I': 'shelf_number',
  '߂e': 'plating_capacity',
  'Ȃ': 'bending_count',
  '낤tӏ': 'brazing_count',
  'NC_UNC@Bԍ': 'machine_number',
  '낤t': 'brazing_jig',
  '񎟋͊': 'subcontractor'
}

// English to Japanese header translation for UI display
export const ENGLISH_TO_JAPANESE_HEADERS: { [key: string]: string } = {
  'arrangement_method': '手配方式',
  'inspection_type': '検査区分',
  'customer_name': '代表得意先',
  'part_number': '部品番号',
  'production_order_number': '製造指示番号',
  'line_code': 'ラインコード',
  'work_area': '作業区',
  'operator_main': '曲げ/ろう付け作業者',
  'operator_plating': 'めっき作業者',
  'plating_type': 'めっき種類',
  'plating_jig': 'めっき冶具',
  'issue_date': '発行日',
  'plating_payout_date': 'めっき払出日',
  'due_date': '製造納期',
  'order_quantity': '製造指示数',
  'oohito_shipment_date': '大仁出荷',
  'plating_process': 'めっき工程',
  'tamagawa_receipt_date': '玉川受入',
  'operator_5x': '5X作業者',
  'shelf_number': '棚番',
  'plating_capacity': 'めっき収容数',
  'bending_count': '曲げ数',
  'brazing_count': 'ろう付け箇所数',
  'machine_number': 'NC_UNC機械番号',
  'brazing_jig': 'ろう付け治具',
  'subcontractor': '二次協力企業'
}

// Function to translate CSV headers from Japanese to English
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function translateHeadersToEnglish(csvData: any[]): any[] {
  if (!csvData || csvData.length === 0) return csvData

  return csvData.map(row => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translatedRow: any = {}
    
    for (const [originalHeader, value] of Object.entries(row)) {
      // Clean the header (remove extra spaces, normalize)
      const cleanHeader = originalHeader.trim()
      
      // Try to find exact match first
      let englishHeader = JAPANESE_TO_ENGLISH_HEADERS[cleanHeader]
      
      // If no exact match, try partial matching
      if (!englishHeader) {
        for (const [japaneseHeader, englishKey] of Object.entries(JAPANESE_TO_ENGLISH_HEADERS)) {
          if (cleanHeader.includes(japaneseHeader) || japaneseHeader.includes(cleanHeader)) {
            englishHeader = englishKey
            break
          }
        }
      }
      
      // Use English header if found, otherwise keep original
      const finalHeader = englishHeader || cleanHeader
      translatedRow[finalHeader] = value
    }
    
    return translatedRow
  })
}

// Function to get Japanese label for English field name (for UI)
export function getJapaneseLabel(englishFieldName: string): string {
  return ENGLISH_TO_JAPANESE_HEADERS[englishFieldName] || englishFieldName
}

// Helper function to safely parse integers
export function safeParseInt(value: string | undefined | null): number | null {
  if (!value || value.toString().trim() === '') return null
  const parsed = parseInt(value.toString().trim(), 10)
  return isNaN(parsed) ? null : parsed
}

// Convert translated CSV row to production data format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function translatedCSVRowToProduction(row: any) {
  return {
    arrangement_method: row.arrangement_method?.trim() || null,
    inspection_type: row.inspection_type?.trim() || null,
    customer_name: row.customer_name?.trim() || null,
    part_number: row.part_number?.trim() || null,
    production_order_number: row.production_order_number?.trim() || null,
    line_code: row.line_code?.trim() || null,
    work_area: row.work_area?.trim() || null,
    operator_main: row.operator_main?.trim() || null,
    operator_plating: row.operator_plating?.trim() || null,
    plating_type: row.plating_type?.trim() || null,
    plating_jig: row.plating_jig?.trim() || null,
    issue_date: row.issue_date?.trim() || null,
    plating_payout_date: row.plating_payout_date?.trim() || null,
    due_date: row.due_date?.trim() || null,
    order_quantity: safeParseInt(row.order_quantity),
    oohito_shipment_date: row.oohito_shipment_date?.trim() || null,
    plating_process: row.plating_process?.trim() || null,
    tamagawa_receipt_date: row.tamagawa_receipt_date?.trim() || null,
    operator_5x: row.operator_5x?.trim() || null,
    shelf_number: row.shelf_number?.trim() || null,
    plating_capacity: safeParseInt(row.plating_capacity),
    bending_count: safeParseInt(row.bending_count),
    brazing_count: safeParseInt(row.brazing_count),
    machine_number: row.machine_number?.trim() || null,
    brazing_jig: row.brazing_jig?.trim() || null,
    subcontractor: row.subcontractor?.trim() || null,
  }
}