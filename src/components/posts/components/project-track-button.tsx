'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GradientButton } from '@/components/ui/gradient-button';
import { Button } from '@/components/ui/button';
import { Radar, Check, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getProjectTrackingStatus, 
  trackProject, 
  untrackProject,
  type ProjectTrackingData
} from '@/components/projects';

interface ProjectTrackButtonProps {
  projectId: string;
  projectName?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function ProjectTrackButton({ 
  projectId, 
  projectName, 
  className, 
  variant = 'default',
  size = 'default'
}: ProjectTrackButtonProps) {
  const [tracking, setTracking] = useState<ProjectTrackingData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [showUntrackDialog, setShowUntrackDialog] = useState(false);
  
  // Use ref to track if user has interacted - this persists across renders
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    checkTrackingStatus();
  }, [projectId]);

  const checkTrackingStatus = async () => {
    try {
      const { data, error } = await getProjectTrackingStatus(projectId);
      if (error) {
        console.error('Error checking tracking status:', error);
      } else {
        // Only update if user hasn't interacted with the button yet
        if (!hasUserInteracted.current) {
          setTracking(data);
        }
      }
    } catch (error) {
      console.error('Error checking tracking status:', error);
    }
  };

  const handleTrackProject = async () => {
    // Mark that user has interacted - this prevents any future initial status checks from overwriting
    hasUserInteracted.current = true;
    
    // Optimistic update - immediately show as tracking
    const optimisticData: ProjectTrackingData = {
      id: 'temp',
      projectId,
      userId: 'temp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationsEnabled: true,
      emailNotifications: true,
      pushNotifications: false,
      lastNotificationSent: null,
      metadata: {}
    };

    setTracking(optimisticData);
    setShowTrackDialog(false);
    toast.success(`You're now tracking ${projectName || 'this project'}!`);

    setActionLoading(true);
    try {
      const { data, error } = await trackProject(projectId, {
        emailNotifications: true,
        pushNotifications: false
      });
      
      if (error) {
        // Revert optimistic update
        setTracking(null);
        toast.error(error);
      } else {
        // Update with real data from server
        setTracking(data);
      }
    } catch (error) {
      // Revert optimistic update
      setTracking(null);
      toast.error('Failed to track project');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUntrackProject = async () => {
    // Mark that user has interacted
    hasUserInteracted.current = true;
    
    // Store current tracking state for potential rollback
    const previousTracking = tracking;
    
    // Optimistic update - immediately show as not tracking
    setTracking(null);
    setShowUntrackDialog(false);
    toast.success(`You're no longer tracking ${projectName || 'this project'}`);

    setActionLoading(true);
    try {
      const { error } = await untrackProject(projectId);
      
      if (error) {
        // Revert optimistic update
        setTracking(previousTracking);
        toast.error(error);
      }
      // If successful, tracking is already null from optimistic update
    } catch (error) {
      // Revert optimistic update
      setTracking(previousTracking);
      toast.error('Failed to untrack project');
    } finally {
      setActionLoading(false);
    }
  };

  // Show tracking state if user is tracking
  if (tracking) {
    return (
      <>
        <GradientButton
          className={cn(
            "min-w-0 relative overflow-hidden",
            "bg-green-600! hover:bg-green-700! dark:bg-green-700! dark:hover:bg-green-800!",
            "border-green-500 dark:border-green-600",
            className
          )}
          onClick={() => setShowUntrackDialog(true)}
        >
          <Check className="w-4 h-4 mr-2" />
          Tracking
        </GradientButton>

        <AlertDialog open={showUntrackDialog} onOpenChange={setShowUntrackDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop tracking project?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll no longer receive notifications about updates to{' '}
                <strong>{projectName || 'this project'}</strong>. You can always start tracking again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep tracking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUntrackProject}
                disabled={actionLoading}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {actionLoading ? (
                  <>
                    <BellOff className="w-4 h-4 animate-pulse" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" />
                    Stop tracking
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Default to showing "Track Project" button - no loading state
  return (
    <>
      <GradientButton
        variant={variant === 'default' ? 'default' : 'variant'}
        className={cn("min-w-0", className)}
        onClick={() => setShowTrackDialog(true)}
      >
        <Radar className="w-4 h-4 mr-2" />
        Track Project
      </GradientButton>

      <AlertDialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Track project updates?</AlertDialogTitle>
            <AlertDialogDescription>
              Get notified about important updates and milestones for{' '}
              <strong>{projectName || 'this project'}</strong>. We'll send you email notifications when there are new developments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTrackProject}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Bell className="w-4 h-4 mr-2 animate-pulse" />
                  Starting...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Start tracking
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 