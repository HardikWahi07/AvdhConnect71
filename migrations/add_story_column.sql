-- Add 'story' column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS story TEXT;

-- Update RLS policy to allow updating story (already covered by existing update policy, but good to double check implicit permissions)
-- "Business owners can update own businesses" covers all columns usually.
