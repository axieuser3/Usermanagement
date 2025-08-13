# 🧪 Connection Testing Guide

## Overview
This guide helps you test all the connections in your Axie Studio subscription app.

## Testing Steps

### 1. 🗄️ Supabase Testing
- **Connection Test**: Verifies database connectivity
- **User Creation**: Creates test users with email/password
- **Authentication**: Tests sign-in/sign-out functionality

### 2. 🎯 Axie Studio Integration Testing
- **API Connection**: Tests if Axie Studio API is accessible
- **User Sync**: Creates users in Axie Studio when Supabase users are created
- **Account Deletion**: Removes users from both systems

### 3. 💳 Stripe Integration Testing
- **SDK Loading**: Verifies Stripe SDK is properly loaded
- **Checkout Sessions**: Creates subscription checkout sessions
- **Payment Flow**: Tests the complete payment process

### 4. 🔗 Full Integration Testing
- **End-to-End Flow**: Tests complete user journey
- **System Sync**: Verifies all systems work together
- **Cleanup**: Removes test data

## How to Test

### Option 1: Use the HTML Test Page
1. Open `test-connections.html` in your browser
2. Click the test buttons in order
3. Monitor the logs for success/error messages

### Option 2: Use Bolt IDE
1. Push code to GitHub
2. Import into Bolt
3. Run the test page
4. Check all connections

## Expected Results

### ✅ Success Indicators
- Supabase connection established
- Users created in both systems
- Stripe checkout sessions created
- All systems synchronized

### ❌ Failure Indicators
- Connection timeouts
- Authentication errors
- API key issues
- Missing environment variables

## Troubleshooting

### Supabase Issues
- Check environment variables
- Verify database tables exist
- Ensure RLS policies are correct

### Axie Studio Issues
- Verify API endpoint is accessible
- Check authentication credentials
- Ensure Supabase functions are deployed

### Stripe Issues
- Verify publishable key is correct
- Check webhook configuration
- Ensure products/prices exist

## Environment Variables Required

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration (Live Keys)
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Product Configuration
STRIPE_PRO_PRICE_ID=your_stripe_price_id
STRIPE_PRO_PRODUCT_ID=your_stripe_product_id

# Axie Studio Configuration
AXIESTUDIO_APP_URL=your_axiestudio_app_url
AXIESTUDIO_API_KEY=your_axiestudio_api_key
AXIESTUDIO_USERNAME=your_axiestudio_username
AXIESTUDIO_PASSWORD=your_axiestudio_password

# Frontend Environment Variables (VITE_ prefix for client-side access)
VITE_AXIESTUDIO_APP_URL=your_axiestudio_app_url
VITE_STRIPE_PRO_PRICE_ID=your_stripe_price_id
VITE_STRIPE_PRO_PRODUCT_ID=your_stripe_product_id
```

## Next Steps After Testing

1. **If all tests pass**: Deploy to production
2. **If tests fail**: Check logs and fix issues
3. **Database setup**: Ensure all tables and functions exist
4. **Webhook setup**: Configure Stripe webhooks
5. **Email setup**: Configure Supabase email settings