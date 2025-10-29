'use client';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileEditForm, ProfileFormRef } from "@/components/ui/profile-edit-form";
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { useState, useRef, useEffect } from "react";
import { useSubscription } from '@/lib/providers/subscription-context';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditModal({ open, onOpenChange }: ProfileEditModalProps) {
  const formRef = useRef<ProfileFormRef>(null);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const { refreshSubscription } = useSubscription();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !showPricingDialog) {
      formRef.current?.handleCancel();
    }
    // Only propagate close if pricing dialog isn't showing
    if (!showPricingDialog) {
      onOpenChange(newOpen);
    }
  };

  return (
    <>
      <Dialog open={open && !showPricingDialog} onOpenChange={handleOpenChange}>
        <DialogContent 
          title="Edit Profile" 
          className="max-w-md p-4" 
          showCloseButton={false}
        >
          <ProfileEditForm 
            ref={formRef}
            onClose={() => onOpenChange(false)}
            onShowPricing={() => setShowPricingDialog(true)} 
          />
        </DialogContent>
      </Dialog>

      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={async (isOpen) => {
          setShowPricingDialog(isOpen);
          if (!isOpen) {
            await refreshSubscription();
            onOpenChange(false);
          }
        }}
        // defaultPlan="pro"
      />
    </>
  );
} 