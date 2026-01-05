-- ============================================
-- BUSINESS VISIBILITY & ADMIN ACCOUNT CREATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. ADD VISIBILITY FIELDS TO BUSINESSES TABLE
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'selected'));

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS visible_to_users UUID[] DEFAULT '{}';

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS account_created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. CREATE INDEX FOR VISIBILITY QUERIES  
CREATE INDEX IF NOT EXISTS idx_businesses_visibility ON public.businesses(visibility);
CREATE INDEX IF NOT EXISTS idx_businesses_visible_to_users ON public.businesses USING GIN(visible_to_users);

-- 3. UPDATE RLS POLICY FOR BUSINESS VIEWING WITH VISIBILITY
DROP POLICY IF EXISTS "Users can view businesses based on visibility" ON public.businesses;
CREATE POLICY "Users can view businesses based on visibility"
    ON public.businesses FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        OR
        (status = 'approved' AND visibility = 'everyone')
        OR
        (status = 'approved' AND visibility = 'selected' AND auth.uid() = ANY(visible_to_users))
    );

-- 4. MIGRATION: SET ALL EXISTING BUSINESSES TO 'everyone'
UPDATE public.businesses 
SET visibility = 'everyone', visible_to_users = '{}'  
WHERE visibility IS NULL;

-- DONE
SELECT 'Business visibility system ready!' as message;
