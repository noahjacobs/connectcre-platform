"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { PRICE_AMOUNTS, MEMBERSHIP_PRICES } from "@/lib/utils/stripe-products"
import { Star, TrendingUp, Newspaper, Handshake, Briefcase, DollarSign, Map, Rocket, Loader2, MessagesSquare, MapPinned, UserPlus, Plus, Minus } from "lucide-react"
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion"
import { useAuth } from "@/lib/providers/auth-context"
import { AuthModal } from "@/components/ui/auth-modal"
import { toast } from "sonner"
import { useSupabase } from "@/lib/providers/supabase-context"
import { useRouter, usePathname } from "next/navigation"

const membershipPlanFeatures = [
  { name: "Market & Project Intel", description: "Real-time updates + curated insights. Know what's breaking ground and who's behind it.", icon: MapPinned },
  { name: "Direct Connections", description: "Message developers, lenders, vendors, and more. Connect with the whole project team.", icon: MessagesSquare },
  { name: "Lead Generation", description: "Discover the right projects and contacts to go after. Win more business.", icon: Handshake },
  { name: "Team Access", description: "Additional seats just $8/mo. Grow your business together at a company rate.", icon: UserPlus },
];

const membershipPlan = {
  id: "membership",
  name: "DevProjects Membership",
  price: {
    monthly: PRICE_AMOUNTS.membership.month,
    yearly: PRICE_AMOUNTS.membership.year,
  },
  description: "Your unfair advantage in commercial real estate.",
  icon: Star,
  features: membershipPlanFeatures,
  highlight: true,
};

interface PricingSectionProps {
  className?: string
}

interface Subscription {
  id: string
  status: string
  plan_id: string
  current_period_end: string
  cancel_at?: string
}

function PricingSection({ className }: PricingSectionProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const { supabase } = useSupabase();
    // Always bill annually but show monthly pricing
    const { user } = useAuth()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function loadSubscription() {
      if (!user?.id || !supabase) return

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSubscription(sub)
    }

    loadSubscription()
  }, [user?.id])

  const handleManageSubscription = async () => {
    if (!user?.id) {
      setShowAuthModal(true)
      return
    }

    setIsLoading('manage')
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create portal session')
        return
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
        return
      }

      toast.error('Could not open customer portal.')
    } catch (error) {
      console.error('Portal session error:', error)
      toast.error('An error occurred while processing your request')
    } finally {
      setIsLoading(null)
    }
  }

  const MEMBERSHIP_PLAN_ID = 'membership';
  const MEMBERSHIP_MONTHLY_PRICE_ID = MEMBERSHIP_PRICES.membership.month_legacy;
  const MEMBERSHIP_YEARLY_PRICE_ID = MEMBERSHIP_PRICES.membership.year;

  const isCurrentPlan = (
    subscription?.status === 'active' &&
    (subscription.plan_id === MEMBERSHIP_MONTHLY_PRICE_ID || subscription.plan_id === MEMBERSHIP_YEARLY_PRICE_ID)
  )

  const getSubscriptionStatusText = () => {
    if (!subscription || !isCurrentPlan) return null
    if (subscription.cancel_at) {
      return `Expires ${new Date(subscription.cancel_at).toLocaleDateString()}`
    }
    return `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
  }

  const handleSubscribe = async () => {
    const tierId = MEMBERSHIP_PLAN_ID;

    if (!user?.id || !supabase) {
      setShowAuthModal(true)
      return
    }

    setIsLoading(tierId)
    try {
      const targetPriceId = MEMBERSHIP_YEARLY_PRICE_ID; // Always use annual billing

      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_city')
        .eq('id', user.id)
        .single();

      const cityToAttribute = profile?.selected_city || null;
      const currentAttributedPost = pathname === '/' ? null : pathname.startsWith('/') ? pathname.substring(1) : pathname;
      const returnPathAfterCheckout = "/dashboard";

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: targetPriceId,
          quantity: quantity,
          attributedCity: cityToAttribute,
          attributedPost: currentAttributedPost,
          returnPath: returnPathAfterCheckout
        }),
      })

      const { url, error } = await response.json()
      if (url) {
        window.location.href = url
      } else {
        toast.error(error || 'Could not initiate checkout session.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Failed to start checkout process')
    } finally {
      setIsLoading(null)
    }
  }

  const buttonStyles = {
    highlight: cn(
      "h-12 bg-blue-600 dark:bg-blue-500",
      "hover:bg-blue-700 dark:hover:bg-blue-600",
      "text-white",
      "shadow-[0_1px_15px_rgba(0,0,0,0.1)] dark:shadow-blue-500/30",
      "hover:shadow-[0_1px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-blue-500/40",
      "font-semibold text-base",
      "transition-all duration-300"
    ),
  }

  const NumberAnimation = ({ value }: { value: number }) => {
    const count = useMotionValue(0)
    const rounded = useTransform(count, (latest) => Math.round(latest))

    useEffect(() => {
      const animation = animate(count, value, {
        duration: 0.4,
        ease: "easeOut",
        type: "tween"
      })
      return animation.stop
    }, [value])

    return (
      <motion.span className="tabular-nums inline-block min-w-[2ch] text-right">
        {rounded}
      </motion.span>
    )
  }

  const AnimatedPrice = ({ price }: { price: number }) => (
    <div className="flex flex-col items-start">
      <div className="flex items-baseline">
        <span className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
          ${price.toLocaleString()}
        </span>
        <span className="ml-2 text-base font-medium text-zinc-500 dark:text-zinc-400">
          /month
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="px-2 py-1 text-sm font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
          Billed Annually
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          ${(price * 12).toLocaleString()} total/year
        </span>
      </div>
    </div>
  )

  return (
    <>
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={pathname}
      />
      <section
        className={cn(
          "relative bg-white dark:bg-black text-foreground",
          "py-12 px-4",
          "overflow-hidden",
          className,
        )}
        id="pricing"
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-linear-to-bl from-blue-500/2 to-transparent dark:from-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-tr-to-gradient from-transparent to-emerald-500/2 dark:from-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full px-6 mx-auto max-w-200">
          <div className="flex flex-col items-center mb-12">
             {isCurrentPlan && (
              <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-sm font-medium mb-4 text-emerald-700 dark:text-emerald-300">
                <CheckIcon className="h-4 w-4 mr-0.5" />
                You have this plan!
              </div>
            )}
            {isCurrentPlan ? (
              <h2 className="text-3xl md:text-4xl font-bold text-center">
                Your Membership
              </h2>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative"
                style={{
                  willChange: "transform, opacity",
                  backfaceVisibility: "hidden",
                  WebkitFontSmoothing: "subpixel-antialiased"
                }}
              >
                <motion.h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center leading-tight">
                  <motion.span 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                  >
                    Unlock
                  </motion.span>
                  {" "}
                  <motion.span 
                    className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 via-violet-600 to-emerald-600 dark:from-blue-400 dark:via-violet-400 dark:to-emerald-400 pb-1"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  >
                    DevProjects
                  </motion.span>
                </motion.h2>

                {/* Animated gradient glow */}
                <motion.div
                  className="absolute -inset-2 bg-linear-to-r from-blue-600/10 via-violet-600/10 to-emerald-600/10 rounded-3xl blur-xl opacity-40 dark:opacity-60"
                  initial={{ opacity: 0.4, scale: 1 }}
                  animate={{
                    scale: [1, 1.02, 1],
                    opacity: [0.4, 0.6, 0.4],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                  style={{
                    willChange: "transform, opacity",
                    backfaceVisibility: "hidden",
                    transform: "translate3d(0,0,0)"
                  }}
                />
              </motion.div>
            )}
            

          </div>

          <div className="relative">
            <div className="absolute inset-x-0 -top-6 h-6 pointer-events-none" aria-hidden="true" />

            {(() => {
              const tier = membershipPlan;
              const Icon = tier.icon;
              const statusText = getSubscriptionStatusText();
              // Base: $399/mo, Additional seats: $99/yr each
              const currentPrice = 399 + ((quantity - 1) * 96/12);

              return (
                <div
                  key={tier.name}
                  className={cn(
                    "relative group",
                    "rounded-3xl",
                    "flex flex-col h-full",
                    "bg-linear-to-b from-blue-50 to-white dark:from-blue-950/50 dark:to-zinc-900",
                    "border",
                    isCurrentPlan
                      ? "border-emerald-200/50 dark:border-emerald-500/20"
                      : "border-blue-200/50 dark:border-blue-500/20",
                    "shadow-xl",
                    "will-change-transform",
                    "transition-all duration-300",
                    "md:scale-[1.02]"
                  )}
                >
                  {isCurrentPlan && (
                      <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg shadow-emerald-500/20 border border-emerald-500/20">
                          Current Plan
                        </div>
                      </div>
                    )}
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-baseline justify-between mb-4">
                      <AnimatedPrice price={currentPrice} />
                      <h3 className={cn(
                        "absolute top-6 right-6 text-xl font-semibold",
                        "bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent"
                      )}>
                        {tier.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
                       <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                       <p className="text-sm">
                         <span className="font-semibold">Team Plans Available</span> — Additional seats $8/month per seat
                       </p>
                     </div>



                    <div className="mb-6 h-px bg-linear-to-r from-transparent via-blue-200 dark:via-blue-700 to-transparent" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                       {tier.features.map((feature) => {
                          const FeatureIcon = feature.icon;
                          return (
                           <div key={feature.name} className="flex gap-4">
                              <div
                                className={cn(
                                  "mt-1 shrink-0",
                                   "text-blue-600 dark:text-blue-400"
                                )}
                              >
                                <div className="rounded-full bg-current/10 p-1">
                                   <FeatureIcon className="w-4 h-4" />
                                </div>
                              </div>
                              <div>
                                <div className={cn(
                                  "font-medium",
                                  "text-blue-900 dark:text-blue-100"
                                )}>
                                  {feature.name}
                                </div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {feature.description}
                                </div>
                              </div>
                            </div>
                          )
                       })} 
                    </div>
                  </div>

                  <div className="p-8 pt-0">
                    {isCurrentPlan ? (
                      <div className="space-y-3">
                        <Button
                          onClick={handleManageSubscription}
                          disabled={isLoading === 'manage'}
                          className={cn(
                            "w-full transform-gpu",
                            "transition-colors duration-300",
                            "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30",
                            "text-emerald-700 dark:text-emerald-300",
                            "h-12 rounded-xl font-medium"
                          )}
                        >
                          <span className="flex items-center justify-center gap-2">
                            {isLoading === 'manage' ? (
                              <div className="flex items-center gap-2">
                                 <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </div>
                            ) : (
                              'Manage Subscription'
                            )}
                          </span>
                        </Button>
                        {statusText && (
                          <p className="text-sm text-center text-emerald-600/80 dark:text-emerald-400/80">
                            {statusText}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
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
                          disabled={isLoading === MEMBERSHIP_PLAN_ID}
                          className={cn(
                            "w-full transform-gpu",
                            buttonStyles.highlight,
                            "h-12 rounded-xl"
                          )}
                        >
                          <span className="flex items-center justify-center gap-2">
                            {isLoading === MEMBERSHIP_PLAN_ID ? (
                              <div className="flex items-center gap-2">
                                 <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </div>
                            ) : (
                              <>
                                Get Full Access
                                <ArrowRightIcon className="w-4 h-4 transform-gpu transition-transform duration-300 group-hover:translate-x-1" />
                              </>
                            )}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>
    </>
  )
}

export { PricingSection } 