# 🚀 Complete Setup Guide

This guide will walk you through setting up the Axie Studio User Management System from scratch.

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Supabase Account** - [Sign up here](https://supabase.com/)
- **Stripe Account** - [Sign up here](https://stripe.com/)
- **Git** - For version control

## 🏗️ Step 1: Project Setup

### 1.1 Clone and Install
```bash
git clone <your-repository-url>
cd axie-studio-user-management
npm install
```

### 1.2 Environment Configuration
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here

# Optional: Admin Configuration
VITE_ADMIN_USER_ID=b8782453-a343-4301-a947-67c5bb407d2b
```

## 🗄️ Step 2: Database Setup

### 2.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose your organization
4. Enter project name: "axie-studio-user-management"
5. Generate a strong password
6. Select your region
7. Click "Create new project"

### 2.2 Apply Database Migration
1. Go to the SQL Editor in your Supabase dashboard
2. Copy the entire content of `supabase/migrations/20250813160527_shy_bird.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the migration

### 2.3 Verify Database Setup
The migration creates:
- ✅ 8 core tables
- ✅ 4 enum types
- ✅ 5 views
- ✅ 20+ functions
- ✅ RLS policies
- ✅ Triggers

## 💳 Step 3: Stripe Configuration

### 3.1 Create Stripe Products
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Products
3. Create a product for your subscription
4. Note the Price ID (starts with `price_`)

### 3.2 Configure Webhooks
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3.3 Update Application Configuration
Update `src/stripe-config.ts` with your Price IDs:
```typescript
export const STRIPE_CONFIG = {
  priceId: 'price_your_actual_price_id_here',
  // Add other price IDs as needed
};
```

## 🔧 Step 4: Supabase Functions

### 4.1 Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy trial-cleanup
supabase functions deploy axie-studio-account
```

### 4.2 Set Function Secrets
```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Set webhook endpoint secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 🔐 Step 5: Authentication Setup

### 5.1 Configure Auth Providers
1. Go to Authentication > Providers in Supabase
2. Configure Email provider
3. Set up custom SMTP (optional)
4. Configure redirect URLs

### 5.2 Set Up Super Admin
The system includes a hardcoded super admin with UUID:
`b8782453-a343-4301-a947-67c5bb407d2b`

To create this user:
1. Sign up normally through your app
2. Go to Authentication > Users in Supabase
3. Find your user and copy the UUID
4. Update the migration file with your actual admin UUID
5. Re-run the migration

## 🚀 Step 6: Development

### 6.1 Start Development Server
```bash
npm run dev
```

### 6.2 Test the Application
1. Open http://localhost:5173
2. Sign up for a new account
3. Verify trial countdown works
4. Test subscription flow
5. Check admin dashboard

## 🧪 Step 7: Testing

### 7.1 Database Health Check
Visit `/test-connections` in your app to verify:
- ✅ Database connectivity
- ✅ All tables exist
- ✅ Functions are working
- ✅ Views are accessible

### 7.2 Trial System Test
1. Create a test user
2. Verify 7-day trial starts
3. Check countdown timer
4. Test trial expiration (manually update database)

### 7.3 Subscription Test
1. Use Stripe test cards
2. Test successful subscription
3. Verify trial conversion
4. Test subscription cancellation

## 🔍 Step 8: Monitoring

### 8.1 Set Up Monitoring
- Monitor Supabase logs
- Set up Stripe webhook monitoring
- Check function execution logs

### 8.2 Health Checks
The system includes built-in health checks:
- Database connectivity
- Function availability
- User access verification

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
- Check Supabase URL and keys
- Verify RLS policies are applied
- Check network connectivity

**Stripe Integration Issues**
- Verify webhook endpoint is accessible
- Check webhook secret configuration
- Validate price IDs

**Trial System Not Working**
- Check if migration was applied completely
- Verify triggers are created
- Check function permissions

### Getting Help
1. Check the logs in Supabase Dashboard
2. Review the testing guide
3. Use the database health checker
4. Check the archive documentation

## ✅ Final Checklist

- [ ] Supabase project created
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Stripe products created
- [ ] Webhooks configured
- [ ] Edge functions deployed
- [ ] Super admin configured
- [ ] Development server running
- [ ] Basic functionality tested
- [ ] Health checks passing

## 🎉 You're Ready!

Your Axie Studio User Management System is now set up and ready for development!

For ongoing maintenance and updates, refer to the other documentation files in the `docs/` directory.
