-- ============================================
-- ADD REVIEW REPLY FEATURE
-- ============================================

-- Add reply columns to reviews table
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS owner_reply TEXT,
ADD COLUMN IF NOT EXISTS owner_reply_at TIMESTAMPTZ;

-- RLS Policy for business owners to add replies
CREATE POLICY "Business owners can update replies on their products"
    ON public.product_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            INNER JOIN public.businesses b ON p.business_id = b.id
            WHERE p.id = product_id AND b.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            INNER JOIN public.businesses b ON p.business_id = b.id
            WHERE p.id = product_id AND b.owner_id = auth.uid()
        )
    );
