-- Production Dashboard Database Optimization Script
-- Execute this in Supabase SQL Editor to optimize database performance
-- Based on IMPROVEMENT_RECOMMENDATIONS.md

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Add composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_productions_customer_due_date 
  ON productions(customer_name, due_date) 
  WHERE customer_name IS NOT NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_line_code_due_date 
  ON productions(line_code, due_date) 
  WHERE line_code IS NOT NULL AND due_date IS NOT NULL;

-- ============================================================================
-- INDEXES FOR NEW FILTER FIELDS
-- ============================================================================

-- Add indexes for subcontractor filtering (brazing mode)
CREATE INDEX IF NOT EXISTS idx_productions_subcontractor 
  ON productions(subcontractor) 
  WHERE subcontractor IS NOT NULL;

-- Add indexes for machine number filtering (bending mode)
CREATE INDEX IF NOT EXISTS idx_productions_machine_number 
  ON productions(machine_number) 
  WHERE machine_number IS NOT NULL;

-- ============================================================================
-- COMPOSITE INDEXES FOR SPECIFIC DISPLAY MODES
-- ============================================================================

-- Composite index for brazing data with subcontractor
CREATE INDEX IF NOT EXISTS idx_productions_brazing_subcontractor 
  ON productions(subcontractor, due_date, brazing_count) 
  WHERE subcontractor IS NOT NULL AND brazing_count IS NOT NULL;

-- Composite index for bending data with machine number
CREATE INDEX IF NOT EXISTS idx_productions_bending_machine 
  ON productions(machine_number, due_date, bending_count) 
  WHERE machine_number IS NOT NULL AND bending_count IS NOT NULL;

-- Composite index for quantity mode with line code
CREATE INDEX IF NOT EXISTS idx_productions_quantity_line_code 
  ON productions(line_code, due_date, order_quantity) 
  WHERE line_code IS NOT NULL AND order_quantity IS NOT NULL;

-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Add constraints for data integrity (PostgreSQL doesn't support IF NOT EXISTS for constraints)
-- Check if constraint exists before adding
DO $$
BEGIN
    -- Add check_positive_quantities constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_positive_quantities'
        AND table_name = 'productions'
    ) THEN
        ALTER TABLE productions
        ADD CONSTRAINT check_positive_quantities
        CHECK (order_quantity IS NULL OR order_quantity > 0);
    END IF;

    -- Add check_positive_bending constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_positive_bending'
        AND table_name = 'productions'
    ) THEN
        ALTER TABLE productions
        ADD CONSTRAINT check_positive_bending
        CHECK (bending_count IS NULL OR bending_count >= 0);
    END IF;

    -- Add check_positive_brazing constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_positive_brazing'
        AND table_name = 'productions'
    ) THEN
        ALTER TABLE productions
        ADD CONSTRAINT check_positive_brazing
        CHECK (brazing_count IS NULL OR brazing_count >= 0);
    END IF;

    -- Add check_positive_plating_capacity constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_positive_plating_capacity'
        AND table_name = 'productions'
    ) THEN
        ALTER TABLE productions
        ADD CONSTRAINT check_positive_plating_capacity
        CHECK (plating_capacity IS NULL OR plating_capacity >= 0);
    END IF;
END $$;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Add partial indexes for performance (active orders only)
CREATE INDEX IF NOT EXISTS idx_productions_active_orders 
  ON productions(due_date, customer_name, order_quantity) 
  WHERE due_date >= CURRENT_DATE - INTERVAL '1 year' 
    AND order_quantity > 0;

-- Index for recent data queries
CREATE INDEX IF NOT EXISTS idx_productions_recent_data 
  ON productions(created_at, due_date) 
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';

-- ============================================================================
-- MATERIALIZED VIEW FOR COMMON AGGREGATIONS
-- ============================================================================

-- Create materialized view for common aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_production_summary AS
SELECT 
  due_date,
  customer_name,
  line_code,
  machine_number,
  subcontractor,
  SUM(order_quantity) as total_quantity,
  SUM(order_quantity * bending_count) as total_bending_workload,
  SUM(order_quantity * brazing_count) as total_brazing_workload,
  COUNT(*) as record_count,
  COUNT(DISTINCT part_number) as unique_parts,
  AVG(order_quantity) as avg_quantity
FROM productions 
WHERE due_date IS NOT NULL 
  AND due_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY due_date, customer_name, line_code, machine_number, subcontractor;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_date 
  ON mv_daily_production_summary(due_date);

CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_customer 
  ON mv_daily_production_summary(customer_name, due_date);

CREATE INDEX IF NOT EXISTS idx_mv_daily_summary_line_code 
  ON mv_daily_production_summary(line_code, due_date);

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE productions;

-- ============================================================================
-- REFRESH MATERIALIZED VIEW
-- ============================================================================

-- Refresh materialized view (run this periodically or set up as a scheduled job)
REFRESH MATERIALIZED VIEW mv_daily_production_summary;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'productions' 
ORDER BY indexname;

-- Check table constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'productions'::regclass;

-- Check materialized view
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews 
WHERE matviewname = 'mv_daily_production_summary';

-- ============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ============================================================================

/*
MAINTENANCE SCHEDULE:

1. DAILY:
   - No specific maintenance required (indexes auto-update)

2. WEEKLY:
   REFRESH MATERIALIZED VIEW mv_daily_production_summary;

3. MONTHLY:
   ANALYZE productions;
   
4. QUARTERLY:
   - Review query performance
   - Check for unused indexes
   - Consider partitioning if data grows large

5. PERFORMANCE MONITORING:
   - Monitor slow queries in Supabase dashboard
   - Check index usage statistics
   - Monitor materialized view refresh time
*/