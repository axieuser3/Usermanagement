import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { supabase } from '../lib/supabase';
import { checkDatabaseStatus, generateDatabaseReport, isDatabaseHealthy } from '../utils/databaseChecker';
import { isSuperAdmin, SUPER_ADMIN_UID } from '../utils/adminAuth';
import { Settings, Database, Users, Activity, TestTube, Shield } from 'lucide-react';

interface TestResult {
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: string;
}

export function AdminPage() {
  const { user } = useAuth();
  const { enterpriseState, isEnterpriseEnabled, syncUserState } = useEnterpriseUser();
  const [supabaseResults, setSupabaseResults] = useState<TestResult[]>([]);
  const [axieResults, setAxieResults] = useState<TestResult[]>([]);
  const [stripeResults, setStripeResults] = useState<TestResult[]>([]);
  const [integrationResults, setIntegrationResults] = useState<TestResult[]>([]);
  const [enterpriseResults, setEnterpriseResults] = useState<TestResult[]>([]);
  
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');

  // Helper functions
  const addLog = (setter: React.Dispatch<React.SetStateAction<TestResult[]>>, message: string, type: TestResult['type']) => {
    setter(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const clearLogs = (setter: React.Dispatch<React.SetStateAction<TestResult[]>>) => {
    setter([]);
  };

  // Check if user is super admin (only specific Supabase UID allowed)
  const isAdmin = isSuperAdmin(user?.id);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border-2 border-red-500 rounded-none shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">ACCESS DENIED</h1>
          </div>
          <p className="text-gray-600 mb-4">
            Only the super administrator can access this panel.
          </p>
          <p className="text-sm text-gray-500">
            User ID: {user?.id || 'Not authenticated'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Required: {SUPER_ADMIN_UID}
          </p>
        </div>
      </div>
    );
  }

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
      addLog(setSupabaseResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  const testDatabaseMigrations = async () => {
    clearLogs(setSupabaseResults);
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

  // Test database relationships
  const testDatabaseRelationships = async () => {
    clearLogs(setSupabaseResults);
    addLog(setSupabaseResults, '🔄 Testing database relationships...', 'info');

    try {
      // Test the stripe_customers to stripe_subscriptions relationship
      const { data: relationshipTest, error: relationshipError } = await supabase
        .from('stripe_customers')
        .select(`
          customer_id,
          stripe_subscriptions (
            subscription_id,
            status,
            price_id
          )
        `)
        .limit(1);

      if (relationshipError) {
        addLog(setSupabaseResults, `❌ Relationship test failed: ${relationshipError.message}`, 'error');
        addLog(setSupabaseResults, '💡 Foreign key constraint may be missing between stripe_customers and stripe_subscriptions', 'info');
      } else {
        addLog(setSupabaseResults, '✅ Database relationships are working correctly', 'success');
      }

      // Test the view that uses the relationship
      const { data: viewData, error: viewError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1);

      if (viewError) {
        addLog(setSupabaseResults, `❌ stripe_user_subscriptions view error: ${viewError.message}`, 'error');
      } else {
        addLog(setSupabaseResults, '✅ stripe_user_subscriptions view is working', 'success');
      }

    } catch (err: any) {
      addLog(setSupabaseResults, `❌ Relationship test error: ${err.message}`, 'error');
    }
  };

  // ENTERPRISE TESTING
  const testEnterpriseFeatures = async () => {
    clearLogs(setEnterpriseResults);
    addLog(setEnterpriseResults, '🔄 Testing enterprise features...', 'info');

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

    } catch (err: any) {
      addLog(setEnterpriseResults, `❌ Enterprise test error: ${err.message}`, 'error');
    }
  };

  // 2. AXIE STUDIO TESTING
  const testAxieStudioConnection = async () => {
    clearLogs(setAxieResults);
    addLog(setAxieResults, '🔄 Testing Axie Studio connection...', 'info');
    
    try {
      const axieUrl = import.meta.env.VITE_AXIESTUDIO_APP_URL || 'https://axiestudio-axiestudio-ttefi.ondigitalocean.app';
      addLog(setAxieResults, `🌐 Testing connection to: ${axieUrl}`, 'info');
      
      const response = await fetch(axieUrl, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      addLog(setAxieResults, '✅ Axie Studio is reachable!', 'success');
      addLog(setAxieResults, `🔗 URL: ${axieUrl}`, 'success');
    } catch (err: any) {
      addLog(setAxieResults, `❌ Connection failed: ${err.message}`, 'error');
      addLog(setAxieResults, '💡 Check if the Axie Studio app is running', 'info');
    }
  };

  const createAxieStudioAccount = async () => {
    if (!user) {
      addLog(setAxieResults, '❌ No user signed in. Please sign in first.', 'error');
      return;
    }

    clearLogs(setAxieResults);
    addLog(setAxieResults, '🔄 Creating Axie Studio account...', 'info');

    try {
      const { data, error } = await supabase.functions.invoke('axie-studio-account', {
        body: {
          email: testEmail,
          password: testPassword,
          action: 'create'
        }
      });

      if (error) {
        addLog(setAxieResults, `❌ Error: ${error.message}`, 'error');
        return;
      }

      if (data?.success) {
        addLog(setAxieResults, '✅ Axie Studio account created successfully!', 'success');
        addLog(setAxieResults, `👤 User ID: ${data.user_id}`, 'success');
        addLog(setAxieResults, `📧 Email: ${data.email}`, 'success');
      } else {
        addLog(setAxieResults, `❌ Failed: ${data?.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      addLog(setAxieResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  // STRIPE TESTING
  const testStripeIntegration = async () => {
    clearLogs(setStripeResults);
    addLog(setStripeResults, '🔄 Testing Stripe integration...', 'info');

    try {
      if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
        addLog(setStripeResults, '✅ Stripe publishable key loaded!', 'success');
        addLog(setStripeResults, `🔑 Key: ${import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...`, 'success');
      } else {
        addLog(setStripeResults, '❌ Stripe publishable key missing', 'error');
      }

      if (import.meta.env.VITE_STRIPE_PRO_PRICE_ID) {
        addLog(setStripeResults, '✅ Stripe price ID configured!', 'success');
        addLog(setStripeResults, `💰 Price ID: ${import.meta.env.VITE_STRIPE_PRO_PRICE_ID}`, 'success');
      } else {
        addLog(setStripeResults, '❌ Stripe price ID missing', 'error');
      }
    } catch (err: any) {
      addLog(setStripeResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  const createStripeCheckout = async () => {
    if (!user) {
      addLog(setStripeResults, '❌ No user signed in. Please sign in first.', 'error');
      return;
    }

    clearLogs(setStripeResults);
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
          cancel_url: `${window.location.origin}/products`,
          mode: 'subscription'
        })
      });

      const result = await response.json();

      if (response.ok) {
        addLog(setStripeResults, '✅ Checkout session created successfully!', 'success');
        addLog(setStripeResults, `🔗 Session ID: ${result.sessionId}`, 'success');
        addLog(setStripeResults, `💳 Checkout URL: ${result.url}`, 'info');
        addLog(setStripeResults, '💡 You can test this URL in a new tab', 'info');
      } else {
        addLog(setStripeResults, `❌ Checkout failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      addLog(setStripeResults, `❌ Error: ${err.message}`, 'error');
    }
  };

  // COMPREHENSIVE INTEGRATION TEST
  const testFullIntegration = async () => {
    clearLogs(setIntegrationResults);
    addLog(setIntegrationResults, '🚀 Starting comprehensive integration test...', 'info');

    try {
      // Step 1: Test Supabase connection
      addLog(setIntegrationResults, '1️⃣ Testing Supabase connection...', 'info');
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        addLog(setIntegrationResults, '✅ Supabase authentication working', 'success');
      } else {
        throw new Error('Supabase authentication failed');
      }

      // Step 2: Test database relationships
      addLog(setIntegrationResults, '2️⃣ Testing database relationships...', 'info');
      const { data: relationshipTest, error: relationshipError } = await supabase
        .from('stripe_customers')
        .select(`
          customer_id,
          stripe_subscriptions (
            subscription_id,
            status
          )
        `)
        .limit(1);

      if (relationshipError) {
        addLog(setIntegrationResults, `⚠️ Database relationship issue: ${relationshipError.message}`, 'error');
      } else {
        addLog(setIntegrationResults, '✅ Database relationships working', 'success');
      }

      // Step 3: Test Axie Studio connection
      addLog(setIntegrationResults, '3️⃣ Testing Axie Studio connection...', 'info');
      const axieUrl = import.meta.env.VITE_AXIESTUDIO_APP_URL || 'https://axiestudio-axiestudio-ttefi.ondigitalocean.app';
      try {
        await fetch(axieUrl, { method: 'HEAD', mode: 'no-cors' });
        addLog(setIntegrationResults, '✅ Axie Studio is reachable', 'success');
      } catch {
        addLog(setIntegrationResults, '⚠️ Axie Studio connection issue', 'error');
      }

      // Step 4: Test Stripe configuration
      addLog(setIntegrationResults, '4️⃣ Testing Stripe configuration...', 'info');
      if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && import.meta.env.VITE_STRIPE_PRO_PRICE_ID) {
        addLog(setIntegrationResults, '✅ Stripe configuration complete', 'success');
      } else {
        addLog(setIntegrationResults, '❌ Stripe configuration incomplete', 'error');
      }

      addLog(setIntegrationResults, '🎉 Integration test completed!', 'success');

    } catch (err: any) {
      addLog(setIntegrationResults, `❌ Integration test failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-black shadow-[0_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-black" />
              <h1 className="text-3xl font-bold text-black uppercase tracking-wide">
                ADMIN PANEL
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Database</p>
                  <p className="font-bold text-black">Connected</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Enterprise</p>
                  <p className="font-bold text-black">{isEnterpriseEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Status</p>
                  <p className="font-bold text-black">Active</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
              <div className="flex items-center gap-3">
                <TestTube className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Testing</p>
                  <p className="font-bold text-black">Ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Interface */}
          <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-wide">
              🧪 SYSTEM TESTING
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Database Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🗄️ DATABASE TESTING
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
                      onClick={testDatabaseRelationships}
                      className="bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700"
                    >
                      Test Relationships
                    </button>
                  </div>
                </div>
                <LogDisplay results={supabaseResults} title="Database Logs" />
              </div>

              {/* Enterprise Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🏢 ENTERPRISE TESTING
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
                  </div>
                </div>
                <LogDisplay results={enterpriseResults} title="Enterprise Logs" />
              </div>
            </div>
          </div>

          {/* Testing Interface */}
          <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-wide">
              🧪 SYSTEM TESTING
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Database Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🗄️ DATABASE TESTING
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
                      onClick={testDatabaseRelationships}
                      className="bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700"
                    >
                      Test Relationships
                    </button>
                  </div>
                </div>
                <LogDisplay results={supabaseResults} title="Database Logs" />
              </div>

              {/* Axie Studio Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🎯 AXIE STUDIO TESTING
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={testAxieStudioConnection}
                      className="bg-purple-600 text-white px-4 py-2 rounded-none font-bold hover:bg-purple-700 mr-2"
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={createAxieStudioAccount}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-none font-bold hover:bg-indigo-700"
                    >
                      Create Account
                    </button>
                    <div className="mt-4 space-y-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="Test email"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-none focus:border-black"
                      />
                      <input
                        type="password"
                        value={testPassword}
                        onChange={(e) => setTestPassword(e.target.value)}
                        placeholder="Test password"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>
                <LogDisplay results={axieResults} title="Axie Studio Logs" />
              </div>

              {/* Stripe Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    💳 STRIPE TESTING
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={testStripeIntegration}
                      className="bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700 mr-2"
                    >
                      Test Config
                    </button>
                    <button
                      onClick={createStripeCheckout}
                      className="bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700"
                    >
                      Create Checkout
                    </button>
                  </div>
                </div>
                <LogDisplay results={stripeResults} title="Stripe Logs" />
              </div>

              {/* Integration Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🔗 INTEGRATION TESTING
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={testFullIntegration}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-none font-bold hover:from-purple-700 hover:to-blue-700"
                    >
                      🚀 Test All Integrations
                    </button>
                  </div>
                </div>
                <LogDisplay results={integrationResults} title="Integration Logs" />
              </div>

              {/* Enterprise Testing */}
              <div className="space-y-6">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-none p-6">
                  <h3 className="text-xl font-bold text-black mb-4 uppercase tracking-wide">
                    🏢 ENTERPRISE TESTING
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
                          ℹ️ Enterprise features available but not enabled.
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
      </main>
    </div>
  );
}

// Log Display Component
function LogDisplay({ results, title }: { results: TestResult[]; title: string }) {
  return (
    <div className="bg-black text-green-400 p-4 rounded-none font-mono text-sm h-64 overflow-y-auto">
      <div className="text-white font-bold mb-2 uppercase tracking-wide">{title}</div>
      {results.length === 0 ? (
        <div className="text-gray-500">No logs yet...</div>
      ) : (
        results.map((result, index) => (
          <div key={index} className={`mb-1 ${
            result.type === 'success' ? 'text-green-400' : 
            result.type === 'error' ? 'text-red-400' : 
            'text-blue-400'
          }`}>
            <span className="text-gray-500">[{result.timestamp}]</span> {result.message}
          </div>
        ))
      )}
    </div>
  );
}
