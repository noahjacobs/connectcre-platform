'use client';

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, LayoutGrid, Map as MapIcon, MapPin, Building2, Train, Home, Building, X, MonitorSmartphone, SquareSplitHorizontal } from "lucide-react";
import { City } from "@/components/map/types";
import { Post } from "@/components/posts/types";
import { Filter } from "@/components/ui/filters";
import { Button } from "@/components/ui/button";
import { MapFilters } from "@/components/map";
import { ActionSearchBar } from "@/components/home";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
    selectedCity?: string | null;
    onSearch?: (query: string | null, results?: Post[] | null) => void;
    cities: City[];
    onCitySelect: (citySlug: string | null) => void;
    onActionSelect?: (actionId: string | null, citySlug: string | null) => void;
    viewMode: 'list' | 'split' | 'map';
    setViewMode: (mode: 'list' | 'split' | 'map') => void;
    mapFilters: Filter[];
    setMapFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
    isMobile: boolean;
    currentSearch: string | null;
    isInitialLoading: boolean;
    displayModeFromParent: 'initial' | 'search' | 'action';
    isCityDetermined?: boolean;
    setHoveredItemId?: (id: string | null) => void;
    isMapHoverDisabled?: boolean;
    setIsMapHoverDisabled?: (disabled: boolean) => void;
}

export default React.memo(function HeroSection({
    selectedCity,
    onSearch,
    cities,
    onCitySelect,
    onActionSelect,
    viewMode,
    setViewMode,
    mapFilters,
    setMapFilters,
    isMobile,
    currentSearch,
    isInitialLoading,
    displayModeFromParent,
    isCityDetermined = true,
    setHoveredItemId,
    isMapHoverDisabled,
    setIsMapHoverDisabled
}: HeroSectionProps) {
    const renderCount = useRef(0);
    useEffect(() => {
        renderCount.current += 1;
    });

    const ViewTogglesSkeleton = () => (
        <div className="inline-flex rounded-md shadow-sm h-10" role="group">
            <Skeleton className="h-10 w-[85px] rounded-r-none" />
                            <Skeleton className="h-10 w-[85px] rounded-none border-l border-r" />
            <Skeleton className="h-10 w-[85px] rounded-l-none" />
        </div>
    );

    return (
        <div className={cn("w-full bg-background py-3 px-4 border-b",)}>
            <div className="relative flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="relative w-full md:flex-1" id="tour-city-select">
                    {isInitialLoading || !isCityDetermined ? (
                        <Skeleton className="h-11 w-full rounded-md" />
                    ) : (
                        <ActionSearchBar
                            selectedCity={selectedCity}
                            onSearch={onSearch}
                            cities={cities}
                            onCitySelect={onCitySelect}
                            onActionSelect={onActionSelect}
                            currentSearch={currentSearch}
                            displayMode={displayModeFromParent}
                            setHoveredItemId={setHoveredItemId}
                            isMapHoverDisabled={isMapHoverDisabled}
                            setIsMapHoverDisabled={setIsMapHoverDisabled}
                        />
                    )}
                </div>

                <div id="tour-map-filters" className={cn(
                    "items-center gap-2 shrink-0",
                    (isMobile || isInitialLoading) ? "hidden" : "hidden md:flex"
                )}>
                     {!isInitialLoading && (
                         <>
                            <div className="inline-flex rounded-md shadow-sm h-10" role="group">
                                <Button
                                    variant={viewMode === 'list' ? "default" : "outline"}
                                    onClick={() => setViewMode('list')}
                                    className="rounded-r-none h-10 px-3"
                                    aria-label="List view"
                                >
                                    <LayoutGrid className="h-4 w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">List</span>
                                </Button>
                                <Button
                                    variant={viewMode === 'split' ? "default" : "outline"}
                                    onClick={() => setViewMode('split')}
                                    className="rounded-none border-l-0 border-r-0 h-10 px-3"
                                    aria-label="Split view"
                                >
                                    <SquareSplitHorizontal className="h-4 w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Split</span>
                                </Button>
                                <Button
                                    variant={viewMode === 'map' ? "default" : "outline"}
                                    onClick={() => setViewMode('map')}
                                    className="rounded-l-none h-10 px-3"
                                    aria-label="Map view"
                                >
                                    <MapIcon className="h-4 w-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Map</span>
                                </Button>
                            </div>

                            <MapFilters
                                filters={mapFilters}
                                setFilters={setMapFilters}
                                isMobile={isMobile}
                            />
                         </>
                     )}
                </div>
                 {isInitialLoading && !isMobile && (
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        <ViewTogglesSkeleton />
                        <MapFiltersSkeleton />
                    </div>
                )}
            </div>
        </div>
    );
});

export function MapFiltersSkeleton() {
    return (
        <Skeleton className="h-10 w-[100px] rounded-md" />
    );
} 