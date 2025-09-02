/**
 * Test script for the new bulk upload system
 * Usage: node scripts/test-bulk-upload.js
 */

const fs = require('fs');
const path = require('path');

// Generate test CSV data
function generateTestCSV(recordCount = 100) {
  const headers = [
    'arrangement_method', 'inspection_type', 'customer_name', 'part_number',
    'production_order_number', 'line_code', 'work_area', 'operator_main',
    'operator_plating', 'plating_type', 'plating_jig', 'issue_date',
    'plating_payout_date', 'due_date', 'order_quantity', 'oohito_shipment_date',
    'plating_process', 'tamagawa_receipt_date', 'operator_5x', 'shelf_number',
    'plating_capacity', 'bending_count', 'brazing_count', 'machine_number',
    'brazing_jig', 'subcontractor'
  ];

  let csvContent = headers.join(',') + '\n';

  for (let i = 1; i <= recordCount; i++) {
    const row = [
      '1', // arrangement_method
      '2', // inspection_type
      `CUST${String(i).padStart(4, '0')}`, // customer_name
      `PART${String(i).padStart(6, '0')}`, // part_number
      `ORDER${String(i).padStart(8, '0')}`, // production_order_number (unique key)
      'A', // line_code
      `AREA${i % 5 + 1}`, // work_area
      `OP${String(i % 100).padStart(3, '0')}`, // operator_main
      `PL${String(i % 50).padStart(3, '0')}`, // operator_plating
      'TYPE1', // plating_type
      'JIG1', // plating_jig
      '20250829', // issue_date
      '20250830', // plating_payout_date
      '20250831', // due_date
      String(100 + (i % 500)), // order_quantity
      '', // oohito_shipment_date
      'PROC1', // plating_process
      '', // tamagawa_receipt_date
      `5X${String(i % 30).padStart(3, '0')}`, // operator_5x
      `SHELF${String(i % 20).padStart(2, '0')}`, // shelf_number
      String(100 + (i % 500)), // plating_capacity
      String(1 + (i % 10)), // bending_count
      String(1 + (i % 8)), // brazing_count
      `MACH${String(i % 15).padStart(2, '0')}`, // machine_number
      'JIGA', // brazing_jig
      `SUB${String(i % 5).padStart(2, '0')}` // subcontractor
    ];
    
    csvContent += row.join(',') + '\n';
  }

  return csvContent;
}

// Test scenarios
const testScenarios = [
  {
    name: 'Small Dataset Test',
    recordCount: 10,
    description: 'Test with 10 records to verify basic functionality'
  },
  {
    name: 'Medium Dataset Test',
    recordCount: 1000,
    description: 'Test with 1,000 records to verify batch processing'
  },
  {
    name: 'Large Dataset Test',
    recordCount: 5000,
    description: 'Test with 5,000 records to verify performance'
  }
];

// Create test files
function createTestFiles() {
  const testDir = path.join(__dirname, '..', 'test-data');
  
  // Create test-data directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  console.log('🔧 Generating test CSV files...\n');

  testScenarios.forEach(scenario => {
    const fileName = `test-${scenario.recordCount}-records.csv`;
    const filePath = path.join(testDir, fileName);
    const csvContent = generateTestCSV(scenario.recordCount);
    
    fs.writeFileSync(filePath, csvContent);
    
    console.log(`✅ Created: ${fileName}`);
    console.log(`   Records: ${scenario.recordCount}`);
    console.log(`   Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    console.log(`   Description: ${scenario.description}\n`);
  });

  // Create UPSERT test file (duplicate data with modifications)
  const upsertTestData = generateTestCSV(10);
  const modifiedData = upsertTestData.replace(/100/g, '200'); // Change quantities
  const upsertFilePath = path.join(testDir, 'test-upsert-modified.csv');
  fs.writeFileSync(upsertFilePath, modifiedData);
  
  console.log('✅ Created: test-upsert-modified.csv');
  console.log('   Records: 10 (modified for UPSERT testing)');
  console.log('   Description: Modified data to test UPSERT functionality\n');
}

// Test API endpoint
async function testAPIEndpoint(fileName, description) {
  const testDir = path.join(__dirname, '..', 'test-data');
  const filePath = path.join(testDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Test file not found: ${fileName}`);
    return;
  }

  console.log(`🧪 Testing: ${description}`);
  console.log(`📁 File: ${fileName}`);
  
  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/upload-csv-bulk', {
      method: 'POST',
      body: form
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success! Processing time: ${processingTime}ms`);
      console.log(`📊 Result: ${result.message}`);
      if (result.details) {
        console.log(`   Total Records: ${result.details.totalRecords}`);
        console.log(`   Processed: ${result.details.processed}`);
        console.log(`   Server Processing Time: ${result.details.processingTime}ms`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('─'.repeat(50));
}

// Main execution
async function main() {
  console.log('🚀 Bulk Upload System Test Suite\n');
  
  // Check if we should generate test files
  const args = process.argv.slice(2);
  const shouldGenerate = args.includes('--generate') || args.includes('-g');
  const shouldTest = args.includes('--test') || args.includes('-t');
  
  if (shouldGenerate || (!shouldTest && args.length === 0)) {
    createTestFiles();
  }
  
  if (shouldTest || (!shouldGenerate && args.length === 0)) {
    console.log('🧪 Starting API endpoint tests...\n');
    
    // Test each scenario
    for (const scenario of testScenarios) {
      const fileName = `test-${scenario.recordCount}-records.csv`;
      await testAPIEndpoint(fileName, scenario.description);
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test UPSERT functionality
    console.log('🔄 Testing UPSERT functionality...\n');
    
    // First upload
    await testAPIEndpoint('test-10-records.csv', 'Initial upload (INSERT)');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second upload with modified data
    await testAPIEndpoint('test-upsert-modified.csv', 'Modified upload (UPDATE)');
  }
  
  console.log('\n✨ Test suite completed!');
  console.log('\n📋 Manual verification steps:');
  console.log('1. Check database for inserted/updated records');
  console.log('2. Verify UPSERT functionality worked correctly');
  console.log('3. Check Edge Function logs in Supabase dashboard');
  console.log('4. Monitor storage bucket for cleanup');
}

// Handle command line usage
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateTestCSV,
  createTestFiles,
  testAPIEndpoint
};