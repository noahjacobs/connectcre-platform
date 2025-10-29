"use client";

import React, { useEffect, useState } from "react";
import {Button} from "@heroui/react";
import {Icon} from "@iconify/react";
import { useAuth } from "@/lib/providers/auth-context";
import { useSubscription } from "@/lib/providers/subscription-context";
import { useSupabase } from "@/lib/providers/supabase-context";

/**
 * You need to make sure to add some padding at the bottom of the page to avoid overlapping.
 */
interface ClaimBannerProps {
  onAddCompany?: () => void;
}

export default function ClaimBanner({ onAddCompany }: ClaimBannerProps) {
  const { user } = useAuth();
  const { hasMembershipAccess, hasActivePlan, hasPaidPlan, isLoading } = useSubscription();
  const { supabase } = useSupabase();
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);
  const [isCheckingBannerStatus, setIsCheckingBannerStatus] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const handleDismiss = async () => {
    if (!user?.id || !supabase) return;

    try {
      // Update the database to mark banner as dismissed
      const { error } = await supabase
        .from('profiles')
        .update({ has_dismissed_claim_banner: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error dismissing banner:', error);
      } else {
        setHasDismissedBanner(true);
      }
    } catch (error) {
      console.error('Error dismissing banner:', error);
    }
  };

  const handleAddCompany = async () => {
    if (!user?.id || !supabase) return;

    // First trigger the upsell modal
    if (onAddCompany) {
      onAddCompany();
    }

    // Then update the database to mark banner as dismissed
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_dismissed_claim_banner: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating banner status:', error);
      } else {
        setHasDismissedBanner(true);
      }
    } catch (error) {
      console.error('Error updating banner status:', error);
    }
  };

  // Check if user has dismissed the banner
  useEffect(() => {
    async function checkBannerStatus() {
      if (!user?.id || !supabase) {
        setIsCheckingBannerStatus(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_dismissed_claim_banner')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking banner status:', error);
          setHasDismissedBanner(false);
        } else {
          setHasDismissedBanner(data?.has_dismissed_claim_banner || false);
        }
      } catch (error) {
        console.error('Error checking banner status:', error);
        setHasDismissedBanner(false);
      } finally {
        setIsCheckingBannerStatus(false);
      }
    }

    checkBannerStatus();
  }, [user?.id]);

  // Add enhanced delay before showing banner to allow invite processing
  useEffect(() => {
    // Don't show banner if user:
    // 1. Is not signed in
    // 2. Has an active paid subscription (hasActivePlan && hasPaidPlan)
    // 3. Has membership access through team invitation (hasMembershipAccess)
    // 4. Has dismissed the banner
    // 5. Data is still loading
    if (!user || hasActivePlan || hasPaidPlan || hasMembershipAccess || hasDismissedBanner || isLoading || isCheckingBannerStatus) {
      setShowBanner(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 5000); // 5 second delay

    return () => clearTimeout(timer);
  }, [user, hasActivePlan, hasPaidPlan, hasMembershipAccess, hasDismissedBanner, isLoading, isCheckingBannerStatus]);

  // Don't show banner if:
  // 1. User is not signed in
  // 2. User has an active subscription (hasActivePlan)
  // 3. User has a paid plan (hasPaidPlan)
  // 4. User has membership access through team invitation (hasMembershipAccess)
  // 5. User has dismissed the banner
  // 6. Still loading subscription or banner status
  // 7. 5-second delay hasn't passed yet
  if (!showBanner) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 w-full px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8">
      <div className="pointer-events-auto mx-auto max-w-2xl animate-in slide-in-from-bottom-2 duration-500">
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-slate-900/65 backdrop-blur-xl backdrop-saturate-150 shadow-2xl">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 opacity-60" />
          
          {/* Main content */}
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                  <Icon 
                    icon="solar:buildings-3-bold" 
                    width={20} 
                    height={20} 
                    className="text-white"
                  />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Claim Your Company
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAddCompany}
                  className="group relative h-11 px-6 overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                  radius="full"
                  endContent={
                    <Icon
                      className="flex-none transition-transform duration-300 group-hover:translate-x-1"
                      icon="solar:arrow-right-linear"
                      width={18}
                    />
                  }
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Button>
                
                <Button
                  isIconOnly
                  onClick={handleDismiss}
                  className="h-10 w-10 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300"
                  radius="full"
                  variant="light"
                  aria-label="Dismiss banner"
                >
                  <Icon 
                    icon="lucide:x" 
                    width={18} 
                    height={18}
                    className="transition-transform duration-300 hover:scale-110"
                  />
                </Button>
              </div>
            </div>
            
            <p className="text-base text-white/80 leading-relaxed">
              Take control of your company profile and invite your team to join DevProjects. 
              Build stronger connections and showcase your projects.
            </p>
          </div>
          
          {/* Floating accent elements */}
          <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 blur-sm" />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 opacity-30 blur-sm" />
        </div>
      </div>
    </div>
  );
}
