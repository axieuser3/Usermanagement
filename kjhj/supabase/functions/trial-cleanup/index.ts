import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const AXIESTUDIO_APP_URL = Deno.env.get('AXIESTUDIO_APP_URL')!;
const AXIESTUDIO_USERNAME = Deno.env.get('AXIESTUDIO_USERNAME')!;
const AXIESTUDIO_PASSWORD = Deno.env.get('AXIESTUDIO_PASSWORD')!;

if (!AXIESTUDIO_APP_URL || !AXIESTUDIO_USERNAME || !AXIESTUDIO_PASSWORD) {
  throw new Error('Missing required Axie Studio environment variables');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getAxieStudioApiKey(): Promise<string> {
  try {
    // Step 1: Login to get JWT token
    const loginResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: AXIESTUDIO_USERNAME,
        password: AXIESTUDIO_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const { access_token } = await loginResponse.json();

    // Step 2: Create API key using JWT token
    const apiKeyResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/api_key/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Trial Cleanup API Key'
      })
    });

    if (!apiKeyResponse.ok) {
      throw new Error(`API key creation failed: ${apiKeyResponse.status}`);
    }

    const { api_key } = await apiKeyResponse.json();
    return api_key;
  } catch (error) {
    console.error('Failed to get Axie Studio API key:', error);
    throw error;
  }
}

async function deleteAxieStudioUser(email: string): Promise<void> {
  try {
    const apiKey = await getAxieStudioApiKey();
    
    // Find user by email
    const usersResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/users/?x-api-key=${apiKey}`);
    
    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users: ${usersResponse.status}`);
    }

    const users = await usersResponse.json();
    const user = users.find((u: any) => u.username === email);

    if (!user) {
      console.log(`User ${email} not found in Axie Studio, skipping deletion`);
      return;
    }

    // Delete user
    const deleteResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/users/${user.id}?x-api-key=${apiKey}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete Axie Studio user: ${deleteResponse.status}`);
    }

    console.log(`Successfully deleted Axie Studio user: ${email}`);
  } catch (error) {
    console.error('Error deleting Axie Studio user:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // This function should be called by a cron job or scheduled task
    console.log('Starting trial cleanup process...');

    // Step 1: Protect paying customers first (CRITICAL SAFETY STEP)
    const { error: protectError } = await supabase.rpc('protect_paying_customers');
    
    if (protectError) {
      console.error('Error protecting paying customers:', protectError);
      throw new Error('Failed to protect paying customers');
    }
    
    // Step 2: Sync subscription status
    const { error: syncError } = await supabase.rpc('sync_subscription_status');
    
    if (syncError) {
      console.error('Error syncing subscription status:', syncError);
      throw new Error('Failed to sync subscription status');
    }
    
    // Step 3: Check for expired trials and schedule deletions
    const { error: checkError } = await supabase.rpc('check_expired_trials');
    
    if (checkError) {
      console.error('Error checking expired trials:', checkError);
      throw new Error('Failed to check expired trials');
    }

    // Step 4: Get users scheduled for deletion (with safety checks)
    const { data: usersToDelete, error: getUsersError } = await supabase.rpc('get_users_for_deletion');
    
    if (getUsersError) {
      console.error('Error getting users for deletion:', getUsersError);
      throw new Error('Failed to get users for deletion');
    }

    console.log(`Found ${usersToDelete?.length || 0} users scheduled for deletion`);

    // Step 5: Final safety check before deletion
    const safeUsersToDelete = [];
    for (const userToDelete of usersToDelete || []) {
      // Double-check that user doesn't have active subscription
      const { data: subscriptionCheck } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status')
        .eq('customer_id', userToDelete.user_id)
        .single();
        
      if (!subscriptionCheck || !['active', 'trialing'].includes(subscriptionCheck.subscription_status)) {
        safeUsersToDelete.push(userToDelete);
      } else {
        console.log(`SAFETY: Skipping deletion of ${userToDelete.email} - has active subscription`);
      }
    }
    
    // Step 6: Delete each verified expired user
    const deletionResults = [];
    
    for (const userToDelete of safeUsersToDelete) {
      try {
        console.log(`Processing deletion for user: ${userToDelete.email}`);
        
        // Delete from Axie Studio first
        await deleteAxieStudioUser(userToDelete.email);
        
        // Delete from Supabase auth (this will cascade to other tables)
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userToDelete.user_id);
        
        if (deleteUserError) {
          console.error(`Failed to delete Supabase user ${userToDelete.email}:`, deleteUserError);
          deletionResults.push({
            email: userToDelete.email,
            success: false,
            error: deleteUserError.message
          });
        } else {
          console.log(`Successfully deleted user: ${userToDelete.email}`);
          deletionResults.push({
            email: userToDelete.email,
            success: true
          });
        }
      } catch (error: any) {
        console.error(`Failed to delete user ${userToDelete.email}:`, error);
        deletionResults.push({
          email: userToDelete.email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trial cleanup completed',
        total_candidates: usersToDelete?.length || 0,
        protected_users: (usersToDelete?.length || 0) - safeUsersToDelete.length,
        processed: safeUsersToDelete.length,
        results: deletionResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Trial cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});