-- Data Analysis Script for Production Dashboard
-- Run this to understand why the application shows 0 records despite having 37,125 records

-- ============================================================================
-- SECTION 1: ANALYZE LINE CODE PATTERNS
-- ============================================================================

-- Check what line code patterns actually exist in your data
SELECT 
  LEFT(line_code, 1) as first_character,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM productions WHERE line_code IS NOT NULL), 2) as percentage
FROM productions 
WHERE line_code IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY count DESC;

-- Check actual line codes (first 20 most common)
SELECT 
  line_code,
  COUNT(*) as count
FROM productions 
WHERE line_code IS NOT NULL
GROUP BY line_code
ORDER BY count DESC
LIMIT 20;

-- ============================================================================
-- SECTION 2: CHECK CURRENT FILTER CONDITIONS
-- ============================================================================

-- Check how many records match the current F/D filter
SELECT 
  'Records matching F or D line codes' as description,
  COUNT(*) as count
FROM productions 
WHERE due_date IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%');

-- Check records with non-null due_date
SELECT 
  'Records with non-null due_date' as description,
  COUNT(*) as count
FROM productions 
WHERE due_date IS NOT NULL;

-- Check records with both non-null due_date and line_code
SELECT 
  'Records with both due_date and line_code' as description,
  COUNT(*) as count
FROM productions 
WHERE due_date IS NOT NULL 
  AND line_code IS NOT NULL;

-- ============================================================================
-- SECTION 3: ANALYZE DATE RANGES
-- ============================================================================

-- Check date range of your data
SELECT 
  MIN(due_date) as earliest_due_date,
  MAX(due_date) as latest_due_date,
  COUNT(DISTINCT due_date) as unique_dates
FROM productions 
WHERE due_date IS NOT NULL;

-- Check data around current date (2025-09-02)
SELECT 
  due_date,
  COUNT(*) as count
FROM productions 
WHERE due_date BETWEEN '2025-08-26' AND '2025-09-08'
  AND due_date IS NOT NULL
GROUP BY due_date
ORDER BY due_date;

-- Check most recent dates in your data
SELECT 
  due_date,
  COUNT(*) as count
FROM productions 
WHERE due_date IS NOT NULL
GROUP BY due_date
ORDER BY due_date DESC
LIMIT 10;

-- ============================================================================
-- SECTION 4: CUSTOMER NAME ANALYSIS
-- ============================================================================

-- Check customer name patterns (first 4 characters as used by the app)
SELECT 
  LEFT(customer_name, 4) as customer_prefix,
  COUNT(*) as count
FROM productions 
WHERE customer_name IS NOT NULL
GROUP BY LEFT(customer_name, 4)
ORDER BY count DESC
LIMIT 20;

-- Check full customer names
SELECT 
  customer_name,
  COUNT(*) as count
FROM productions 
WHERE customer_name IS NOT NULL
GROUP BY customer_name
ORDER BY count DESC
LIMIT 20;

-- ============================================================================
-- SECTION 5: SIMULATE APPLICATION QUERY
-- ============================================================================

-- This simulates exactly what the application is doing
-- Check records that match the application's current filter logic
SELECT 
  'Application filter simulation' as description,
  COUNT(*) as matching_records
FROM productions 
WHERE due_date IS NOT NULL
  AND line_code IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%')
  AND due_date >= '2025-08-28'  -- 5 days before selected date
  AND due_date <= '2025-09-21'; -- 19 days after selected date

-- Show sample records that would match the application filter
SELECT 
  customer_name,
  line_code,
  due_date,
  order_quantity,
  bending_count,
  brazing_count
FROM productions 
WHERE due_date IS NOT NULL
  AND line_code IS NOT NULL
  AND (line_code ILIKE 'F%' OR line_code ILIKE 'D%')
  AND due_date >= '2025-08-28'
  AND due_date <= '2025-09-21'
ORDER BY due_date
LIMIT 10;

-- ============================================================================
-- SECTION 6: ALTERNATIVE FILTER SUGGESTIONS
-- ============================================================================

-- If F/D filter returns 0, let's see what the most common line code prefixes are
-- and suggest alternatives
SELECT 
  'Most common line code prefixes (alternatives to F/D)' as suggestion,
  LEFT(line_code, 1) as prefix,
  COUNT(*) as count
FROM productions 
WHERE line_code IS NOT NULL
  AND due_date IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY count DESC
LIMIT 5;

-- Check if there are any records at all that match basic criteria
SELECT 
  'Records with basic criteria (due_date and line_code not null)' as description,
  COUNT(*) as count
FROM productions 
WHERE due_date IS NOT NULL
  AND line_code IS NOT NULL;

-- ============================================================================
-- SECTION 7: RECOMMENDATIONS
-- ============================================================================

-- Show what line code prefixes would give you data
SELECT 
  LEFT(line_code, 1) as recommended_prefix,
  COUNT(*) as records_available,
  MIN(due_date) as earliest_date,
  MAX(due_date) as latest_date
FROM productions 
WHERE line_code IS NOT NULL
  AND due_date IS NOT NULL
GROUP BY LEFT(line_code, 1)
HAVING COUNT(*) > 100  -- Only show prefixes with substantial data
ORDER BY records_available DESC;