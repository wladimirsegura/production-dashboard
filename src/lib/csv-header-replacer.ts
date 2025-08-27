// English headers in the correct order based on your CSV data analysis
// Looking at the sample data, the correct mapping should be:
// '0' -> arrangement_method (手配方式)
// '1' -> inspection_type (検査区分)
// '4217' -> work_area (作業区) - this looks like a work area code
// 'ME012386-B-S1' -> part_number (部品番号)
// 'MY25806000349' -> production_order_number (製造指示番号)
// 'F64217' -> line_code (ラインコード)
// '21011' -> customer_name (代表得意先) - this looks like a customer code
// '7769' -> operator_main (曲げ/ろう付け作業者)
// '6310' -> operator_plating (めっき作業者)
// '' -> plating_type (めっき種類)
// '' -> plating_jig (めっき冶具)
// '0' -> issue_date (発行日)
// '20250904' -> plating_payout_date (めっき払出日)
// '20250908' -> due_date (製造納期)
// '120' -> order_quantity (製造指示数)
// '' -> oohito_shipment_date (大仁出荷)
// '' -> plating_process (めっき工程)
// '' -> tamagawa_receipt_date (玉川受入)
// '6246' -> operator_5x (5X作業者)
// 'LS10' -> shelf_number (棚番)
// '120' -> plating_capacity (めっき収容数)
// '4' -> bending_count (曲げ数)
// '4' -> brazing_count (ろう付け箇所数)
// 'Ϲ' -> machine_number (NC_UNC機械番号)
// ' A' -> brazing_jig (ろう付け治具)
// 'h()' -> subcontractor (二次協力企業)

const ENGLISH_HEADERS = [
  'arrangement_method',     // 手配方式 (0)
  'inspection_type',        // 検査区分 (1)
  'customer_name',         // 代表得意先 (4217)
  'part_number',           // 部品番号 (ME012386-B-S1)
  'production_order_number', // 製造指示番号 (MY25806000349)
  'line_code',             // ラインコード (F64217)
  'work_area',             // 作業区 (21011)
  'operator_main',         // 曲げ/ろう付け作業者 (7769)
  'operator_plating',      // めっき作業者 (6310)
  'plating_type',          // めっき種類 ()
  'plating_jig',           // めっき冶具 ('')
  'issue_date',            // 発行日 (0)
  'plating_payout_date',   // めっき払出日 (20250904)
  'due_date',              // 製造納期 (20250908)
  'order_quantity',        // 製造指示数 (120)
  'oohito_shipment_date',  // 大仁出荷 ('')
  'plating_process',       // めっき工程 ('')
  'tamagawa_receipt_date', // 玉川受入 ('')
  'operator_5x',           // 5X作業者 (6246)
  'shelf_number',          // 棚番 (LS10)
  'plating_capacity',      // めっき収容数 (120)
  'bending_count',         // 曲げ数 (4)
  'brazing_count',         // ろう付け箇所数 (4)
  'machine_number',        // NC_UNC機械番号 (Japanese characters)
  'brazing_jig',           // ろう付け治具 (Japanese characters)
  'subcontractor'          // 二次協力企業 (Japanese characters)
]

// Function to replace the entire first line with English headers
export function replaceCSVHeaders(csvContent: string): string {
  console.log('Replacing entire CSV header line with English headers...')
  
  const lines = csvContent.split('\n')
  if (lines.length === 0) {
    console.log('Empty CSV content')
    return csvContent
  }
  
  // Log original first line
  console.log('Original header line:', lines[0])
  
  // Replace first line with English headers
  const englishHeaderLine = ENGLISH_HEADERS.join(',')
  lines[0] = englishHeaderLine
  
  const modifiedContent = lines.join('\n')
  
  console.log('New header line:', englishHeaderLine)
  console.log('Header replacement completed')
  
  return modifiedContent
}

// Simple production data converter for English headers
export function englishCSVRowToProduction(row: Record<string, unknown>) {
  return {
    arrangement_method: safeParseString(row.arrangement_method),
    inspection_type: safeParseString(row.inspection_type),
    customer_name: safeTruncateString(row.customer_name, 4), // Take only first 4 characters
    part_number: safeParseString(row.part_number),
    production_order_number: safeParseString(row.production_order_number),
    line_code: safeTruncateString(row.line_code, 1), // Take only first 1 character
    work_area: safeParseString(row.work_area), // Keep work_area as is
    operator_main: safeParseString(row.operator_main),
    operator_plating: safeParseString(row.operator_plating),
    plating_type: safeParseString(row.plating_type),
    plating_jig: safeParseString(row.plating_jig),
    issue_date: safeParseDate(row.issue_date),
    plating_payout_date: safeParseDate(row.plating_payout_date),
    due_date: safeParseDate(row.due_date),
    order_quantity: safeParseInt(row.order_quantity),
    oohito_shipment_date: safeParseDate(row.oohito_shipment_date),
    plating_process: safeParseString(row.plating_process),
    tamagawa_receipt_date: safeParseDate(row.tamagawa_receipt_date),
    operator_5x: safeParseString(row.operator_5x),
    shelf_number: safeParseString(row.shelf_number),
    plating_capacity: safeParseInt(row.plating_capacity),
    bending_count: safeParseInt(row.bending_count),
    brazing_count: safeParseInt(row.brazing_count),
    machine_number: safeParseString(row.machine_number),
    brazing_jig: safeParseString(row.brazing_jig),
    subcontractor: safeParseString(row.subcontractor),
  }
}

// Helper function to safely parse strings
function safeParseString(value: unknown): string | null {
  if (!value || value.toString().trim() === '' || value.toString().trim() === '0') {
    return null
  }
  return value.toString().trim()
}

// Helper function to safely truncate strings to specified length
function safeTruncateString(value: unknown, maxLength: number): string | null {
  if (!value || value.toString().trim() === '' || value.toString().trim() === '0') {
    return null
  }
  const str = value.toString().trim()
  return str.substring(0, maxLength)
}

// Helper function to safely parse dates
function safeParseDate(value: unknown): string | null {
  if (!value || value.toString().trim() === '' || value.toString().trim() === '0') {
    return null
  }
  
  const dateStr = value.toString().trim()
  
  // Handle YYYYMMDD format (like 20250908)
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    return `${year}-${month}-${day}`
  }
  
  // Handle YYYY-MM-DD format (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Handle other date formats - try to parse and format
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    }
  } catch {
    console.log(`Could not parse date: ${dateStr}`)
  }
  
  return null
}

// Helper function to safely parse integers
function safeParseInt(value: unknown): number | null {
  if (!value || value.toString().trim() === '' || value.toString().trim() === '0') return null
  const parsed = parseInt(value.toString().trim(), 10)
  return isNaN(parsed) ? null : parsed
}