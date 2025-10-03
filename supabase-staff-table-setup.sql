-- Staff Management Table Setup for Supabase
-- This script creates the staff_members table with proper relationships to the businesses table

-- First, create the staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    user_id UUID NOT NULL, -- References auth.users
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL,
    phone_number TEXT,
    hourly_rate NUMERIC DEFAULT 0,
    max_hours_per_week INTEGER DEFAULT 8,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    skills TEXT[],
    preferred_shifts TEXT[],
    unavailable_days TEXT[],
    unavailable_dates DATE[],
    experience_level TEXT,
    certifications TEXT[],
    location_preference TEXT[],
    
    -- Foreign key constraints
    CONSTRAINT fk_staff_members_business 
        FOREIGN KEY (business_id) 
        REFERENCES businesses(business_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_staff_members_user 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate emails per business
    CONSTRAINT unique_staff_email_per_business 
        UNIQUE (business_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_members_business_id ON staff_members(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON staff_members(email);
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(is_active);

-- Create updated_at trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_staff_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_members_updated_at
    BEFORE UPDATE ON staff_members
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_members_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access staff from their own businesses
CREATE POLICY "Users can manage staff from their own businesses" ON staff_members
    FOR ALL USING (
        user_id = auth.uid() OR 
        business_id IN (
            SELECT business_id FROM businesses 
            WHERE owner_email = auth.jwt() ->> 'email' OR business_id IN (
                SELECT business_id FROM business_users 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Authenticated users can insert staff for businesses they own
CREATE POLICY "Users can insert staff for owned businesses" ON staff_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        business_id IN (
            SELECT business_id FROM businesses 
            WHERE owner_email = auth.jwt() ->> 'email'
        )
    );

-- Grant necessary permissions
GRANT ALL ON staff_members TO authenticated;
GRANT ALL ON staff_members TO service_role;

-- Optional: Create a view for easier staff management queries
CREATE OR REPLACE VIEW staff_members_with_business AS
SELECT 
    s.*,
    b.shop_name,
    b.business_type,
    b.owner_email
FROM staff_members s
JOIN businesses b ON s.business_id = b.business_id
LEFT JOIN auth.users u ON s.user_id = u.id;

GRANT SELECT ON staff_members_with_business TO authenticated;

-- Sample data structure for availability field:
-- [
--   {"day": "Monday", "start": "09:00", "end": "17:00"},
--   {"day": "Tuesday", "start": "09:00", "end": "17:00"},
--   {"day": "Wednesday", "start": "09:00", "end": "17:00"}
-- ]

-- Example query to insert a staff member:
/*
INSERT INTO staff_members (business_id, user_id, first_name, last_name, email, phone_number, hourly_rate, max_hours_per_week, role, skills, preferred_shifts, unavailable_days, experience_level, certifications, location_preference)
VALUES (
    'business-uuid-here', -- business_id from businesses table
    'auth-user-uuid-here', -- user_id from auth.users
    'John',
    'Doe',
    'john.doe@example.com',
    '(555) 123-4567',
    15.50,
    8,
    'Barista',
    ARRAY['Coffee Making', 'Customer Service'],
    ARRAY['Morning', 'Weekend'],
    ARRAY['Monday', 'Wednesday'],
    'Mid-Level',
    ARRAY['Food Handler Permit'],
    ARRAY['Downtown', 'North Side']
);
*/