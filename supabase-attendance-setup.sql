-- Create attendance_records table for camera-based check-in/check-out
CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('checkin', 'checkout')),
  photo_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own attendance records
CREATE POLICY "Users can view their own attendance records" ON attendance_records
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own attendance records
CREATE POLICY "Users can insert their own attendance records" ON attendance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own attendance records
CREATE POLICY "Users can update their own attendance records" ON attendance_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Create storage bucket for attendance photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-photos', 'attendance-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for attendance photos
CREATE POLICY "Users can upload their own attendance photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attendance-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own attendance photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attendance-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_timestamp ON attendance_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_records_action ON attendance_records(action);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_records_updated_at 
  BEFORE UPDATE ON attendance_records 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();