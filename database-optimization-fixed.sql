-- Production Dashboard Database Optimization Script (Fixed Version)
-- Execute this in Supabase SQL Editor - All syntax errors resolved
-- This version removes problematic CURRENT_DATE functions from index predicates

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
-- SECTION 4: PERFORMANCE OPTIMIZATION INDEXES (Fixed - No CURRENT_DATE)
-- ============================================================================

-- Index for active orders (without date function in predicate)
CREATE INDEX IF NOT EXISTS idx_productions_active_orders 
  ON productions(due_date, customer_name, order_quantity) 
  WHERE order_quantity > 0;

-- Index for recent data (without date function in predicate)
CREATE INDEX IF NOT EXISTS idx_productions_recent_data 
  ON productions(created_at, due_date);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_productions_due_date_only 
  ON productions(due_date) 
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_productions_created_at_only 
  ON productions(created_at) 
  WHERE created_at IS NOT NULL;

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

-- Check table size and index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename = 'productions' 
  AND attname IN ('customer_name', 'due_date', 'line_code', 'machine_number', 'subcontractor')
ORDER BY attname;

-- ============================================================================
-- SECTION 7: OPTIONAL DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Add constraints one by one (run these separately if needed)

-- Check for positive quantities
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_quantities' 
        AND table_name = 'productions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE productions 
        ADD CONSTRAINT check_positive_quantities 
        CHECK (order_quantity IS NULL OR order_quantity > 0);
        RAISE NOTICE 'Added check_positive_quantities constraint';
    ELSE
        RAISE NOTICE 'check_positive_quantities constraint already exists';
    END IF;
END $$;

-- Check for non-negative bending count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_bending' 
        AND table_name = 'productions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE productions 
        ADD CONSTRAINT check_positive_bending 
        CHECK (bending_count IS NULL OR bending_count >= 0);
        RAISE NOTICE 'Added check_positive_bending constraint';
    ELSE
        RAISE NOTICE 'check_positive_bending constraint already exists';
    END IF;
END $$;

-- Check for non-negative brazing count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_brazing' 
        AND table_name = 'productions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE productions 
        ADD CONSTRAINT check_positive_brazing 
        CHECK (brazing_count IS NULL OR brazing_count >= 0);
        RAISE NOTICE 'Added check_positive_brazing constraint';
    ELSE
        RAISE NOTICE 'check_positive_brazing constraint already exists';
    END IF;
END $$;

-- ============================================================================
-- SECTION 8: PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to check index usage (run this after some time to verify indexes are being used)
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'productions'
-- ORDER BY idx_tup_read DESC;

-- Query to check table statistics
-- SELECT 
--   seq_scan,
--   seq_tup_read,
--   idx_scan,
--   idx_tup_fetch,
--   n_tup_ins,
--   n_tup_upd,
--   n_tup_del
-- FROM pg_stat_user_tables 
-- WHERE relname = 'productions';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Database Optimization Complete ===';
    RAISE NOTICE 'Indexes created for improved query performance';
    RAISE NOTICE 'Constraints added for data integrity';
    RAISE NOTICE 'Statistics updated for better query planning';
    RAISE NOTICE 'Run the verification queries to confirm everything is working';
END $$;