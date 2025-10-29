"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Building2,
    MapPin,
    X,
    Construction,
    Store,
    Bookmark,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { Post } from "@/components/posts/types";
import { City } from "@/components/map/types";
import { useAuth } from "@/lib/providers/auth-context";
import { useSupabase } from "@/lib/providers/supabase-context";
import { perfLog } from '@/lib/utils/performance-monitor-client';
// import { ComingSoonDialog } from "@/components/ui/coming-soon-dialog";

interface Action {
    id: string;
    label: string;
    icon: React.ReactNode;
    description?: string;
    short?: string;
    end?: string;
}

interface SearchResult {
    actions: Action[];
}

interface ActionSearchBarProps {
    actions?: Action[];
    selectedCity?: string | null;
    onSearch?: (query: string | null, results?: Post[] | null) => void;
    cities: City[];
    onCitySelect: (citySlug: string | null) => void;
    onActionSelect?: (actionId: string | null, citySlug: string | null) => void;
    currentSearch?: string | null;
    displayMode?: 'initial' | 'search' | 'action';
    setHoveredItemId?: (id: string | null) => void;
    isMapHoverDisabled?: boolean;
    setIsMapHoverDisabled?: (disabled: boolean) => void;
}

const ActionSearchBarComponent: React.FC<ActionSearchBarProps> = ({ 
    actions: propActions, 
    selectedCity,
    onSearch,
    cities,
    onCitySelect,
    onActionSelect,
    currentSearch,
    displayMode = 'initial',
    setHoveredItemId,
    isMapHoverDisabled,
    setIsMapHoverDisabled
}) => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<SearchResult | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const debouncedQuery = useDebounce(query, 200);
    const [windowWidth, setWindowWidth] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const { user } = useAuth();
    const router = useRouter();
    const { supabase } = useSupabase();
    
    // Add hover disable timeout ref for city selection delays
    const hoverDisableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const dynamicActions = useMemo(() => [
        {
            id: "1",
            label: "New Developments",
            icon: <Building2 className="h-4 w-4 text-blue-500" />,
            description: selectedCity ? "Latest projects across the city." : "Latest projects.",
            short: "⌘D",
            end: "Projects",
        },
        {
            id: "2",
            label: "Construction Updates",
            icon: <Construction className="h-4 w-4 text-orange-500" />,
            description: "Sites with active crews and cranes.",
            short: "⌘U",
            end: "Updates",
        },
        {
            id: "3",
            label: "Marketplace",
            icon: <Store className="h-4 w-4 text-purple-500" />,
            description: "Find the right pros. Get quality leads.",
            short: "⌘K",
            end: "Market",
        },
        {
            id: "4",
            label: "Saved Projects",
            icon: <Bookmark className="h-4 w-4 text-green-500" />,
            description: "Pick up where you left off — or track deals.",
            short: "⌘S",
            end: "Saved",
        }
    ], [selectedCity]);

    const actionsToUse = propActions ?? dynamicActions;

    const isActive = displayMode === 'search' || displayMode === 'action';

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current) {
                const { scrollWidth, clientWidth } = containerRef.current;
                setIsOverflowing(scrollWidth > clientWidth);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [cities]);

    useEffect(() => {
        setWindowWidth(window.innerWidth);
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverDisableTimeoutRef.current) {
                clearTimeout(hoverDisableTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Initialize query state from currentSearch prop if parent is active
        // --- REMOVED: Don't set query state automatically --- 
        // if (isActive && currentSearch && query !== currentSearch) {
        //     setQuery(currentSearch);
        // }
        // --- END REMOVED --- 

        // Pass isActive instead of isParentSearchActive
    }, [isActive, currentSearch]); 

    const handleActionClick = (action: Action) => {
        setIsFocused(false);
        setQuery("");

        if (action.id === "3") {
            router.push('/directory'); 
        } else if (action.id === "4") {
            router.push('/tracking'); 
        } else {
            onActionSelect?.(action.id, selectedCity ?? null);
        }
    };

    // useEffect for handling global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if Command (Mac) or Ctrl (Win/Linux) key is pressed
            if (e.metaKey || e.ctrlKey) {
                const key = e.key.toUpperCase(); // Get the pressed key (N, U, K, S)
                
                // Find the action matching the shortcut
                const targetAction = actionsToUse.find(action => action.short?.endsWith(key));

                if (targetAction) {
                    e.preventDefault(); // Prevent default browser action (e.g., Cmd+N = New Window)
                    handleActionClick(targetAction); // Trigger the action click handler
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleActionClick, actionsToUse]);

    const container = {
        hidden: { opacity: 0, height: 0 },
        show: {
            opacity: 1,
            height: "auto",
            transition: {
                height: { duration: 0.4 },
                staggerChildren: 0.1,
            },
        },
        exit: {
            opacity: 0,
            height: 0,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.2 },
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        try {
            onSearch?.(query);
            setIsFocused(false);
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    const handleClear = () => {
        setQuery('');
        onSearch?.(null);
        onActionSelect?.(null, selectedCity ?? null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleClear();
            setIsFocused(false);
        }
    };

    const placeholder = 
        // Show current search/action title as placeholder if parent is active
        isActive && currentSearch 
            ? currentSearch
            // Original placeholder logic otherwise
            : windowWidth === null || windowWidth >= 640
                ? "Search projects, neighborhoods, and more..."
                : "Search projects...";

    const handleCityClick = async (citySlug: string) => {
        const startTime = performance.now();
        perfLog.log('CitySelect', 'User clicked city', undefined, { 
          citySlug, 
          currentCity: selectedCity,
          timestamp: new Date().toISOString() 
        });
        
        // --- NEW: Disable map hover during city selection ---
        if (setIsMapHoverDisabled) {
            const hoverDisableStart = performance.now();
            if (hoverDisableTimeoutRef.current) {
                clearTimeout(hoverDisableTimeoutRef.current);
            }
            setIsMapHoverDisabled(true);
            hoverDisableTimeoutRef.current = setTimeout(() => {
                setIsMapHoverDisabled(false);
                hoverDisableTimeoutRef.current = null;
            }, 400); // Increased back to 400ms for better prevention of early panning
            perfLog.log('CitySelect', 'Map hover disabled', performance.now() - hoverDisableStart);
        }
        // --- END NEW ---

        const newSelection = selectedCity === citySlug ? null : citySlug;
        perfLog.log('CitySelect', 'New selection determined', undefined, { newSelection, isDeselection: newSelection === null });
        
        const localStorageStart = performance.now();
        localStorage.setItem('selectedCity', newSelection || '');
        perfLog.log('CitySelect', 'LocalStorage updated', performance.now() - localStorageStart);
        
        // Update user profile in Supabase if user is logged in
        if (user && supabase) {
            const supabaseStart = performance.now();
            perfLog.log('CitySelect', 'Updating user profile in Supabase...');
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ selected_city: newSelection })
                    .eq('id', user.id);
                
                const supabaseTime = performance.now() - supabaseStart;
                if (error) {
                    console.error('❌ [CityClick] Supabase profile update error:', error);
                } else {
                    perfLog.log('CitySelect', 'Supabase profile updated', supabaseTime);
                }
                
                if (supabaseTime > 1000) {
                    console.warn('⚠️ [CityClick] SLOW SUPABASE UPDATE DETECTED:', supabaseTime, 'ms');
                }
            } catch (error) {
                console.error('❌ [CityClick] Supabase profile update exception:', error);
            }
        } else {
            perfLog.log('CitySelect', 'No user logged in - skipping profile update');
        }
        
        const callbackStart = performance.now();
        perfLog.log('CitySelect', 'Calling onCitySelect callback...');
        onCitySelect(newSelection);
        perfLog.log('CitySelect', 'Callback completed', performance.now() - callbackStart);
        
        const totalTime = performance.now() - startTime;
        perfLog.log('CitySelect', 'Total city click handled', totalTime, { citySlug, newSelection });
        
        if (totalTime > 500) {
            console.warn('⚠️ [CityClick] SLOW CITY CLICK HANDLER DETECTED:', totalTime, 'ms');
        }
    };

    const handleRemoveCity = async () => {
        // --- NEW: Disable map hover during city removal ---
        if (setIsMapHoverDisabled) {
            if (hoverDisableTimeoutRef.current) {
                clearTimeout(hoverDisableTimeoutRef.current);
            }
            setIsMapHoverDisabled(true);
            hoverDisableTimeoutRef.current = setTimeout(() => {
                setIsMapHoverDisabled(false);
                hoverDisableTimeoutRef.current = null;
            }, 1500);
        }
        // --- END NEW ---

        localStorage.removeItem('selectedCity');
        
        // Remove selected city from user profile in Supabase if user is logged in
        if (user && supabase) {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ selected_city: null })
                    .eq('id', user.id);
                
                if (error) {
                    console.error('Error removing selected city:', error);
                }
            } catch (error) {
                console.error('Error removing selected city:', error);
            }
        }
        
        onCitySelect(null);
    };

    const citiesBySlug = new Map((cities || []).map(city => [city.slug, city]));
    const cityFromSlug = selectedCity ? citiesBySlug.get(selectedCity) : null;
    const cityName = cityFromSlug?.name;

    const filteredRelatedCities = (cities || []).filter((city) =>
        city.slug !== selectedCity
    );

    const cityOptions = filteredRelatedCities.map((city) => ({
        value: city.slug,
        label: city.name,
        emoji: "🏙️",
    }));

    return (
        <div className="w-full">
            <div className="relative flex flex-col justify-start items-center min-h-11">
                <div className="w-full sticky top-0 bg-background z-10">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="relative">
                            <div className="relative flex items-center h-11 px-2 rounded-xl border border-input bg-background">
                                {selectedCity && (
                                    <div className="flex items-center mr-2">
                                        <span 
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30"
                                        >
                                            {cityName}
                                            <button
                                                type="button"
                                                onClick={handleRemoveCity}
                                                className="text-current/60 hover:text-current transition-colors shrink-0"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder={placeholder}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => {
                                        setIsFocused(true);
                                    }}
                                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                                    className="mr-8 flex-1 h-full bg-transparent border-0 outline-none text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                                />
                                <div className="flex items-center gap-2">
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                        <AnimatePresence mode="wait">
                                            {isActive ? (
                                                <motion.button key="clear-icon" type="button" onClick={handleClear} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors" aria-label="Clear filter">
                                                    <X className="w-4 h-4 text-zinc-500" />
                                                </motion.button>
                                            ) : (
                                                <motion.div key="search-icon" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
                                                    <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="w-full relative">
                    <AnimatePresence>
                        {isFocused && (
                            <motion.div
                                className="absolute left-0 right-0 w-full border rounded-xl shadow-lg overflow-hidden 
                                         dark:border-gray-800 bg-white dark:bg-black mt-1"
                                variants={container}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                style={{ zIndex: 9999 }}
                            >
                                {!selectedCity && (
                                    <motion.div 
                                        className="p-2 border-b border-gray-100 dark:border-gray-800"
                                        variants={item}
                                    >
                                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                                            Select a region
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {cityOptions.map((city) => (
                                                <motion.button
                                                    key={city.value}
                                                    variants={item}
                                                    onClick={() => {
                                                        handleCityClick(city.value);
                                                        setIsFocused(false);
                                                    }}
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm transition-colors
                                                        ${selectedCity === city.value
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                        }`}
                                                >
                                                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                                    {city.label}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {(result?.actions || actionsToUse).map((action) => (
                                        <motion.div
                                            key={action.id}
                                            className="transform-gpu px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer"
                                            variants={item}
                                            onClick={() => handleActionClick(action)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="shrink-0">{action.icon}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {action.label}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {action.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded">
                                                    {action.short}
                                                </kbd>
                                                <span className="text-xs text-gray-400">
                                                    {action.end}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Press enter to search</span>
                                            <span>ESC to clear</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* <ComingSoonDialog 
                isOpen={showMapSoon}
                onOpenChange={setShowMapSoon}
                featureName="Development Map"
                description="Visualize project locations on an interactive map. This exciting feature is on its way!"
            /> */}
        </div>
    );
};

const ActionSearchBar = React.memo(ActionSearchBarComponent);

export default ActionSearchBar;
