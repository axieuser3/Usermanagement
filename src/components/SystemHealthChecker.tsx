import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { checkDatabaseStatus, generateDatabaseReport, isDatabaseHealthy } from '../utils/databaseChecker';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
}

export function SystemHealthChecker() {
  const { user } = useAuth();
  const { enterpriseState, isEnterpriseEnabled, syncUserState } = useEnterpriseUser();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // 1. Test Supabase Connection
      addResult({ name: 'Supabase Connection', status: 'loading', message: 'Testing connection...' });
      
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          addResult({ 
            name: 'Supabase Connection', 
            status: 'success', 
            message: 'Connected and authenticated',
            details: `User: ${authUser.email}`
          });
        } else {
          addResult({ 
            name: 'Supabase Connection', 
            status: 'warning', 
            message: 'Connected but not authenticated'
          });
        }
      } catch (err) {
        addResult({ 
          name: 'Supabase Connection', 
          status: 'error', 
          message: 'Connection failed',
          details: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // 2. Test Database Health
      addResult({ name: 'Database Health', status: 'loading', message: 'Checking database...' });
      
      try {
        const dbStatus = await checkDatabaseStatus();
        const isHealthy = await isDatabaseHealthy();
        
        if (isHealthy) {
          addResult({ 
            name: 'Database Health', 
            status: 'success', 
            message: 'All critical components working',
            details: generateDatabaseReport(dbStatus)
          });
        } else {
          addResult({ 
            name: 'Database Health', 
            status: 'warning', 
            message: 'Some components missing',
            details: generateDatabaseReport(dbStatus)
          });
        }
      } catch (err) {
        addResult({ 
          name: 'Database Health', 
          status: 'error', 
          message: 'Database check failed',
          details: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // 3. Test Enterprise Features
      addResult({ name: 'Enterprise Features', status: 'loading', message: 'Testing enterprise system...' });
      
      if (isEnterpriseEnabled && enterpriseState) {
        addResult({ 
          name: 'Enterprise Features', 
          status: 'success', 
          message: 'Enterprise system active',
          details: `Access Level: ${enterpriseState.access_level}, Status: ${enterpriseState.account_status}`
        });
      } else {
        addResult({ 
          name: 'Enterprise Features', 
          status: 'warning', 
          message: 'Enterprise features not available - using basic mode'
        });
      }

      // 4. Test AxieStudio Connection & API
      addResult({ name: 'AxieStudio Connection', status: 'loading', message: 'Testing AxieStudio...' });

      try {
        const axieUrl = import.meta.env.VITE_AXIESTUDIO_APP_URL;
        if (!axieUrl) {
          throw new Error('AxieStudio URL not configured');
        }

        // Test basic connectivity
        const response = await fetch(axieUrl, {
          method: 'HEAD',
          mode: 'no-cors'
        });

        addResult({
          name: 'AxieStudio Connection',
          status: 'success',
          message: 'AxieStudio is reachable',
          details: `URL: ${axieUrl}`
        });

        // Test API authentication
        addResult({ name: 'AxieStudio API Auth', status: 'loading', message: 'Testing API authentication...' });

        if (user) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const apiTestResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: 'test_api',
                email: 'test@example.com',
                password: 'testpass123'
              }),
            });

            const apiResult = await apiTestResponse.text();

            if (apiTestResponse.ok) {
              addResult({
                name: 'AxieStudio API Auth',
                status: 'success',
                message: 'API authentication working',
                details: apiResult
              });
            } else {
              addResult({
                name: 'AxieStudio API Auth',
                status: 'error',
                message: 'API authentication failed',
                details: `Status: ${apiTestResponse.status}, Response: ${apiResult}`
              });
            }
          } else {
            addResult({
              name: 'AxieStudio API Auth',
              status: 'warning',
              message: 'No session available for API test'
            });
          }
        } else {
          addResult({
            name: 'AxieStudio API Auth',
            status: 'warning',
            message: 'No user logged in for API test'
          });
        }
      } catch (err) {
        addResult({
          name: 'AxieStudio Connection',
          status: 'error',
          message: 'AxieStudio connection failed',
          details: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // 5. Test Stripe Configuration
      addResult({ name: 'Stripe Configuration', status: 'loading', message: 'Checking Stripe...' });
      
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const stripePriceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
      
      if (stripeKey && stripePriceId) {
        addResult({ 
          name: 'Stripe Configuration', 
          status: 'success', 
          message: 'Stripe properly configured',
          details: `Key: ${stripeKey.substring(0, 20)}..., Price ID: ${stripePriceId}`
        });
      } else {
        addResult({ 
          name: 'Stripe Configuration', 
          status: 'error', 
          message: 'Stripe configuration incomplete',
          details: `Missing: ${!stripeKey ? 'publishable key' : ''} ${!stripePriceId ? 'price ID' : ''}`
        });
      }

      // 6. Test User Sync (if enterprise enabled)
      if (isEnterpriseEnabled && user) {
        addResult({ name: 'User Sync', status: 'loading', message: 'Testing user sync...' });
        
        try {
          const syncResult = await syncUserState();
          if (syncResult) {
            addResult({ 
              name: 'User Sync', 
              status: 'success', 
              message: 'User state sync working'
            });
          } else {
            addResult({ 
              name: 'User Sync', 
              status: 'warning', 
              message: 'User sync failed or not available'
            });
          }
        } catch (err) {
          addResult({ 
            name: 'User Sync', 
            status: 'error', 
            message: 'User sync error',
            details: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black uppercase tracking-wide">
          🔍 System Health Check
        </h2>
        <button
          onClick={runComprehensiveTest}
          disabled={isRunning}
          className="bg-black text-white px-6 py-2 rounded-none font-bold hover:bg-gray-800 disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-none p-4">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(result.status)}
                <span className="font-bold text-black">{result.name}</span>
              </div>
              <p className="text-gray-700 mb-2">{result.message}</p>
              {result.details && (
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium">Details</summary>
                  <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs overflow-x-auto">
                    {result.details}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Click "Run Tests" to check system health
        </div>
      )}
    </div>
  );
}
