-- ============================================
-- ADMIN FEATURE UPDATES (SAFE TO RE-RUN)
-- ============================================

-- 1. UPDATE USERS TABLE TO ALLOW 'admin' ROLE
-- First, drop the existing check constraint on role if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new check constraint
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- 2. UPDATE RLS POLICIES FOR ADMINS

-- 3. POLICIES FOR BUSINESS APPROVAL

-- Allow admins to update businesses (to approve/reject)
DROP POLICY IF EXISTS "Admins can update any business" ON public.businesses;
CREATE POLICY "Admins can update any business"
    ON public.businesses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to delete any business
DROP POLICY IF EXISTS "Admins can delete any business" ON public.businesses;
CREATE POLICY "Admins can delete any business"
    ON public.businesses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. POLICIES FOR CATEGORY MANAGEMENT

-- Allow admins to insert categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
    ON public.categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update categories
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
    ON public.categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to delete categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
