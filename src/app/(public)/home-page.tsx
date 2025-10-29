'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from "@/components/home/hero-section";
import DynamicPostGrid from "@/components/home/dynamic-post-grid";
import { City } from "@/components/map/types";
import { Filter } from "@/components/ui/filters";

// Dynamic imports for modals and map
const PostModal = dynamic(() => import("@/components/home/post-modal"), { ssr: false });
const ProjectMap = dynamic(() => import("@/components/map/map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse" />
});

interface HomePageProps {
  initialArticles: any[];
  cities?: City[];
}

export default function HomePage({ initialArticles, cities = [] }: HomePageProps) {
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'split' | 'map'>('list');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [currentSearch, setCurrentSearch] = useState<string | null>(null);
  const [mapFilters, setMapFilters] = useState<Filter[]>([]);
  const [isUpsellDismissed, setIsUpsellDismissed] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  const handleSearch = (query: string | null, results?: any[] | null) => {
    setCurrentSearch(query);
  };

  const handleCitySelect = (citySlug: string | null) => {
    setSelectedCity(citySlug);
  };

  const handleLoadMore = async () => {
    // TODO: Implement pagination
  };

  const handleHoveredItem = (id: string | null) => {
    setHoveredItemId(id);
  };

  const handleViewProjectClick = (project: any) => {
    // TODO: Open project modal
    console.log('View project:', project);
  };

  return (
    <main className="relative flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-49px)]">
      {/* Hero section with search and filters */}
      <HeroSection
        selectedCity={selectedCity}
        onSearch={handleSearch}
        cities={cities}
        onCitySelect={handleCitySelect}
        viewMode={viewMode}
        setViewMode={setViewMode}
        mapFilters={mapFilters}
        setMapFilters={setMapFilters}
        isMobile={false}
        currentSearch={currentSearch}
        isInitialLoading={false}
        displayModeFromParent="initial"
      />

      {/* Content area */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden md:relative z-0">
        {/* Article grid */}
        <div className="p-6 w-full md:w-2/3 md:overflow-y-auto md:order-1">
          <DynamicPostGrid
            posts={initialArticles || []}
            postsPerPage={12}
            selectedCity={selectedCity}
            canLoadMore={false}
            isLoadingMore={false}
            isLoading={false}
            loadMorePosts={handleLoadMore}
            setHoveredItemId={handleHoveredItem}
            viewMode={viewMode}
            isMobile={false}
            isUpsellDismissed={isUpsellDismissed}
            setIsUpsellDismissed={setIsUpsellDismissed}
            onPostClick={setSelectedArticle}
          />
        </div>

        {/* Map view */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={viewMode === 'map' ? 'w-full md:order-2' : 'w-full md:w-1/3 md:order-2'}>
            <ProjectMap
              citySlug={selectedCity}
              searchQuery={currentSearch}
              actionId={null}
              priorityProjectIds={[]}
              onFullScreenToggle={setIsMapFullScreen}
              hoveredItemId={hoveredItemId}
              setHoveredItemId={setHoveredItemId}
              isFullScreen={isMapFullScreen}
              mapFilters={mapFilters}
              onViewProjectClick={handleViewProjectClick}
              isSearching={false}
            />
          </div>
        )}
      </div>

      {/* Article modal */}
      {selectedArticle && (
        <PostModal 
          post={selectedArticle}
          isOpen={!!selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </main>
  );
}
