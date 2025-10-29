"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
  dropdownContent,
}: {
  setActive: (item: string | null) => void;
  active: string | null | boolean;
  item: string;
  children: React.ReactNode;
  dropdownContent?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      {children}
      {(active === item || (typeof active === 'boolean' && active)) && dropdownContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          <div className="absolute top-[calc(100%+0rem)] left-0 pt-4">
            <motion.div
              transition={transition}
              layoutId="active"
              className="bg-white dark:bg-black backdrop-blur-sm rounded-xl overflow-hidden border border-black/20 dark:border-white/20 shadow-xl"
            >
              <motion.div layout className="w-max h-full p-4">
                {dropdownContent}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative flex items-center z-50"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) => {
  return (
    <Link href={href} className="flex space-x-2 hover:bg-accent rounded-md p-4">
      <div className="relative flex items-center justify-center w-12 h-12">
        <div className="absolute inset-0 rounded-md shadow-2xl opacity-50" />
        <Icon className="w-6 h-6 relative z-10" />
      </div>
      <div>
        <h4 className="text-xl font-bold mb-1 text-black dark:text-white">
          {title}
        </h4>
        <p className="text-neutral-700 text-sm max-w-[18rem] dark:text-neutral-300">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({ children, className, ...rest }: any) => {
  return (
    <Link
      {...rest}
      className={cn(
        "flex items-center gap-2 p-2 text-sm hover:bg-accent rounded-lg transition-colors",
        "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
};
