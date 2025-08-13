# How to Apply Database Migrations

## Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref othsnnoncnerjogvwjgc
   ```

4. **Apply migrations**:
   ```bash
   supabase db push
   ```

## Option 2: Manual SQL Execution

If you can't use the CLI, you can manually run the SQL migrations in your Supabase dashboard:

1. Go to https://supabase.com/dashboard/project/othsnnoncnerjogvwjgc
2. Navigate to SQL Editor
3. Run each migration file in order:

### Migration 1: `20250812033340_blue_castle.sql`
- Creates stripe_customers, stripe_subscriptions, stripe_orders tables
- Creates stripe_user_subscriptions and stripe_user_orders views

### Migration 2: `20250812035657_raspy_silence.sql`
- Disables email confirmation

### Migration 3: `20250812040608_foggy_harbor.sql`
- Creates user_trials table
- Creates user_trial_info view
- Creates trial management functions

### Migration 4: `20250812041628_empty_reef.sql`
- Creates user_access_status view
- Creates enhanced functions for user protection
- Creates triggers for subscription changes

## Option 3: Deploy Supabase Functions

After applying migrations, deploy the edge functions:

```bash
supabase functions deploy axie-studio-account
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy trial-cleanup
```

## Verification

After applying migrations, test your setup:

1. Go to your testing page: `/test-connections`
2. Click "Check Migrations" to verify all database objects exist
3. Click "Test Connection" to run comprehensive database tests

## Environment Variables

Make sure these are set in your Supabase project settings:

### Supabase Function Environment Variables:
- `AXIESTUDIO_APP_URL`
- `AXIESTUDIO_USERNAME`
- `AXIESTUDIO_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Frontend Environment Variables (.env file):
```env
VITE_SUPABASE_URL=https://othsnnoncnerjogvwjgc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aHNubm9uY25lcmpvZ3Z3amdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTY1NDcsImV4cCI6MjA2NzczMjU0N30.bAYQm2q_LH6xCMXrPsObht6pmFbz966MU-g7v1SRzrE
VITE_AXIESTUDIO_APP_URL=https://axiestudio-axiestudio-ttefi.ondigitalocean.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51R8NaSBacFXEnBmNctNhCB371L8X2hMUHlwLAmxLKZ0yzGyzZxFmNoUeOwAm7M5NeqgePP2uMRp85xHA0BCA98OX00hdoNhjfd
VITE_STRIPE_PRO_PRICE_ID=price_1Rv4rDBacFXEnBmNDMrhMqOH
```

## Troubleshooting

If you still get errors after applying migrations:

1. Check the browser console for detailed error messages
2. Use the "Check Migrations" button to see which objects are missing
3. Verify RLS policies are correctly applied
4. Check that all environment variables are set correctly

## Quick Test

Once everything is set up, you should be able to:
1. Create a test user
2. See trial information
3. Create Stripe checkout sessions
4. See user access status

The updated hooks will now provide much better error messages and fallback gracefully if some database objects are missing.
