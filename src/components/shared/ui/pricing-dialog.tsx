import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Check, ArrowRight, Loader2, AlertCircle, Newspaper, Star, Briefcase, Map, Handshake, Rocket, LucideProps, FileText, MessagesSquare, UserPlus, TrendingUp, MapPinned, ShieldCheck, Minus, Plus } from "lucide-react";
import { MEMBERSHIP_PRICES, PRICE_AMOUNTS } from "@/lib/utils/stripe-products";
import { useAuth } from "@/lib/providers/auth-context";
import { useSubscription } from "@/lib/providers/subscription-context";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/ui/auth-modal";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/lib/providers/supabase-context";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PlanOption {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: {
    name: string;
    description: string;
    icon: React.ElementType;
  }[];
  icon: React.ReactNode;
  highlight?: boolean;
}

const membershipPlanFeatures = [
  { name: "Market & Project Intel", description: "Real-time updates + curated insights. Know what's breaking ground and who's behind it.", icon: MapPinned },
  { name: "Direct Connections", description: "Message developers, lenders, vendors, and more. Connect with the whole project team.", icon: MessagesSquare },
  { name: "Lead Generation", description: "Discover the right projects and contacts to go after. Win more business.", icon: Handshake },
  { name: "Team Access", description: "Additional seats just $8/mo. Grow your business together at a company rate.", icon: UserPlus },
];

const defaultPlans: PlanOption[] = [
  {
    id: "membership",
    name: "DevProjects Membership",
    price: {
      monthly: PRICE_AMOUNTS.membership.month,
      yearly: PRICE_AMOUNTS.membership.year,
    },
    description: "Your unfair advantage in commercial real estate.",
    icon: <Star className="h-4 w-4" />,
    features: membershipPlanFeatures,
    highlight: true,
  },
];

interface PricingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SINGLE_PLAN_ID = 'membership';
const MEMBERSHIP_YEARLY_PRICE_ID = MEMBERSHIP_PRICES.membership.year;

export function PricingDialog({
  isOpen,
  onOpenChange,
}: PricingDialogProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const { subscription, refreshSubscription, isMembershipPlan } = useSubscription();
  const pathname = usePathname();
  const { supabase } = useSupabase();

  const plan = defaultPlans.find(p => p.id === SINGLE_PLAN_ID);

  const handleSubscribe = async () => {
    if (!user?.id || !supabase) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const targetPriceId = MEMBERSHIP_YEARLY_PRICE_ID; // Always use yearly billing

      if (subscription?.status === 'active') {
        if (subscription.plan_id === targetPriceId) {
          const response = await fetch('/api/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const { url } = await response.json();
          if (url) {
            window.location.href = url;
          } else {
            toast.error('Could not create portal session.');
          }
        } else {
          const response = await fetch('/api/create-update-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newPriceId: targetPriceId,
              subscriptionId: subscription.stripe_subscription_id,
            }),
          });

          const sessionData = await response.json();
          if (sessionData.invoice_url) {
            window.location.href = sessionData.invoice_url;
          } else if (sessionData.url) {
             console.warn('Update returned a generic URL, redirecting...');
             window.location.href = sessionData.url;
          } else if (sessionData.success) {
            toast.success('Subscription updated successfully!');
            await refreshSubscription();
            onOpenChange(false);
          } else {
            toast.error(sessionData.error || 'Failed to update subscription.');
          }
        }
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_city')
        .eq('id', user.id)
        .single();
      const cityToAttribute = profile?.selected_city || null;
      const currentAttributedPost = pathname === '/' ? null : pathname.startsWith('/') ? pathname.substring(1) : pathname;
      const returnPathAfterCheckout = "/";

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: targetPriceId,
          quantity: quantity,
          attributedCity: cityToAttribute,
          attributedPost: currentAttributedPost,
          returnPath: returnPathAfterCheckout
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
         toast.error('Could not initiate checkout session.');
      }
    } catch (error) {
      console.error('Error handling subscription:', error);
      toast.error('Failed to process subscription request');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (subscription?.status === 'active') {
      if (isMembershipPlan) {
        return 'Manage Subscription';
      }
    }
    return `Get Full Access`;
  };

  if (!plan) {
     console.error("Membership plan not found in configuration.");
     return null;
  }

  // Show monthly price but bill annually
  // Base: $399/mo ($4,788/year), Additional seats: $99/yr
  const monthlyPrice = 399 + ((quantity - 1) * 96/12);
  const annualPrice = 4788 + ((quantity - 1) * 96);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <VisuallyHidden>
          <DialogTitle>Subscription</DialogTitle>
        </VisuallyHidden>
        <DialogContent className="sm:max-w-[700px] p-0 rounded-xl">
           <div className="flex flex-col max-h-[90vh]">
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 text-center">
              <h2 className="text-xl font-semibold">
                Unlock DevProjects
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

              <div
                className="relative flex flex-col p-4 rounded-xl border-2 border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                    )}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {/* <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {plan.description}
                      </p> */}
                    </div>
                  </div>
                  {plan.highlight && (
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                       <span className="px-3 py-1 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-blue-500 rounded-full shadow-md">
                         Full Access
                       </span>
                     </div>
                   )}
                </div>

                <div className={cn(
                  "flex items-baseline mb-2"
                )}>
                  <span className="text-3xl font-bold">
                    ${monthlyPrice.toLocaleString()}
                  </span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    /month {quantity === 1 ? '' : `for ${quantity} seats`}
                  </span>
                </div>
                
                <div className="mb-3 flex items-center gap-2">
                  <span className="px-2 py-1 text-sm font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                    Billed Annually
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    ${annualPrice.toLocaleString()} total/year
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
                   <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                   <p className="text-sm">
                     <span className="font-semibold">Team Plans Available</span> — Additional seats $8/month per seat
                   </p>
                 </div>

                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  {plan.features.map((feature) => {
                    const IconComponent = feature.icon;
                    return (
                      <li key={feature.name} className="flex gap-3 items-start">
                        <div className={cn(
                          "mt-1 shrink-0",
                           "text-blue-600 dark:text-blue-400"
                        )}>
                          <div className="rounded-full bg-current/10">
                            <IconComponent className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {feature.name}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            {feature.description}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                 <div className="absolute -right-[2px] -top-[2px]">
                   <span className={cn(
                     "flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-900",
                     "bg-blue-600 dark:bg-blue-600"
                   )}>
                     <Check className={cn(
                       "h-3.5 w-3.5",
                       "text-white"
                     )} />
                   </span>
                 </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
              {subscription?.status === 'active' && subscription.cancel_at && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Your subscription will be canceled on {new Date(subscription.cancel_at).toLocaleDateString()}.
                      </p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-yellow-700 dark:text-yellow-300"
                        onClick={handleSubscribe}
                      >
                        Reactivate subscription
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center mb-4">
                <div className="flex-1 flex justify-end pr-4">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Team Size:</span>
                </div>
                <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 1) {
                        setQuantity(value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (isNaN(value) || value < 1) {
                        setQuantity(1);
                      }
                    }}
                    className="w-16 py-2 border-x border-zinc-200 dark:border-zinc-700 text-center font-medium bg-transparent focus:outline-none focus:bg-zinc-50 dark:focus:bg-zinc-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-r-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 flex justify-start pl-4">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    seat{quantity > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={isLoading}
                className={cn(
                  "w-full h-12 text-base font-semibold",
                    "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {getButtonText()}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo="pricing"
      />
    </>
  );
} 