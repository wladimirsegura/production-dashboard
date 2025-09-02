# Migration Fix - Index Creation Issue

## Problem
When running the migration in Supabase SQL Editor, you may encounter:
```
ERROR: 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

## Solution
The migration has been updated to remove `CONCURRENTLY` from the index creation. The fixed migration now uses:

```sql
-- Fixed version (no CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_productions_order_number_btree 
ON productions USING btree (production_order_number);
```

## Alternative Approach for Large Tables

If you have a large existing `productions` table and want to create the index without blocking operations, run this separately **after** the main migration:

```sql
-- Run this separately in SQL Editor (not in migration)
CREATE INDEX CONCURRENTLY idx_productions_order_number_btree 
ON productions USING btree (production_order_number);
```

## Migration Steps

1. **Run the updated migration** (without CONCURRENTLY):
   ```bash
   supabase db push
   ```

2. **For large tables only** - Replace the index with concurrent version:
   ```sql
   -- Drop the regular index
   DROP INDEX IF EXISTS idx_productions_order_number_btree;
   
   -- Create concurrent index (run separately)
   CREATE INDEX CONCURRENTLY idx_productions_order_number_btree 
   ON productions USING btree (production_order_number);
   ```

## Verification

Check that the migration was successful:

```sql
-- Verify unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'productions' 
AND constraint_name = 'unique_production_order_number';

-- Verify index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'productions' 
AND indexname = 'idx_productions_order_number_btree';

-- Verify updated_at column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'productions' 
AND column_name = 'updated_at';

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'csv-uploads';
```

## Expected Results

All queries should return results confirming:
- ✅ Unique constraint on `production_order_number`
- ✅ Index on `production_order_number` 
- ✅ `updated_at` column with timestamp type
- ✅ `csv-uploads` storage bucket exists

The migration is now ready for the bulk processing system to work correctly.