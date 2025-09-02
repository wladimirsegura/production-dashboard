-- Database Debug Script
-- Run this in Supabase SQL Editor to check data and troubleshoot

-- ============================================================================
-- SECTION 1: CHECK IF TABLE EXISTS AND HAS DATA
-- ============================================================================

-- Check if productions table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'productions';

-- Check total record count
SELECT COUNT(*) as total_records FROM productions;

-- Check if there are any records with non-null due_date
SELECT COUNT(*) as records_with_due_date 
FROM productions 
WHERE due_date IS NOT NULL;

-- Check date range of existing data
SELECT 
  MIN(due_date) as earliest_due_date,
  MAX(due_date) as latest_due_date,
  MIN(created_at) as earliest_created,
  MAX(created_at) as latest_created
FROM productions;

-- ============================================================================
-- SECTION 2: CHECK LINE CODE DATA
-- ============================================================================

-- Check line codes that start with F or D
SELECT 
  LEFT(line_code, 1) as line_code_prefix,
  COUNT(*) as count
FROM productions 
WHERE line_code IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY count DESC;

-- Check all line codes
SELECT 
  line_code,
  COUNT(*) as count
FROM productions 
WHERE line_code IS NOT NULL
GROUP BY line_code
ORDER BY count DESC
LIMIT 20;

-- ============================================================================
-- SECTION 3: CHECK CUSTOMER DATA
-- ============================================================================

-- Check customer names
SELECT 
  customer_name,
  COUNT(*) as count
FROM productions 
WHERE customer_name IS NOT NULL
GROUP BY customer_name
ORDER BY count DESC
LIMIT 10;

-- ============================================================================
-- SECTION 4: CHECK RECENT DATA
-- ============================================================================

-- Check data from last 30 days
SELECT 
  due_date,
  COUNT(*) as count
FROM productions 
WHERE due_date >= CURRENT_DATE - INTERVAL '30 days'
  AND due_date IS NOT NULL
GROUP BY due_date
ORDER BY due_date DESC
LIMIT 10;

-- Check data from last year
SELECT 
  DATE_TRUNC('month', due_date) as month,
  COUNT(*) as count
FROM productions 
WHERE due_date >= CURRENT_DATE - INTERVAL '1 year'
  AND due_date IS NOT NULL
GROUP BY DATE_TRUNC('month', due_date)
ORDER BY month DESC
LIMIT 12;

-- ============================================================================
-- SECTION 5: SAMPLE DATA CHECK
-- ============================================================================

-- Show sample records
SELECT 
  customer_name,
  line_code,
  due_date,
  order_quantity,
  bending_count,
  brazing_count,
  machine_number,
  subcontractor,
  created_at
FROM productions 
WHERE due_date IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- SECTION 6: CHECK SPECIFIC FILTER CONDITIONS
-- ============================================================================

-- Check records that match current filter (line codes starting with F or D)
SELECT COUNT(*) as matching_records
FROM productions 
WHERE due_date IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%');

-- Check records for today's date (2025-09-02)
SELECT COUNT(*) as records_for_today
FROM productions 
WHERE due_date = '2025-09-02';

-- Check records around today's date
SELECT 
  due_date,
  COUNT(*) as count
FROM productions 
WHERE due_date BETWEEN '2025-08-28' AND '2025-09-07'
  AND due_date IS NOT NULL
GROUP BY due_date
ORDER BY due_date;

-- ============================================================================
-- SECTION 7: TABLE STRUCTURE CHECK
-- ============================================================================

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'productions'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 8: PERMISSIONS CHECK
-- ============================================================================

-- Check if we can insert test data (this will show permission errors if any)
-- DO NOT RUN THIS IF YOU HAVE PRODUCTION DATA
-- INSERT INTO productions (customer_name, line_code, due_date, order_quantity) 
-- VALUES ('TEST_CUSTOMER', 'F001', CURRENT_DATE, 100);

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'productions';