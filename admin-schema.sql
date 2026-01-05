-- ============================================
-- ADMIN FEATURE ENHANCEMENT - DATABASE SCHEMA
-- ============================================
-- Run this script to add admin-specific tables and policies

-- ============================================
-- 1. UPDATE USERS TABLE FOR ADMIN ROLE
-- ============================================

-- Update users table role constraint to allow 'admin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- ============================================
-- 2. CREATE ADMIN ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'user', 'business', 'category', 'settings'
    entity_id UUID,
    details JSONB, -- Store additional context
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_type ON public.admin_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs"
    ON public.admin_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert logs (system will use service role)
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
CREATE POLICY "Admins can insert logs"
    ON public.admin_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 3. CREATE ADMIN SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
CREATE POLICY "Admins can view settings"
    ON public.admin_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
CREATE POLICY "Admins can update settings"
    ON public.admin_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert settings
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
CREATE POLICY "Admins can insert settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update trigger for admin_settings
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ENHANCED RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Allow admins to view ALL users (not just their own profile)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        true -- Already covered by existing policy, just explicit
    );

-- Allow admins to update any user (for role changes, suspensions)
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
    ON public.users FOR UPDATE
    USING (
        auth.uid() = id OR -- Own profile
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to delete users
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
    ON public.users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to view pending businesses
DROP POLICY IF EXISTS "Admins can view all businesses" ON public.businesses;
CREATE POLICY "Admins can view all businesses"
    ON public.businesses FOR SELECT
    USING (
        status = 'approved' OR 
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any business (for approval/rejection)
DROP POLICY IF EXISTS "Admins can update any business" ON public.businesses;
CREATE POLICY "Admins can update any business"
    ON public.businesses FOR UPDATE
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete any business
DROP POLICY IF EXISTS "Admins can delete any business" ON public.businesses;
CREATE POLICY "Admins can delete any business"
    ON public.businesses FOR DELETE
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 5. CATEGORY MANAGEMENT POLICIES
-- ============================================

-- Admins can insert categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
    ON public.categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update categories
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
    ON public.categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 6. INSERT DEFAULT ADMIN SETTINGS
-- ============================================

INSERT INTO public.admin_settings (key, value, description)
VALUES 
    ('auto_approve_threshold', '{"enabled": false, "min_rating": 4.5}'::jsonb, 'Automatically approve businesses meeting criteria'),
    ('email_notifications', '{"enabled": true, "on_new_business": true, "on_new_user": false}'::jsonb, 'Email notification preferences'),
    ('maintenance_mode', '{"enabled": false}'::jsonb, 'Site maintenance mode toggle'),
    ('feature_flags', '{"chat_enabled": true, "orders_enabled": true, "reviews_enabled": true}'::jsonb, 'Feature toggle flags')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
