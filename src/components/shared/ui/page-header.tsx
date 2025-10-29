import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground max-w-[750px]">{description}</p>
      )}
      {children}
    </div>
  );
} 