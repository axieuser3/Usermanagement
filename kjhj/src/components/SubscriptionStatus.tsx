import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { Crown, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';

export function SubscriptionStatus() {
  const { subscription, loading, hasActiveSubscription, isTrialing, isPastDue, isCanceled } = useSubscription();

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

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-white border-2 border-black rounded-none p-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-black" />
          <div>
            <p className="text-black font-bold uppercase tracking-wide">NO SUBSCRIPTION</p>
            <p className="text-gray-600 text-sm">Upgrade to unlock premium features</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (hasActiveSubscription) return <CheckCircle className="w-5 h-5 text-black" />;
    if (isTrialing) return <Clock className="w-5 h-5 text-black" />;
    if (isPastDue) return <AlertTriangle className="w-5 h-5 text-black" />;
    if (isCanceled) return <XCircle className="w-5 h-5 text-black" />;
    return <Crown className="w-5 h-5 text-black" />;
  };

  const getStatusText = () => {
    if (hasActiveSubscription) return 'ACTIVE SUBSCRIPTION';
    if (isTrialing) return 'TRIAL PERIOD';
    if (isPastDue) return 'PAYMENT OVERDUE';
    if (isCanceled) return 'CANCELED';
    return 'SUBSCRIPTION STATUS';
  };

  const getStatusDescription = () => {
    if (hasActiveSubscription) return `${subscription.product_name || 'Premium'} plan is active`;
    if (isTrialing) return 'Your trial period is active';
    if (isPastDue) return 'Please update your payment method';
    if (isCanceled) return 'Your subscription has been canceled';
    return 'Subscription information';
  };

  return (
    <div className="bg-white border-2 border-black rounded-none p-4">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="font-bold text-black uppercase tracking-wide">{getStatusText()}</p>
          <p className="text-sm text-gray-600">{getStatusDescription()}</p>
          {subscription.current_period_end && hasActiveSubscription && (
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
              Renews {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}