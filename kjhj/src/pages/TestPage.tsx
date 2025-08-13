import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { SystemHealthChecker } from '../components/SystemHealthChecker';
import { AxieStudioDebugger } from '../components/AxieStudioDebugger';
import { supabase } from '../lib/supabase';
import { TestTube, User, Database, CreditCard, ExternalLink } from 'lucide-react';

export function TestPage() {
  const { user } = useAuth();
  const { enterpriseState, isEnterpriseEnabled } = useEnterpriseUser();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test AxieStudio account creation
  const testAxieStudioAccount = async () => {
    clearTestResults();
    addTestResult('🔄 Testing AxieStudio account creation...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addTestResult('❌ No active session found');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          action: 'create'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addTestResult('✅ AxieStudio account created successfully!');
        addTestResult(`👤 User ID: ${result.user_id}`);
        addTestResult(`📧 Email: ${result.email}`);
      } else {
        addTestResult(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      addTestResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Test Stripe checkout
  const testStripeCheckout = async () => {
    clearTestResults();
    addTestResult('🔄 Testing Stripe checkout session...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addTestResult('❌ No active session found');
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
        addTestResult('✅ Checkout session created successfully!');
        addTestResult(`🔗 Session ID: ${result.sessionId}`);
        addTestResult(`💳 Checkout URL: ${result.url}`);
        addTestResult('💡 You can test this URL in a new tab');
      } else {
        addTestResult(`❌ Checkout failed: ${result.error}`);
      }
    } catch (err) {
      addTestResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Test user data sync
  const testUserSync = async () => {
    clearTestResults();
    addTestResult('🔄 Testing user data synchronization...');

    try {
      // Test basic user data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        addTestResult('✅ Supabase user data available');
        addTestResult(`👤 User ID: ${authUser.id}`);
        addTestResult(`📧 Email: ${authUser.email}`);
      }

      // Test enterprise state
      if (isEnterpriseEnabled && enterpriseState) {
        addTestResult('✅ Enterprise state available');
        addTestResult(`🎯 Access Level: ${enterpriseState.access_level}`);
        addTestResult(`📊 Account Status: ${enterpriseState.account_status}`);
        addTestResult(`⏰ Trial Days: ${enterpriseState.trial_days_remaining}`);
        
        if (enterpriseState.stripe_customer_id) {
          addTestResult(`💳 Stripe Customer: ${enterpriseState.stripe_customer_id}`);
        }
        
        if (enterpriseState.axie_studio_user_id) {
          addTestResult(`🎯 AxieStudio User: ${enterpriseState.axie_studio_user_id}`);
        }
      } else {
        addTestResult('⚠️ Enterprise features not available - using basic mode');
      }

    } catch (err) {
      addTestResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <TestTube className="w-8 h-8 text-black" />
            <h1 className="text-3xl font-bold text-black uppercase tracking-wide">
              System Testing Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Test all system integrations: Supabase, AxieStudio, and Stripe connections.
          </p>
          {user && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 text-sm">
                ✅ Logged in as: {user.email}
              </p>
            </div>
          )}
        </div>

        {/* System Health Checker */}
        <SystemHealthChecker />

        {/* AxieStudio Debugger */}
        <AxieStudioDebugger />

        {/* Manual Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AxieStudio Test */}
          <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-black uppercase">AxieStudio Test</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Email</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Password</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-none focus:border-black"
                />
              </div>
              <button
                onClick={testAxieStudioAccount}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-none font-bold hover:bg-purple-700"
              >
                Test AxieStudio Account Creation
              </button>
            </div>
          </div>

          {/* Stripe Test */}
          <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-black uppercase">Stripe Test</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test Stripe checkout session creation. This will create a real checkout URL.
              </p>
              <button
                onClick={testStripeCheckout}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-none font-bold hover:bg-green-700"
              >
                Test Stripe Checkout
              </button>
            </div>
          </div>

          {/* User Sync Test */}
          <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-black uppercase">User Sync Test</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test user data synchronization across all systems.
              </p>
              <button
                onClick={testUserSync}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-none font-bold hover:bg-blue-700"
              >
                Test User Synchronization
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-orange-600" />
              <h3 className="text-xl font-bold text-black uppercase">Test Results</h3>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-none font-mono text-sm h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500">No test results yet...</div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
