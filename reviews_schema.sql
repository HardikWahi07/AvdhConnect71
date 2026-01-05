-- ============================================
-- PRODUCT REVIEW SYSTEM
-- ============================================

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one review per user per product
    UNIQUE(product_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews(rating);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating timestamp
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can view reviews"
    ON public.product_reviews FOR SELECT
    USING (true);

-- Users can insert reviews (verification happens in app logic)
CREATE POLICY "Authenticated users can insert reviews"
    ON public.product_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
    ON public.product_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
    ON public.product_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Add average_rating column to products table (for caching)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET 
        average_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
            FROM public.product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM public.product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update product rating on review changes
DROP TRIGGER IF EXISTS update_rating_on_insert ON public.product_reviews;
CREATE TRIGGER update_rating_on_insert
    AFTER INSERT ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

DROP TRIGGER IF EXISTS update_rating_on_update ON public.product_reviews;
CREATE TRIGGER update_rating_on_update
    AFTER UPDATE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

DROP TRIGGER IF EXISTS update_rating_on_delete ON public.product_reviews;
CREATE TRIGGER update_rating_on_delete
    AFTER DELETE ON public.product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();
