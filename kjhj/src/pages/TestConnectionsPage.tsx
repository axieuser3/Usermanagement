import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { checkDatabaseStatus, generateDatabaseReport, isDatabaseHealthy } from '../utils/databaseChecker';

interface TestResult {
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: string;
}

export function TestConnectionsPage() {
  const { user } = useAuth();
  const { enterpriseState, isEnterpriseEnabled, syncUserState } = useEnterpriseUser();
  const [supabaseResults, setSupabaseResults] = useState<TestResult[]>([]);
  const [axieResults, setAxieResults] = useState<TestResult[]>([]);
  const [stripeResults, setStripeResults] = useState<TestResult[]>([]);
  const [integrationResults, setIntegrationResults] = useState<TestResult[]>([]);
  const [enterpriseResults, setEnterpriseResults] = useState<TestResult[]>([]);
  
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');

  const addLog = (
    setter: React.Dispatch<React.SetStateAction<TestResult[]>>, 
    message: string, 
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    setter(prev => [...prev, { message, type, timestamp }]);
  };

  const clearLogs = (setter: React.Dispatch<React.SetStateAction<TestResult[]>>) => {
    setter([]);
  };

  // Environment variables check
  useEffect(() => {
    const checkEnvVars = () => {
      const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY', 
        'VITE_AXIESTUDIO_APP_URL',
        'VITE_STRIPE_PUBLISHABLE_KEY',
        'VITE_STRIPE_PRO_PRICE_ID'
      ];

      const missing = requiredVars.filter(varName => !import.meta.env[varName]);
      
      if (missing.length > 0) {
        addLog(setSupabaseResults, `❌ Missing environment variables: ${missing.join(', ')}`, 'error');
      } else {
        addLog(setSupabaseResults, '✅ All environment variables loaded', 'success');
      }
    };

    checkEnvVars();
  }, []);

  // 1. SUPABASE TESTING
  const testSupabaseConnection = async () => {
    clearLogs(setSupabaseResults);
    addLog(setSupabaseResults, '🔄 Testing Supabase connection...', 'info');

    try {
      // Run comprehensive database check
      addLog(setSupabaseResults, '🔍 Running comprehensive database check...', 'info');
      const status = await checkDatabaseStatus();
      const report = generateDatabaseReport(status);
      const isHealthy = await isDatabaseHealthy();

      // Log the detailed report
      const reportLines = report.split('\n');
      reportLines.forEach(line => {
        if (line.trim()) {
          const type = line.includes('✅') ? 'success' : line.includes('❌') ? 'error' : 'info';
          addLog(setSupabaseResults, line, type);
        }
      });

      if (isHealthy) {
        addLog(setSupabaseResults, '🎉 Database is healthy and ready!', 'success');
      } else {
        addLog(setSupabaseResults, '⚠️ Database has some issues that need attention', 'error');
      }

    } catch (err: any) {
      addLog(setSupabaseResults, `❌ Connection error: ${err.message}`, 'error');
    }
  };

  const testDatabaseMigrations = async () => {
    addLog(setSupabaseResults, '🔄 Testing database migrations...', 'info');

    try {
      // Check if migrations have been applied by testing specific functions
      const { data: syncResult, error: syncError } = await supabase.rpc('sync_subscription_status');
      if (syncError) {
        addLog(setSupabaseResults, `❌ sync_subscription_status function missing: ${syncError.message}`, 'error');
        addLog(setSupabaseResults, '💡 Run: supabase db push to apply migrations', 'info');
      } else {
        addLog(setSupabaseResults, '✅ Database functions are available', 'success');
      }

      // Test if views exist by checking their structure
      const { data: viewTest, error: viewError } = await supabase
        .from('user_access_status')
        .select('user_id, has_access, access_type')
        .limit(1);

      if (viewError) {
        addLog(setSupabaseResults, `❌ user_access_status view missing: ${viewError.message}`, 'error');
        addLog(setSupabaseResults, '💡 Views may not be created. Check migrations.', 'info');
      } else {
        addLog(setSupabaseResults, '✅ Database views are working', 'success');
      }

    } catch (err: any) {
      addLog(setSupabaseResults, `❌ Migration test error: ${err.message}`, 'error');
    }
  };

  // COMBINED TESTING (Basic + Enterprise features)
  const testEnterpriseFeatures = async () => {
    clearLogs(setEnterpriseResults);
    addLog(setEnterpriseResults, '🔄 Testing combined basic + enterprise features...', 'info');

    try {
      // Test enterprise dashboard view
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('user_dashboard')
        .select('*')
        .maybeSingle();

      if (dashboardData && !dashboardError) {
        addLog(setEnterpriseResults, '✅ Enterprise dashboard view working!', 'success');
        addLog(setEnterpriseResults, `📊 Account status: ${dashboardData?.account_status || 'unknown'}`, 'info');
        addLog(setEnterpriseResults, `🎯 Access level: ${dashboardData?.access_level || 'unknown'}`, 'info');
        addLog(setEnterpriseResults, `👤 User: ${dashboardData?.email || 'unknown'}`, 'info');
      } else {
        addLog(setEnterpriseResults, '⚠️ Enterprise dashboard not available', 'error');
        addLog(setEnterpriseResults, `Error: ${dashboardError?.message}`, 'error');
      }

      // Test user profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .maybeSingle();

      if (profileError) {
        addLog(setEnterpriseResults, `❌ User profiles table error: ${profileError.message}`, 'error');
      } else {
        addLog(setEnterpriseResults, '✅ User profiles table working', 'success');
        addLog(setEnterpriseResults, `👤 Profile: ${profileData?.email || 'unknown'}`, 'info');
      }

      // Test sync function
      const syncResult = await syncUserState();
      if (syncResult) {
        addLog(setEnterpriseResults, '✅ User state sync working', 'success');
      } else {
        addLog(setEnterpriseResults, '⚠️ User state sync failed', 'error');
      }

      // Test system metrics
      const { data: metrics, error: metricsError } = await supabase.rpc('get_system_metrics');
      if (metricsError) {
        addLog(setEnterpriseResults, `❌ System metrics error: ${metricsError.message}`, 'error');
      } else {
        addLog(setEnterpriseResults, '✅ System metrics available', 'success');
        addLog(setEnterpriseResults, `👥 Total users: ${metrics?.total_users || 0}`, 'info');
        addLog(setEnterpriseResults, `🔄 Active trials: ${metrics?.active_trials || 0}`, 'info');
        addLog(setEnterpriseResults, `💳 Active subscriptions: ${metrics?.active_subscriptions || 0}`, 'info');
      }

      addLog(setEnterpriseResults, '🎉 Enterprise features fully operational!', 'success');

    } catch (err: any) {
      addLog(setEnterpriseResults, `❌ Enterprise test error: ${err.message}`, 'error');
    }
  };

  const createTestUser = async () => {
    addLog(setSupabaseResults, `🔄 Creating user: ${testEmail}`, 'info');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      if (error) {
        addLog(setSupabaseResults, `❌ User creation failed: ${error.message}`, 'error');
      } else {
        addLog(setSupabaseResults, '✅ User created successfully!', 'success');
        addLog(setSupabaseResults, `👤 User ID: ${data.user?.id}`, 'success');
        addLog(setSupabaseResults, `📧 Email: ${data.user?.email}`, 'success');
        
        // Automatically create Axie Studio user
        setTimeout(() => createAxieStudioUser(), 1000);
      }
    } catch (err: any) {
      addLog(setSupabaseResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  const signInTestUser = async () => {
    addLog(setSupabaseResults, `🔄 Signing in user: ${testEmail}`, 'info');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (error) {
        addLog(setSupabaseResults, `❌ Sign in failed: ${error.message}`, 'error');
      } else {
        addLog(setSupabaseResults, '✅ User signed in successfully!', 'success');
        addLog(setSupabaseResults, `👤 User ID: ${data.user?.id}`, 'success');
      }
    } catch (err: any) {
      addLog(setSupabaseResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  // 2. AXIE STUDIO TESTING
  const testAxieStudioConnection = async () => {
    clearLogs(setAxieResults);
    addLog(setAxieResults, '🔄 Testing Axie Studio API connection...', 'info');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_AXIESTUDIO_APP_URL}/api/v1/`, {
        method: 'GET',
      });
      
      if (response.ok) {
        addLog(setAxieResults, '✅ Axie Studio API is accessible!', 'success');
        addLog(setAxieResults, `🌐 Status: ${response.status}`, 'success');
      } else {
        addLog(setAxieResults, `⚠️ API responded with status: ${response.status}`, 'error');
      }
    } catch (err: any) {
      addLog(setAxieResults, `❌ Connection failed: ${err.message}`, 'error');
    }
  };

  const createAxieStudioUser = async () => {
    if (!user) {
      addLog(setAxieResults, '❌ No Supabase user found. Create user first.', 'error');
      return;
    }
    
    addLog(setAxieResults, `🔄 Creating Axie Studio user for: ${user.email}`, 'info');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        addLog(setAxieResults, '❌ No active session found', 'error');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          password: 'TempPassword123!'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        addLog(setAxieResults, '✅ Axie Studio user created successfully!', 'success');
        addLog(setAxieResults, `📧 Email: ${user.email}`, 'success');
      } else {
        addLog(setAxieResults, `❌ Creation failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      addLog(setAxieResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  const deleteAxieStudioUser = async () => {
    if (!user) {
      addLog(setAxieResults, '❌ No Supabase user found.', 'error');
      return;
    }
    
    addLog(setAxieResults, `🔄 Deleting Axie Studio user: ${user.email}`, 'info');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        addLog(setAxieResults, '❌ No active session found', 'error');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        addLog(setAxieResults, '✅ Axie Studio user deleted successfully!', 'success');
      } else {
        addLog(setAxieResults, `❌ Deletion failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      addLog(setAxieResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  // 3. STRIPE TESTING
  const testStripeConnection = async () => {
    clearLogs(setStripeResults);
    addLog(setStripeResults, '🔄 Testing Stripe connection...', 'info');
    
    try {
      if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        addLog(setStripeResults, '✅ Stripe publishable key loaded!', 'success');
        addLog(setStripeResults, `🔑 Key: ${import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...`, 'success');
      } else {
        addLog(setStripeResults, '❌ Stripe publishable key missing', 'error');
      }
    } catch (err: any) {
      addLog(setStripeResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  const createCheckoutSession = async () => {
    if (!user) {
      addLog(setStripeResults, '❌ No user signed in. Please sign in first.', 'error');
      return;
    }
    
    addLog(setStripeResults, '🔄 Creating Stripe checkout session...', 'info');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        addLog(setStripeResults, '❌ No active session found', 'error');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`,
          mode: 'subscription'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        addLog(setStripeResults, '✅ Checkout session created successfully!', 'success');
        addLog(setStripeResults, `🔗 Session ID: ${result.sessionId}`, 'success');
        addLog(setStripeResults, `🌐 Checkout URL: ${result.url}`, 'success');
        
        if (window.confirm('Open Stripe checkout page?')) {
          window.open(result.url, '_blank');
        }
      } else {
        addLog(setStripeResults, `❌ Checkout creation failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      addLog(setStripeResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  // 4. FULL INTEGRATION TEST
  const runFullIntegrationTest = async () => {
    clearLogs(setIntegrationResults);
    addLog(setIntegrationResults, '🚀 Starting full integration test...', 'info');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    try {
      // Step 1: Create Supabase user
      addLog(setIntegrationResults, '1️⃣ Creating Supabase user...', 'info');
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      if (userError) throw new Error(`Supabase user creation failed: ${userError.message}`);
      
      addLog(setIntegrationResults, '✅ Supabase user created', 'success');
      
      // Wait for session
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Create Axie Studio user
      addLog(setIntegrationResults, '2️⃣ Creating Axie Studio user...', 'info');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('No active session found');
      
      const axieResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          password: testPassword
        })
      });
      
      const axieResult = await axieResponse.json();
      if (!axieResponse.ok) throw new Error(`Axie Studio creation failed: ${axieResult.error}`);
      
      addLog(setIntegrationResults, '✅ Axie Studio user created', 'success');
      
      // Step 3: Test Stripe checkout
      addLog(setIntegrationResults, '3️⃣ Testing Stripe checkout...', 'info');
      const stripeResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`,
          mode: 'subscription'
        })
      });
      
      const stripeResult = await stripeResponse.json();
      if (!stripeResponse.ok) throw new Error(`Stripe checkout failed: ${stripeResult.error}`);
      
      addLog(setIntegrationResults, '✅ Stripe checkout session created', 'success');
      addLog(setIntegrationResults, '4️⃣ Integration test completed successfully! 🎉', 'success');
      addLog(setIntegrationResults, `📧 Test user: ${testEmail}`, 'success');
      addLog(setIntegrationResults, `🔗 Checkout URL: ${stripeResult.url}`, 'success');
      
    } catch (err: any) {
      addLog(setIntegrationResults, `❌ Integration test failed: ${err.message}`, 'error');
    }
  };

  const LogDisplay = ({ results, title }: { results: TestResult[], title: string }) => (
    <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
      <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">{title}</h3>
      <div className="bg-gray-50 border border-gray-300 rounded-none p-4 h-64 overflow-y-auto font-mono text-sm">
        {results.length === 0 ? (
          <p className="text-gray-500">No logs yet...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} className={`mb-2 ${
              result.type === 'success' ? 'text-green-600' : 
              result.type === 'error' ? 'text-red-600' : 'text-gray-700'
            }`}>
              [{result.timestamp}] {result.message}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4 uppercase tracking-wide">
            🧪 CONNECTION TESTING
          </h1>
          <p className="text-gray-600 text-lg">
            Test all integrations: Supabase, Axie Studio, and Stripe
          </p>
        </div>

        {/* Test User Inputs */}
        <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-8">
          <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">Test User Credentials</h3>
          <div className="flex gap-4">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="px-4 py-2 border-2 border-black rounded-none"
            />
            <input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="password123"
              className="px-4 py-2 border-2 border-black rounded-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Supabase Testing */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                1. 🗄️ SUPABASE TESTING
              </h3>
              <div className="space-y-2">
                <button
                  onClick={testSupabaseConnection}
                  className="bg-black text-white px-4 py-2 rounded-none font-bold hover:bg-gray-800 mr-2"
                >
                  Test Connection
                </button>
                <button
                  onClick={testDatabaseMigrations}
                  className="bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700 mr-2"
                >
                  Check Migrations
                </button>
                <button
                  onClick={createTestUser}
                  className="bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700 mr-2"
                >
                  Create User
                </button>
                <button
                  onClick={signInTestUser}
                  className="bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700"
                >
                  Sign In User
                </button>
              </div>
            </div>
            <LogDisplay results={supabaseResults} title="Supabase Logs" />
          </div>

          {/* Axie Studio Testing */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                2. 🎯 AXIE STUDIO TESTING
              </h3>
              <div className="space-y-2">
                <button
                  onClick={testAxieStudioConnection}
                  className="bg-black text-white px-4 py-2 rounded-none font-bold hover:bg-gray-800 mr-2"
                >
                  Test API
                </button>
                <button
                  onClick={createAxieStudioUser}
                  className="bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700 mr-2"
                >
                  Create User
                </button>
                <button
                  onClick={deleteAxieStudioUser}
                  className="bg-red-600 text-white px-4 py-2 rounded-none font-bold hover:bg-red-700"
                >
                  Delete User
                </button>
              </div>
            </div>
            <LogDisplay results={axieResults} title="Axie Studio Logs" />
          </div>

          {/* Stripe Testing */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                3. 💳 STRIPE TESTING
              </h3>
              <div className="space-y-2">
                <button
                  onClick={testStripeConnection}
                  className="bg-black text-white px-4 py-2 rounded-none font-bold hover:bg-gray-800 mr-2"
                >
                  Test Connection
                </button>
                <button
                  onClick={createCheckoutSession}
                  className="bg-purple-600 text-white px-4 py-2 rounded-none font-bold hover:bg-purple-700"
                >
                  Create Checkout
                </button>
              </div>
            </div>
            <LogDisplay results={stripeResults} title="Stripe Logs" />
          </div>

          {/* Integration Testing */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                4. 🔗 FULL INTEGRATION
              </h3>
              <button
                onClick={runFullIntegrationTest}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-none font-bold hover:from-purple-700 hover:to-blue-700"
              >
                🚀 Run Full Test
              </button>
            </div>
            <LogDisplay results={integrationResults} title="Integration Logs" />
          </div>

          {/* Enterprise Testing - NEW OPTIONAL FEATURE */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                5. 🏢 ENTERPRISE FEATURES
              </h3>
              <div className="space-y-2">
                <button
                  onClick={testEnterpriseFeatures}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-none font-bold hover:from-orange-700 hover:to-red-700"
                >
                  🔍 Test Enterprise
                </button>
                {isEnterpriseEnabled && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 text-sm">
                      ✅ Enterprise features are enabled!
                    </p>
                  </div>
                )}
                {!isEnterpriseEnabled && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 text-sm">
                      ℹ️ Enterprise features available but not enabled. Run ENTERPRISE_USER_MANAGEMENT.sql to activate.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <LogDisplay results={enterpriseResults} title="Enterprise Logs" />
          </div>
        </div>
      </div>
    </div>
  );
}