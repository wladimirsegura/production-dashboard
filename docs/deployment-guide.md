# Deployment Guide - Bulk Processing System

## Prerequisites

Before deploying the new bulk processing system, ensure you have:

- Supabase CLI installed and configured
- Access to your Supabase project
- Database migration permissions
- Edge Functions deployment access

## Deployment Steps

### 1. Database Migration

Apply the database schema changes:

```bash
# Navigate to your project root
cd d:/www/production-dashboard

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up --include-all
```

**Migration includes:**
- Unique constraint on `production_order_number`
- `updated_at` column with trigger
- Storage bucket creation
- RLS policies for CSV uploads
- Performance indexes

### 2. Deploy Edge Function

Deploy the bulk processing Edge Function:

```bash
# Deploy the Edge Function
supabase functions deploy bulk-upsert-productions

# Verify deployment
supabase functions list
```

**Expected output:**
```
┌─────────────────────────┬─────────────┬────────────────┬─────────────────────┐
│ NAME                    │ SLUG        │ VERSION        │ CREATED_AT          │
├─────────────────────────┼─────────────┼────────────────┼─────────────────────┤
│ bulk-upsert-productions │ ...         │ v1             │ 2025-08-29T02:36:00 │
└─────────────────────────┴─────────────┴────────────────┴─────────────────────┘
```

### 3. Environment Variables

Ensure these environment variables are set:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Verify Storage Bucket

Check that the storage bucket was created:

```bash
# List storage buckets
supabase storage ls

# Should show 'csv-uploads' bucket
```

### 5. Test Database Connection

Verify the database changes:

```sql
-- Check unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'productions' 
AND constraint_name = 'unique_production_order_number';

-- Check updated_at column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'productions' 
AND column_name = 'updated_at';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'csv-uploads';
```

## Testing Guide

### 1. Unit Testing

Test individual components:

#### Test Storage Manager
```typescript
// Test file: src/lib/__tests__/storage-manager.test.ts
import { uploadCSVToStorage, triggerBulkProcessing } from '../storage-manager'

describe('Storage Manager', () => {
  test('should upload CSV to storage', async () => {
    const mockFile = new File(['test,data\n1,2'], 'test.csv', { type: 'text/csv' })
    const result = await uploadCSVToStorage(mockFile, 'test,data\n1,2')
    expect(result.success).toBe(true)
  })
})
```

#### Test API Endpoint
```bash
# Test with curl
curl -X POST http://localhost:3000/api/upload-csv-bulk \
  -F "file=@test-data.csv" \
  -H "Content-Type: multipart/form-data"
```

### 2. Integration Testing

#### Small Dataset Test
Create a small test CSV file:

```csv
arrangement_method,inspection_type,customer_name,part_number,production_order_number,line_code,work_area,operator_main,operator_plating,plating_type,plating_jig,issue_date,plating_payout_date,due_date,order_quantity,oohito_shipment_date,plating_process,tamagawa_receipt_date,operator_5x,shelf_number,plating_capacity,bending_count,brazing_count,machine_number,brazing_jig,subcontractor
1,2,TEST,PART001,ORDER001,A,AREA1,OP1,OP2,TYPE1,JIG1,20250829,20250830,20250831,100,,PROC1,,OP3,SHELF1,100,5,3,MACH1,JIGA,SUB1
1,2,TEST,PART002,ORDER002,B,AREA2,OP4,OP5,TYPE2,JIG2,20250829,20250830,20250831,200,,PROC2,,OP6,SHELF2,200,10,6,MACH2,JIGB,SUB2
```

#### Test UPSERT Functionality
1. **First Upload**: Upload the test CSV
2. **Verify Insert**: Check that records were inserted
3. **Modify Data**: Change some values in the CSV
4. **Second Upload**: Upload the modified CSV
5. **Verify Update**: Check that existing records were updated

```sql
-- Check initial insert
SELECT COUNT(*) FROM productions WHERE production_order_number IN ('ORDER001', 'ORDER002');

-- Check update after second upload
SELECT production_order_number, order_quantity, updated_at 
FROM productions 
WHERE production_order_number IN ('ORDER001', 'ORDER002')
ORDER BY updated_at DESC;
```

### 3. Performance Testing

#### Large Dataset Test
Test with a larger dataset (1,000-10,000 records):

```bash
# Generate test data
node scripts/generate-test-csv.js --records 10000 --output large-test.csv

# Upload and measure time
time curl -X POST http://localhost:3000/api/upload-csv-bulk \
  -F "file=@large-test.csv"
```

#### Benchmark Comparison
Compare old vs new system:

```bash
# Old system (for comparison)
time curl -X POST http://localhost:3000/api/upload-csv \
  -F "file=@test-1000-records.csv"

# New system
time curl -X POST http://localhost:3000/api/upload-csv-bulk \
  -F "file=@test-1000-records.csv"
```

### 4. Error Testing

#### Test Error Scenarios
1. **Invalid File Format**: Upload non-CSV file
2. **Malformed CSV**: Upload CSV with missing columns
3. **Large File**: Upload file exceeding limits
4. **Duplicate Keys**: Test UPSERT with existing records
5. **Network Issues**: Simulate connection failures

```bash
# Test invalid file
curl -X POST http://localhost:3000/api/upload-csv-bulk \
  -F "file=@test.txt"

# Test malformed CSV
echo "invalid,csv,data" > malformed.csv
curl -X POST http://localhost:3000/api/upload-csv-bulk \
  -F "file=@malformed.csv"
```

## Monitoring and Debugging

### 1. Edge Function Logs

Monitor Edge Function execution:

```bash
# View function logs
supabase functions logs bulk-upsert-productions

# Follow logs in real-time
supabase functions logs bulk-upsert-productions --follow
```

### 2. Database Monitoring

Monitor database performance:

```sql
-- Check recent uploads
SELECT 
  COUNT(*) as total_records,
  MAX(created_at) as last_upload,
  MAX(updated_at) as last_update
FROM productions;

-- Check processing performance
SELECT 
  production_order_number,
  created_at,
  updated_at,
  CASE 
    WHEN created_at = updated_at THEN 'INSERT'
    ELSE 'UPDATE'
  END as operation_type
FROM productions 
ORDER BY updated_at DESC 
LIMIT 100;
```

### 3. Storage Monitoring

Monitor storage usage:

```bash
# Check storage usage
supabase storage ls csv-uploads

# Monitor storage size
supabase storage usage
```

## Rollback Plan

If issues occur, rollback steps:

### 1. Revert to Legacy System
```bash
# Temporarily disable new endpoint
# Comment out the new route in your deployment
```

### 2. Database Rollback
```sql
-- Remove unique constraint if needed
ALTER TABLE productions DROP CONSTRAINT IF EXISTS unique_production_order_number;

-- Remove updated_at column if needed
ALTER TABLE productions DROP COLUMN IF EXISTS updated_at;
```

### 3. Clean Up Storage
```bash
# Remove storage bucket if needed
supabase storage rm csv-uploads --recursive
```

## Production Checklist

Before going live:

- [ ] Database migration applied successfully
- [ ] Edge Function deployed and accessible
- [ ] Storage bucket created with proper policies
- [ ] Environment variables configured
- [ ] Small dataset test passed
- [ ] Large dataset test passed
- [ ] UPSERT functionality verified
- [ ] Error handling tested
- [ ] Performance benchmarks met
- [ ] Monitoring setup configured
- [ ] Rollback plan documented
- [ ] Team trained on new system

## Troubleshooting

### Common Issues

#### 1. Edge Function Not Found
```bash
# Redeploy function
supabase functions deploy bulk-upsert-productions --no-verify-jwt
```

#### 2. Storage Permission Denied
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Recreate policies if needed
DROP POLICY IF EXISTS "Allow authenticated users to upload CSV files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload CSV files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'csv-uploads' AND auth.role() = 'authenticated');
```

#### 3. Unique Constraint Violations
```sql
-- Check for existing duplicates
SELECT production_order_number, COUNT(*) 
FROM productions 
GROUP BY production_order_number 
HAVING COUNT(*) > 1;

-- Clean up duplicates before applying constraint
```

#### 4. Performance Issues
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM productions WHERE production_order_number = 'ORDER001';

-- Recreate indexes if needed
REINDEX INDEX idx_productions_order_number_btree;
```

## Support

For issues or questions:
1. Check Edge Function logs
2. Review database query performance
3. Verify storage bucket permissions
4. Test with smaller datasets first
5. Consult the troubleshooting section above