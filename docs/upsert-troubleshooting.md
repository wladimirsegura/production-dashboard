# UPSERT Troubleshooting Guide

## Common Issues and Solutions

### 1. Duplicate Key Error (23505)
**Error**: `duplicate key value violates unique constraint "unique_production_order_number"`

**Cause**: Using `insert()` instead of `upsert()` when records already exist.

**Solution**: Always use `upsert()` for data that might already exist:

```typescript
// ❌ Wrong - will fail if record exists
const { data, error } = await supabase
  .from('productions')
  .insert(data)

// ✅ Correct - handles both insert and update
const { data, error } = await supabase
  .from('productions')
  .upsert(data, { 
    onConflict: 'production_order_number',
    count: 'exact'
  })
```

### 2. Missing Unique Constraint
**Error**: UPSERT operations not working as expected

**Cause**: The unique constraint on `production_order_number` hasn't been applied.

**Solution**: Run the migration to add the constraint:

```sql
-- Check if constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'productions' 
AND constraint_name = 'unique_production_order_number';

-- If missing, add it
ALTER TABLE productions 
ADD CONSTRAINT unique_production_order_number 
UNIQUE (production_order_number);
```

### 3. NULL production_order_number
**Error**: UPSERT fails with NULL key values

**Cause**: Some records have NULL `production_order_number` values.

**Solution**: Clean up NULL values before UPSERT:

```sql
-- Find NULL values
SELECT COUNT(*) FROM productions WHERE production_order_number IS NULL;

-- Option 1: Delete NULL records
DELETE FROM productions WHERE production_order_number IS NULL;

-- Option 2: Generate unique values for NULL records
UPDATE productions 
SET production_order_number = 'GENERATED-' || id::text 
WHERE production_order_number IS NULL;
```

### 4. Edge Function UPSERT Issues
**Error**: Edge Function fails to process UPSERT

**Cause**: Incorrect UPSERT syntax in Edge Function.

**Solution**: Ensure proper UPSERT configuration:

```typescript
// In Edge Function
const { data, error } = await supabase
  .from('productions')
  .upsert(batch, { 
    onConflict: 'production_order_number',
    count: 'exact'
  })
```

### 5. Performance Issues with Large UPSERT
**Error**: UPSERT operations timing out

**Cause**: Trying to UPSERT too many records at once.

**Solution**: Use appropriate batch sizes:

```typescript
// Recommended batch sizes
const BATCH_SIZE = 1000 // For most cases
const LARGE_BATCH_SIZE = 500 // For complex records
const SMALL_BATCH_SIZE = 2000 // For simple records

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE)
  await supabase.from('productions').upsert(batch, { 
    onConflict: 'production_order_number' 
  })
}
```

## Testing UPSERT Operations

### Test Script
```typescript
// Test UPSERT functionality
const testData = [
  {
    production_order_number: 'TEST-001',
    customer_name: 'Test Customer',
    order_quantity: 100
    // ... other fields
  }
]

// First UPSERT (should INSERT)
const { data: insertResult, error: insertError } = await supabase
  .from('productions')
  .upsert(testData, { onConflict: 'production_order_number' })
  .select()

console.log('Insert result:', insertResult)

// Modify data
testData[0].order_quantity = 200

// Second UPSERT (should UPDATE)
const { data: updateResult, error: updateError } = await supabase
  .from('productions')
  .upsert(testData, { onConflict: 'production_order_number' })
  .select()

console.log('Update result:', updateResult)
```

### Verification Queries
```sql
-- Check if UPSERT worked correctly
SELECT 
  production_order_number,
  order_quantity,
  created_at,
  updated_at,
  CASE 
    WHEN created_at = updated_at THEN 'INSERTED'
    ELSE 'UPDATED'
  END as operation_type
FROM productions 
WHERE production_order_number = 'TEST-001';
```

## Best Practices

### 1. Always Use UPSERT for Data Imports
```typescript
// For CSV imports, always use UPSERT
const { data, error } = await supabase
  .from('productions')
  .upsert(csvData, { 
    onConflict: 'production_order_number',
    count: 'exact' // Get count of affected rows
  })
```

### 2. Handle UPSERT Errors Gracefully
```typescript
const { data, error } = await supabase
  .from('productions')
  .upsert(batch, { onConflict: 'production_order_number' })

if (error) {
  console.error('UPSERT failed:', error)
  
  // Check if it's a constraint violation
  if (error.code === '23505') {
    console.log('Duplicate key - this should not happen with UPSERT')
  }
  
  // Check if it's a missing constraint
  if (error.message.includes('constraint')) {
    console.log('Check if unique constraint exists on production_order_number')
  }
}
```

### 3. Monitor UPSERT Performance
```typescript
const startTime = Date.now()

const { data, error } = await supabase
  .from('productions')
  .upsert(batch, { onConflict: 'production_order_number' })

const endTime = Date.now()
console.log(`UPSERT completed in ${endTime - startTime}ms for ${batch.length} records`)
```

## Quick Fixes

### Fix Test Upload API
If you're getting duplicate key errors in test APIs:

```typescript
// Change from insert() to upsert()
const { data, error } = await supabaseAdmin
  .from('productions')
  .upsert(testData, { 
    onConflict: 'production_order_number',
    count: 'exact'
  })
  .select()
```

### Fix Bulk Upload API
Ensure bulk upload uses UPSERT:

```typescript
// In Edge Function or API
const { data, error } = await supabase
  .from('productions')
  .upsert(productionData, { 
    onConflict: 'production_order_number',
    count: 'exact'
  })
```

This ensures all database operations handle both new and existing records correctly.