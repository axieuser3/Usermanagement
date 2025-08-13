import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ExternalLink, Play, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface DebugStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  timestamp?: string;
}

export function AxieStudioDebugger() {
  const { user } = useAuth();
  const [testEmail, setTestEmail] = useState('debug@test.com');
  const [testPassword, setTestPassword] = useState('debugpass123');
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addStep = (step: Partial<DebugStep>) => {
    setDebugSteps(prev => {
      const existing = prev.find(s => s.step === step.step);
      if (existing) {
        return prev.map(s => s.step === step.step ? { ...s, ...step, timestamp: new Date().toLocaleTimeString() } : s);
      }
      return [...prev, { ...step, timestamp: new Date().toLocaleTimeString() } as DebugStep];
    });
  };

  const clearSteps = () => {
    setDebugSteps([]);
  };

  const runFullDiagnostic = async () => {
    if (!user) {
      alert('Please log in first to run diagnostics');
      return;
    }

    setIsRunning(true);
    clearSteps();

    try {
      // Step 1: Check environment variables
      addStep({ step: 'Environment Check', status: 'running', message: 'Checking configuration...' });
      
      const axieUrl = import.meta.env.VITE_AXIESTUDIO_APP_URL;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!axieUrl || !supabaseUrl) {
        addStep({ 
          step: 'Environment Check', 
          status: 'error', 
          message: 'Missing environment variables',
          details: { axieUrl: !!axieUrl, supabaseUrl: !!supabaseUrl }
        });
        return;
      }

      addStep({ 
        step: 'Environment Check', 
        status: 'success', 
        message: 'Environment variables configured',
        details: { axieUrl, supabaseUrl }
      });

      // Step 2: Check Supabase session
      addStep({ step: 'Session Check', status: 'running', message: 'Checking authentication...' });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        addStep({ 
          step: 'Session Check', 
          status: 'error', 
          message: 'No valid session found',
          details: sessionError
        });
        return;
      }

      addStep({ 
        step: 'Session Check', 
        status: 'success', 
        message: 'Valid session found',
        details: { userId: session.user.id, email: session.user.email }
      });

      // Step 3: Test AxieStudio API endpoint directly
      addStep({ step: 'API Endpoint Test', status: 'running', message: 'Testing AxieStudio API...' });
      
      try {
        const directApiResponse = await fetch(`${axieUrl}/api/v1/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: 'stefan@axiestudio.se',
            password: 'STEfanjohn!12'
          })
        });

        if (directApiResponse.ok) {
          const loginData = await directApiResponse.json();
          addStep({ 
            step: 'API Endpoint Test', 
            status: 'success', 
            message: 'AxieStudio API is responding',
            details: { status: directApiResponse.status, hasToken: !!loginData.access_token }
          });
        } else {
          const errorText = await directApiResponse.text();
          addStep({ 
            step: 'API Endpoint Test', 
            status: 'error', 
            message: 'AxieStudio API login failed',
            details: { status: directApiResponse.status, error: errorText }
          });
        }
      } catch (apiError) {
        addStep({ 
          step: 'API Endpoint Test', 
          status: 'error', 
          message: 'AxieStudio API unreachable',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
      }

      // Step 4: Test Supabase function
      addStep({ step: 'Function Test', status: 'running', message: 'Testing Supabase function...' });
      
      try {
        const functionResponse = await fetch(`${supabaseUrl}/functions/v1/axie-studio-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'create',
            email: testEmail,
            password: testPassword
          }),
        });

        const functionResult = await functionResponse.text();
        let parsedResult;
        try {
          parsedResult = JSON.parse(functionResult);
        } catch {
          parsedResult = functionResult;
        }

        if (functionResponse.ok) {
          addStep({ 
            step: 'Function Test', 
            status: 'success', 
            message: 'Supabase function executed successfully',
            details: { status: functionResponse.status, result: parsedResult }
          });
        } else {
          addStep({ 
            step: 'Function Test', 
            status: 'error', 
            message: 'Supabase function failed',
            details: { status: functionResponse.status, error: parsedResult }
          });
        }
      } catch (funcError) {
        addStep({ 
          step: 'Function Test', 
          status: 'error', 
          message: 'Supabase function error',
          details: funcError instanceof Error ? funcError.message : 'Unknown error'
        });
      }

      // Step 5: Check AxieStudio admin panel
      addStep({ step: 'Admin Panel Check', status: 'running', message: 'Checking admin panel access...' });
      
      try {
        const adminResponse = await fetch(`${axieUrl}/admin`, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        addStep({ 
          step: 'Admin Panel Check', 
          status: 'success', 
          message: 'Admin panel is accessible',
          details: { url: `${axieUrl}/admin` }
        });
      } catch (adminError) {
        addStep({ 
          step: 'Admin Panel Check', 
          status: 'error', 
          message: 'Admin panel check failed',
          details: adminError instanceof Error ? adminError.message : 'Unknown error'
        });
      }

    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'pending':
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ExternalLink className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-black uppercase tracking-wide">
            AxieStudio Debugger
          </h3>
        </div>
        <a
          href="https://axiestudio-axiestudio-ttefi.ondigitalocean.app/admin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-none font-bold hover:bg-purple-700"
        >
          <Eye className="w-4 h-4" />
          View Admin Panel
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
      </div>

      <button
        onClick={runFullDiagnostic}
        disabled={isRunning || !user}
        className="w-full bg-purple-600 text-white px-6 py-3 rounded-none font-bold hover:bg-purple-700 disabled:opacity-50 mb-6"
      >
        {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic'}
      </button>

      {debugSteps.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-bold text-black uppercase tracking-wide">Diagnostic Results:</h4>
          {debugSteps.map((step, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-none p-4">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(step.status)}
                <span className="font-bold text-black">{step.step}</span>
                {step.timestamp && (
                  <span className="text-xs text-gray-500">[{step.timestamp}]</span>
                )}
              </div>
              <p className="text-gray-700 mb-2">{step.message}</p>
              {step.details && (
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium">Details</summary>
                  <pre className="mt-2 p-2 bg-gray-50 border rounded text-xs overflow-x-auto">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {debugSteps.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Click "Run Full Diagnostic" to debug AxieStudio integration
        </div>
      )}
    </div>
  );
}
