-- SQL script to delete all records from the productions table
-- This will clean up the 8145 records with NULL data

-- Option 1: Delete all records (recommended for cleanup)
DELETE FROM productions;

-- Option 2: Reset the table completely (alternative approach)
-- TRUNCATE TABLE productions;

-- Option 3: Delete only records where all important fields are NULL (safer approach)
-- DELETE FROM productions 
-- WHERE customer_name IS NULL 
--   AND due_date IS NULL 
--   AND part_number IS NULL 
--   AND production_order_number IS NULL;

-- Verify the cleanup
SELECT COUNT(*) as remaining_records FROM productions;

-- Optional: Reset the auto-increment counter if using TRUNCATE
-- This is not needed for UUID primary keys, but included for reference
-- ALTER SEQUENCE productions_id_seq RESTART WITH 1;