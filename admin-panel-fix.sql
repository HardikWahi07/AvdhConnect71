-- ============================================
-- FIX FOR ADMIN PANEL ERRORS
-- ============================================
-- Run this script if you're getting 404 or 400 errors in admin panel

-- 1. First, ensure the admin_logs table exists
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity_type ON public.admin_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- 4. Add RLS policies for admin_logs
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs"
    ON public.admin_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
CREATE POLICY "Admins can insert logs"
    ON public.admin_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Verify foreign key on businesses.category_id exists
-- If it doesn't exist, this will create it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'businesses_category_id_fkey'
    ) THEN
        ALTER TABLE public.businesses 
        ADD CONSTRAINT businesses_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES public.categories(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Verify foreign key on businesses.owner_id exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'businesses_owner_id_fkey'
    ) THEN
        ALTER TABLE public.businesses 
        ADD CONSTRAINT businesses_owner_id_fkey 
        FOREIGN KEY (owner_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Grant necessary permissions (if needed)
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT INSERT ON public.admin_logs TO authenticated;

-- Done!
SELECT 'Admin panel errors should be fixed now!' as message;
