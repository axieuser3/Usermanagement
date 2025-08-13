import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEnterpriseUser } from '../hooks/useEnterpriseUser';
import { isSuperAdmin } from '../utils/adminAuth';
import { AlertTriangle, Clock, Shield, Crown } from 'lucide-react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function AccountDeletionCountdown() {
  const { user } = useAuth();
  const { enterpriseState, isEnterpriseEnabled } = useEnterpriseUser();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Check if user is super admin (infinite access)
  const isAdmin = isSuperAdmin(user?.id);

  useEffect(() => {
    if (!user || !isEnterpriseEnabled || !enterpriseState || isAdmin) {
      return;
    }

    // Only show countdown for trial users
    if (enterpriseState.account_status !== 'trial' || enterpriseState.trial_days_remaining <= 0) {
      return;
    }

    const calculateTimeRemaining = () => {
      // Calculate deletion date (7 days from account creation)
      const accountCreated = new Date(user.created_at);
      const deletionDate = new Date(accountCreated.getTime() + (7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const timeDiff = deletionDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [user, enterpriseState, isEnterpriseEnabled, isAdmin]);

  // Don't show for admin users
  if (isAdmin) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6 text-white" />
          <h3 className="text-xl font-bold text-white uppercase tracking-wide">
            Super Admin Account
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-white" />
          <p className="text-white font-medium">
            Infinite access - No deletion countdown
          </p>
        </div>
      </div>
    );
  }

  // Don't show if not in trial or no enterprise features
  if (!isEnterpriseEnabled || !enterpriseState || enterpriseState.account_status !== 'trial') {
    return null;
  }

  // Don't show if trial has already expired
  if (enterpriseState.trial_days_remaining <= 0) {
    return null;
  }

  // Show expired state
  if (isExpired) {
    return (
      <div className="bg-red-600 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-white" />
          <h3 className="text-xl font-bold text-white uppercase tracking-wide">
            Trial Expired
          </h3>
        </div>
        <p className="text-white font-medium mb-4">
          Your free trial has ended. Upgrade to Pro to continue using the service.
        </p>
        <button className="bg-white text-red-600 px-6 py-2 rounded-none font-bold hover:bg-gray-100 transition-colors">
          UPGRADE NOW
        </button>
      </div>
    );
  }

  // Show countdown
  if (timeRemaining) {
    const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 24;
    const bgColor = isUrgent ? 'bg-red-600' : timeRemaining.days <= 1 ? 'bg-orange-600' : 'bg-blue-600';

    return (
      <div className={`${bgColor} border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-white" />
          <h3 className="text-xl font-bold text-white uppercase tracking-wide">
            Trial Countdown
          </h3>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="bg-white text-black rounded-none p-3 border-2 border-black">
              <div className="text-2xl font-bold">{timeRemaining.days}</div>
              <div className="text-xs uppercase tracking-wide">Days</div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white text-black rounded-none p-3 border-2 border-black">
              <div className="text-2xl font-bold">{timeRemaining.hours}</div>
              <div className="text-xs uppercase tracking-wide">Hours</div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white text-black rounded-none p-3 border-2 border-black">
              <div className="text-2xl font-bold">{timeRemaining.minutes}</div>
              <div className="text-xs uppercase tracking-wide">Minutes</div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white text-black rounded-none p-3 border-2 border-black">
              <div className="text-2xl font-bold">{timeRemaining.seconds}</div>
              <div className="text-xs uppercase tracking-wide">Seconds</div>
            </div>
          </div>
        </div>

        <div className="text-white">
          <p className="font-medium mb-2">
            {isUrgent 
              ? '⚠️ Your account will be deleted soon!' 
              : timeRemaining.days <= 1
              ? '⏰ Less than 24 hours remaining!'
              : `🎯 ${timeRemaining.days} days left in your free trial`
            }
          </p>
          <p className="text-sm opacity-90">
            Upgrade to Pro to keep your account and continue using all features.
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <button className="bg-white text-black px-6 py-2 rounded-none font-bold hover:bg-gray-100 transition-colors flex-1">
            UPGRADE TO PRO
          </button>
          <button className="border-2 border-white text-white px-4 py-2 rounded-none font-bold hover:bg-white hover:text-black transition-colors">
            LEARN MORE
          </button>
        </div>
      </div>
    );
  }

  return null;
}
