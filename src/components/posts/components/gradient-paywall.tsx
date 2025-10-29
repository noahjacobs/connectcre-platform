"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { AuthModal } from "@/components/ui/auth-modal"
import { PricingDialog } from "@/components/ui/pricing-dialog"
import { useAuth } from "@/lib/providers/auth-context"

export function GradientPaywall() {
  const [showAuth, setShowAuth] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // Add class to body when paywall mounts
    document.body.classList.add('paywall-active');

    // Cleanup: remove class when unmounted
    return () => {
      document.body.classList.remove('paywall-active');
    };
  }, []); // Only run on mount and unmount

  return (
    <>
      {/* Interaction blocker */}
      <div 
        className="fixed inset-0 overflow-hidden"
        style={{ 
          zIndex: 40,
          height: '100vh'
        }} 
      />

      {/* Full page blur/fade overlay */}
      <div 
        className="fixed inset-0 pointer-events-none bg-gradient"
        style={{ 
          backdropFilter: 'blur(2px)',
          zIndex: 45,
        }} 
      />
      
      {/* Fixed paywall dialog that slides up */}
      <div 
        className="fixed bottom-0 inset-x-0 bg-background border-t shadow-2xl rounded-t-3xl animate-slide-up"
        style={{ maxHeight: '80vh', zIndex: 50 }}
      >
        <div className="flex flex-col text-center max-w-2xl mx-auto p-8">
          <h2 className="text-4xl font-bold mb-3">Keep Reading</h2>
          <p className="text-xl text-foreground/80 mb-2">
            Get unlimited access to DevProjects
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Stay informed with nationwide coverage, and connect with top CRE professionals.
          </p>

          <div className="space-y-4">
            <Button 
              className="w-full py-7 text-lg font-medium group" 
              size="lg"
              onClick={() => {
                setShowPricingDialog(true)
              }}
            >
              Become a member
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            {!user && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <AuthModal 
                  open={showAuth} 
                  onOpenChange={setShowAuth}
                  trigger={
                    <Button 
                      variant="outline" 
                      className="w-full py-7 text-lg hover:bg-muted/50" 
                      size="lg"
                    >
                      Sign in to your account
                    </Button>
                  }
                />
              </>
            )}
          </div>

          <div className="mt-8 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Access 5 free projects each month • Subscribe for unlimited access
            </p>
            <Button 
              variant="link" 
              className="text-sm text-foreground hover:text-foreground/80"
              onClick={() => {
                window.location.href = '/about'
              }}
            >
              See member benefits
            </Button>
          </div>
        </div>
      </div>

      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        // defaultPlan="editorial"
      />
    </>
  )
} 