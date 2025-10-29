'use client';

import { Star, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function StickyLarge() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for the custom event from sticky-small
    const handleClose = () => setIsVisible(false);
    window.addEventListener('closeStickyCtAs', handleClose);
    
    return () => {
      window.removeEventListener('closeStickyCtAs', handleClose);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-500 transform translate-y-0 opacity-100 group" id="sticky-cta-large">
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 backdrop-blur-md w-80 sm:w-96">
        {/* Close button */}
        <button 
          onClick={() => {
            setIsVisible(false);
            // Also close the small CTA by dispatching the same event
            window.dispatchEvent(new CustomEvent('closeStickyCtAs'));
          }}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors z-10 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-600 via-violet-600 to-emerald-600"></div>
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-linear-to-tl from-blue-500/10 to-transparent rounded-full blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-linear-to-tr from-emerald-500/10 to-transparent rounded-full blur-xl"></div>
        
        <div className="p-6">
          {/* Badge */}
          <div className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 mb-4">
            <Star className="h-3 w-3 mr-1.5 text-blue-500" />
            <span>Limited Time Offer</span>
          </div>
          
          {/* Main content */}
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Unlock Premium CRE Access</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Join 500,000+ professionals connecting directly with developers and financing sources.</p>
          
          {/* Pricing */}
          <div className="flex items-baseline gap-2 mb-5">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">$99</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">/month</div>
            {/* <div className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full ml-auto">
              Save 17% annually
            </div> */}
          </div>
          
          {/* Features */}
          <div className="space-y-2.5 mb-5">
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 mr-2.5 shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Direct access to 500+ developers</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 mr-2.5 shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Bid on 8,500+ active projects</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 mr-2.5 shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Premium market intelligence</span>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="space-y-3">
            <Button className="w-full bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-lg hover:shadow-xl transition-all py-5 h-auto text-sm font-medium group">
              Get Pro Membership
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              30-day money back guarantee. No commitment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}