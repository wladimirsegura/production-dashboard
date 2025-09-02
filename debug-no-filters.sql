-- Debug Query - Test what the application should be fetching
-- This simulates the exact query the application runs but without filters

-- ============================================================================
-- TEST 1: Basic query without any filters (what should work)
-- ============================================================================

SELECT 
  customer_name, 
  due_date, 
  order_quantity, 
  bending_count, 
  brazing_count, 
  line_code, 
  machine_number
FROM productions 
WHERE due_date IS NOT NULL
ORDER BY due_date ASC
LIMIT 10;

-- ============================================================================
-- TEST 2: Check line code patterns in your data
-- ============================================================================

-- See what line code prefixes actually exist
SELECT 
  LEFT(line_code, 1) as prefix,
  COUNT(*) as count
FROM productions 
WHERE line_code IS NOT NULL 
  AND due_date IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY count DESC;

-- ============================================================================
-- TEST 3: Test the F/D filter that the app is using
-- ============================================================================

-- This is exactly what the application is trying to do
SELECT COUNT(*) as records_with_f_or_d_line_codes
FROM productions 
WHERE due_date IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%');

-- Show sample records with F or D line codes
SELECT 
  customer_name, 
  line_code, 
  due_date, 
  order_quantity
FROM productions 
WHERE due_date IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%')
ORDER BY due_date DESC
LIMIT 5;

-- ============================================================================
-- TEST 4: Check date range around 2025-09-02
-- ============================================================================

-- Check data in the date range the app is looking for
SELECT 
  due_date,
  COUNT(*) as count
FROM productions 
WHERE due_date BETWEEN '2025-08-28' AND '2025-09-21'  -- App's date range
  AND due_date IS NOT NULL
GROUP BY due_date
ORDER BY due_date;

-- ============================================================================
-- TEST 5: Combined filter test (what the app is actually doing)
-- ============================================================================

-- This is the EXACT query the application should be running
SELECT COUNT(*) as final_count
FROM productions 
WHERE due_date IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%')
  AND due_date >= '2025-08-28'
  AND due_date <= '2025-09-21';

-- If the above returns 0, try without line code filter
SELECT COUNT(*) as count_without_line_filter
FROM productions 
WHERE due_date IS NOT NULL
  AND due_date >= '2025-08-28'
  AND due_date <= '2025-09-21';

-- ============================================================================
-- TEST 6: Find what would work instead
-- ============================================================================

-- Find the most common line code prefix that has recent data
SELECT 
  LEFT(line_code, 1) as prefix,
  COUNT(*) as total_count,
  COUNT(CASE WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_count
FROM productions 
WHERE line_code IS NOT NULL 
  AND due_date IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY recent_count DESC, total_count DESC;