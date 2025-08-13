import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface EnterpriseUserState {
  user_id: string;
  email: string;
  full_name: string | null;
  account_status: string;
  has_access: boolean;
  access_level: string;
  trial_days_remaining: number;
  
  // Stripe info
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  current_period_end: number | null;
  
  // Axie Studio info
  axie_studio_user_id: string | null;
  axie_studio_status: string | null;
  
  // Timestamps
  user_created_at: string;
  last_activity_at: string | null;
}

/**
 * Enterprise user management hook - OPTIONAL enhancement
 * Falls back gracefully if enterprise tables don't exist
 */
export function useEnterpriseUser() {
  const { user } = useAuth();
  const [enterpriseState, setEnterpriseState] = useState<EnterpriseUserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnterpriseEnabled, setIsEnterpriseEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      setEnterpriseState(null);
      setLoading(false);
      return;
    }

    const fetchEnterpriseState = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Checking for enterprise features...');

        // Try to fetch from enterprise dashboard view
        const { data: dashboardData, error: dashboardError } = await supabase
          .from('user_dashboard')
          .select('*')
          .maybeSingle();

        if (dashboardData && !dashboardError) {
          console.log('✅ Enterprise features available:', dashboardData);
          setIsEnterpriseEnabled(true);
          setEnterpriseState(dashboardData);
          return;
        }

        console.log('ℹ️ Enterprise features not available, using basic mode');
        setIsEnterpriseEnabled(false);
        
        // Fallback: Create basic state from existing data
        const basicState: EnterpriseUserState = {
          user_id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          account_status: 'trial_active',
          has_access: true,
          access_level: 'trial',
          trial_days_remaining: 7,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_status: null,
          current_period_end: null,
          axie_studio_user_id: null,
          axie_studio_status: null,
          user_created_at: user.created_at || new Date().toISOString(),
          last_activity_at: null
        };

        setEnterpriseState(basicState);

      } catch (err) {
        console.error('Error fetching enterprise state:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch enterprise state');
        setEnterpriseState(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterpriseState();
  }, [user]);

  const syncUserState = async (): Promise<boolean> => {
    if (!user || !isEnterpriseEnabled) {
      console.log('⚠️ Enterprise sync not available');
      return false;
    }

    try {
      console.log('🔄 Syncing user state...');
      
      const { data, error } = await supabase.rpc('sync_user_state', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Sync error:', error);
        return false;
      }

      console.log('✅ User state synced:', data);
      
      // Refresh the dashboard data
      const { data: refreshedData } = await supabase
        .from('user_dashboard')
        .select('*')
        .maybeSingle();

      if (refreshedData) {
        setEnterpriseState(refreshedData);
      }

      return true;
    } catch (err) {
      console.error('Error syncing user state:', err);
      return false;
    }
  };

  const linkAxieStudioAccount = async (axieUserId: string, axieEmail: string): Promise<boolean> => {
    if (!user || !isEnterpriseEnabled) {
      console.log('⚠️ Enterprise linking not available');
      return false;
    }

    try {
      console.log('🔗 Linking Axie Studio account...');
      
      const { error } = await supabase.rpc('link_axie_studio_account', {
        p_user_id: user.id,
        p_axie_studio_user_id: axieUserId,
        p_axie_studio_email: axieEmail
      });

      if (error) {
        console.error('Linking error:', error);
        return false;
      }

      console.log('✅ Axie Studio account linked');
      
      // Sync and refresh
      await syncUserState();
      return true;
    } catch (err) {
      console.error('Error linking Axie Studio account:', err);
      return false;
    }
  };

  const linkStripeCustomer = async (stripeCustomerId: string, stripeEmail: string): Promise<boolean> => {
    if (!user || !isEnterpriseEnabled) {
      console.log('⚠️ Enterprise linking not available');
      return false;
    }

    try {
      console.log('🔗 Linking Stripe customer...');
      
      const { error } = await supabase.rpc('link_stripe_customer', {
        p_user_id: user.id,
        p_stripe_customer_id: stripeCustomerId,
        p_stripe_email: stripeEmail
      });

      if (error) {
        console.error('Linking error:', error);
        return false;
      }

      console.log('✅ Stripe customer linked');
      
      // Sync and refresh
      await syncUserState();
      return true;
    } catch (err) {
      console.error('Error linking Stripe customer:', err);
      return false;
    }
  };

  return {
    enterpriseState,
    loading,
    error,
    isEnterpriseEnabled,
    syncUserState,
    linkAxieStudioAccount,
    linkStripeCustomer,
    
    // Convenience getters
    hasAccess: enterpriseState?.has_access || false,
    accessLevel: enterpriseState?.access_level || 'trial',
    isPaidUser: enterpriseState?.access_level === 'pro',
    isTrialUser: enterpriseState?.access_level === 'trial',
    daysRemaining: enterpriseState?.trial_days_remaining || 0,
  };
}
