"use client";

import { useEffect } from 'react';

export function StickyCTAScript() {
  useEffect(() => {
    // Ensure the CTA starts hidden
    const stickyCta = document.getElementById('sticky-cta');
    if (stickyCta) {
      stickyCta.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }

    const handleScroll = () => {
      const stickyCta = document.getElementById('sticky-cta');
      const pricingSection = document.getElementById('pricing');
      if (!stickyCta) return;
      
      // Check if pricing section is in view
      const isPricingSectionInView = pricingSection ? isElementInView(pricingSection) : false;
      
      // Show after scrolling past 10px AND pricing section is not in view
      if (window.scrollY > 10 && !isPricingSectionInView) {
        stickyCta.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
        stickyCta.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
      } else {
        stickyCta.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        stickyCta.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      }
    };

    // Helper function to check if element is in viewport
    const isElementInView = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      
      return (rect.top >= -700 && rect.top <= windowHeight);
    };

    // Add a small delay before binding scroll event to ensure initial state is set
    setTimeout(() => {
      window.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }, 100);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return null;
} 