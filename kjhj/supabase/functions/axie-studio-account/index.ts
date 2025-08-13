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
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
        name: 'Account Management API Key'
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

async function createAxieStudioUser(email: string, password: string): Promise<any> {
  try {
    console.log(`🔄 Starting AxieStudio user creation for: ${email}`);

    // Step 1: Login to AxieStudio to get JWT token
    console.log(`🔐 Logging into AxieStudio...`);
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
    console.log(`✅ Login successful, got access token`);

    // Step 2: Create API key using JWT token
    console.log(`🔑 Creating API key...`);
    const apiKeyResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/api_key/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Account Management API Key'
      })
    });

    if (!apiKeyResponse.ok) {
      throw new Error(`API key creation failed: ${apiKeyResponse.status}`);
    }

    const { api_key } = await apiKeyResponse.json();
    console.log(`✅ API key created: ${api_key.substring(0, 10)}...`);

    // Step 3: Create the actual user
    console.log(`👤 Creating user account...`);
    const userData = {
      username: email,
      password: password,
      is_active: true,
      is_superuser: false
    };

    console.log(`📤 Sending user data:`, { ...userData, password: '[REDACTED]' });

    const userResponse = await fetch(`${AXIESTUDIO_APP_URL}/api/v1/users/?x-api-key=${api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': api_key
      },
      body: JSON.stringify(userData)
    });

    console.log(`📥 User creation response status: ${userResponse.status}`);

    const responseText = await userResponse.text();
    console.log(`📥 User creation response body: ${responseText}`);

    if (!userResponse.ok) {
      throw new Error(`Failed to create Axie Studio user: ${userResponse.status} - ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`✅ Successfully created Axie Studio user: ${email}`);
    return {
      success: true,
      user_id: responseData.id || responseData.user_id || 'unknown',
      email: email,
      response_data: responseData
    };
  } catch (error) {
    console.error('❌ Error creating Axie Studio user:', error);
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, password } = await req.json();

    if (req.method === 'POST' && action === 'create') {
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required for account creation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await createAxieStudioUser(user.email!, password);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Axie Studio account created successfully',
          ...result
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE' || (req.method === 'POST' && action === 'delete')) {
      await deleteAxieStudioUser(user.email!);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Axie Studio account deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request method or action' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Axie Studio account management error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});