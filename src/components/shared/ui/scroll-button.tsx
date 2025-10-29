"use client";

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ScrollButtonProps {
  targetId: string;
  className?: string;
  children: React.ReactNode;
}

export function ScrollButton({ targetId, className, children }: ScrollButtonProps) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Button 
      size="lg" 
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
} 