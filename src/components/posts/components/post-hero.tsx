'use client';

import Image from "next/image";
import { useState, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import { Dialog, DialogContent } from "@/components/ui/image-dialog";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, ChevronRight, X, Building2, History, MessagesSquare,
  CheckCircle2, Building, Layers, Car, Ruler, ArrowRight, Stamp, HardHat, Ban, 
  ScrollText, CalendarClock, Loader2,
  Radar,
  Target,
  MapPin,
  MapPinned,
  Sparkles
} from "lucide-react";
import type { EmblaOptionsType } from 'embla-carousel';
import React from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { GradientButton } from '@/components/ui/gradient-button';
import { ContactDevelopers } from "./contact-developers";
import { ProjectTrackButton } from "./project-track-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Project } from "@/components/projects/types";
import { type CompanyProjectResponse } from '@/components/projects';
import { AuthModal } from "@/components/ui/auth-modal";
import { PricingDialog } from "@/components/ui/pricing-dialog";
import { ComingSoonDialog } from "@/components/ui/coming-soon-dialog";
import { useAuth } from "@/lib/providers/auth-context";
import { useSubscription } from "@/lib/providers/subscription-context";

interface SupabaseImage {
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  credit?: string;
  aspectRatio?: number;
}

interface PostHeroProps {
  project: Project;
  projectCompanies: CompanyProjectResponse[];
  userCompanies: any[];
  images: (SupabaseImage | string)[];
  onShowProjectBidDialog?: () => void;
  className?: string;
}

// Helper function to normalize image data to consistent format
function getImageData(image: SupabaseImage | string): SupabaseImage {
  if (typeof image === 'string') {
    return { url: image };
  }
  return image;
}

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string) => {
  if (!str) return "";
  return str.split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(" ");
};

// Helper functions from project-details
const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return "—";
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString();
};

const formatDate = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    if (isNaN(utcDate.getTime())) return null;
    
    // Special case: if date is January 1st, just return the year (common placeholder for year-only data)
    if (utcDate.getUTCMonth() === 0 && utcDate.getUTCDate() === 1) {
      return utcDate.getUTCFullYear().toString();
    }
    
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(utcDate);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return null;
  }
};

const StatItem = ({ icon: Icon, value, label, subLabel, iconClasses }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  subLabel?: string | null;
  iconClasses?: string;
}) => (
  <div className="h-[110px] bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 relative overflow-hidden group transition-all duration-300">
    <div className="relative z-10">
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
      {subLabel && (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {subLabel}
        </div>
      )}
    </div>
    <Icon className={cn("absolute right-4 bottom-4 w-12 h-12 text-zinc-200 dark:text-zinc-700 transition-transform duration-300 group-hover:scale-110", iconClasses)} />
  </div>
);

const DetailsSection = ({ title, items, icon: Icon }: {
  title: string;
  items: { label:string; value: React.ReactNode }[];
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="h-[110px] bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 relative overflow-hidden group transition-all duration-300 flex flex-col">
    <div className="relative z-10 grow">
      <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex justify-between items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</span>
            <span className="font-medium text-sm text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
    {/* <Icon className="absolute right-4 bottom-4 w-12 h-12 text-zinc-200 dark:text-zinc-700 transition-transform duration-300 group-hover:scale-110" /> */}
  </div>
);

export function PostHero({ 
  project, 
  projectCompanies, 
  userCompanies, 
  images: originalImages, 
  onShowProjectBidDialog,
  className 
}: PostHeroProps) {
  // Filter out empty/invalid images and normalize format
  const images = React.useMemo(() => {
    return originalImages
      .filter(img => {
        if (typeof img === 'string') return img.trim() !== '';
        return img?.url && img.url.trim() !== '';
      })
      .map(getImageData);
  }, [originalImages]);

  const { user } = useAuth();
  const { hasMembershipAccess } = useSubscription();

  // Status configuration and project status logic
  type ProjectStatus = 'proposed' | 'approved' | 'under_construction' | 'completed' | 'cancelled';

  const statusConfig: Record<ProjectStatus, { 
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }> = {
    proposed: {
      icon: ScrollText,
      label: "Proposed"
    },
    approved: {
      icon: Stamp,
      label: "Approved"
    },
    under_construction: {
      icon: HardHat,
      label: "Under Construction"
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed"
    },
    cancelled: {
      icon: Ban,
      label: "Cancelled"
    }
  };

  const currentStatus = (project.status && statusConfig[project.status as ProjectStatus]) 
                        ? project.status as ProjectStatus 
                        : 'proposed';

  const statuses = (currentStatus === "cancelled" 
    ? ["proposed", "approved", "under_construction", "cancelled"]
    : ["proposed", "approved", "under_construction", "completed"]) as ProjectStatus[];

  const progressWidths = {
    proposed: '12%',
    approved: '38%',
    under_construction: '64%',
    completed: '100%'
  };

  // Timeline data
  const startDate = formatDate(project.start_date);
  const completionDate = formatDate(project.completion_date);
  const totalUnits = (project.apartment_count || 0) + (project.condo_count || 0) + (project.hotel_count || 0);
  const parking = project.parking_spaces || 0;
  const parkingPerUnit = totalUnits > 0 && parking > 0 ? `${(parking / totalUnits).toFixed(2)} per unit` : `— per unit`;
  
  const hasActualTimeline = !!(startDate || completionDate);
  const hasCommercialSpace = project.retail_space_sf || project.office_space_sf;

  const renderAddress = () => {
    if (!project.address) return project.title || 'Address Unavailable';
    const parts = project.address.split(',');
    if (parts.length >= 2) {
        return `${parts[0].trim()},<br/>${parts.slice(1).join(',').trim()}`;
    }
    return project.address;
  };
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);

  const mainCarouselOptions: EmblaOptionsType = {
    loop: false,
    align: "center",
    skipSnaps: false,
    dragFree: true,
    containScroll: "keepSnaps",
    duration: 10,
    startIndex: selectedIndex,
  };

  const thumbCarouselOptions: EmblaOptionsType = {
    dragFree: true,
    containScroll: "keepSnaps",
    align: "center",
    dragThreshold: 8
  };

  const [mainRef, mainEmbla] = useEmblaCarousel({
    ...mainCarouselOptions,
    startIndex: selectedIndex
  });
  const [thumbRef, thumbEmbla] = useEmblaCarousel(thumbCarouselOptions);

  const resetZoomIfNeeded = useCallback(() => {
    if (isZoomed) {
      setIsZoomed(false);
    }
  }, [isZoomed]);
  
  const scrollPrev = useCallback(() => {
    resetZoomIfNeeded();
    mainEmbla?.scrollPrev();
  }, [mainEmbla, resetZoomIfNeeded]);
  
  const scrollNext = useCallback(() => {
    resetZoomIfNeeded();
    mainEmbla?.scrollNext();
  }, [mainEmbla, resetZoomIfNeeded]);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainEmbla || !thumbEmbla) return;
      resetZoomIfNeeded();
      mainEmbla.scrollTo(index);
    },
    [mainEmbla, thumbEmbla, resetZoomIfNeeded]
  );

  const onSelect = useCallback(() => {
    if (!mainEmbla || !thumbEmbla) return;
    
    const newIndex = mainEmbla.selectedScrollSnap();
    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
    }
    
    thumbEmbla.scrollTo(newIndex);
    setCanScrollPrev(mainEmbla.canScrollPrev());
    setCanScrollNext(mainEmbla.canScrollNext());
  }, [mainEmbla, thumbEmbla, selectedIndex]);

  React.useEffect(() => {
    if (!mainEmbla) return;
    onSelect();
    mainEmbla.on("select", onSelect);
    return () => {
      mainEmbla.off("select", onSelect);
    };
  }, [mainEmbla, onSelect]);

  React.useEffect(() => {
    if (lightboxOpen && mainEmbla) {
      mainEmbla.scrollTo(selectedIndex);
    }
  }, [lightboxOpen, mainEmbla, selectedIndex]);

  React.useEffect(() => {
    if (lightboxOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [lightboxOpen]);

  React.useEffect(() => {
    if (!lightboxOpen || !mainEmbla) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        mainEmbla.scrollPrev();
      } else if (event.key === "ArrowRight") {
        mainEmbla.scrollNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, mainEmbla]);

  React.useEffect(() => {
    setSlideKey(prevKey => prevKey + 1);
    setIsZoomed(false);
  }, [selectedIndex]);

  React.useEffect(() => {
    if (images.length > 1) {
      const nextIndex = (selectedIndex + 1) % images.length;
      const prevIndex = selectedIndex === 0 ? images.length - 1 : selectedIndex - 1;
      
      [nextIndex, prevIndex].forEach(index => {
        if (images[index]?.url) {
          if (typeof window !== 'undefined') {
            const preloadImg = new window.Image();
            preloadImg.src = images[index].url;
          }
        }
      });
    }
  }, [selectedIndex, images]);

  const carouselStyles = `
    .embla__viewport {
      -webkit-perspective: 1000;
      perspective: 1000;
    }
    
    .embla__container {
      backface-visibility: hidden;
      display: flex;
      transform-style: preserve-3d;
      will-change: transform;
      transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1);
      -webkit-font-smoothing: subpixel-antialiased;
      font-smoothing: subpixel-antialiased;
    }
    
    .embla__dragging .embla__container {
      transition: none !important;
    }
    
    .embla__slide {
      flex: 0 0 100%;
      position: relative;
      will-change: transform;
      transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      -webkit-font-smoothing: subpixel-antialiased;
      font-smoothing: subpixel-antialiased;
      pointer-events: auto;
    }
    
    .embla__slide__img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transform: translateZ(0);
      will-change: transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      -webkit-transform: translateZ(0);
    }
    
    .react-transform-wrapper,
    .react-transform-component {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      will-change: transform;
      -webkit-font-smoothing: subpixel-antialiased;
      font-smoothing: subpixel-antialiased;
    }
    
    .react-transform-wrapper:not(.react-transform-wrapper--dragging) {
      transition: all 0.2s cubic-bezier(0.2, 0, 0.2, 1);
    }
    
    .react-transform-wrapper.react-transform-wrapper--panning .react-transform-component,
    .react-transform-wrapper.react-transform-wrapper--dragging .react-transform-component {
      transition: none !important;
    }
    
    .embla__slide-enter {
      opacity: 0;
    }
    .embla__slide-enter-active {
      opacity: 1;
      transition: opacity 0.25s ease-out;
    }
    .embla__slide-exit {
      opacity: 1;
    }
    .embla__slide-exit-active {
      opacity: 0;
      transition: opacity 0.25s ease-out;
    }
    
    .embla__slide {
      overflow: hidden;
    }
    
    .embla__slide-content {
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    
    .embla__slide.is-selected .embla__slide-content {
      opacity: 1;
    }
    
    .embla__dragging .embla__slide-content,
    .dragging-active .embla__slide-content {
      opacity: 0;
      transition: none;
    }
    
    .embla__slide:not(.is-selected) .embla__slide-content {
      opacity: 0;
    }
  `;

  React.useEffect(() => {
    if (!mainEmbla) return;
    
    const handlePointerDown = () => {
      document.documentElement.classList.add('dragging-active');
    };
    
    const handlePointerUp = () => {
      document.documentElement.classList.remove('dragging-active');
    };
    
    mainEmbla.on('pointerDown', handlePointerDown);
    mainEmbla.on('pointerUp', handlePointerUp);
    
    return () => {
      mainEmbla.off('pointerDown', handlePointerDown);
      mainEmbla.off('pointerUp', handlePointerUp);
    };
  }, [mainEmbla]);

  React.useEffect(() => {
    if (!mainEmbla) return;
    
    const handleSelect = () => {
      const slides = mainEmbla.slideNodes();
      const selectedIndex = mainEmbla.selectedScrollSnap();
      
      slides.forEach((slide) => {
        slide.classList.remove('is-selected');
      });
      
      if (slides[selectedIndex]) {
        slides[selectedIndex].classList.add('is-selected');
      }
    };
    
    handleSelect();
    mainEmbla.on('select', handleSelect);
    
    return () => {
      mainEmbla.off('select', handleSelect);
    };
  }, [mainEmbla]);

  if (!images?.length) return null;

  return (
    <>
      <style jsx>{carouselStyles}</style>
      <div className={cn("my-4 md:my-6 max-w-[1178px]", className)}>
        {/* Mobile: Use ImageGallery layout */}
        <div className="block lg:hidden">
          <div className="my-4 md:my-6">
            {images.length === 1 ? (
              <div 
                className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer" 
                onClick={() => setLightboxOpen(true)}
              >
                <Image
                  src={images[0].url}
                  alt={images[0].alt || images[0].title || "Post image 1"}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  quality={100}
                />
              </div>
            ) : images.length === 2 ? (
              <div className="grid grid-cols-2 gap-2 h-[400px]">
                {images.map((image, i) => (
                  <div 
                    key={`mobile-preview-${i}-${image.url}`}
                    className={cn(
                      "relative overflow-hidden cursor-pointer",
                      i === 0 ? "rounded-l-2xl" : "rounded-r-2xl"
                    )}
                    onClick={() => {
                      setSelectedIndex(i);
                      setLightboxOpen(true);
                    }}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || image.title || `Post image ${i + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      quality={100}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-2 h-[400px]">
                <div 
                  className="col-span-8 relative rounded-l-2xl overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedIndex(0);
                    setLightboxOpen(true);
                  }}
                >
                  <Image
                    src={images[0].url}
                    alt={images[0].alt || images[0].title || "Main post image"}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    quality={100}
                    priority={true}
                  />
                  
                  {images[0].credit && (
                    <div className="absolute bottom-3 right-3">
                      <p className="text-white text-xs bg-black/50 px-2 py-1 rounded-md">
                        © <span dangerouslySetInnerHTML={{ __html: images[0].credit }} />
                      </p>
                    </div>
                  )}
                </div>
                <div className="col-span-4 grid grid-rows-2 gap-2">
                  {images.slice(1, 3).map((image, i) => (
                    <div 
                      key={`mobile-preview-${i + 1}-${image.url}`}
                      className={cn(
                        "relative overflow-hidden cursor-pointer",
                        i === 0 ? "rounded-tr-2xl" : "rounded-br-2xl"
                      )}
                      onClick={() => {
                        setSelectedIndex(i + 1);
                        setLightboxOpen(true);
                      }}
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || image.title || `Post image ${i + 2}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        quality={100}
                      />
                      {i === 1 && images.length > 3 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xl font-medium">+{images.length - 3}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Project Details - Below images */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 space-y-6">
              {/* Stats Layout */}
              <div className="grid grid-cols-1 gap-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <StatItem
                    icon={Ruler}
                    value={project.height_ft ? `${formatNumber(project.height_ft)}'` : "—"}
                    label="Building Height"
                    iconClasses="-mr-2 transform rotate-45"
                  />
                  <StatItem
                    icon={Building}
                    value={totalUnits > 0 ? formatNumber(totalUnits) : "—"}
                    label="Total Units"
                  />
                  <StatItem
                    icon={Layers}
                    value={formatNumber(project.floors)}
                    label="Stories"
                  />
                  <StatItem
                    icon={Car}
                    value={formatNumber(parking)}
                    label="Parking Spaces"
                    subLabel={parkingPerUnit}
                  />
                </div>

                {/* Timeline and Commercial Space - Stacked on mobile */}
                <div className="space-y-4">
                  <DetailsSection
                    title="Timeline"
                    icon={CalendarClock}
                    items={[
                      { label: 'Start', value: startDate || '—' },
                      { label: 'Completion', value: completionDate || '—' }
                    ]}
                  />
                  <DetailsSection
                    title="Commercial Space"
                    icon={Building2}
                    items={[
                      { label: 'Retail', value: project.retail_space_sf ? `${formatNumber(project.retail_space_sf)} SF` : "—" },
                      { label: 'Office', value: project.office_space_sf ? `${formatNumber(project.office_space_sf)} SF` : "—" }
                    ]}
                  />
                </div>
              </div>

              {/* Status Progress Bar */}
              <div className="relative">
                <div className="flex mb-2">
                  {statuses.map((status, index) => {
                    const StatusIcon = statusConfig[status].icon;
                    const isCancelled = currentStatus === "cancelled";
                    const isActive = currentStatus === status;
                    const isPassed = index < statuses.indexOf(currentStatus);
                    
                    return (
                      <div 
                        key={status} 
                        className={cn(
                          "flex-1 flex flex-col items-center",
                          isCancelled && status !== "cancelled" && "opacity-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center z-10",
                          isActive && "bg-primary text-white dark:bg-white dark:text-zinc-950",
                          !isActive && isPassed && "bg-primary text-white dark:bg-white dark:text-zinc-950",
                          !isActive && !isPassed && "bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
                          status === "cancelled" && "bg-red-500 text-white"
                        )}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <p className={cn(
                          "text-xs mt-2 text-center relative",
                          isActive && "font-medium text-primary dark:text-white",
                          !isActive && !isPassed && "dark:text-zinc-400",
                          !isActive && isPassed && "dark:text-white",
                          status === "cancelled" && "font-medium text-red-500",
                          isCancelled && status !== "cancelled" && "line-through"
                        )}>
                          {statusConfig[status].label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700/50 -z-0" />
                {currentStatus !== "cancelled" && (
                  <div 
                    className="absolute top-4 left-0 h-0.5 bg-primary dark:bg-primary/80 -z-0 transition-all duration-300"
                    style={{ 
                      width: progressWidths[currentStatus]
                    }}
                  />
                )}
                {currentStatus === "cancelled" && (
                  <div 
                    className="absolute top-4 left-0 right-0 h-0.5 bg-red-500/50 dark:bg-red-500/30 -z-0"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, currentColor 4px, currentColor 8px)'
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                {/* <ContactDevelopers
                  targetCompanies={projectCompanies}
                  projectSlug={project?.slug}
                  projectName={project?.title}
                  userCompanies={userCompanies}
                  trigger={
                    <GradientButton className='flex-1 min-w-0'>
                      <Radar className="w-4 h-4 mr-2" />
                      Track Project
                    </GradientButton>
                  }
                /> */}
                {user ? (
                  hasMembershipAccess ? (
                    <ProjectTrackButton
                      projectId={project?.id || ''}
                      projectName={project?.title || undefined}
                      className='flex-1 min-w-0'
                    />
                  ) : (
                    <GradientButton
                      className='flex-1 min-w-0'
                      onClick={() => setShowPricingDialog(true)}
                    >
                      <Radar className="w-4 h-4 mr-2" />
                      Track Project
                    </GradientButton>
                  )
                ) : (
                  <GradientButton
                    className='flex-1 min-w-0'
                    onClick={() => setShowAuthModal(true)}
                  >
                    <Radar className="w-4 h-4 mr-2" />
                    Track Project
                  </GradientButton>
                )}
                <GradientButton
                  className='flex-1 min-w-0'
                  variant="variant"
                  onClick={() => setShowComingSoonDialog(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ask AI
                </GradientButton>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Use original PostHero layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 min-h-[400px]">
          {/* Rich Project Details - Desktop only */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="p-6 space-y-6">
              {/* Project Title */}
              {/* <div>
                <h2 
                  className="text-2xl font-semibold mb-3"
                  dangerouslySetInnerHTML={{ __html: renderAddress() }}
                />
              </div> */}
              

              {/* Stats Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Stats Grid */}
                <div className="lg:col-span-1">
                  <div className="grid grid-cols-2 gap-4">
                    <StatItem
                      icon={Ruler}
                      value={project.height_ft ? `${formatNumber(project.height_ft)}'` : "—"}
                      label="Building Height"
                      iconClasses="-mr-2 transform rotate-45"
                    />
                    <StatItem
                      icon={Building}
                      value={totalUnits > 0 ? formatNumber(totalUnits) : "—"}
                      label="Total Units"
                    />
                    <StatItem
                      icon={Layers}
                      value={formatNumber(project.floors)}
                      label="Stories"
                    />
                    <StatItem
                      icon={Car}
                      value={formatNumber(parking)}
                      label="Parking Spaces"
                      subLabel={parkingPerUnit}
                    />
                  </div>
                </div>

                {/* Timeline and Commercial Space */}
                <div className="space-y-4">
                  <DetailsSection
                    title="Timeline"
                    icon={CalendarClock}
                    items={[
                      { label: 'Start', value: startDate || '—' },
                      { label: 'Completion', value: completionDate || '—' }
                    ]}
                  />
                  <DetailsSection
                    title="Commercial Space"
                    icon={Building2}
                    items={[
                      { label: 'Retail', value: project.retail_space_sf ? `${formatNumber(project.retail_space_sf)} SF` : "—" },
                      { label: 'Office', value: project.office_space_sf ? `${formatNumber(project.office_space_sf)} SF` : "—" }
                    ]}
                  />
                </div>
              </div>

              {/* Status Progress Bar */}
              <div className="relative">
                <div className="flex mb-2">
                  {statuses.map((status, index) => {
                    const StatusIcon = statusConfig[status].icon;
                    const isCancelled = currentStatus === "cancelled";
                    const isActive = currentStatus === status;
                    const isPassed = index < statuses.indexOf(currentStatus);
                    
                    return (
                      <div 
                        key={status} 
                        className={cn(
                          "flex-1 flex flex-col items-center",
                          isCancelled && status !== "cancelled" && "opacity-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center z-10",
                          isActive && "bg-primary text-white dark:bg-white dark:text-zinc-950",
                          !isActive && isPassed && "bg-primary text-white dark:bg-white dark:text-zinc-950",
                          !isActive && !isPassed && "bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400",
                          status === "cancelled" && "bg-red-500 text-white"
                        )}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <p className={cn(
                          "text-xs mt-2 text-center relative",
                          isActive && "font-medium text-primary dark:text-white",
                          !isActive && !isPassed && "dark:text-zinc-400",
                          !isActive && isPassed && "dark:text-white",
                          status === "cancelled" && "font-medium text-red-500",
                          isCancelled && status !== "cancelled" && "line-through"
                        )}>
                          {statusConfig[status].label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700/50 -z-0" />
                {currentStatus !== "cancelled" && (
                  <div 
                    className="absolute top-4 left-0 h-0.5 bg-primary dark:bg-primary/80 -z-0 transition-all duration-300"
                    style={{ 
                      width: progressWidths[currentStatus]
                    }}
                  />
                )}
                {currentStatus === "cancelled" && (
                  <div 
                    className="absolute top-4 left-0 right-0 h-0.5 bg-red-500/50 dark:bg-red-500/30 -z-0"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, currentColor 4px, currentColor 8px)'
                    }}
                  />
                )}
            </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                {/* <ContactDevelopers
                  targetCompanies={projectCompanies}
                  projectSlug={project?.slug}
                  projectName={project?.title}
                  userCompanies={userCompanies}
                  trigger={
                    <GradientButton className='flex-1 min-w-0'>
                      <MessagesSquare className="w-4 h-4 mr-2" />
                      Contact Developer
                    </GradientButton>
                  }
                /> */}
                {user ? (
                  hasMembershipAccess ? (
                    <ProjectTrackButton
                      projectId={project?.id || ''}
                      projectName={project?.title || undefined}
                      className='flex-1 min-w-0'
                    />
                  ) : (
                    <GradientButton
                      className='flex-1 min-w-0'
                      onClick={() => setShowPricingDialog(true)}
                    >
                      <Radar className="w-4 h-4 mr-2" />
                      Track Project
                    </GradientButton>
                  )
                ) : (
                  <GradientButton
                    className='flex-1 min-w-0'
                    onClick={() => setShowAuthModal(true)}
                  >
                    <Radar className="w-4 h-4 mr-2" />
                    Track Project
                  </GradientButton>
                )}
                <GradientButton
                  className='flex-1 min-w-0'
                  variant="variant"
                  onClick={() => setShowComingSoonDialog(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ask AI
                </GradientButton>
              </div>
            </div>
          </div>

          {/* Images Grid - Desktop only */}
          <div className={cn(
            "lg:col-span-4",
            images.length === 1 ? "grid grid-rows-1" : "grid grid-rows-2 gap-2"
          )}>
            {images.slice(0, images.length === 1 ? 1 : 2).map((image, i) => (
              <div 
                key={`desktop-preview-${i}-${image.url}`}
                className={cn(
                  "relative overflow-hidden cursor-pointer min-h-[120px]",
                  images.length === 1 
                    ? "rounded-tr-2xl rounded-br-2xl" 
                    : i === 0 
                      ? "rounded-tr-2xl md:rounded-tr-2xl rounded-tl-2xl md:rounded-tl-none" 
                      : "rounded-br-2xl"
                )}
                onClick={() => {
                  setSelectedIndex(i);
                  setLightboxOpen(true);
                }}
              >
                <Image
                  src={image.url}
                  alt={image.alt || image.title || `Post image ${i + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  quality={100}
                  priority={i === 0}
                />
                {i === 1 && images.length > 2 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xl font-medium">+{images.length - 2}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Dialog - Same as original gallery */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          title="Image Lightbox"
          className={cn(
            "bg-black/90 border-none p-0 overflow-hidden",
          )}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            transform: 'none'
          }}
          showCloseButton={false}
        >
          <div className="relative h-full w-full flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors focus:outline-none focus-visible:ring-0"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Main carousel */}
            <div className="embla w-full h-full" ref={mainRef}>
              <div className="embla__container h-full">
                {images.map((image, index) => {
                  const aspectRatio = image.aspectRatio || (16 / 9);
                  return (
                    <div 
                      key={`slide-${index}-${image.url}`} 
                      className="embla__slide flex-[0_0_100%] min-w-0 relative flex flex-col items-center justify-center"
                    >
                      {/* Mobile view */}
                      <div className="relative w-full flex flex-col sm:hidden">
                        <div className="grow relative">
                          <TransformWrapper
                            key={`mobile-image-${index}-${slideKey}`}
                            initialScale={1}
                            minScale={1}
                            maxScale={4}
                            centerOnInit={true}
                            panning={{ disabled: !isZoomed }}
                            onZoomStop={(ref: ReactZoomPanPinchRef) => {
                              setIsZoomed(ref.state.scale > 1);
                            }}
                            velocityAnimation={{ disabled: true }}
                            alignmentAnimation={{ disabled: true }}
                          >
                            <TransformComponent
                              wrapperClass="w-full! h-full!"
                              contentClass="w-full! h-full!"
                              wrapperStyle={{
                                width: '100%',
                                height: '100%',
                                overflow: 'visible'
                              }}
                            >
                              <div className="relative w-full" style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}>
                                <Image
                                  src={image.url}
                                  alt={image.alt || image.title || `Image ${index + 1}`}
                                  fill
                                  className="object-contain"
                                  quality={100}
                                  draggable={false}
                                  priority={index === selectedIndex}
                                />
                              </div>
                            </TransformComponent>
                          </TransformWrapper>
                        </div>

                        {image.caption && (
                          <div className="mt-2 px-4">
                            <p className="text-slate-300 text-sm bg-black/70 px-2 py-1 rounded-md text-left pointer-events-auto">
                              {image.caption}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Desktop view */}
                      <div className="relative hidden sm:block w-full h-full max-w-[85vw] max-h-[70vh]">
                        <TransformWrapper
                          key={`desktop-image-${index}-${slideKey}`}
                          initialScale={1}
                          minScale={1}
                          maxScale={4}
                          centerOnInit={true}
                          panning={{ disabled: !isZoomed }}
                          onZoomStop={(ref: ReactZoomPanPinchRef) => {
                            setIsZoomed(ref.state.scale > 1);
                          }}
                          velocityAnimation={{ disabled: true }}
                          alignmentAnimation={{ disabled: true }}
                        >
                          <TransformComponent wrapperClass="w-full! h-full!" contentClass="w-full! h-full!">
                            <Image
                              src={image.url}
                              alt={image.alt || image.title || `Image ${index + 1}`}
                              fill
                              className="object-contain"
                              quality={100}
                              draggable={false}
                              priority={index === selectedIndex}
                            />
                          </TransformComponent>
                        </TransformWrapper>
                      </div>

                      {/* Caption and Credit Display */}
                      {(image.caption || image.credit) && (
                        <div className="absolute bottom-3 left-4 right-4 z-50 flex justify-between items-end gap-x-4 pointer-events-none embla__slide-content">
                          {image.caption ? (
                            <>
                            <p className="hidden sm:block text-white text-sm sm:text-base bg-black/70 px-2 py-1 rounded-md truncate pointer-events-auto min-w-0 shrink">
                              {image.caption}
                            </p>
                            <span className="sm:hidden" />
                            </>
                          ) : <span />}

                          {image.credit ? (
                            <p className="text-white text-sm sm:text-base bg-black/70 px-2 py-1 rounded-md whitespace-nowrap pointer-events-auto shrink-0">
                              © <span dangerouslySetInnerHTML={{ __html: image.credit }} />
                            </p>
                          ) : null }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation arrows - desktop only */}
            {images.length > 1 && (
              <>
                <button
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors hidden md:block",
                    !canScrollPrev && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={scrollPrev}
                  disabled={!canScrollPrev}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors hidden md:block",
                    !canScrollNext && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={scrollNext}
                  disabled={!canScrollNext}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>

                {/* Thumbnails */}
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-black/50 p-4 ${images.some(img => img.credit || img.caption) ? 'pb-[46px] sm:pb-[54px]' : ''}`}
                  ref={thumbRef}
                >
                  <div className="flex gap-2 min-w-full">
                    {images.map((image, index) => (
                      <button
                        key={`thumb-${index}-${image.url}`}
                        onClick={() => onThumbClick(index)}
                        className="relative flex-[0_0_80px] h-[50px] rounded-md overflow-hidden"
                      >
                        <Image
                          src={image.url}
                          alt={image.alt || image.title || `Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth and Pricing Modals */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
      />

      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
      />

      <ComingSoonDialog
        isOpen={showComingSoonDialog}
        onOpenChange={setShowComingSoonDialog}
        featureName="AI Assistant"
        description="Our AI-powered project analysis and insights feature is coming soon! Get ready to unlock deeper understanding of your projects with intelligent data analysis."
      />
    </>
  );
}