'use client';

import Image from "next/image";
import { useState, useCallback } from "react";
import useEmblaCarousel from 'embla-carousel-react';
import { Dialog, DialogContent } from "@/components/ui/image-dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { EmblaOptionsType } from 'embla-carousel';
import React from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

interface SupabaseImage {
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  credit?: string;
  aspectRatio?: number;
}

interface ImageGalleryProps {
  images: (SupabaseImage | string)[]; // Support both object format and direct URL strings
  className?: string;
}

// Helper function to normalize image data to consistent format
function getImageData(image: SupabaseImage | string): SupabaseImage {
  if (typeof image === 'string') {
    return { url: image };
  }
  return image;
}

export function ImageGallery({ images: originalImages, className }: ImageGalleryProps) {
  // Filter out empty/invalid images and normalize format
  const images = React.useMemo(() => {
    return originalImages
      .filter(img => {
        if (typeof img === 'string') return img.trim() !== '';
        return img?.url && img.url.trim() !== '';
      })
      .map(getImageData);
  }, [originalImages]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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

  // Add an effect to scroll to the selected index when the lightbox opens
  React.useEffect(() => {
    if (lightboxOpen && mainEmbla) {
      mainEmbla.scrollTo(selectedIndex);
    }
  }, [lightboxOpen, mainEmbla, selectedIndex]);

  // Add this effect to handle scroll locking
  React.useEffect(() => {
    if (lightboxOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Apply fixed positioning to body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scroll position when dialog closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [lightboxOpen]);

  // Add keyboard navigation effect
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

  // Add this useEffect to force re-render on selectedIndex change
  React.useEffect(() => {
    // This will change slideKey whenever selectedIndex changes
    // but not when isZoomed changes
    setSlideKey(prevKey => prevKey + 1);
    // Also reset zoom state when changing slides
    setIsZoomed(false);
  }, [selectedIndex]);

  // Add image preloading
  React.useEffect(() => {
    // Preload the next image to prevent flickering
    if (images.length > 1) {
      const nextIndex = (selectedIndex + 1) % images.length;
      const prevIndex = selectedIndex === 0 ? images.length - 1 : selectedIndex - 1;
      
      // Preload next and previous images
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

  // Update CSS styles to prevent flickering during rapid swipes
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
    
    /* Make dragging more immediate */
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
    
    /* Prevent flickering with hardware acceleration */
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
    
    /* Only apply transitions when not dragging/zoomed */
    .react-transform-wrapper:not(.react-transform-wrapper--dragging) {
      transition: all 0.2s cubic-bezier(0.2, 0, 0.2, 1);
    }
    
    /* When zoomed, disable transitions on transform-component to prevent flicker during pan */
    .react-transform-wrapper.react-transform-wrapper--panning .react-transform-component,
    .react-transform-wrapper.react-transform-wrapper--dragging .react-transform-component {
      transition: none !important;
    }
    
    /* Smoother opacity transitions */
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
    
    /* Ensure slide content doesn't overflow during transitions */
    .embla__slide {
      overflow: hidden; /* Contain child elements */
    }
    
    .embla__slide-content {
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    
    .embla__slide.is-selected .embla__slide-content {
      opacity: 1;
    }
    
    /* When changing slides, ensure content doesn't bleed through */
    .embla__dragging .embla__slide-content,
    .dragging-active .embla__slide-content {
      opacity: 0;
      transition: none;
    }
    
    /* When a slide is not selected, hide its content */
    .embla__slide:not(.is-selected) .embla__slide-content {
      opacity: 0;
    }
  `;

  // Add an effect to fix Embla carousel behavior on mobile
  React.useEffect(() => {
    if (!mainEmbla) return;
    
    const handlePointerDown = () => {
      document.documentElement.classList.add('dragging-active');
    };
    
    const handlePointerUp = () => {
      document.documentElement.classList.remove('dragging-active');
    };
    
    // Add listeners to manage dragging state
    mainEmbla.on('pointerDown', handlePointerDown);
    mainEmbla.on('pointerUp', handlePointerUp);
    
    return () => {
      mainEmbla.off('pointerDown', handlePointerDown);
      mainEmbla.off('pointerUp', handlePointerUp);
    };
  }, [mainEmbla]);

  // Add an effect to handle selected slide content visibility
  React.useEffect(() => {
    if (!mainEmbla) return;
    
    const handleSelect = () => {
      // Find all slides
      const slides = mainEmbla.slideNodes();
      
      // Get the selected slide index
      const selectedIndex = mainEmbla.selectedScrollSnap();
      
      // Remove is-selected class from all slides
      slides.forEach((slide) => {
        slide.classList.remove('is-selected');
      });
      
      // Add is-selected class to the current slide
      if (slides[selectedIndex]) {
        slides[selectedIndex].classList.add('is-selected');
      }
    };
    
    // Initialize on mount
    handleSelect();
    
    // Add event listener for select events
    mainEmbla.on('select', handleSelect);
    
    return () => {
      mainEmbla.off('select', handleSelect);
    };
  }, [mainEmbla]);

  if (!images?.length) return null;

  return (
    <>
      <style jsx>{carouselStyles}</style>
      <div className={cn("my-4 md:my-6", className)}>
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
                key={`preview-${i}-${image.url}`}
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
              
              {/* Add credit to the main preview image */}
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
                  key={`preview-${i + 1}-${image.url}`}
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
                  const aspectRatio = image.aspectRatio || (16 / 9); // Default to 16:9
                  return (
                    <div 
                      key={`slide-${index}-${image.url}`} 
                      className="embla__slide flex-[0_0_100%] min-w-0 relative flex flex-col items-center justify-center"
                    >
                      {/* Mobile view with aspect ratio padding */}
                      <div
                        className="relative w-full flex flex-col sm:hidden" // Show only on mobile
                      >
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
                            velocityAnimation={{
                              disabled: true // Disable velocity animation to reduce flickering
                            }}
                            alignmentAnimation={{
                              disabled: true // Disable alignment animation to reduce flickering
                            }}
                          >
                            <TransformComponent
                              wrapperClass="w-full! h-full!"
                              contentClass="w-full! h-full!"
                              wrapperStyle={{
                                width: '100%',
                                height: '100%',
                                overflow: 'visible' // Allow content to overflow when zoomed
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

                      {/* Desktop view with Tailwind height and constraints */}
                      <div
                        className="relative hidden sm:block w-full h-full max-w-[85vw] max-h-[70vh]" // Show only on sm and up
                      >
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
                          velocityAnimation={{
                            disabled: true // Disable velocity animation to reduce flickering
                          }}
                          alignmentAnimation={{
                            disabled: true // Disable alignment animation to reduce flickering
                          }}
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
                          {/* Caption: takes available space, truncates - hidden on mobile */}
                          {image.caption ? (
                            <>
                            <p className="hidden sm:block text-white text-sm sm:text-base bg-black/70 px-2 py-1 rounded-md truncate pointer-events-auto min-w-0 shrink">
                              {image.caption}
                            </p>
                            <span className="sm:hidden" />
                            </>
                          ) : <span /> /* Empty span to make credit align right if only credit exists */}

                          {/* Credit: fixed size, on the right */}
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
    </>
  );
}