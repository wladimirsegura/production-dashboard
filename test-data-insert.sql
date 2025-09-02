-- Test Data Insertion Script
-- Run this in Supabase SQL Editor to add sample data for testing
-- This will help verify that the application works correctly

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================

-- Insert sample production data with various scenarios
INSERT INTO productions (
  arrangement_method,
  inspection_type,
  customer_name,
  part_number,
  production_order_number,
  line_code,
  work_area,
  operator_main,
  operator_plating,
  plating_type,
  plating_jig,
  issue_date,
  plating_payout_date,
  due_date,
  order_quantity,
  oohito_shipment_date,
  plating_process,
  tamagawa_receipt_date,
  operator_5x,
  shelf_number,
  plating_capacity,
  bending_count,
  brazing_count,
  machine_number,
  brazing_jig,
  subcontractor
) VALUES 
-- Sample data for customer 5110 with F line codes (quantity mode)
('0', '1', '5110', 'ME012386-B-S1', 'MY25806000349', 'F64217', '21011', '7769', '6310', 'Chrome', 'JIG001', '2025-08-30', '2025-09-01', '2025-09-02', 120, NULL, 'Process1', NULL, '6246', 'LS10', 120, 4, 4, 'NC-1', 'JIG-A', 'Subcontractor-A'),
('0', '1', '5110', 'ME012387-C-S2', 'MY25806000350', 'F64218', '21012', '7770', '6311', 'Nickel', 'JIG002', '2025-08-30', '2025-09-01', '2025-09-03', 80, NULL, 'Process2', NULL, '6247', 'LS11', 80, 3, 2, 'NC-2', 'JIG-B', 'Subcontractor-B'),

-- Sample data for customer 4117 with D line codes (bending mode)
('0', '1', '4117', 'ME012388-D-S3', 'MY25806000351', 'D64219', '21013', '7771', '6312', 'Zinc', 'JIG003', '2025-08-31', '2025-09-02', '2025-09-04', 150, NULL, 'Process3', NULL, '6248', 'LS12', 150, 6, 3, 'UNC08', 'JIG-C', 'Subcontractor-C'),
('0', '1', '4119', 'ME012389-E-S4', 'MY25806000352', 'D64220', '21014', '7772', '6313', 'Chrome', 'JIG004', '2025-08-31', '2025-09-02', '2025-09-05', 200, NULL, 'Process4', NULL, '6249', 'LS13', 200, 8, 5, 'UNC10', 'JIG-D', 'Subcontractor-D'),

-- Sample data for customer 4106 (brazing mode with subcontractors)
('0', '1', '4106', 'ME012390-F-S5', 'MY25806000353', 'F64221', '21015', '7773', '6314', 'Nickel', 'JIG005', '2025-09-01', '2025-09-03', '2025-09-06', 100, NULL, 'Process5', NULL, '6250', 'LS14', 100, 2, 8, 'NC-3', 'JIG-E', 'Tokyo-Brazing-Co'),
('0', '1', '4106', 'ME012391-G-S6', 'MY25806000354', 'F64222', '21016', '7774', '6315', 'Zinc', 'JIG006', '2025-09-01', '2025-09-03', '2025-09-07', 75, NULL, 'Process6', NULL, '6251', 'LS15', 75, 1, 6, 'NC-4', 'JIG-F', 'Osaka-Brazing-Ltd'),

-- Sample data for customer 4217 with various dates
('0', '1', '4217', 'ME012392-H-S7', 'MY25806000355', 'D64223', '21017', '7775', '6316', 'Chrome', 'JIG007', '2025-09-01', '2025-09-04', '2025-09-08', 300, NULL, 'Process7', NULL, '6252', 'LS16', 300, 5, 4, 'UNC12', 'JIG-G', 'Nagoya-Works'),
('0', '1', '4217', 'ME012393-I-S8', 'MY25806000356', 'D64224', '21018', '7776', '6317', 'Nickel', 'JIG008', '2025-09-02', '2025-09-04', '2025-09-09', 180, NULL, 'Process8', NULL, '6253', 'LS17', 180, 7, 3, 'UNC14', 'JIG-H', 'Kyoto-Precision'),

-- Sample data for customer 5121 (combined group)
('0', '1', '5121', 'ME012394-J-S9', 'MY25806000357', 'F64225', '21019', '7777', '6318', 'Zinc', 'JIG009', '2025-09-02', '2025-09-05', '2025-09-10', 90, NULL, 'Process9', NULL, '6254', 'LS18', 90, 3, 7, 'NC-5', 'JIG-I', 'Hiroshima-Tech'),
('0', '1', '5123', 'ME012395-K-S10', 'MY25806000358', 'F64226', '21020', '7778', '6319', 'Chrome', 'JIG010', '2025-09-02', '2025-09-05', '2025-09-11', 110, NULL, 'Process10', NULL, '6255', 'LS19', 110, 4, 5, 'NC-6', 'JIG-J', 'Sendai-Manufacturing'),

-- Sample data for customer 4176
('0', '1', '4176', 'ME012396-L-S11', 'MY25806000359', 'D64227', '21021', '7779', '6320', 'Nickel', 'JIG011', '2025-09-03', '2025-09-06', '2025-09-12', 250, NULL, 'Process11', NULL, '6256', 'LS20', 250, 6, 2, 'UNC15', 'JIG-K', 'Fukuoka-Industries'),

-- Sample data for customer 4293
('0', '1', '4293', 'ME012397-M-S12', 'MY25806000360', 'F64228', '21022', '7780', '6321', 'Zinc', 'JIG012', '2025-09-03', '2025-09-06', '2025-09-13', 160, NULL, 'Process12', NULL, '6257', 'LS21', 160, 5, 6, 'NC-7', 'JIG-L', 'Sapporo-Metalworks'),

-- Sample data for "その他" (other customers)
('0', '1', '9999', 'ME012398-N-S13', 'MY25806000361', 'F64229', '21023', '7781', '6322', 'Chrome', 'JIG013', '2025-09-04', '2025-09-07', '2025-09-14', 70, NULL, 'Process13', NULL, '6258', 'LS22', 70, 2, 4, 'NC-8', 'JIG-M', 'Other-Contractor-1'),
('0', '1', '8888', 'ME012399-O-S14', 'MY25806000362', 'D64230', '21024', '7782', '6323', 'Nickel', 'JIG014', '2025-09-04', '2025-09-07', '2025-09-15', 130, NULL, 'Process14', NULL, '6259', 'LS23', 130, 4, 3, 'UNC16', 'JIG-N', 'Other-Contractor-2'),

-- Additional data for today and nearby dates to ensure visibility
('0', '1', '5110', 'ME012400-P-S15', 'MY25806000363', 'F64231', '21025', '7783', '6324', 'Zinc', 'JIG015', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, CURRENT_DATE, 95, NULL, 'Process15', NULL, '6260', 'LS24', 95, 3, 5, 'NC-9', 'JIG-O', 'Today-Contractor'),
('0', '1', '4117', 'ME012401-Q-S16', 'MY25806000364', 'D64232', '21026', '7784', '6325', 'Chrome', 'JIG016', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 140, NULL, 'Process16', NULL, '6261', 'LS25', 140, 7, 4, 'UNC17', 'JIG-P', 'Tomorrow-Works');

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check that data was inserted successfully
SELECT 
  'Data insertion completed' as status,
  COUNT(*) as total_records_inserted
FROM productions 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute';

-- Show sample of inserted data
SELECT 
  customer_name,
  line_code,
  due_date,
  order_quantity,
  bending_count,
  brazing_count,
  machine_number,
  subcontractor
FROM productions 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
ORDER BY due_date
LIMIT 10;

-- Show data grouped by customer (should match the expected customer groups)
SELECT 
  customer_name,
  COUNT(*) as record_count,
  SUM(order_quantity) as total_quantity
FROM productions 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
GROUP BY customer_name
ORDER BY customer_name;

-- Show data by line code prefix
SELECT 
  LEFT(line_code, 1) as line_code_prefix,
  COUNT(*) as record_count
FROM productions 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
  AND line_code IS NOT NULL
GROUP BY LEFT(line_code, 1)
ORDER BY line_code_prefix;