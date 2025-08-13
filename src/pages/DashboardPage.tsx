import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserAccess } from '../hooks/useUserAccess';
import { isSuperAdmin } from '../utils/adminAuth';

import { supabase } from '../lib/supabase';

import { SubscriptionStatus } from '../components/SubscriptionStatus';
import { TrialStatus } from '../components/TrialStatus';
import { AccountDeletionCountdown } from '../components/AccountDeletionCountdown';
import { ReturningUserStatus } from '../components/ReturningUserStatus';
import { Link } from 'react-router-dom';
import { Crown, Settings, LogOut, ShoppingBag, Zap, Trash2, Shield, AlertTriangle, User } from 'lucide-react';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const {
    accessStatus,
    hasAccess,
    isPaidUser,
    isTrialing,
    isFreeTrialing,
    isProtected
  } = useUserAccess();

  // Check if current user is super admin
  const isAdmin = isSuperAdmin(user?.id);





  const handleDeleteAccount = async () => {
    if (isProtected) {
      if (!confirm('You have an active subscription or trial. Deleting your account will also cancel your subscription. Are you sure you want to continue?')) {
        return;
      }
    }
    
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will remove your access to AI workflows.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Delete Axie Studio account first
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to delete Axie Studio account:', error);
    }

    // Sign out from Supabase (this will also clean up the session)
    await signOut();
  };



  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                <Crown className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-black uppercase tracking-wide">DASHBOARD</h1>
              {isProtected && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 border border-green-600 rounded-none">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">PROTECTED</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 font-medium uppercase tracking-wide">
                {user?.email}
                {isAdmin && (
                  <span className="ml-2 bg-red-600 text-white px-2 py-1 text-xs rounded-none font-bold">
                    SUPER ADMIN
                  </span>
                )}
              </span>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-none font-bold hover:bg-red-700 transition-colors uppercase tracking-wide text-xs"
                >
                  <Settings className="w-4 h-4" />
                  ADMIN PANEL
                </Link>
              )}

              <Link
                to="/account"
                className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-none font-bold hover:bg-gray-700 transition-colors uppercase tracking-wide text-xs"
              >
                <Settings className="w-4 h-4" />
                ACCOUNT
              </Link>

              <Link
                to="/products"
                className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-none font-bold hover:bg-gray-800 transition-colors uppercase tracking-wide text-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                PRODUCTS
              </Link>

              <button
                onClick={signOut}
                className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-medium uppercase tracking-wide"
              >
                <LogOut className="w-4 h-4" />
                SIGN OUT
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-black mb-4 uppercase tracking-wide">
            {hasAccess ? 'AI WORKFLOWS READY' : 'WELCOME TO AXIE STUDIO'}
          </h2>
          <p className="text-gray-600 text-lg">
            {hasAccess 
              ? 'Your AI workflow platform is active and ready to use.'
              : 'Start your 7-day free trial to access advanced AI workflow capabilities.'
            }
          </p>
        </div>

        {/* Account Deletion Countdown */}
        <div className="mb-8">
          <AccountDeletionCountdown />
        </div>

        {/* Returning User Status */}
        {user?.email && (
          <div className="mb-8">
            <ReturningUserStatus userEmail={user.email} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Access Status Overview */}
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                ACCESS STATUS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 border-2 rounded-none ${
                  hasAccess ? 'border-green-600 bg-green-50' : 'border-red-600 bg-red-50'
                }`}>
                  <p className={`font-bold uppercase tracking-wide ${
                    hasAccess ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {hasAccess ? 'ACTIVE ACCESS' : 'NO ACCESS'}
                  </p>
                  <p className={`text-sm ${hasAccess ? 'text-green-700' : 'text-red-700'}`}>
                    {accessStatus?.access_type.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                  </p>
                </div>
                <div className={`p-4 border-2 rounded-none ${
                  isProtected ? 'border-green-600 bg-green-50' : 'border-orange-600 bg-orange-50'
                }`}>
                  <p className={`font-bold uppercase tracking-wide ${
                    isProtected ? 'text-green-800' : 'text-orange-800'
                  }`}>
                    {isProtected ? 'ACCOUNT PROTECTED' : 'TRIAL ACCOUNT'}
                  </p>
                  <p className={`text-sm ${isProtected ? 'text-green-700' : 'text-orange-700'}`}>
                    {isProtected ? 'Safe from deletion' : 'Subject to trial expiration'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                TRIAL STATUS
              </h3>
              <TrialStatus />
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                SUBSCRIPTION STATUS
              </h3>
              <SubscriptionStatus />
            </div>

            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                QUICK ACTIONS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Link
                  to="/products"
                  className="flex items-center gap-4 p-6 border-2 border-black rounded-none hover:bg-gray-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-black uppercase tracking-wide">VIEW PLANS</h4>
                    <p className="text-sm text-gray-600">Upgrade or change plan</p>
                  </div>
                </Link>

                <Link
                  to="/account"
                  className="flex items-center gap-4 p-6 border-2 border-black rounded-none hover:bg-gray-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-black uppercase tracking-wide">ACCOUNT SETTINGS</h4>
                    <p className="text-sm text-gray-600">Manage your account</p>
                  </div>
                </Link>

                {isAdmin && (
                  <Link
                    to="/test"
                    className="flex items-center gap-4 p-6 border-2 border-red-600 rounded-none hover:bg-red-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  >
                    <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-none">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black uppercase tracking-wide">ADMIN TESTING</h4>
                      <p className="text-sm text-gray-600">Test system integrations</p>
                    </div>
                  </Link>
                )}
                
                {hasAccess && (
                  <a
                    href={import.meta.env.VITE_AXIESTUDIO_APP_URL || 'https://axiestudio-axiestudio-ttefi.ondigitalocean.app'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-6 border-2 border-black rounded-none hover:bg-gray-50 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  >
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-none">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black uppercase tracking-wide">LAUNCH STUDIO</h4>
                      <p className="text-sm text-gray-600">Access AI workflow builder</p>
                    </div>
                  </a>
                )}
                
                {!hasAccess && accessStatus?.trial_status !== 'expired' && accessStatus?.trial_status !== 'scheduled_for_deletion' && (
                  <div className="flex items-center gap-4 p-6 border-2 border-gray-300 rounded-none opacity-50">
                    <div className="w-12 h-12 bg-gray-300 text-gray-500 flex items-center justify-center rounded-none">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-500 uppercase tracking-wide">AI WORKFLOWS</h4>
                      <p className="text-sm text-gray-400">Requires active subscription</p>
                    </div>
                  </div>
                )}

                {(accessStatus?.trial_status === 'expired' || accessStatus?.trial_status === 'scheduled_for_deletion') && !hasAccess && (
                  <div className="flex items-center gap-4 p-6 border-2 border-red-600 rounded-none bg-red-50">
                    <div className="w-12 h-12 bg-red-600 text-white flex items-center justify-center rounded-none">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-800 uppercase tracking-wide">TRIAL EXPIRED</h4>
                      <p className="text-sm text-red-700">Upgrade to Pro to restore access</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
                ACCOUNT INFO
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-black uppercase tracking-wide">EMAIL</label>
                  <p className="text-gray-900 font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-black uppercase tracking-wide">MEMBER SINCE</label>
                  <p className="text-gray-900 font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-bold text-black uppercase tracking-wide">ACCOUNT STATUS</label>
                  <p className={`font-medium ${isProtected ? 'text-green-600' : 'text-orange-600'}`}>
                    {isProtected ? 'PROTECTED' : 'TRIAL'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black text-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">
                {hasAccess ? 'STUDIO ACCESS' : 
                 accessStatus?.trial_status === 'expired' || accessStatus?.trial_status === 'scheduled_for_deletion' ? 'UPGRADE REQUIRED' : 'START FREE TRIAL'}
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                {hasAccess 
                  ? 'Your AI workflow studio is ready to use with full access to all features.'
                  : accessStatus?.trial_status === 'expired' || accessStatus?.trial_status === 'scheduled_for_deletion'
                  ? 'Your trial has expired. Upgrade to Pro to restore access to AI workflows.'
                  : 'Get 7 days free access to advanced AI workflow capabilities.'
                }
              </p>
              {hasAccess ? (
                <a
                  href="https://axiestudio-axiestudio-ttefi.ondigitalocean.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide border-2 border-white hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Zap className="w-4 h-4" />
                  OPEN STUDIO
                </a>
              ) : !(accessStatus?.trial_status === 'expired' || accessStatus?.trial_status === 'scheduled_for_deletion') ? (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-none font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide border-2 border-white hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Crown className="w-4 h-4" />
                  START TRIAL
                </Link>
              ) : (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-none font-bold hover:bg-red-700 transition-colors uppercase tracking-wide border-2 border-red-600 hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                >
                  <Crown className="w-4 h-4" />
                  UPGRADE NOW
                </Link>
              )}
            </div>

            <div className={`bg-white border-2 rounded-none shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] p-6 ${
              isProtected ? 'border-orange-500' : 'border-red-500'
            }`}>
              <h3 className="text-lg font-bold text-red-600 mb-3 uppercase tracking-wide">
                DANGER ZONE
              </h3>
              {isProtected && (
                <div className="mb-4 p-3 bg-orange-100 border border-orange-600 rounded-none">
                  <p className="text-orange-800 text-sm font-medium">
                    ⚠️ You have an active subscription. Deleting your account will also cancel your subscription.
                  </p>
                </div>
              )}
              <p className="text-gray-600 text-sm mb-4">
                Permanently delete your account and all associated data. This will also remove your Axie Studio account.
              </p>
              <button
                onClick={handleDeleteAccount}
                className={`inline-flex items-center gap-2 text-white px-4 py-2 rounded-none font-bold transition-colors uppercase tracking-wide text-sm border-2 ${
                  isProtected 
                    ? 'bg-orange-600 border-orange-600 hover:bg-orange-700' 
                    : 'bg-red-600 border-red-600 hover:bg-red-700'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                DELETE ACCOUNT
              </button>
            </div>


          </div>
        </div>
      </main>
    </div>
  );
}