import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { supabase } from '../lib/supabase';
import { User, Mail, Calendar, Shield, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

export function UserManagementPage() {
  const { user, signOut } = useAuth();
  const { enterpriseState, isEnterpriseEnabled } = useEnterpriseUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete Axie Studio account first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/axie-studio-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }

      // Delete Supabase account
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      // Sign out
      await signOut();
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-8 h-8 text-black" />
            <h1 className="text-3xl font-bold text-black uppercase tracking-wide">
              Account Management
            </h1>
          </div>
          <p className="text-gray-600">
            Manage your account settings and subscription details.
          </p>
        </div>

        {/* Account Information */}
        <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h2 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
            Account Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-none">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Email</p>
                  <p className="font-bold text-black">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-none">
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600 uppercase tracking-wide">Member Since</p>
                  <p className="font-bold text-black">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isEnterpriseEnabled && enterpriseState && (
                <>
                  <div className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-none">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600 uppercase tracking-wide">Access Level</p>
                      <p className="font-bold text-black capitalize">{enterpriseState.access_level}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-none">
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600 uppercase tracking-wide">Account Status</p>
                      <p className="font-bold text-black capitalize">{enterpriseState.account_status}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        {isEnterpriseEnabled && enterpriseState && (
          <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
              Subscription Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enterpriseState.stripe_customer_id && (
                <div className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Stripe Customer ID</p>
                  <p className="font-mono text-sm text-black">{enterpriseState.stripe_customer_id}</p>
                </div>
              )}
              
              {enterpriseState.stripe_status && (
                <div className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Subscription Status</p>
                  <p className="font-bold text-black capitalize">{enterpriseState.stripe_status}</p>
                </div>
              )}
              
              {enterpriseState.trial_days_remaining > 0 && (
                <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-none">
                  <p className="text-sm text-orange-600 uppercase tracking-wide mb-2">Trial Days Remaining</p>
                  <p className="font-bold text-orange-800">{enterpriseState.trial_days_remaining} days</p>
                </div>
              )}
              
              {enterpriseState.axie_studio_user_id && (
                <div className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">AxieStudio Account</p>
                  <p className="font-mono text-sm text-black">{enterpriseState.axie_studio_user_id}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
          <h2 className="text-xl font-bold text-black mb-6 uppercase tracking-wide">
            Account Actions
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 border-2 border-red-200 bg-red-50 rounded-none">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-800 uppercase tracking-wide">
                  Danger Zone
                </h3>
              </div>
              
              <p className="text-red-700 mb-4">
                Deleting your account will permanently remove all your data, cancel any active subscriptions, 
                and delete your AxieStudio account. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-none font-bold hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="font-bold text-red-800">
                    Are you absolutely sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-none font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded-none font-bold hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
