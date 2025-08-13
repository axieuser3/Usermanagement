import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface TrialInfo {
  user_id: string;
  trial_start_date: string;
  trial_end_date: string;
  trial_status: 'active' | 'expired' | 'converted_to_paid' | 'scheduled_for_deletion';
  deletion_scheduled_at: string | null;
  seconds_remaining: number;
  days_remaining: number;
}

export function useTrialStatus() {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrialInfo(null);
      setLoading(false);
      return;
    }

    const fetchTrialInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching trial info for user:', user.id);

        // Try the view first
        const { data, error: fetchError } = await supabase
          .from('user_trial_info')
          .select('*')
          .maybeSingle();

        if (data && !fetchError) {
          console.log('✅ Successfully fetched from user_trial_info view:', data);
          setTrialInfo(data);
          return;
        }

        console.log('⚠️ user_trial_info view failed, trying base table:', fetchError);

        // Fallback: Query the base table directly
        const { data: trialData, error: trialError } = await supabase
          .from('user_trials')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (trialError) {
          throw trialError;
        }

        if (trialData) {
          // Calculate remaining time manually
          const trialEndDate = new Date(trialData.trial_end_date);
          const now = new Date();
          const secondsRemaining = trialEndDate > now ? Math.floor((trialEndDate.getTime() - now.getTime()) / 1000) : 0;
          const daysRemaining = trialEndDate > now ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          const enrichedData = {
            ...trialData,
            seconds_remaining: secondsRemaining,
            days_remaining: daysRemaining
          };

          console.log('✅ Successfully fetched from user_trials table:', enrichedData);
          setTrialInfo(enrichedData);
        } else {
          setTrialInfo(null);
        }
      } catch (err) {
        console.error('Error fetching trial info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trial info');
        setTrialInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialInfo();

    // Set up real-time subscription for trial updates
    const subscription = supabase
      .channel('trial_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_trials',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          fetchTrialInfo();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const isTrialActive = trialInfo?.trial_status === 'active' && trialInfo?.days_remaining > 0;
  const isTrialExpired = trialInfo?.trial_status === 'expired' || (trialInfo?.days_remaining === 0 && trialInfo?.trial_status === 'active');
  const isScheduledForDeletion = trialInfo?.trial_status === 'scheduled_for_deletion';
  const hasConvertedToPaid = trialInfo?.trial_status === 'converted_to_paid';

  return {
    trialInfo,
    loading,
    error,
    isTrialActive,
    isTrialExpired,
    isScheduledForDeletion,
    hasConvertedToPaid,
  };
}