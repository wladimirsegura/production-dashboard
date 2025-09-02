-- Production Dashboard Database Optimization Script (Simple Version)
-- Execute this in Supabase SQL Editor if the main script has issues
-- Run each section separately if needed

-- ============================================================================
-- SECTION 1: COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productions_customer_due_date 
  ON productions(customer_name, due_date) 
  WHERE customer_name IS NOT NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_line_code_due_date 
  ON productions(line_code, due_date) 
  WHERE line_code IS NOT NULL AND due_date IS NOT NULL;

-- ============================================================================
-- SECTION 2: INDEXES FOR NEW FILTER FIELDS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productions_subcontractor 
  ON productions(subcontractor) 
  WHERE subcontractor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_machine_number 
  ON productions(machine_number) 
  WHERE machine_number IS NOT NULL;

-- ============================================================================
-- SECTION 3: COMPOSITE INDEXES FOR SPECIFIC DISPLAY MODES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productions_brazing_subcontractor 
  ON productions(subcontractor, due_date, brazing_count) 
  WHERE subcontractor IS NOT NULL AND brazing_count IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_bending_machine 
  ON productions(machine_number, due_date, bending_count) 
  WHERE machine_number IS NOT NULL AND bending_count IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_quantity_line_code 
  ON productions(line_code, due_date, order_quantity) 
  WHERE line_code IS NOT NULL AND order_quantity IS NOT NULL;

-- ============================================================================
-- SECTION 4: PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_productions_active_orders 
  ON productions(due_date, customer_name, order_quantity) 
  WHERE due_date >= CURRENT_DATE - INTERVAL '1 year' 
    AND order_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_productions_recent_data 
  ON productions(created_at, due_date) 
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';

-- ============================================================================
-- SECTION 5: UPDATE STATISTICS
-- ============================================================================

ANALYZE productions;

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'productions' 
  AND indexname LIKE 'idx_productions_%'
ORDER BY indexname;

-- ============================================================================
-- OPTIONAL: DATA INTEGRITY CONSTRAINTS (Run only if needed)
-- ============================================================================

-- Uncomment and run these one by one if you want to add constraints:

-- ALTER TABLE productions 
-- ADD CONSTRAINT check_positive_quantities 
-- CHECK (order_quantity IS NULL OR order_quantity > 0);

-- ALTER TABLE productions 
-- ADD CONSTRAINT check_positive_bending 
-- CHECK (bending_count IS NULL OR bending_count >= 0);

-- ALTER TABLE productions 
-- ADD CONSTRAINT check_positive_brazing 
-- CHECK (brazing_count IS NULL OR brazing_count >= 0);

-- ALTER TABLE productions 
-- ADD CONSTRAINT check_positive_plating_capacity 
-- CHECK (plating_capacity IS NULL OR plating_capacity >= 0);

-- ============================================================================
-- OPTIONAL: MATERIALIZED VIEW (Run only if you have sufficient data)
-- ============================================================================

-- Uncomment and run this if you want the materialized view:

-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_production_summary AS
-- SELECT 
--   due_date,
--   customer_name,
--   line_code,
--   machine_number,
--   subcontractor,
--   SUM(order_quantity) as total_quantity,
--   SUM(order_quantity * bending_count) as total_bending_workload,
--   SUM(order_quantity * brazing_count) as total_brazing_workload,
--   COUNT(*) as record_count,
--   COUNT(DISTINCT part_number) as unique_parts,
--   AVG(order_quantity) as avg_quantity
-- FROM productions 
-- WHERE due_date IS NOT NULL 
--   AND due_date >= CURRENT_DATE - INTERVAL '2 years'
-- GROUP BY due_date, customer_name, line_code, machine_number, subcontractor;

-- CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_date 
--   ON mv_daily_production_summary(due_date);

-- CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_customer 
--   ON mv_daily_production_summary(customer_name, due_date);

-- CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_line_code 
--   ON mv_daily_production_summary(line_code, due_date);

-- REFRESH MATERIALIZED VIEW mv_daily_production_summary;