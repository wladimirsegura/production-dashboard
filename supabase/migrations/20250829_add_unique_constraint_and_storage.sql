-- Add unique constraint on production_order_number for UPSERT operations
ALTER TABLE productions 
ADD CONSTRAINT unique_production_order_number 
UNIQUE (production_order_number);

-- Add updated_at column for tracking changes
ALTER TABLE productions 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_productions_updated_at 
    BEFORE UPDATE ON productions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Optimize indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_productions_order_number_btree
ON productions USING btree (production_order_number);

-- Create storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-uploads', 'csv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for CSV uploads bucket
CREATE POLICY "Allow authenticated users to upload CSV files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to read CSV files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role full access to CSV files" ON storage.objects
FOR ALL USING (
    bucket_id = 'csv-uploads' 
    AND auth.role() = 'service_role'
);