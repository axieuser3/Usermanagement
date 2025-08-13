import React, { useState, useEffect } from 'react';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { useSubscription } from '../hooks/useSubscription';
import { Clock, AlertTriangle, Crown, CheckCircle } from 'lucide-react';

export function TrialStatus() {
  const { trialInfo, loading, isTrialActive, isTrialExpired, isScheduledForDeletion } = useTrialStatus();
  const { hasActiveSubscription } = useSubscription();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!trialInfo || !isTrialActive) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(trialInfo.trial_end_date).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      } else {
        setTimeRemaining('Expired');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trialInfo, isTrialActive]);

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-none p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-300 rounded-none"></div>
          <div className="h-4 bg-gray-300 rounded-none w-32"></div>
        </div>
      </div>
    );
  }

  if (!trialInfo) {
    return null;
  }

  // Don't show trial status if user has active subscription
  if (hasActiveSubscription) {
    return (
      <div className="bg-green-50 border-2 border-green-600 rounded-none p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-green-800 font-bold uppercase tracking-wide">PREMIUM ACTIVE</p>
            <p className="text-green-700 text-sm">You have full access to all features</p>
          </div>
        </div>
      </div>
    );
  }

  if (isScheduledForDeletion) {
    return (
      <div className="bg-red-50 border-2 border-red-600 rounded-none p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 font-bold uppercase tracking-wide">ACCOUNT DELETION SCHEDULED</p>
            <p className="text-red-700 text-sm">Your trial has expired. Upgrade now to keep your account.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="bg-orange-50 border-2 border-orange-600 rounded-none p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-orange-800 font-bold uppercase tracking-wide">TRIAL EXPIRED</p>
            <p className="text-orange-700 text-sm">Upgrade to Pro to continue using AI workflows</p>
          </div>
        </div>
      </div>
    );
  }

  if (isTrialActive) {
    const isUrgent = trialInfo.days_remaining <= 1;
    
    return (
      <div className={`border-2 rounded-none p-4 ${
        isUrgent 
          ? 'bg-red-50 border-red-600' 
          : 'bg-blue-50 border-blue-600'
      }`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
          <div>
            <p className={`font-bold uppercase tracking-wide ${
              isUrgent ? 'text-red-800' : 'text-blue-800'
            }`}>
              {isUrgent ? 'TRIAL ENDING SOON' : 'FREE TRIAL ACTIVE'}
            </p>
            <p className={`text-sm ${isUrgent ? 'text-red-700' : 'text-blue-700'}`}>
              {timeRemaining} remaining • Ends {new Date(trialInfo.trial_end_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}