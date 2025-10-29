"use client"

import { Radar, Search, Building2, ClipboardList, ArrowRight, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useAuth } from "@/lib/providers/auth-context"
import { AuthModal } from "@/components/ui/auth-modal"
import React from "react"

// No project-specific props needed
interface NoProjectCTAProps {
  // defaultLoanType?: string; // This prop is no longer used, consider removing later
}

// Wrap component definition
const NoProjectCTAComponent = ({
}: NoProjectCTAProps) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Handler to ensure user is logged in before navigating to dashboard action
  const handleGetLeadsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!user) {
          e.preventDefault(); // Prevent link navigation
          setShowAuthModal(true);
      }
      // If user exists, the Link component handles navigation
  };

  return (
    <>
      {/* <div className="rounded-xl border border-green-200/80 dark:border-green-700/60 bg-linear-to-r from-green-50/50 via-green-100/50 to-green-50/50 dark:from-green-900/20 dark:via-green-900/30 dark:to-green-900/20 p-6 mb-4 shadow-sm flex flex-col items-center text-center">
          <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium rounded-full mb-3">
              <Store className="w-4 h-4 mr-1.5" /> DevProjects Marketplace
          </div>
          <h4 className="text-xl font-semibold mb-2 text-green-900 dark:text-green-100">Get Bids from CRE Pros</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 max-w-md">
              Post your project to the Marketplace and get tailored proposals from verified providers.
          </p>
          <Button
              asChild
              className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-600/90 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white group"
          >
              <Link href="/dashboard?dash&action=request" onClick={handleGetLeadsClick}>
                  <span className="flex items-center justify-center">
                      Request Proposals
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
              </Link>
          </Button>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Free to post. Only verified companies can respond.
          </p>
      </div> */}

      {/* Marketplace/Project Search CTA */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
          {/* General Platform Stats */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <p className="text-blue-800 dark:text-blue-300 font-medium flex items-center">
                <Radar className="w-4 h-4 mr-2" />
                DevProjects Stats
              </p>
               {/* Link to marketplace */}
               <Link href="/directory" passHref legacyBehavior>
                <a className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full hover:bg-blue-600/90 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
                  EXPLORE
                </a>
              </Link>
            </div>
            
            {/* Hardcoded Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-md p-2">
                <p className="text-blue-700 dark:text-blue-400 mb-1">Verified Companies</p>
                <p className="text-blue-800 dark:text-blue-300 font-semibold text-lg">
                  8,500+
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-md p-2">
                <p className="text-blue-700 dark:text-blue-400 mb-1">Active Projects</p>
                <p className="text-blue-800 dark:text-blue-300 font-semibold text-lg">
                  6,000+
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-zinc-600 dark:text-zinc-300 mt-4 mb-3">Find Your Next Opportunity</h3>
          
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Explore thousands of projects and connect with companies in the DevProjects directory.
            </p>
            
            <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-600/90 dark:bg-blue-700 dark:hover:bg-blue-800 text-white h-10 group" asChild>
              <Link href="/directory">
                  <Search className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Explore Directory
              </Link>
            </Button>
          </div>
      </div>

      {/* Auth Modal Instance */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal} 
        trigger={<div />} // Hidden trigger
      />
    </>
  );
};

// Export the memoized component
export default React.memo(NoProjectCTAComponent);