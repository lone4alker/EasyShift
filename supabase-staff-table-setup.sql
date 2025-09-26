-- Staff Management Table Setup for Supabase
-- This script creates the staff table with proper relationships to the businesses table

-- First, create the staff table
CREATE TABLE IF NOT EXISTS staff (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    owner_id UUID NOT NULL, -- References auth.users
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    max_hours INTEGER DEFAULT 8,
    availability JSONB DEFAULT '[]'::jsonb, -- Store availability as JSON array
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_staff_business 
        FOREIGN KEY (business_id) 
        REFERENCES businesses(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_staff_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate emails per business
    CONSTRAINT unique_staff_email_per_business 
        UNIQUE (business_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_business_id ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_owner_id ON staff(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- Create updated_at trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access staff from their own businesses
CREATE POLICY "Users can manage staff from their own businesses" ON staff
    FOR ALL USING (
        owner_id = auth.uid() OR 
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid() OR id IN (
                SELECT business_id FROM business_users 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Authenticated users can insert staff for businesses they own
CREATE POLICY "Users can insert staff for owned businesses" ON staff
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND 
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff TO service_role;

-- Optional: Create a view for easier staff management queries
CREATE OR REPLACE VIEW staff_with_business AS
SELECT 
    s.*,
    b.business_name,
    b.business_type,
    u.email AS owner_email
FROM staff s
JOIN businesses b ON s.business_id = b.id
LEFT JOIN auth.users u ON s.owner_id = u.id;

GRANT SELECT ON staff_with_business TO authenticated;

-- Sample data structure for availability field:
-- [
--   {"day": "Monday", "start": "09:00", "end": "17:00"},
--   {"day": "Tuesday", "start": "09:00", "end": "17:00"},
--   {"day": "Wednesday", "start": "09:00", "end": "17:00"}
-- ]

-- Example query to insert a staff member:
/*
INSERT INTO staff (business_id, owner_id, full_name, role, email, phone, hourly_rate, max_hours, availability)
VALUES (
    1, -- business_id from businesses table
    'auth-user-uuid-here', -- owner_id from auth.users
    'John Doe',
    'Barista',
    'john.doe@example.com',
    '(555) 123-4567',
    15.50,
    8,
    '[
        {"day": "Monday", "start": "09:00", "end": "17:00"},
        {"day": "Tuesday", "start": "09:00", "end": "17:00"},
        {"day": "Wednesday", "start": "09:00", "end": "17:00"},
        {"day": "Thursday", "start": "09:00", "end": "17:00"},
        {"day": "Friday", "start": "09:00", "end": "17:00"}
    ]'::jsonb
);
*/