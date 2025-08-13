import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              email_confirm: false
            }
          },
        });

        if (error) throw error;

        // Create Axie Studio account after successful Supabase signup
        try {
          console.log('🔄 Creating AxieStudio account...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const axieResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: 'create',
                password: password
              }),
            });

            const axieResult = await axieResponse.json();

            if (axieResponse.ok && axieResult.success) {
              console.log('✅ AxieStudio account created:', axieResult);
              setMessage({
                type: 'success',
                text: `Account created successfully! AxieStudio user ID: ${axieResult.user_id}. Check https://axiestudio-axiestudio-ttefi.ondigitalocean.app/admin to verify the account was created.`,
              });
            } else {
              console.error('❌ AxieStudio account creation failed:', axieResult);
              setMessage({
                type: 'success',
                text: 'Account created successfully! Note: AxieStudio account creation had issues. You can still sign in and start your trial.',
              });
            }
          } else {
            console.error('❌ No session available for AxieStudio account creation');
            setMessage({
              type: 'success',
              text: 'Account created successfully! Note: AxieStudio account will be created on first login.',
            });
          }
        } catch (axieError) {
          console.error('❌ Failed to create Axie Studio account:', axieError);
          setMessage({
            type: 'success',
            text: 'Account created successfully! Note: AxieStudio account creation failed but you can still sign in.',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-none mb-4">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">
            {mode === 'login' ? 'SIGN IN' : 'SIGN UP'}
          </h1>
          <p className="text-gray-600">
            {mode === 'login' 
              ? 'Access your account' 
              : 'Create your account'
            }
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 border-2 border-black rounded-none flex items-center gap-3 ${
            message.type === 'error' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-none focus:outline-none focus:ring-0 focus:border-gray-600 transition-colors bg-white"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 border-2 border-black rounded-none focus:outline-none focus:ring-0 focus:border-gray-600 transition-colors bg-white"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-gray-500 uppercase tracking-wide">
                Min 6 characters
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 px-4 rounded-none font-bold uppercase tracking-wide hover:bg-gray-800 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {mode === 'login' ? 'SIGNING IN...' : 'CREATING...'}
              </div>
            ) : (
              mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={onToggleMode}
            className="mt-2 text-black font-bold hover:underline transition-all uppercase tracking-wide"
          >
            {mode === 'login' ? 'SIGN UP' : 'SIGN IN'}
          </button>
        </div>
      </div>
    </div>
  );
}