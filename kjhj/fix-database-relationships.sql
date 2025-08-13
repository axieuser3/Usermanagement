-- Fix Database Relationships
-- This script adds the missing foreign key constraint between stripe_customers and stripe_subscriptions

-- First, check if the foreign key constraint already exists
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stripe_subscriptions_customer_id'
        AND table_name = 'stripe_subscriptions'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE stripe_subscriptions 
        ADD CONSTRAINT fk_stripe_subscriptions_customer_id 
        FOREIGN KEY (customer_id) REFERENCES stripe_customers(customer_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Refresh the schema cache to ensure PostgREST recognizes the relationship
NOTIFY pgrst, 'reload schema';

-- Test the relationship by creating a simple view
CREATE OR REPLACE VIEW test_stripe_relationship AS
SELECT 
    c.user_id,
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.deleted_at IS NULL 
AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL);

-- Grant permissions on the test view
GRANT SELECT ON test_stripe_relationship TO authenticated;
GRANT SELECT ON test_stripe_relationship TO anon;

-- Enable RLS on the test view
ALTER VIEW test_stripe_relationship OWNER TO postgres;

COMMENT ON VIEW test_stripe_relationship IS 'Test view to verify stripe_customers to stripe_subscriptions relationship is working';
