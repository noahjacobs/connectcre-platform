"use client";

import { useState, useRef, useEffect } from 'react';
import { cn, getImageUrl } from "@/lib/utils";
import Image from "next/image";
import { Building2, MapPin } from "lucide-react";
import { City, Neighborhood } from "@/components/map/types";
import { PostImage } from "@/lib/types/shared";
import { Post } from "../types";
import { motion } from "framer-motion";
import { Button } from '@/components/ui/button';

interface PostCardProps {
  title: string;
  subtitle?: string;
  image?: PostImage | any; // Support new PostImage type and maintain backward compatibility
  city?: City;
  neighborhood?: Neighborhood;
  className?: string;
  isSelectedCity?: boolean;
}

// Helper function to get city fallback image path
function getCityFallbackImage(city?: City): string | null {
  if (!city?.slug) return null;
  
  const citySlug = city.slug;
  
  // Map city slugs to available image files
  const cityImageMap: { [key: string]: string } = {
    "atlanta": "/images/cities/atlanta.jpg",
    "austin": "/images/cities/austin.jpg", 
    "chicago": "/images/cities/chicago.jpg",
    "dallas": "/images/cities/dallas.jpg",
    "detroit": "/images/cities/detroit.jpg",
    "la": "/images/cities/la.jpg",
    "nyc": "/images/cities/nyc.jpg",
    "sf": "/images/cities/sf.jpg",
    "seattle": "/images/cities/seattle.jpg",
    "toronto": "/images/cities/toronto.jpg",
    "dc": "/images/cities/dc.jpg",
    "miami": "/images/cities/miami.jpg",
    "sd": "/images/cities/sd.jpeg"
  };
  
  return cityImageMap[citySlug] || null;
}

export default function PostCard({ 
  title, 
  subtitle, 
  image, 
  city, 
  neighborhood,
  className,
  isSelectedCity 
}: PostCardProps) {
  const hasMinimalContent = !image && (!subtitle || subtitle.length < 50);
  
  // Get image URLs with proper fallback logic
  const postImageUrl = getImageUrl(image);
  const cityFallbackImage = getCityFallbackImage(city);

  // Fallback order: post image → city fallback image → Building2 icon
  const imageUrl = postImageUrl || cityFallbackImage;

  // Determine location display text
  const locationText = isSelectedCity && neighborhood 
    ? neighborhood.name
    : city?.name || "";

  return (
    <div className={cn(
      "group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-lg",
      className
    )}>
      {imageUrl ? (
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={imageUrl}
            alt={`${title || 'Development project'}${locationText ? ` in ${locationText}` : ''} - DevProjects`}
            className="object-cover w-full h-full transition-transform group-hover:scale-105"
            fill
            priority={imageUrl === cityFallbackImage && city?.slug === 'nyc'}
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
                {neighborhood?.name || city?.name}
                {city?.name && neighborhood?.name && `, ${city.name}`}
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
