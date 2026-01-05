-- Add opening_hours column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS opening_hours TEXT;

-- Comment on column
COMMENT ON COLUMN public.businesses.opening_hours IS 'Operating hours of the business (e.g., "9:00 AM - 6:00 PM")';
