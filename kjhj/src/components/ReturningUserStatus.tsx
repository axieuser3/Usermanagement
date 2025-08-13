import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Clock, CreditCard, CheckCircle } from 'lucide-react';

interface ReturningUserStatusProps {
  userEmail: string;
}

interface TrialHistory {
  has_used_trial: boolean;
  requires_subscription: boolean;
  ever_subscribed: boolean;
  deletion_reason: string;
  deleted_at: string;
}

export function ReturningUserStatus({ userEmail }: ReturningUserStatusProps) {
  const [trialHistory, setTrialHistory] = useState<TrialHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTrialHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('check_email_trial_history', { 
          p_email: userEmail 
        });

        if (error) {
          console.error('Error checking trial history:', error);
          setError('Failed to check account history');
          return;
        }

        if (data && data.length > 0) {
          setTrialHistory(data[0]);
        } else {
          setTrialHistory(null);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load account history');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      checkTrialHistory();
    }
  }, [userEmail]);

  if (loading) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-none p-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-500 animate-spin" />
          <span className="text-sm text-gray-600">Checking account history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-none p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  if (!trialHistory || !trialHistory.has_used_trial) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-none p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <h3 className="text-sm font-bold text-green-800">New User Account</h3>
            <p className="text-xs text-green-600">Welcome! You're eligible for a 7-day free trial.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-none p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-yellow-800 mb-2">Returning User Account</h3>
          
          <div className="space-y-2 text-xs text-yellow-700">
            <div className="flex items-center justify-between">
              <span>Previous trial used:</span>
              <span className="font-medium">
                {trialHistory.has_used_trial ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Ever subscribed:</span>
              <span className="font-medium">
                {trialHistory.ever_subscribed ? 'Yes' : 'No'}
              </span>
            </div>
            
            {trialHistory.deleted_at && (
              <div className="flex items-center justify-between">
                <span>Last deletion:</span>
                <span className="font-medium">
                  {new Date(trialHistory.deleted_at).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {trialHistory.deletion_reason && (
              <div className="flex items-center justify-between">
                <span>Deletion reason:</span>
                <span className="font-medium capitalize">
                  {trialHistory.deletion_reason.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          {trialHistory.requires_subscription && (
            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-none">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-bold text-yellow-800">
                  Subscription Required
                </span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                You've already used your free trial. Please subscribe to continue using our service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
