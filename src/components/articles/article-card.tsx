"use client";

import { cn, getImageUrl } from "@/lib/utils";
import Image from "next/image";
import { Building2, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface ArticleCardProps {
  title: string;
  subtitle?: string | null;
  images?: string[];
  city?: string | null;
  neighborhood?: string | null;
  className?: string;
  onClick?: () => void;
}

export default function ArticleCard({ 
  title, 
  subtitle, 
  images, 
  city, 
  neighborhood,
  className,
  onClick
}: ArticleCardProps) {
  const hasMinimalContent = !images?.length && (!subtitle || subtitle.length < 50);
  
  const imageUrl = images?.[0] || null;
  const locationText = neighborhood || city || "";

  return (
    <div 
      className={cn(
        "group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {imageUrl ? (
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            className="object-cover w-full h-full transition-transform group-hover:scale-105"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className={cn(
          "aspect-video bg-muted/30 flex items-center justify-center",
          hasMinimalContent && "border-b border-dashed"
        )}>
          <Building2 className="w-12 h-12 text-muted-foreground/50" />
        </div>
      )}

      <div className={cn(
        "p-4 pt-3 flex flex-col h-[150px]",
        hasMinimalContent && "flex flex-col items-start text-start"
      )}>
        <div className="flex-1 flex flex-col">
          {locationText && (
            <motion.div 
              className="flex items-center gap-1 text-sm text-muted-foreground mb-1"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={locationText}
            >
              <MapPin className="h-4 w-4" />
              <span>
                {neighborhood && city ? `${neighborhood}, ${city}` : locationText}
              </span>
            </motion.div>
          )}

          <h3 className={cn(
            "font-semibold mb-1.5 line-clamp-2",
            hasMinimalContent ? "text-xl" : "text-lg leading-snug"
          )}>
            {title}
          </h3>

          {subtitle && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
