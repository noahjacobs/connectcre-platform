"use client";

import { TrendingUp, Clock, MapPinned, Handshake, ArrowRight, Bell, Target, Users, Sparkles, BellPlus, Radar, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Project } from "@/components/projects/types"
import { useState, useEffect } from "react"
import { type UserCompany } from "@/hooks/use-user-companies"
import { useAuth } from "@/lib/providers/auth-context"
import { AuthModal } from "@/components/ui/auth-modal"
import React from "react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// import { useSubscription } from "@/lib/providers/subscription-context"
// import { PricingDialog } from "@/components/ui/pricing-dialog";

interface SideCTAProps {
  project: Project & { id: string };
  setRefreshCallback?: (callback: () => void) => void;
  refreshStatsTrigger?: (() => void) | null;
  setBidsRefreshCallback?: (callback: () => void) => void;
  userCompanies?: UserCompany[];
}

const SideCTAComponent = ({ project, setRefreshCallback, refreshStatsTrigger, setBidsRefreshCallback, userCompanies = [] }: SideCTAProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const handleBookmarkProject = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsBookmarking(true);
    try {
      // TODO: Implement bookmark functionality
      // const result = await bookmarkProject(project.id);
      toast.success('Project bookmarked! View it in your bookmarks.');
      router.push('/bookmarks');
    } catch (error) {
      toast.error('Failed to bookmark project');
    } finally {
      setIsBookmarking(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Bookmark className="w-5 h-5 mr-2 text-blue-600" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Save This Project</h3>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
            Bookmark this project to easily find it later and keep track of opportunities.
          </p>

          {/* Value props */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-300">Quick access to saved projects</span>
            </div>
            <div className="flex items-center text-sm">
              <MapPinned className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-300">Organize your opportunities</span>
            </div>
            <div className="flex items-center text-sm">
              <Handshake className="w-4 h-4 mr-2 text-purple-600 shrink-0" />
              <span className="text-zinc-700 dark:text-zinc-300">Never miss a potential deal</span>
            </div>
          </div>

          {/* Action button */}
          <Button
            onClick={handleBookmarkProject}
            disabled={isBookmarking}
            className="w-full"
          >
            {isBookmarking ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Bookmark This Project
              </>
            )}
          </Button>
        </div>
      </div>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </>
  );
};

export default React.memo(SideCTAComponent); 
