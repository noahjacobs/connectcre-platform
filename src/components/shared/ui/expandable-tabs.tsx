"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: "menu";
  onClick?: () => void;
  disabled?: boolean;
  iconClassName?: string;
  badge?: number;
  dropdownContent?: React.ReactNode;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

export type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  activeTab?: number;
  onChange?: (index: number | null) => void;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: "0.75rem",
    paddingRight: "0.75rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : "0.75rem",
    paddingRight: isSelected ? "1rem" : "0.75rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { type: "spring", bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  activeTab,
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(activeTab ?? null);
  const outsideClickRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (activeTab !== undefined) {
      setSelected(activeTab);
    }
  }, [activeTab]);

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    if (activeTab === undefined) {
      setSelected(index);
    }
    onChange?.(index);
  };

  const Separator = () => (
    <div className="mx-0.5 h-[24px] w-[1.2px] bg-border" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-2xl border bg-background p-1 shadow-sm",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;
        
        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => {
              handleSelect(index);
              tab.onClick?.();
            }}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
              isSelected
                ? cn("bg-muted", activeColor)
                : "text-muted-foreground hover:bg-muted hover:text-foreground px-10",
              tab.disabled && "pointer-events-none opacity-50"
            )}
            disabled={tab.disabled}
          >
            <Icon size={20} className={tab.iconClassName} />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
            {tab.badge !== undefined && (
              <div className={cn(
                "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-xs flex items-center justify-center",
                isSelected 
                  ? "bg-background text-foreground" 
                  // : "bg-transparent text-primary-foreground"
                  : "bg-background text-foreground"
              )}>
                {tab.badge}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}