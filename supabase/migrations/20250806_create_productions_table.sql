-- Create productions table for storing CSV data
CREATE TABLE productions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    arrangement_method TEXT,
    inspection_type TEXT,
    customer_name TEXT,
    part_number TEXT,
    production_order_number TEXT,
    line_code TEXT,
    work_area TEXT,
    operator_main TEXT,
    operator_plating TEXT,
    plating_type TEXT,
    plating_jig TEXT,
    issue_date DATE,
    plating_payout_date DATE,
    due_date DATE,
    order_quantity INTEGER,
    oohito_shipment_date DATE,
    plating_process TEXT,
    tamagawa_receipt_date DATE,
    operator_5x TEXT,
    shelf_number TEXT,
    plating_capacity INTEGER,
    bending_count INTEGER,
    brazing_count INTEGER,
    machine_number TEXT,
    brazing_jig TEXT,
    subcontractor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_productions_customer_name ON productions(customer_name);
CREATE INDEX idx_productions_due_date ON productions(due_date);
CREATE INDEX idx_productions_part_number ON productions(part_number);
CREATE INDEX idx_productions_created_at ON productions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON productions
    FOR ALL USING (auth.role() = 'authenticated');