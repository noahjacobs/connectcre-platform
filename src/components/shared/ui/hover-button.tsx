import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  icon?: React.ReactNode;
}

const HoverButton = React.forwardRef<
  HTMLButtonElement,
  HoverButtonProps
>(({ text = "Button", icon=<ArrowRight className="transition-all duration-300 group-hover:translate-x-1" />, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-32 cursor-pointer overflow-hidden rounded-full bg-primary text-primary-foreground p-2 text-center font-semibold",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="transition-transform duration-300 group-hover:scale-105">{text}</span>
        {icon}
      </div>
      
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary-foreground/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -translate-x-full group-hover:translate-x-full transition-transform duration-1000 w-1/2 h-full bg-linear-to-r from-transparent via-primary-foreground/20 to-transparent transform skew-x-12" />
      </div>
    </button>
  );
});

HoverButton.displayName = "HoverButton";

export { HoverButton };
