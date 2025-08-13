-- ============================================================================
-- ENTERPRISE USER MANAGEMENT ENHANCEMENT
-- Run this AFTER your main database setup to add enterprise features
-- ============================================================================

-- ============================================================================
-- ENHANCED USER PROFILE MANAGEMENT
-- ============================================================================

-- Central user profiles table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    phone text,
    company text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_login_at timestamptz,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Axie Studio account linking table
CREATE TABLE IF NOT EXISTS axie_studio_accounts (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    axie_studio_user_id text NOT NULL UNIQUE,
    axie_studio_email text NOT NULL,
    account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_sync_at timestamptz DEFAULT now(),
    sync_errors jsonb DEFAULT '[]'::jsonb
);

-- Enhanced stripe customers with better tracking
ALTER TABLE stripe_customers ADD COLUMN IF NOT EXISTS stripe_customer_email text;
ALTER TABLE stripe_customers ADD COLUMN IF NOT EXISTS last_sync_at timestamptz DEFAULT now();
ALTER TABLE stripe_customers ADD COLUMN IF NOT EXISTS sync_errors jsonb DEFAULT '[]'::jsonb;

-- ============================================================================
-- USER STATE MANAGEMENT ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_account_status AS ENUM (
        'trial_active',
        'trial_expired', 
        'subscription_active',
        'subscription_trialing',
        'subscription_past_due',
        'subscription_canceled',
        'account_suspended',
        'account_deleted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CENTRAL USER STATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_account_state (
    user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    account_status user_account_status NOT NULL DEFAULT 'trial_active',
    
    -- Access control
    has_access boolean DEFAULT true,
    access_level text DEFAULT 'trial' CHECK (access_level IN ('trial', 'pro', 'enterprise', 'suspended')),
    
    -- Trial information
    trial_start_date timestamptz,
    trial_end_date timestamptz,
    trial_days_remaining integer DEFAULT 0,
    
    -- Subscription information
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_status text,
    current_period_end timestamptz,
    
    -- Axie Studio information
    axie_studio_user_id text,
    axie_studio_status text DEFAULT 'active',
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_activity_at timestamptz DEFAULT now(),
    
    -- Metadata
    notes text,
    admin_flags jsonb DEFAULT '{}'::jsonb
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE axie_studio_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_state ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR ALL
    TO authenticated
    USING (id = auth.uid());

-- Policies for axie_studio_accounts
DROP POLICY IF EXISTS "Users can view own axie account" ON axie_studio_accounts;
CREATE POLICY "Users can view own axie account"
    ON axie_studio_accounts FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Policies for user_account_state
DROP POLICY IF EXISTS "Users can view own account state" ON user_account_state;
CREATE POLICY "Users can view own account state"
    ON user_account_state FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- ENTERPRISE FUNCTIONS
-- ============================================================================

-- Function to create complete user profile
CREATE OR REPLACE FUNCTION create_complete_user_profile(
    p_user_id uuid,
    p_email text,
    p_full_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create user profile
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (p_user_id, p_email, p_full_name)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = now();
    
    -- Create account state
    INSERT INTO user_account_state (
        user_id, 
        trial_start_date, 
        trial_end_date,
        trial_days_remaining
    )
    VALUES (
        p_user_id, 
        now(), 
        now() + interval '7 days',
        7
    )
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Function to link Axie Studio account
CREATE OR REPLACE FUNCTION link_axie_studio_account(
    p_user_id uuid,
    p_axie_studio_user_id text,
    p_axie_studio_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update Axie Studio account link
    INSERT INTO axie_studio_accounts (
        user_id, 
        axie_studio_user_id, 
        axie_studio_email
    )
    VALUES (p_user_id, p_axie_studio_user_id, p_axie_studio_email)
    ON CONFLICT (user_id) DO UPDATE SET
        axie_studio_user_id = EXCLUDED.axie_studio_user_id,
        axie_studio_email = EXCLUDED.axie_studio_email,
        updated_at = now(),
        last_sync_at = now();
    
    -- Update central state
    UPDATE user_account_state 
    SET 
        axie_studio_user_id = p_axie_studio_user_id,
        axie_studio_status = 'active',
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Function to link Stripe customer
CREATE OR REPLACE FUNCTION link_stripe_customer(
    p_user_id uuid,
    p_stripe_customer_id text,
    p_stripe_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update stripe_customers table
    UPDATE stripe_customers 
    SET 
        stripe_customer_email = p_stripe_email,
        last_sync_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND customer_id = p_stripe_customer_id;
    
    -- Update central state
    UPDATE user_account_state 
    SET 
        stripe_customer_id = p_stripe_customer_id,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Comprehensive user state sync function
CREATE OR REPLACE FUNCTION sync_user_state(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '{}';
    v_trial_info record;
    v_stripe_info record;
    v_axie_info record;
    v_new_status user_account_status;
    v_has_access boolean := false;
    v_access_level text := 'suspended';
BEGIN
    -- Get trial information
    SELECT * INTO v_trial_info
    FROM user_trials 
    WHERE user_id = p_user_id;
    
    -- Get Stripe information
    SELECT 
        c.customer_id,
        s.subscription_id,
        s.status,
        s.current_period_end
    INTO v_stripe_info
    FROM stripe_customers c
    LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
    WHERE c.user_id = p_user_id 
    AND c.deleted_at IS NULL 
    AND (s.deleted_at IS NULL OR s.deleted_at IS NULL);
    
    -- Get Axie Studio information
    SELECT * INTO v_axie_info
    FROM axie_studio_accounts
    WHERE user_id = p_user_id;
    
    -- Determine new status and access
    IF v_stripe_info.status IN ('active') THEN
        v_new_status := 'subscription_active';
        v_has_access := true;
        v_access_level := 'pro';
    ELSIF v_stripe_info.status IN ('trialing') THEN
        v_new_status := 'subscription_trialing';
        v_has_access := true;
        v_access_level := 'pro';
    ELSIF v_stripe_info.status IN ('past_due') THEN
        v_new_status := 'subscription_past_due';
        v_has_access := false;
        v_access_level := 'suspended';
    ELSIF v_stripe_info.status IN ('canceled') THEN
        v_new_status := 'subscription_canceled';
        v_has_access := false;
        v_access_level := 'trial';
    ELSIF v_trial_info.trial_status = 'active' AND v_trial_info.trial_end_date > now() THEN
        v_new_status := 'trial_active';
        v_has_access := true;
        v_access_level := 'trial';
    ELSE
        v_new_status := 'trial_expired';
        v_has_access := false;
        v_access_level := 'suspended';
    END IF;
    
    -- Update central state
    UPDATE user_account_state 
    SET 
        account_status = v_new_status,
        has_access = v_has_access,
        access_level = v_access_level,
        stripe_customer_id = v_stripe_info.customer_id,
        stripe_subscription_id = v_stripe_info.subscription_id,
        subscription_status = v_stripe_info.status,
        current_period_end = to_timestamp(v_stripe_info.current_period_end),
        axie_studio_user_id = v_axie_info.axie_studio_user_id,
        axie_studio_status = v_axie_info.account_status,
        trial_days_remaining = CASE 
            WHEN v_trial_info.trial_end_date > now() 
            THEN EXTRACT(days FROM (v_trial_info.trial_end_date - now()))::integer
            ELSE 0
        END,
        updated_at = now(),
        last_activity_at = now()
    WHERE user_id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'status', v_new_status,
        'has_access', v_has_access,
        'access_level', v_access_level,
        'synced_at', now()
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- ENHANCED TRIGGERS
-- ============================================================================

-- Enhanced user creation trigger
CREATE OR REPLACE FUNCTION on_auth_user_created_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create complete user profile
    PERFORM create_complete_user_profile(
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );

    -- Create trial record (existing functionality)
    INSERT INTO user_trials (user_id, trial_start_date, trial_end_date)
    VALUES (NEW.id, now(), now() + interval '7 days');

    RETURN NEW;
END;
$$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION on_auth_user_created_enhanced();

-- ============================================================================
-- ENTERPRISE VIEWS
-- ============================================================================

-- Comprehensive user dashboard view
DROP VIEW IF EXISTS user_dashboard;
CREATE VIEW user_dashboard WITH (security_invoker = true) AS
SELECT
    up.id as user_id,
    up.email,
    up.full_name,
    up.company,
    up.created_at as user_created_at,
    up.last_login_at,

    -- Account state
    uas.account_status,
    uas.has_access,
    uas.access_level,
    uas.trial_days_remaining,
    uas.last_activity_at,

    -- Trial info
    ut.trial_start_date,
    ut.trial_end_date,
    ut.trial_status,

    -- Stripe info
    sc.customer_id as stripe_customer_id,
    ss.subscription_id as stripe_subscription_id,
    ss.status as stripe_status,
    ss.current_period_end,
    ss.price_id,

    -- Axie Studio info
    asa.axie_studio_user_id,
    asa.axie_studio_email,
    asa.account_status as axie_studio_status,
    asa.last_sync_at as axie_last_sync

FROM user_profiles up
LEFT JOIN user_account_state uas ON up.id = uas.user_id
LEFT JOIN user_trials ut ON up.id = ut.user_id
LEFT JOIN stripe_customers sc ON up.id = sc.user_id AND sc.deleted_at IS NULL
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id AND ss.deleted_at IS NULL
LEFT JOIN axie_studio_accounts asa ON up.id = asa.user_id
WHERE up.id = auth.uid();

GRANT SELECT ON user_dashboard TO authenticated;

-- Admin view for user management (service role only)
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT
    up.id as user_id,
    up.email,
    up.full_name,
    up.company,
    up.created_at,
    up.is_active,

    uas.account_status,
    uas.has_access,
    uas.access_level,
    uas.trial_days_remaining,

    -- Counts and metrics
    CASE WHEN sc.customer_id IS NOT NULL THEN true ELSE false END as has_stripe_account,
    CASE WHEN asa.axie_studio_user_id IS NOT NULL THEN true ELSE false END as has_axie_account,

    -- Last activity
    uas.last_activity_at,
    asa.last_sync_at as axie_last_sync,
    sc.last_sync_at as stripe_last_sync

FROM user_profiles up
LEFT JOIN user_account_state uas ON up.id = uas.user_id
LEFT JOIN stripe_customers sc ON up.id = sc.user_id AND sc.deleted_at IS NULL
LEFT JOIN axie_studio_accounts asa ON up.id = asa.user_id;

-- ============================================================================
-- MAINTENANCE AND MONITORING
-- ============================================================================

-- Function to sync all users (for maintenance)
CREATE OR REPLACE FUNCTION sync_all_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_results jsonb := '[]'::jsonb;
    v_sync_result jsonb;
BEGIN
    FOR v_user_id IN
        SELECT id FROM user_profiles WHERE is_active = true
    LOOP
        v_sync_result := sync_user_state(v_user_id);
        v_results := v_results || v_sync_result;
    END LOOP;

    RETURN jsonb_build_object(
        'synced_users', jsonb_array_length(v_results),
        'results', v_results,
        'synced_at', now()
    );
END;
$$;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metrics jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM user_profiles),
        'active_trials', (SELECT COUNT(*) FROM user_trials WHERE trial_status = 'active'),
        'active_subscriptions', (SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active'),
        'linked_axie_accounts', (SELECT COUNT(*) FROM axie_studio_accounts),
        'users_with_access', (SELECT COUNT(*) FROM user_account_state WHERE has_access = true),
        'generated_at', now()
    ) INTO v_metrics;

    RETURN v_metrics;
END;
$$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🚀 ENTERPRISE USER MANAGEMENT SETUP COMPLETE! 🚀';
    RAISE NOTICE 'Enhanced user profiles, state management, and monitoring are now active.';
    RAISE NOTICE 'Use sync_user_state(user_id) to sync individual users.';
    RAISE NOTICE 'Use get_system_metrics() to monitor system health.';
END
$$;
