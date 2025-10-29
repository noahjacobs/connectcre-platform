"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image'; // Added for avatars
import { motion, AnimatePresence } from "framer-motion"; // Added for animations
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/lib/providers/auth-context';
import { User, UserPlus, Plus, Loader2, ExternalLink, X, Crown, ShieldCheck, UserCheck, Send, Mail, LogOut, Users, Info } from 'lucide-react'; // Added Plus, Send, Mail, LogOut, Users, Info
import { cn } from '@/lib/utils';
import { PricingDialog } from '@/components/ui/pricing-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation'; // <<< Import useRouter

// Interface updated to match ManagerWithProfile structure from RPC
interface CompanyManager {
  user_id: string;
  role: 'owner' | 'admin' | 'editor';
  full_name: string | null;
  avatar_url: string | null;
}

// Interface for pending invite STATE within the invite dialog
interface PendingInviteInModal { 
  email: string;
  role: 'admin' | 'editor';
}

// Interface for pending invite data passed as PROP (fetched from DB)
interface PendingInviteDisplayData { 
  id: string;
  invited_email: string;
  role: 'admin' | 'editor';
  created_at: string;
  expires_at: string | null;
}

interface CompanyManagersSectionProps {
  companyId: string;
  isCurrentUserAdminOrOwner: boolean;
  managers: CompanyManager[];
  isLoading: boolean;

  // --- UPDATED PROPS (Owner's Aggregated Data) ---
  isCompanyOnMembershipPlan: boolean | undefined;
  ownerPlanQuantity: number | undefined; // Total seats in owner's plan
  totalOwnerManagerCount: number | undefined; // Total managers across ALL owner's companies
  totalOwnerPendingInvitesCount: number | undefined; // Total pending invites across ALL owner's companies
  isCompanySubLoading: boolean; // Loading state for owner's sub/usage data
  // --- END UPDATED PROPS ---

  // --- NEW PROPS for Pending Invites Display ---
  pendingInvites: PendingInviteDisplayData[];
  isLoadingPendingInvites: boolean;
  // --- END NEW PROPS ---

  // --- NEW PROP for current user's role --- 
  currentUserRole: 'owner' | 'admin' | 'editor';
  // --- END NEW PROP ---

  shouldShowInheritanceWarning: boolean;
}

// Role styles inspired by the example
const roleStyles = {
  owner: {
    icon: Crown,
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-700",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  admin: {
    icon: ShieldCheck,
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-700",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  editor: {
    icon: UserCheck,
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-700",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
};

export function CompanyManagersSection({
  companyId,
  isCurrentUserAdminOrOwner,
  managers,
  isLoading: isManagerListLoading,

  isCompanyOnMembershipPlan,
  ownerPlanQuantity,
  totalOwnerManagerCount,
  totalOwnerPendingInvitesCount,
  isCompanySubLoading,
  pendingInvites,
  isLoadingPendingInvites,
  currentUserRole,
  shouldShowInheritanceWarning,
}: CompanyManagersSectionProps) {
  const { user } = useAuth();
  const router = useRouter(); // <<< Use the hook
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('editor');
  // --- RESTORED State for invites within the modal --- 
  const [pendingInvitesInModal, setPendingInvitesInModal] = useState<PendingInviteInModal[]>([]); 
  // --- END RESTORED State ---
  const [isInviting, setIsInviting] = useState(false);
  const [managerToRemove, setManagerToRemove] = useState<CompanyManager | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRedirectingToPortal, setIsRedirectingToPortal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRevokingInvite, setIsRevokingInvite] = useState<string | null>(null);
  const [showLeaveConfirmDialog, setShowLeaveConfirmDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState<string | null>(null); // <<< New state for role change loading
  const [showInheritanceConflictDialog, setShowInheritanceConflictDialog] = useState(false);

  // --- UPDATED Calculations with Debug Logging --- 
  const isCurrentUserOwner = useMemo(() => {
    return managers.some(m => m.user_id === user?.id && m.role === 'owner');
  }, [managers, user?.id]);

  const currentLocalManagerCount = managers.length;
  const effectiveOwnerQuantity = ownerPlanQuantity ?? 0;
  const currentTotalManagers = totalOwnerManagerCount ?? 0;
  const currentTotalPendingInvites = totalOwnerPendingInvitesCount ?? 0;
  // Total seats currently used or invited across all owner's companies (from DB)
  const totalSeatsUsedOrPendingInDB = currentTotalManagers + currentTotalPendingInvites;
  // Seats available in the plan *before* considering invites being added in this modal session
  const remainingSeatsInPlan = isCompanyOnMembershipPlan ? Math.max(0, effectiveOwnerQuantity - totalSeatsUsedOrPendingInDB) : 0;
  // Can the user initiate inviting at all? (Is owner on plan and has >= 1 seat free overall?)
  const canInviteAny = !!isCompanyOnMembershipPlan && remainingSeatsInPlan > 0;
  // Seats available considering invites added *in this modal session*
  const remainingSeatsAfterModalAdds = Math.max(0, remainingSeatsInPlan - pendingInvitesInModal.length);
  // Can more invites be added *to the modal*?
  const canAddMorePendingInModal = remainingSeatsInPlan > 0 && remainingSeatsAfterModalAdds > 0;
  // Can the currently staged invites be sent? (Are there enough seats available from the start?)
  const canSendStagedInvites = pendingInvitesInModal.length <= remainingSeatsInPlan;
  // Overall loading state
  const isOverallLoading = isManagerListLoading || isCompanySubLoading;

  // Debug logging for seat calculations
  console.log('[DEBUG] Seat calculations:', {
    companyId,
    isCompanyOnMembershipPlan,
    effectiveOwnerQuantity,
    currentTotalManagers,
    currentTotalPendingInvites,
    totalSeatsUsedOrPendingInDB,
    remainingSeatsInPlan,
    canInviteAny,
    pendingInvitesInModalLength: pendingInvitesInModal.length,
    canAddMorePendingInModal,
    canSendStagedInvites,
    currentLocalManagerCount,
    managersCount: managers.length
  });
  // --- END UPDATED Calculations ---

  const availableInviteRoles: ('admin' | 'editor')[] = ['admin', 'editor'];

  const handleAddPendingInvite = () => {
    const emailToAdd = inviteEmail.trim().toLowerCase();
    if (!emailToAdd || !inviteRole) { toast.error("Please enter a valid email and select a role."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) { toast.error("Please enter a valid email address."); return; }

    const alreadyManager = managers.some(m => (m as any).email?.toLowerCase() === emailToAdd);
    const alreadyPendingInDb = pendingInvites.some(p => p.invited_email.toLowerCase() === emailToAdd);
    const alreadyPendingInModal = pendingInvitesInModal.some(p => p.email === emailToAdd);

    if (alreadyManager) { toast.warning(`"${emailToAdd}" is already a member.`); return; }
    if (alreadyPendingInDb) { toast.warning(`"${emailToAdd}" already has a pending invite.`); return; }
    if (alreadyPendingInModal) { toast.warning(`"${emailToAdd}" is already in this invite batch.`); return; }

    // Check if adding *this specific invite* exceeds the limit based on current modal state
    if (!canAddMorePendingInModal) { 
       toast.error("Cannot add more invites; owner seat limit would be exceeded.");
       return;
    }

    // Add to modal state
    const newPendingList = [...pendingInvitesInModal, { email: emailToAdd, role: inviteRole }];
    setPendingInvitesInModal(newPendingList);
    setInviteEmail('');

    // Check if this was the last available seat *after* adding it
    const seatsRemainingAfterThisAdd = remainingSeatsInPlan - newPendingList.length;
    if (seatsRemainingAfterThisAdd === 0) {
        toast.info("Last available seat added to invite list.");
    }
  };

  const handleRemovePendingInvite = (emailToRemove: string) => {
    setPendingInvitesInModal(pendingInvitesInModal.filter(p => p.email !== emailToRemove));
  };

  const handleInviteSubmit = async () => {
     if (pendingInvitesInModal.length === 0 || !companyId || isInviting) return;
     if (!isCompanyOnMembershipPlan) {
        toast.error("The company owner needs to upgrade their plan to invite members.");
        return;
     }
     
     setIsInviting(true);
     const invitesToSend = [...pendingInvitesInModal];
     let successCount = 0;
     let errorCount = 0;
     const errors: string[] = [];

     for (const invite of invitesToSend) {
        try {
            const response = await fetch('/api/company/invite-manager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, inviteeEmail: invite.email, role: invite.role }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Failed to invite ${invite.email}`);
            }
            successCount++;
        } catch (error: any) {
            console.error(`Invite error for ${invite.email}:`, error);
            errors.push(error.message || `Unknown error inviting ${invite.email}`);
            errorCount++;
        }
     }

     setIsInviting(false);

     if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'invite' : 'invites'} sent successfully!`);
        setPendingInvitesInModal([]);
        setShowInviteModal(false);
        // --- Use router refresh --- 
        router.push('/company?refresh=true'); 
        // --- End Use --- 
    }

    if (errorCount > 0) {
        toast.error(`${errorCount} ${errorCount === 1 ? 'invite' : 'invites'} failed to send.`, {
            description: `Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`
        });
        const successfulEmails = invitesToSend.filter((inv, i) => !errors.some(e => e.includes(inv.email))).map(inv => inv.email);
        setPendingInvitesInModal(currentPending => currentPending.filter(p => !successfulEmails.includes(p.email)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && inviteEmail.trim() && isCompanyOnMembershipPlan && canAddMorePendingInModal) {
      e.preventDefault();
      handleAddPendingInvite();
    }
  };

  const handleRemoveClick = (manager: CompanyManager) => {
    setManagerToRemove(manager);
  };

  const confirmRemove = async () => {
    if (!managerToRemove || isRemoving) return;
    setIsRemoving(true);

    try {
      const response = await fetch('/api/company/remove-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, managerUserIdToRemove: managerToRemove.user_id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove manager');
      }

      toast.success('Manager removed successfully!');
      setManagerToRemove(null);
      // --- Use router refresh --- 
      router.push('/company?refresh=true'); 
      // --- End Use --- 
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error(`Failed to remove manager: ${error.message}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRedirectToPortal = async () => {
    // Show inheritance conflict dialog if user has inherited membership but is trying to manage
    // subscription for a company they don't own
    if (currentUserRole === 'owner' && shouldShowInheritanceWarning) {
      setShowInheritanceConflictDialog(true);
      return;
    }

    if (!isCompanyOnMembershipPlan) {
      setShowUpgradeModal(true);
      return;
    }
    setIsRedirectingToPortal(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (url) window.location.href = url;
      else throw new Error('Could not get Stripe portal URL.');

    } catch (error: any) {
      console.error('Portal redirect error:', error);
      toast.error(`Failed to open subscription management: ${error.message}`);
      setIsRedirectingToPortal(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string, inviteeEmail: string) => {
    if (!isCurrentUserAdminOrOwner) return; // Basic check
    setIsRevokingInvite(inviteId); 

    try {
        const response = await fetch('/api/company/revoke-invite', { // TODO: Create this API route
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId, inviteId }), // Send companyId for verification too
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to revoke invite');
        }

        toast.success(`Invite for ${inviteeEmail} revoked.`);
        // --- Use router refresh --- 
        router.push('/company?refresh=true'); 
        // --- End Use --- 

    } catch (error: any) {
        console.error(`Revoke invite error for ${inviteId}:`, error);
        toast.error(`Failed to revoke invite: ${error.message}`);
    } finally {
        setIsRevokingInvite(null);
    }
  };

  const handleLeaveCompany = async () => {
    if (!user?.id || isLeaving) return;
    setIsLeaving(true);

    try {
      const response = await fetch('/api/company/remove-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, managerUserIdToRemove: user.id }), // Remove self
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to leave company');
      }

      toast.success('You have left the company successfully!');
      setShowLeaveConfirmDialog(false);
      setShowInviteModal(false); // Close invite modal if open
      router.push('/company?refresh=true'); // Redirect to general dashboard
    } catch (error: any) {
      console.error('Leave company error:', error);
      toast.error(`Failed to leave company: ${error.message}`);
    } finally {
      setIsLeaving(false);
    }
  };

  // --- NEW: Handler for changing manager role --- 
  const handleRoleChange = async (targetUserId: string, newRole: 'admin' | 'editor') => {
    if (!user?.id || currentUserRole !== 'owner' || isChangingRole === targetUserId) return;
    
    setIsChangingRole(targetUserId); // Set loading for this specific user
    
    try {
      const response = await fetch('/api/company/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId, 
          targetUserId, 
          newRole 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      toast.success("Manager's role updated successfully!");
      router.push('/company?refresh=true'); // Refresh data

    } catch (error: any) {
      console.error('Role change failed:', error);
      toast.error(`Failed to update role: ${error.message}`);
    } finally {
      setIsChangingRole(null); // Clear loading state
    }
  };
  // --- END NEW Handler --- 

  const renderLoadingSkeletons = (count = 2) => (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );

  const renderInviteSkeletons = (count = 1) => (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={`invite-skel-${i}`} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg opacity-70">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" /> 
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Card className="mt-6 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden bg-linear-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 p-6 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-zinc-800 dark:text-white">Company Members</CardTitle>
            <CardDescription className="text-zinc-600 dark:text-zinc-400 mt-1">
              Added members use a seat and gain DevProjects Membership through the owner's plan.
            </CardDescription>
          </div>
          {isCurrentUserAdminOrOwner && (
            <Dialog open={showInviteModal} onOpenChange={(open) => {
                setShowInviteModal(open);
                if (!open) setPendingInvitesInModal([]);
            }}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      disabled={isCompanySubLoading || !isCompanyOnMembershipPlan || remainingSeatsInPlan <= 0}
                      onClick={() => {
                        if (isCompanySubLoading || !isCompanyOnMembershipPlan || remainingSeatsInPlan <= 0) return;
                        setShowInviteModal(true);
                      }}
                      className={cn(
                        "w-full sm:w-auto",
                        "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200",
                        isCompanySubLoading && "opacity-50 cursor-wait"
                      )}
                    >
                      {isCompanySubLoading 
                        ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> 
                        : <UserPlus className="mr-0.5 h-4 w-4" />
                      }
                      Invite Member
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isCompanySubLoading 
                      ? "Loading plan details..."
                      : !isCompanyOnMembershipPlan 
                        ? (currentUserRole === 'owner' 
                            ? "Upgrade your plan to invite members"
                            : "Company owner needs to upgrade their plan")
                        : remainingSeatsInPlan <= 0
                          ? "No seats available in owner's plan"
                          : "Invite new team member"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="sm:max-w-[560px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 shadow-xl overflow-hidden">
                {isCompanySubLoading ? (
                    <div className="flex items-center justify-center p-10 h-40">
                       <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !isCompanyOnMembershipPlan ? (
                    <div className="p-6 text-center space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-medium">Membership Required</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground pt-1">
                                {currentUserRole === 'owner'
                                    ? "Your current plan doesn't support adding members. Upgrade to invite your team."
                                    : "The company owner needs to upgrade their plan to add members."}
                            </DialogDescription>
                        </DialogHeader>
                        {currentUserRole === 'owner' ? (
                            <Button
                                onClick={() => { setShowInviteModal(false); handleRedirectToPortal(); }}
                                disabled={isRedirectingToPortal}
                                className="w-full"
                            >
                                {isRedirectingToPortal ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : <Crown className="mr-0.5 h-4 w-4" />}
                                {isRedirectingToPortal ? 'Loading...' : 'Manage Subscription / Upgrade'}
                            </Button>
                        ) : null}
                        <Button variant="outline" className="w-full" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                    </div>
                ) : remainingSeatsInPlan <= 0 ? (
                    <div className="p-6 text-center space-y-4">
                       <DialogHeader>
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 mb-3">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <DialogTitle className="text-lg font-medium">Expand Your Team</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground pt-1">
                                {currentUserRole === 'owner'
                                    ? `You've reached your plan's member limit (${effectiveOwnerQuantity} seats used). Add more seats to invite additional team members!`
                                    : `The company has reached the owner's plan limit (${effectiveOwnerQuantity} seats). Contact the owner to request more seats.`}
                            </DialogDescription>
                        </DialogHeader>
                        {currentUserRole === 'owner' && (
                            <Button 
                                onClick={handleRedirectToPortal} 
                                disabled={isRedirectingToPortal} 
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                {isRedirectingToPortal ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
                                {isRedirectingToPortal ? 'Loading...' : 'Manage Plan / Add Seats'}
                                {!isRedirectingToPortal && <ExternalLink className="ml-2 h-4 w-4" />} 
                            </Button>
                        )}
                        <Button variant="outline" className="w-full" onClick={() => setShowInviteModal(false)} disabled={isRedirectingToPortal}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-zinc-800 dark:text-white">Invite team members</h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Add your colleagues to collaborate together.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="colleague@company.com"
                                className="flex-1 h-11 px-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                disabled={isInviting || !canAddMorePendingInModal}
                            />
                            <div className="flex gap-2">
                                <Select
                                  value={inviteRole}
                                  onValueChange={(value: 'admin' | 'editor') => setInviteRole(value)}
                                  disabled={isInviting}
                                >
                                    <SelectTrigger className="w-full sm:w-[130px] h-11 px-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableInviteRoles.map(role => {
                                            const RoleIcon = roleStyles[role].icon;
                                            return (
                                                <SelectItem key={role} value={role}>
                                                    <div className="flex items-center gap-2">
                                                        <RoleIcon className={cn("h-4 w-4", roleStyles[role].iconColor)} />
                                                        {role === 'admin' ? 'Admin' : 'Member'}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    onClick={handleAddPendingInvite}
                                    disabled={isInviting || !inviteEmail.trim() || !canAddMorePendingInModal}
                                    className="h-11 w-11 flex items-center justify-center
                                        bg-zinc-900 hover:bg-zinc-800
                                        dark:bg-white dark:hover:bg-zinc-200
                                        text-white dark:text-black
                                        rounded-lg transition-all duration-300 shrink-0"
                                    title={!canAddMorePendingInModal ? "Owner seat limit reached" : "Add to invite list"}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {pendingInvitesInModal.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {pendingInvitesInModal.map((invite, index) => (
                                        <motion.div
                                            key={invite.email}
                                            layout
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10, transition: { duration: 0.15 } }}
                                            transition={{ type: "spring", stiffness: 400, damping: 40 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg group">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                     <div className="h-8 w-8 rounded-full bg-muted dark:bg-zinc-700 flex items-center justify-center shrink-0">
                                                          <User className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                                                     </div>
                                                     <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate" title={invite.email}>{invite.email}</p>
                                                     </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2">
                                                     <div
                                                        className={cn(
                                                            "text-xs font-medium px-2 py-0.5 rounded-md border",
                                                            roleStyles[invite.role].bg,
                                                            roleStyles[invite.role].text,
                                                            roleStyles[invite.role].border
                                                        )}
                                                     >
                                                         {invite.role === 'admin' ? 'Admin' : 'Member'}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemovePendingInvite(invite.email)}
                                                        disabled={isInviting}
                                                        className="h-7 w-7 text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-md"
                                                        title={`Remove ${invite.email}`}
                                                    >
                                                       <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                               type="button"
                               onClick={handleInviteSubmit}
                               disabled={isInviting || pendingInvitesInModal.length === 0 || !canSendStagedInvites}
                               title={!canSendStagedInvites ? "Number of invites exceeds available owner seats" : undefined}
                               className="w-full h-11
                                   bg-zinc-900 hover:bg-zinc-800 text-white
                                   dark:bg-white dark:text-black dark:hover:bg-zinc-200
                                   rounded-lg transition-all duration-300 font-medium
                                   flex items-center justify-center gap-2
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               {isInviting ? (
                                   <Loader2 className="w-4 h-4 animate-spin" />
                               ) : (
                                   <Send className="w-4 h-4" />
                               )}
                                <span>
                                   {isInviting
                                       ? 'Sending invites...'
                                       : `Send ${pendingInvitesInModal.length || '0'} ${pendingInvitesInModal.length === 1 ? 'invite' : 'invites'}`}
                               </span>
                           </Button>
                       </div>
                    </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-6">
           <div className="p-3 mb-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/50 text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
             {isCompanySubLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription details...
                </div>
             ) : isCompanyOnMembershipPlan ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  {currentUserRole === 'owner' ? "Your Plan Seats: " : "Owner's Plan Seats: "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {(totalOwnerManagerCount ?? 0) + (totalOwnerPendingInvitesCount ?? 0)} / {effectiveOwnerQuantity}
                  </span>
                </span>
                {currentUserRole === 'owner' ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 text-xs sm:text-sm justify-start sm:justify-end"
                    onClick={handleRedirectToPortal}
                    disabled={isRedirectingToPortal}
                  >
                    {isRedirectingToPortal ? (
                      <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading Portal...</>
                    ) : (
                      <>Manage Subscription / Seats <ExternalLink className="h-3 w-3" /></>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Contact company owner to request more seats
                  </span>
                )}
              </div>
             ) : (
               <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-sm">
                    {currentUserRole === 'owner'
                      ? "Upgrade plan to add members"
                      : "Owner needs to upgrade plan to add members"}
                  </span>
                   {currentUserRole === 'owner' && (
                       <Button
                           size="sm"
                           onClick={handleRedirectToPortal}
                           disabled={isRedirectingToPortal}
                           className="shrink-0"
                       >
                            {isRedirectingToPortal ? (
                              <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Crown className="mr-0.5 h-4 w-4" />
                            )}
                            {isRedirectingToPortal ? 'Loading...' : 'Manage / Upgrade'}
                       </Button>
                   )}
               </div>
             )}
           </div>

          {isManagerListLoading ? (
            renderLoadingSkeletons(managers.length > 0 ? managers.length : 2)
          ) : managers.length === 0 && isCompanyOnMembershipPlan ? (
             <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 py-6">
                No members found for this specific company.
            </p>
          ) : managers.length === 0 && !isCompanyOnMembershipPlan ? (
             <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 py-6">
                Owner needs to upgrade plan to add more seats.
             </p>
          ) : (
            <div className="space-y-3">
                <AnimatePresence>
                  {managers.map((manager) => {
                      const RoleIcon = roleStyles[manager.role].icon;
                      const isCurrentUser = manager.user_id === user?.id;
                      const canRemove = isCurrentUserAdminOrOwner && !isCurrentUser && manager.role !== 'owner';

                      return (
                          <motion.div
                              key={manager.user_id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, transition: { duration: 0.2 } }}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl group transition-colors duration-200 hover:border-zinc-300 dark:hover:border-zinc-600"
                          >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="relative h-10 w-10 shrink-0">
                                      {manager.avatar_url ? (
                                          <Image
                                              src={manager.avatar_url}
                                              alt={manager.full_name || 'User avatar'}
                                              fill
                                              className="object-cover rounded-md bg-muted"
                                              sizes="40px"
                                          />
                                      ) : (
                                          <div className="h-10 w-10 rounded-md bg-muted dark:bg-zinc-700 flex items-center justify-center">
                                              <User className="h-5 w-5 text-muted-foreground dark:text-zinc-400" />
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                          {manager.full_name || 'Invited User'}
                                          {isCurrentUser && <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">(You)</span>}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                  {/* --- Role Display/Select Logic --- */}
                                  {(currentUserRole === 'owner' && manager.role !== 'owner' && manager.user_id !== user?.id) ? (
                                    // Owner sees a dropdown to change roles for others (non-owners)
                                    <div className="relative w-32">
                                      {isChangingRole === manager.user_id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-md">
                                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                      )}
                                      <Select 
                                          value={manager.role} 
                                          onValueChange={(newRole: 'admin' | 'editor') => handleRoleChange(manager.user_id, newRole)}
                                          disabled={isChangingRole === manager.user_id}
                                      >
                                          <SelectTrigger 
                                              className={cn(
                                                  "h-8 text-xs font-medium border rounded-md focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                                                  roleStyles[manager.role].bg,
                                                  roleStyles[manager.role].text,
                                                  roleStyles[manager.role].border,
                                                  isChangingRole === manager.user_id && "opacity-50 cursor-not-allowed"
                                              )}
                                              title={`Change role for ${manager.full_name}`}
                                          >
                                              <SelectValue placeholder="Select role" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              {['admin', 'editor'].map(r => {
                                                  const roleKey = r as 'admin' | 'editor';
                                                  const RoleIcon = roleStyles[roleKey].icon;
                                                  return (
                                                      <SelectItem key={roleKey} value={roleKey}>
                                                          <div className="flex items-center gap-2">
                                                              <RoleIcon className={cn("h-3.5 w-3.5", roleStyles[roleKey].iconColor)} />
                                                              <span>{roleKey === 'admin' ? 'Admin' : 'Member'}</span>
                                                          </div>
                                                      </SelectItem>
                                                  );
                                              })}
                                          </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    // Non-owners or owner viewing self/another owner sees static role badge
                                    <div
                                        className={cn(
                                            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border",
                                            roleStyles[manager.role].bg,
                                            roleStyles[manager.role].text,
                                            roleStyles[manager.role].border
                                        )}
                                        title={manager.role === 'admin' ? 'Admin' : manager.role === 'owner' ? 'Owner' : 'Member'}
                                    >
                                        <RoleIcon className={cn("h-3.5 w-3.5", roleStyles[manager.role].iconColor)} />
                                        <span className="hidden sm:inline">{manager.role === 'admin' ? 'Admin' : manager.role === 'owner' ? 'Owner' : 'Member'}</span>
                                    </div>
                                  )}
                                  {/* --- End Role Display/Select Logic --- */}

                                  {/* --- Refactored Remove/Leave Logic --- */}
                                  {currentUserRole === 'owner' && manager.role !== 'owner' && manager.user_id !== user?.id && (
                                      // Owner sees Remove button for others (non-owners)
                                      <AlertDialog open={managerToRemove?.user_id === manager.user_id} onOpenChange={(open) => !open && setManagerToRemove(null)}>
                                          <TooltipProvider delayDuration={100}>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
                                                          onClick={() => handleRemoveClick(manager)}
                                                          disabled={isRemoving && managerToRemove?.user_id === manager.user_id}
                                                      >
                                                          {isRemoving && managerToRemove?.user_id === manager.user_id ? (
                                                              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                                          ) : (
                                                              <X className="h-4 w-4" />
                                                          )}
                                                      </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                      <p>Remove {manager.full_name || 'member'}</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                          <AlertDialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                              <AlertDialogHeader>
                                                  <AlertDialogTitle className="text-lg font-medium text-zinc-900 dark:text-white">Remove Member</AlertDialogTitle>
                                                  <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">
                                                      Are you sure you want to remove <span className="font-medium text-zinc-800 dark:text-zinc-200">{manager.full_name || 'this user'}</span>?
                                                      They will lose all access to manage this company profile. This action cannot be undone.
                                                  </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter className="pt-4">
                                                  <AlertDialogCancel
                                                    disabled={isRemoving}
                                                    className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                  >
                                                    Cancel
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                      onClick={confirmRemove}
                                                      disabled={isRemoving}
                                                      className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                                                  >
                                                      {isRemoving ? (
                                                          <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                                                      ) : null}
                                                      {isRemoving ? 'Removing...' : 'Confirm Removal'}
                                                  </AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  )}
                                  {currentUserRole !== 'owner' && manager.user_id === user?.id && (
                                      // Non-owners see Leave button for themselves
                                      <TooltipProvider delayDuration={100}>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-8 w-8 text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
                                                      onClick={() => setShowLeaveConfirmDialog(true)}
                                                      disabled={isLeaving}
                                                  >
                                                      {isLeaving ? (
                                                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                                      ) : (
                                                          <LogOut className="h-4 w-4" />
                                                      )}
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                  <p>Leave Company</p>
                                              </TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  )}
                                  {/* --- End Refactored Logic --- */}
                              </div>
                          </motion.div>
                      );
                  })}
                </AnimatePresence>
            </div>
          )}

          <div>
             <h4 className="text-sm font-medium text-muted-foreground mb-3">Pending Invites ({totalOwnerPendingInvitesCount ?? 0})</h4>
             {isLoadingPendingInvites ? (
                renderInviteSkeletons(pendingInvites.length > 0 ? pendingInvites.length : 1)
             ) : pendingInvites.length === 0 ? (
                 <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 py-3">
                     No pending invitations.
                 </p>
             ) : (
                 <div className="space-y-3">
                     <AnimatePresence>
                        {pendingInvites.map((invite) => (
                            <motion.div
                                key={invite.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-700/50 rounded-lg group"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                     <div className="h-8 w-8 rounded-full bg-muted dark:bg-zinc-700 flex items-center justify-center shrink-0">
                                          <Mail className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate" title={invite.invited_email}>{invite.invited_email}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Invited {new Date(invite.created_at).toLocaleDateString()}
                                            {invite.expires_at && ` • Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                                        </p>
                                     </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <div
                                        className={cn(
                                            "text-xs font-medium px-2 py-0.5 rounded-md border",
                                            roleStyles[invite.role].bg,
                                            roleStyles[invite.role].text,
                                            roleStyles[invite.role].border
                                        )}
                                     >
                                         {invite.role === 'admin' ? 'Admin' : 'Member'}
                                    </div>
                                    {isCurrentUserAdminOrOwner && (
                                        <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                     <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRevokeInvite(invite.id, invite.invited_email)}
                                                        disabled={isRevokingInvite === invite.id}
                                                        className="h-7 w-7 text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/20 rounded-md"
                                                    >
                                                        {isRevokingInvite === invite.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                                        ) : (
                                                            <X className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Revoke Invite</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                     </AnimatePresence>
                 </div>
             )}
          </div>
        </CardContent>
      </Card>
      <PricingDialog isOpen={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      {/* --- Leave Company Confirmation Dialog --- */}
      <AlertDialog open={showLeaveConfirmDialog} onOpenChange={setShowLeaveConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-medium text-zinc-900 dark:text-white">Leave Company</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2">
                  Are you sure you want to leave this company?
                  You will lose access to manage its profile and any associated DevProjects Membership benefits provided through the company owner. This action cannot be undone.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
              <AlertDialogCancel
                disabled={isLeaving}
                className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleLeaveCompany}
                  disabled={isLeaving}
                  className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
              >
                  {isLeaving ? (
                      <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                  ) : null}
                  {isLeaving ? 'Leaving...' : 'Confirm Leave'}
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- End Leave Company Confirmation Dialog --- */}

      {/* --- NEW: Inheritance Conflict Dialog --- */}
      <AlertDialog open={showInheritanceConflictDialog} onOpenChange={setShowInheritanceConflictDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mx-auto mb-3">
                <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDialogTitle className="text-lg font-medium text-center text-zinc-900 dark:text-white">You're Already a Member!</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600 dark:text-zinc-400 pt-2 text-center">
              It looks like your DevProjects membership is currently linked to a different company.
              <br /><br />
              You can still manage this company's profile—but to share membership seats from this company, you'll need to:
              <ul className="list-disc list-inside text-left mt-2 pl-4 space-y-1 text-sm">
                <li>Use a different DevProjects account just for this company, or</li>
                <li>Leave your current company membership and subscribe from this one instead.</li>
              </ul>
              <br />
              Keeping memberships separate helps make seat management simple and secure.
              <br /><br />
              <span className="italic text-sm">
                Note: Only the original subscriber for a company can share their seats across multiple companies they manage.  
                For everyone else, seats stay with the company that's paying.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogAction
              onClick={() => setShowInheritanceConflictDialog(false)}
              className="w-full" // Make button full width for better centering
            >
              Okay, Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- END Inheritance Conflict Dialog --- */}
    </>
  );
}

// Removed helper function as it wasn't used