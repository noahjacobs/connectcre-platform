"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotionButtonProps {
    children: React.ReactNode;
    onLoad?: () => Promise<void>;
    className?: string;
    loadingDuration?: number;
}

export default function MotionButton({
    children = "Load More",
    onLoad,
    className = "",
    loadingDuration = 2000,
}: MotionButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            await onLoad?.();
        } finally {
            setTimeout(() => setIsLoading(false), loadingDuration);
        }
    };

    return (
        <motion.button
            className={cn(
                "relative group overflow-hidden",
                "h-10 px-5 rounded-lg",
                "flex items-center justify-center gap-2",
                "text-sm font-medium",
                "transition-all duration-300",
                isLoading 
                    ? "bg-white/5 dark:bg-zinc-800/90 ring-1 ring-blue-500/20 dark:ring-blue-500/30" 
                    : "bg-zinc-900 dark:bg-zinc-100",
                "shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                "backdrop-blur-xs",
                isLoading && "cursor-pointer",
                className
            )}
            onClick={handleClick}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Background Gradient Animation */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="absolute inset-0 bg-linear-to-r from-blue-500/10 to-blue-600/10 
                                 dark:from-blue-900/30 dark:to-blue-800/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={isLoading ? "loading" : "default"}
                    className={cn(
                        "relative flex items-center gap-2",
                        isLoading 
                            ? "text-blue-500 dark:text-blue-400" 
                            : "text-white dark:text-zinc-900"
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading...</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4 transform-gpu" />
                            <span className="transform-gpu">{children}</span>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Progress Bar */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-blue-400/50 via-blue-500/50 to-transparent"
                        initial={{ scaleX: 1, opacity: 0 }}
                        animate={{ scaleX: 0, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                            scaleX: {
                                duration: loadingDuration / 1000,
                                ease: "linear"
                            },
                            opacity: {
                                duration: 0.2,
                                ease: "easeOut"
                            }
                        }}
                        style={{ transformOrigin: "left" }}
                    />
                )}
            </AnimatePresence>
        </motion.button>
    );
} 