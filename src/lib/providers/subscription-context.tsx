"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/providers/auth-context';
import { useSupabase } from './supabase-context';
import { MEMBERSHIP_PRICES } from '@/lib/utils/stripe-products';

// export type SubscriptionTier = 'free' | 'DevProjects Membership' | 'editorial' | 'pro' | 'broker';
export type SubscriptionTier = 'free' | 'DevProjects Membership' | 'Editorial';

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_end: string;
  cancel_at?: string;
  created_at: string;
  updated_at: string;
  isMembershipPlan: boolean;
  quantity: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  tier: SubscriptionTier;
  hasActivePlan: boolean;
  hasPaidPlan: boolean;
  // isEditorialPlan: boolean;
  // isProPlan: boolean;
  isMembershipPlan: boolean;
  subscriptionQuantity: number;
  hasMembershipAccess: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMembershipAccess, setHasMembershipAccess] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user?.id || !supabase) {
      setSubscription(null);
      setHasMembershipAccess(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch subscription and membership access in parallel
      const [subscriptionResult, membershipAccessResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*, quantity')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.rpc('check_user_membership_access', { p_user_id: user.id })
      ]);

      if (subscriptionResult.error) {
        // console.error('Error fetching subscription:', subscriptionResult.error);
        setSubscription(null);
      } else {
        setSubscription(subscriptionResult.data);
      }

      if (membershipAccessResult.error) {
        console.error('Error checking membership access:', membershipAccessResult.error);
        setHasMembershipAccess(false);
      } else {
        setHasMembershipAccess(membershipAccessResult.data ?? false);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setSubscription(null);
      setHasMembershipAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchSubscriptionData();

    // PERFORMANCE FIX: Disabled realtime subscription to prevent excessive DB load
    // The realtime subscription was causing 20M+ calls to realtime.list_changes
    // Instead, subscription changes will be refreshed manually after payment operations
    
    // OPTIONAL: Periodic refresh for subscription status (much more efficient than realtime)
    // Uncomment the block below if you want automatic refresh every 5 minutes
    /*
    const interval = setInterval(() => {
      // Only refresh when tab is visible and user is authenticated
      if (document.visibilityState === 'visible' && user?.id) {
        fetchSubscriptionData();
      }
    }, 5 * 60 * 1000); // Every 5 minutes when tab is active

    return () => clearInterval(interval);
    */
    
    // ORIGINAL CODE (CAUSING PERFORMANCE ISSUE):
    // // Only subscribe to subscription changes if user is authenticated
    // if (!user?.id) {
    //   return; // Don't create subscription for unauthenticated users
    // }

    // // Subscribe to subscription changes
    // const subscriptionChannel = supabase
    //   .channel('subscription_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: 'subscriptions',
    //       filter: `user_id=eq.${user.id}`,
    //     },
    //     () => fetchSubscriptionData()
    //   )
    //   .subscribe();

    // return () => {
    //   subscriptionChannel.unsubscribe();
    // };
  }, [user?.id, fetchSubscriptionData]);

  // Determine subscription tier
  const tier: SubscriptionTier = useMemo(() => {
    if (!subscription || subscription.status !== 'active') return 'free';
    
    // Check for any Membership plan (new, legacy yearly, or legacy monthly)
    if (subscription.plan_id === MEMBERSHIP_PRICES.membership.year || 
        subscription.plan_id === MEMBERSHIP_PRICES.membership.month_legacy) {
      return 'DevProjects Membership';
    }

    // Fallback if plan_id doesn't match known tiers (should ideally not happen with active subs)
    console.warn(`Unknown active plan_id: ${subscription.plan_id}`);
    return 'free'; // Or handle as appropriate, maybe return 'membership' if it's the default?
  }, [subscription]);

  // Helper functions for subscription status
  const hasActivePlan = useMemo(() => subscription?.status === 'active', [subscription]);
  const hasPaidPlan = useMemo(() => hasActivePlan && tier !== 'free', [hasActivePlan, tier]);
  // const isEditorialPlan = useMemo(() => tier === 'editorial', [tier]);
  // const isProPlan = useMemo(() => tier === 'pro', [tier]);
  const isMembershipPlan = useMemo(() => tier === 'DevProjects Membership', [tier]);

  // Memoize the context value
  const value = useMemo(() => ({
    subscription,
    isLoading,
    tier,
    hasActivePlan,
    hasPaidPlan,
    isMembershipPlan,
    subscriptionQuantity: subscription?.quantity ?? 1,
    hasMembershipAccess,
    refreshSubscription: fetchSubscriptionData,
  }), [
    subscription,
    isLoading,
    tier,
    hasActivePlan,
    hasPaidPlan,
    isMembershipPlan,
    subscription?.quantity,
    hasMembershipAccess,
    fetchSubscriptionData,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
} 