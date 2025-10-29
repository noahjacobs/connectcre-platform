import { useRouter } from 'next/navigation';
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SubscriptionSuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tier: 'DevProjects Membership' | 'Editorial' | 'free';
  reason: 'subscription' | 'invite' | null;
  hadExistingSubscription?: boolean;
}

export function SubscriptionSuccessDialog({
  isOpen,
  onOpenChange,
  tier,
  reason,
  hadExistingSubscription
}: SubscriptionSuccessDialogProps) {
  const router = useRouter();

  const handleExploreContent = () => {
    onOpenChange(false);
    router.push('/');
  };

  const handleBrowseDirectory = () => {
    onOpenChange(false);
    router.push('/directory');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] gap-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <div className="text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold leading-6 text-center">
              {/* Conditional Title based on reason */}
              {reason === 'invite' && 'Welcome to DevProjects!'}
              {/* {reason === 'subscription' && tier === 'editorial' && 'Welcome to DevProjects Editorial Membership!'}
              {reason === 'subscription' && tier === 'pro' && 'Welcome to DevProjects Pro Membership!'}
              {reason === 'subscription' && tier === 'broker' && 'Welcome to DevProjects Broker Membership!'} */}
              {reason === 'subscription' && tier === 'DevProjects Membership' && 'Welcome to DevProjects!'}
              {reason === 'subscription' && tier === 'Editorial' && 'Welcome Back to DevProjects!'} {/* Added Editorial Title */}
              {reason !== 'invite' && reason !== 'subscription' && 'Welcome to DevProjects!'}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {/* Conditional Description based on reason and new flag */}
              {reason === 'invite' && hadExistingSubscription && (
                <>
                  You've successfully joined a company on DevProjects! Membership benefits are now provided by their plan.
                  <br/><br/>
                  We noticed you also have an active personal subscription. You can manage or cancel your personal plan in user settings at any time.
                </>
              )}
              {reason === 'invite' && !hadExistingSubscription && ( // <-- Original invite message
                'You have successfully joined a company on DevProjects. You now have access to premium features, editorial content, and exclusive opportunities.'
              )}
              {reason === 'subscription' && tier === 'DevProjects Membership' && (
                'You\'re ready to unlock market intel, find your next deal, and connect with key players reshaping our cities.'
              )}
              {reason === 'subscription' && tier === 'Editorial' && (
                'As one of our valued original subscribers, you continue to enjoy access to all our premium editorial content. To explore new features like our company directory, bid tools, and enhanced networking, consider upgrading to the new DevProjects Membership.'
              )}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button 
            size="lg"
            onClick={handleExploreContent}
            className="flex-1"
          >
            Explore Content
          </Button>
          {/* Button 2: Conditional */} 
          {reason === 'invite' && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                  onOpenChange(false);
                  router.push('/company'); // Navigate to company dashboard
              }}
              className="flex-1"
            >
              Company Profile
            </Button>
          )}
          {reason === 'subscription' && tier === 'DevProjects Membership' && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleBrowseDirectory}
              className="flex-1"
            >
              Browse Directory
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 