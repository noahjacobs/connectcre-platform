'use client';

import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function StickySmall() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div 
      id="sticky-cta"
      className="fixed bottom-6 left-6 sm:right-6 sm:left-auto z-50 transition-all duration-500 transform translate-y-20 opacity-0 pointer-events-none group"
    >
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 backdrop-blur-md w-64">
        {/* Close button */}
        <button 
          onClick={() => {
            setIsDismissed(true);
            // Also close the large CTA by dispatching a custom event
            window.dispatchEvent(new CustomEvent('closeStickyCtAs'));
          }} 
          className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors z-10 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-600 via-violet-600 to-emerald-600"></div>
        
        <div className="p-4">
          {/* Badge */}
          <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
            <Star className="h-3 w-3 mr-1" />
            <span>DevProjects Membership</span>
          </div>
          
          {/* Main content */}
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Join the CRE Market Leader</h4>
          
          {/* Pricing */}
          <div className="flex items-baseline gap-1 mb-3">
            <div className="text-xl font-bold text-zinc-900 dark:text-white">$399</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">/month</div>
            <div className="text-xs px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full ml-auto">
              + $8/mo/seat
            </div>
          </div>
          
          {/* CTA Button */}
          <Button 
            className="w-full bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-md hover:shadow-lg transition-all py-1.5 h-auto text-xs font-medium group"
            onClick={() => {
              const element = document.getElementById('pricing');
              if (element) {
                const offset = element.getBoundingClientRect().top + window.scrollY - 60;
                window.scrollTo({ top: offset, behavior: 'smooth' });
              }
            }}
          >
            Unlock Access
            <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
} 