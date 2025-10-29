"use client";

import * as React from "react";
import { X, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  buttonText?: string;
  description?: string;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

export function UpgradeBanner({
  buttonText = "Upgrade to Pro",
  description = "for 2x more CPUs and faster builds",
  onClose,
  onClick,
  className
}: UpgradeBannerProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const iconVariants = {
    hidden: { x: 0, y: 0, opacity: 0, scale: 0.8 },
    visible: (custom: { x: number; y: number }) => ({
      x: custom.x,
      y: custom.y,
      opacity: 1,
      scale: 1,
      transition: {
        x: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.3 },
        scale: {
          duration: 0.3,
          type: "spring",
          stiffness: 200,
          damping: 15,
        },
      },
    }),
  };

  const sparkleVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.7, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className={cn("w-full flex items-center justify-center", className)}>
      <AnimatePresence>
        <motion.div
          className="relative w-full"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative flex h-[64px] w-[calc(100vw-2rem)] sm:w-full sm:h-[40px] min-h-[48px] sm:min-h-0 items-center justify-center gap-1 rounded-[6px] border border-[#CBE7FF] bg-[#F0F7FF] pl-2.5 pr-1 text-sm dark:border-[#003674] dark:bg-[#06193A]">
            <div className="flex flex-col sm:flex-row flex-1 items-center justify-center sm:items-center min-w-0 gap-2 sm:gap-3 py-3">
              <div className="relative">
                <motion.div
                  initial="hidden"
                  animate={isHovered ? "visible" : "hidden"}
                  variants={iconVariants}
                  custom={{ x: -8, y: -8 }}
                  className="pointer-events-none absolute -left-0.5 -top-0.5"
                >
                  <motion.div
                    variants={sparkleVariants}
                    animate="animate"
                    style={{ originX: "50%", originY: "50%" }}
                  >
                    <Sparkles className="h-4 w-4 text-[#005FF2] dark:text-[#006EFE]" />
                  </motion.div>
                </motion.div>
                <motion.div
                  initial="hidden"
                  animate={isHovered ? "visible" : "hidden"}
                  variants={iconVariants}
                  custom={{ x: 10, y: 10 }}
                  className="pointer-events-none absolute -right-0.5 -bottom-0.5"
                >
                  <motion.div
                    variants={sparkleVariants}
                    animate="animate"
                    style={{ originX: "50%", originY: "50%" }}
                  >
                    <Sparkles className="h-4 w-4 text-[#005FF2] dark:text-[#006EFE]" />
                  </motion.div>
                </motion.div>
                <button
                  className="focus-visible:shadow-focus-ring rounded-xs cursor-pointer border-none bg-transparent px-0 font-sans text-[14px] sm:text-[13px] font-medium text-[#002359] underline decoration-[#CAE7FF] underline-offset-[5px] outline-none hover:text-[#005FF2] hover:decoration-[#94CCFF] focus-visible:shadow-[#008FFF]! dark:text-[#EAF5FF] dark:decoration-[#003674] dark:hover:text-[#44A7FF] dark:hover:decoration-[#00408A] whitespace-nowrap"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={onClick}
                >
                  {buttonText}
                </button>
              </div>
              <span className="text-[0.8125rem] text-[#005FF2] dark:text-[#44A7FF] text-center">
                {description}
              </span>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="absolute right-px top-px sm:relative sm:right-0 sm:top-0 m-0 flex h-6 w-6! shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent p-0 text-[#005FF2] hover:bg-[#CAE7FF] dark:hover:bg-[#012F61] sm:self-center"
                >
                  <X size={16} className="text-[#005FF2] dark:text-[#47A8FF]" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}