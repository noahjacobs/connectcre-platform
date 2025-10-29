'use client';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AuthCard from "@/components/ui/auth-card";
import { useState } from "react";

interface AuthModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  returnTo?: string;
  plan?: string;
  billing?: 'monthly' | 'yearly';
}

export function AuthModal({ 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  returnTo,
  plan,
  billing
}: AuthModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default">
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        title="Authentication" 
        className="p-0 w-fit" 
        showCloseButton={false}
      >
        <AuthCard 
          onClose={() => handleOpenChange(false)}
          returnTo={returnTo}
          plan={plan}
          billing={billing}
        />
      </DialogContent>
    </Dialog>
  );
} 