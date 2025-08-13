import React from 'react';
import { stripeProducts } from '../stripe-config';
import { ProductCard } from '../components/ProductCard';
import { SubscriptionStatus } from '../components/SubscriptionStatus';
import { useSubscription } from '../hooks/useSubscription';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProductsPage() {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
          <span className="text-black font-medium uppercase tracking-wide">Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-medium uppercase tracking-wide mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO DASHBOARD
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-black mb-6 uppercase tracking-wide">
            START YOUR AI JOURNEY
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get 7 days free access to advanced AI workflow capabilities
          </p>
        </div>

        <div className="mb-12">
          <SubscriptionStatus />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {stripeProducts.map((product) => {
            const isCurrentPlan = subscription?.price_id === product.priceId && 
                                 (subscription?.subscription_status === 'active' || 
                                  subscription?.subscription_status === 'trialing');

            return (
              <ProductCard
                key={product.id}
                product={product}
                isCurrentPlan={isCurrentPlan}
              />
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <div className="bg-white border-2 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-black mb-6 uppercase tracking-wide">
              WHY CHOOSE PRO?
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Start with a 7-day free trial to explore advanced AI workflow capabilities. 
              Cancel anytime during or after your trial period.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-black font-medium">
              <div className="flex items-center justify-center gap-2 p-3 border border-black rounded-none">
                <span>✓</span>
                <span className="uppercase tracking-wide">7-DAY FREE TRIAL</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3 border border-black rounded-none">
                <span>✓</span>
                <span className="uppercase tracking-wide">CANCEL ANYTIME</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-3 border border-black rounded-none">
                <span>✓</span>
                <span className="uppercase tracking-wide">INSTANT ACCESS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}