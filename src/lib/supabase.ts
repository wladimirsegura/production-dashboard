// Dynamic import for Supabase to handle potential missing dependency
let createClient: any = null
let supabase: any = null
let supabaseAdmin: any = null

// Create a chainable mock query builder
const createMockQueryBuilder = () => {
  const mockError = new Error('Supabase not configured. Please install: npm install @supabase/supabase-js @supabase/ssr')
  
  const mockBuilder = {
    select: () => mockBuilder,
    insert: () => mockBuilder,
    eq: () => mockBuilder,
    gte: () => mockBuilder,
    lte: () => mockBuilder,
    not: () => mockBuilder,
    order: () => mockBuilder,
    then: (resolve: any) => resolve({ data: null, error: mockError })
  }
  
  return mockBuilder
}

try {
  const supabaseModule = require('@supabase/supabase-js')
  createClient = supabaseModule.createClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please check your .env.local file.')
    supabase = {
      from: () => createMockQueryBuilder()
    }
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Create admin client for server-side operations
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      console.warn('Missing SUPABASE_SERVICE_ROLE_KEY. Server-side operations may fail.')
      supabaseAdmin = supabase // Fallback to regular client
    }
  }
} catch (error) {
  console.warn('Supabase not installed. Please run: npm install @supabase/supabase-js @supabase/ssr')
  
  // Create a mock supabase client for development
  supabase = {
    from: () => createMockQueryBuilder()
  }
  supabaseAdmin = supabase // Use same mock for admin
}

export { supabase, supabaseAdmin }

// Type definitions for our productions table
export interface Production {
  id: string
  arrangement_method: string | null
  inspection_type: string | null
  customer_name: string | null
  part_number: string | null
  production_order_number: string | null
  line_code: string | null
  work_area: string | null
  operator_main: string | null
  operator_plating: string | null
  plating_type: string | null
  plating_jig: string | null
  issue_date: string | null
  plating_payout_date: string | null
  due_date: string | null
  order_quantity: number | null
  oohito_shipment_date: string | null
  plating_process: string | null
  tamagawa_receipt_date: string | null
  operator_5x: string | null
  shelf_number: string | null
  plating_capacity: number | null
  bending_count: number | null
  brazing_count: number | null
  machine_number: string | null
  brazing_jig: string | null
  subcontractor: string | null
  created_at: string
}

// Type for CSV row data
export interface CSVRow {
  '手配方式': string
  '検査区分': string
  '代表得意先': string
  '部品番号': string
  '製造指示番号': string
  'ラインコード': string
  '作業区': string
  '曲げ/ろう付け作業者': string
  'めっき作業者': string
  'めっき種類': string
  'めっき冶具': string
  '発行日': string
  'めっき払出日': string
  '製造納期': string
  '製造指示数': string
  '大仁出荷': string
  'めっき工程': string
  '玉川受入': string
  '5X作業者': string
  '棚番': string
  'めっき収容数': string
  '曲げ数': string
  'ろう付け箇所数': string
  'NC_UNC機械番号': string
  'ろう付け治具': string
  '二次協力企業': string
}

// Helper function to safely parse integers
function safeParseInt(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.trim(), 10)
  return isNaN(parsed) ? null : parsed
}

// Function to convert CSV row to Production data
export function csvRowToProduction(row: CSVRow): Omit<Production, 'id' | 'created_at'> {
  return {
    arrangement_method: row['手配方式']?.trim() || null,
    inspection_type: row['検査区分']?.trim() || null,
    customer_name: row['代表得意先']?.trim() || null,
    part_number: row['部品番号']?.trim() || null,
    production_order_number: row['製造指示番号']?.trim() || null,
    line_code: row['ラインコード']?.trim() || null,
    work_area: row['作業区']?.trim() || null,
    operator_main: row['曲げ/ろう付け作業者']?.trim() || null,
    operator_plating: row['めっき作業者']?.trim() || null,
    plating_type: row['めっき種類']?.trim() || null,
    plating_jig: row['めっき冶具']?.trim() || null,
    issue_date: row['発行日']?.trim() || null,
    plating_payout_date: row['めっき払出日']?.trim() || null,
    due_date: row['製造納期']?.trim() || null,
    order_quantity: safeParseInt(row['製造指示数']),
    oohito_shipment_date: row['大仁出荷']?.trim() || null,
    plating_process: row['めっき工程']?.trim() || null,
    tamagawa_receipt_date: row['玉川受入']?.trim() || null,
    operator_5x: row['5X作業者']?.trim() || null,
    shelf_number: row['棚番']?.trim() || null,
    plating_capacity: safeParseInt(row['めっき収容数']),
    bending_count: safeParseInt(row['曲げ数']),
    brazing_count: safeParseInt(row['ろう付け箇所数']),
    machine_number: row['NC_UNC機械番号']?.trim() || null,
    brazing_jig: row['ろう付け治具']?.trim() || null,
    subcontractor: row['二次協力企業']?.trim() || null,
  }
}