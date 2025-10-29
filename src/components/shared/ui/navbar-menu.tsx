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
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [shouldAlignRight, setShouldAlignRight] = React.useState(false);

  React.useEffect(() => {
    if (menuRef.current && active === item) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Check if dropdown would extend beyond right edge
      const dropdownWidth = menuRef.current.querySelector('[data-dropdown]')?.getBoundingClientRect().width ?? 0;
      const rightEdge = menuRect.left + (dropdownWidth / 1.5);
      
      setShouldAlignRight(rightEdge > viewportWidth);
    }
  }, [active, item]);

  return (
    <div ref={menuRef} onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="text-sm cursor-pointer text-black hover:opacity-[0.9] dark:text-white whitespace-nowrap"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div 
              data-dropdown
              className={cn(
                "absolute top-[calc(100%+0rem)] pt-4",
                shouldAlignRight ? "-right-26" : "left-1/2 transform -translate-x-1/2"
              )}
            >
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-white dark:bg-black backdrop-blur-sm rounded-2xl overflow-hidden border border-black/20 dark:border-white/20 shadow-xl"
              >
                <motion.div
                  layout
                  className="w-max h-full p-4"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
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
      onMouseLeave={() => setActive(null)} // resets the state
      className="relative shadow-input flex justify-center space-x-5 ml-2"
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
  onClick,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
}) => {
  return (
    <Link href={href} onClick={onClick} className="flex space-x-2 hover:bg-accent rounded-md p-4">
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
        "text-neutral-700 dark:text-neutral-200 hover:text-black group flex",
        className
      )}
    >
      {children}
    </Link>
  );
};
