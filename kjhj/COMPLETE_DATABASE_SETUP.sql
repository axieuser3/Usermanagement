-- ============================================================================
-- COMPLETE DATABASE SETUP + ENTERPRISE FEATURES
-- Copy and paste this entire block into Supabase SQL Editor
-- This file contains EVERYTHING: Basic + Enterprise features for Axie Studio
-- ============================================================================

-- ============================================================================
-- ENUM TYPES (with safe creation)
-- ============================================================================

-- Create stripe_subscription_status enum safely
DO $$ BEGIN
    CREATE TYPE stripe_subscription_status AS ENUM (
        'not_started',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create stripe_order_status enum safely
DO $$ BEGIN
    CREATE TYPE stripe_order_status AS ENUM (
        'pending',
        'completed',
        'canceled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create trial_status enum safely
DO $$ BEGIN
    CREATE TYPE trial_status AS ENUM (
        'active',
        'expired', 
        'converted_to_paid',
        'scheduled_for_deletion'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES (with IF NOT EXISTS)
-- ============================================================================

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

-- Create stripe_orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

-- Create user_trials table
CREATE TABLE IF NOT EXISTS user_trials (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
    trial_start_date timestamptz DEFAULT now() NOT NULL,
    trial_end_date timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
    trial_status trial_status DEFAULT 'active' NOT NULL,
    deletion_scheduled_at timestamptz DEFAULT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY & POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
DROP POLICY IF EXISTS "Users can view their own trial data" ON user_trials;

-- Recreate policies
CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can view their own trial data"
    ON user_trials
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- VIEWS (drop and recreate)
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS stripe_user_subscriptions;
DROP VIEW IF EXISTS stripe_user_orders;
DROP VIEW IF EXISTS user_trial_info;
DROP VIEW IF EXISTS user_access_status;

-- Recreate stripe_user_subscriptions view
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

-- Recreate stripe_user_orders view
CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

-- Recreate user_trial_info view
CREATE VIEW user_trial_info WITH (security_invoker = true) AS
SELECT
    ut.user_id,
    ut.trial_start_date,
    ut.trial_end_date,
    ut.trial_status,
    ut.deletion_scheduled_at,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(epoch FROM (ut.trial_end_date - now()))::bigint
        ELSE 0
    END as seconds_remaining,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
        ELSE 0
    END as days_remaining
FROM user_trials ut
WHERE ut.user_id = auth.uid();

-- Recreate user_access_status view
CREATE VIEW user_access_status WITH (security_invoker = true) AS
SELECT
    ut.user_id,
    ut.trial_start_date,
    ut.trial_end_date,
    ut.trial_status,
    ut.deletion_scheduled_at,
    s.status as subscription_status,
    s.subscription_id,
    s.price_id,
    s.current_period_end,
    CASE 
        WHEN s.status IN ('active', 'trialing') THEN true
        WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN true
        ELSE false
    END as has_access,
    CASE 
        WHEN s.status = 'active' THEN 'paid_subscription'
        WHEN s.status = 'trialing' THEN 'stripe_trial'
        WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN 'free_trial'
        ELSE 'no_access'
    END as access_type,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(epoch FROM (ut.trial_end_date - now()))::bigint
        ELSE 0
    END as seconds_remaining,
    CASE 
        WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
        ELSE 0
    END as days_remaining
FROM user_trials ut
LEFT JOIN stripe_customers c ON ut.user_id = c.user_id AND c.deleted_at IS NULL
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
WHERE ut.user_id = auth.uid();

-- Grant permissions on views
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_orders TO authenticated;
GRANT SELECT ON user_trial_info TO authenticated;
GRANT SELECT ON user_access_status TO authenticated;

-- ============================================================================
-- FUNCTIONS - Business Logic for Trial Management and User Protection
-- ============================================================================

-- Enhanced function to sync subscription status with trial status
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark trials as converted for users with active subscriptions
    UPDATE user_trials
    SET
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id IN (
        SELECT DISTINCT c.user_id
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing')
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    AND trial_status NOT IN ('converted_to_paid');

    -- Update expired trials that haven't been converted to paid
    UPDATE user_trials
    SET
        trial_status = 'expired',
        deletion_scheduled_at = now() + interval '1 day',
        updated_at = now()
    WHERE
        trial_end_date < now()
        AND trial_status = 'active'
        AND user_id NOT IN (
            SELECT DISTINCT c.user_id
            FROM stripe_customers c
            JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
            WHERE s.status IN ('active', 'trialing')
            AND s.deleted_at IS NULL
            AND c.deleted_at IS NULL
        );

    -- Schedule deletion for accounts that have been expired for more than 1 day
    -- BUT ONLY if they don't have active subscriptions
    UPDATE user_trials
    SET
        trial_status = 'scheduled_for_deletion',
        updated_at = now()
    WHERE
        trial_status = 'expired'
        AND deletion_scheduled_at < now()
        AND user_id NOT IN (
            SELECT DISTINCT c.user_id
            FROM stripe_customers c
            JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
            WHERE s.status IN ('active', 'trialing')
            AND s.deleted_at IS NULL
            AND c.deleted_at IS NULL
        );
END;
$$;

-- Enhanced function to protect paying customers from deletion
CREATE OR REPLACE FUNCTION protect_paying_customers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove deletion scheduling for any user who has an active subscription
    UPDATE user_trials
    SET
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id IN (
        SELECT DISTINCT c.user_id
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing')
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    AND trial_status IN ('expired', 'scheduled_for_deletion');
END;
$$;

-- Function to get user's current access level
CREATE OR REPLACE FUNCTION get_user_access_level(p_user_id uuid)
RETURNS TABLE(
    has_access boolean,
    access_type text,
    subscription_status text,
    trial_status text,
    days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN s.status IN ('active', 'trialing') THEN true
            WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN true
            ELSE false
        END as has_access,
        CASE
            WHEN s.status = 'active' THEN 'paid_subscription'
            WHEN s.status = 'trialing' THEN 'stripe_trial'
            WHEN ut.trial_status = 'active' AND ut.trial_end_date > now() THEN 'free_trial'
            ELSE 'no_access'
        END as access_type,
        COALESCE(s.status::text, 'none') as subscription_status,
        ut.trial_status::text,
        CASE
            WHEN ut.trial_end_date > now() THEN EXTRACT(days FROM (ut.trial_end_date - now()))::integer
            ELSE 0
        END as days_remaining
    FROM user_trials ut
    LEFT JOIN stripe_customers c ON ut.user_id = c.user_id AND c.deleted_at IS NULL
    LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
    WHERE ut.user_id = p_user_id;
END;
$$;

-- Enhanced function to safely get users for deletion (with multiple safety checks)
CREATE OR REPLACE FUNCTION get_users_for_deletion()
RETURNS TABLE(user_id uuid, email text, trial_end_date timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ut.user_id,
        au.email,
        ut.trial_end_date
    FROM user_trials ut
    JOIN auth.users au ON ut.user_id = au.id
    WHERE ut.trial_status = 'scheduled_for_deletion'
    -- SAFETY CHECK: Ensure no active subscription exists
    AND ut.user_id NOT IN (
        SELECT DISTINCT c.user_id
        FROM stripe_customers c
        JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
        WHERE s.status IN ('active', 'trialing')
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
    )
    -- SAFETY CHECK: Ensure trial has actually expired
    AND ut.trial_end_date < now() - interval '1 day';
END;
$$;

-- Enhanced check_expired_trials function with better safety
CREATE OR REPLACE FUNCTION check_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, protect any paying customers
    PERFORM protect_paying_customers();

    -- Then sync subscription status
    PERFORM sync_subscription_status();

    -- Log the operation
    RAISE NOTICE 'Trial cleanup completed at %', now();
END;
$$;

-- Function to mark trial as converted when user subscribes
CREATE OR REPLACE FUNCTION mark_trial_converted(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_trials
    SET
        trial_status = 'converted_to_paid',
        deletion_scheduled_at = NULL,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Function to manually verify user protection status
CREATE OR REPLACE FUNCTION verify_user_protection(p_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    email text,
    is_protected boolean,
    protection_reason text,
    trial_status text,
    subscription_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        au.id as user_id,
        au.email,
        CASE
            WHEN s.status IN ('active', 'trialing') THEN true
            WHEN ut.trial_status = 'converted_to_paid' THEN true
            ELSE false
        END as is_protected,
        CASE
            WHEN s.status = 'active' THEN 'Active paid subscription'
            WHEN s.status = 'trialing' THEN 'Stripe trial period'
            WHEN ut.trial_status = 'converted_to_paid' THEN 'Previously converted to paid'
            ELSE 'No protection - eligible for deletion'
        END as protection_reason,
        ut.trial_status::text,
        COALESCE(s.status::text, 'none') as subscription_status
    FROM auth.users au
    LEFT JOIN user_trials ut ON au.id = ut.user_id
    LEFT JOIN stripe_customers c ON au.id = c.user_id AND c.deleted_at IS NULL
    LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
    WHERE au.id = p_user_id;
END;
$$;

-- ============================================================================
-- TRIGGERS - Automatic Actions for User Management
-- ============================================================================

-- Trigger function to create trial record when user signs up
CREATE OR REPLACE FUNCTION create_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_trials (user_id, trial_start_date, trial_end_date)
    VALUES (NEW.id, now(), now() + interval '7 days');
    RETURN NEW;
END;
$$;

-- Trigger function to automatically sync when subscription status changes
CREATE OR REPLACE FUNCTION on_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If subscription becomes active or trialing, protect the user
    IF NEW.status IN ('active', 'trialing') THEN
        UPDATE user_trials
        SET
            trial_status = 'converted_to_paid',
            deletion_scheduled_at = NULL,
            updated_at = now()
        WHERE user_id = (
            SELECT user_id
            FROM stripe_customers
            WHERE customer_id = NEW.customer_id
            AND deleted_at IS NULL
        );
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER CREATION (Drop existing triggers first)
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_stripe_subscription_change ON stripe_subscriptions;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_trial();

-- Create trigger for subscription changes
CREATE TRIGGER on_stripe_subscription_change
    AFTER INSERT OR UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION on_subscription_change();

-- ============================================================================
-- FINAL SETUP - Ensure everything is properly configured
-- ============================================================================

-- Run initial sync to ensure data consistency
SELECT sync_subscription_status();
SELECT protect_paying_customers();

-- ============================================================================
-- ENTERPRISE FEATURES - Enhanced User Management
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

-- User state management enum
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

-- Central user state table
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

-- Enable RLS on enterprise tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE axie_studio_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_state ENABLE ROW LEVEL SECURITY;

-- Drop existing enterprise policies and recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own axie account" ON axie_studio_accounts;
DROP POLICY IF EXISTS "Users can view own account state" ON user_account_state;

-- Create enterprise policies
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR ALL
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can view own axie account"
    ON axie_studio_accounts FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

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

-- Drop existing enterprise views
DROP VIEW IF EXISTS user_dashboard;
DROP VIEW IF EXISTS admin_user_overview;

-- Comprehensive user dashboard view
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

-- Grant permissions on enterprise views
GRANT SELECT ON user_dashboard TO authenticated;

-- ============================================================================
-- FINAL SETUP AND SUCCESS MESSAGE
-- ============================================================================

-- Run initial sync to ensure data consistency
SELECT sync_subscription_status();
SELECT protect_paying_customers();

-- Migrate existing users to enterprise structure
INSERT INTO user_profiles (id, email, created_at)
SELECT id, email, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Sync all existing user states
SELECT sync_all_users();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 COMPLETE DATABASE SETUP WITH ENTERPRISE FEATURES! 🎉';
    RAISE NOTICE 'Basic Features: ✅ Tables, Views, Functions, Triggers';
    RAISE NOTICE 'Enterprise Features: ✅ User Profiles, State Management, Monitoring';
    RAISE NOTICE 'Your Axie Studio subscription app is fully ready!';
    RAISE NOTICE 'Enterprise dashboard available at user_dashboard view';
    RAISE NOTICE 'System metrics available via get_system_metrics() function';
END
$$;
