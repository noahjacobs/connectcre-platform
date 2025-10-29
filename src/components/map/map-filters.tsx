"use client";

import { useState, useRef, Fragment, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ListFilter, Building2, X, Plus, ArrowLeft, Check, Construction } from "lucide-react";
import { nanoid } from "nanoid";
import * as React from "react";
import { AnimateChangeInHeight } from "@/components/ui/filters";
import {
  Filter,
  FilterOperator,
  FilterOption,
  FilterType,
  FilterValueCombobox,
  ProjectStatus,
  PropertyType,
  FilterIcon,
  filterOperators,
} from "@/components/ui/filters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// --- Define Map-Specific Filter Configuration ---

// No need for a separate MapFilterType enum
// Define which FilterTypes are relevant for the map
const allowedMapFilterTypes: FilterType[] = [
  FilterType.PROJECT_STATUS,
  FilterType.PROPERTY_TYPE, // Assuming PROJECT_STATUS exists in FilterType or is added
  // Add other relevant FilterTypes like FilterType.LOCATION if needed
];

// We might need to add PROJECT_STATUS to the main FilterType enum if it's not there.
// Let's assume PROJECT_STATUS needs to be added to FilterType in filters.tsx later.

// Map existing enums to FilterOption arrays (using FilterType)
const mapPropertyTypeFilterOptions: FilterOption[] = Object.values(PropertyType).map(
  (type) => ({
    name: type,
    icon: <Building2 className="size-3.5" />, 
    label: FilterType.PROPERTY_TYPE // Add label for clarity if needed
  })
);

const mapProjectStatusFilterOptions: FilterOption[] = Object.values(ProjectStatus).map(
  (status) => ({
    name: status,
    icon: <Construction className="size-3.5" />, 
    label: FilterType.PROJECT_STATUS // Add label for clarity
  })
);

// Filter view options specifically for the map filters, using allowed FilterTypes
const mapFilterViewOptions: FilterOption[][] = [
  [
    {
      name: FilterType.PROJECT_STATUS,
      icon: <Construction className="size-3.5" />,
    },
    {
      name: FilterType.PROPERTY_TYPE,
      icon: <Building2 className="size-3.5" />,
    },
  ],
];

// Map filter type names to their options arrays (using FilterType)
// Use Partial<> to allow defining only a subset of keys
const mapFilterViewToFilterOptions: Partial<Record<FilterType, FilterOption[]>> = {
  // Only include allowed types
  [FilterType.PROPERTY_TYPE]: mapPropertyTypeFilterOptions,
  [FilterType.PROJECT_STATUS]: mapProjectStatusFilterOptions,
  // Need defaults for other FilterType members if Record<> is used strictly
  // Or filter the keys based on allowedMapFilterTypes when accessing
};

// No need for mapFilterOperators, use the imported filterOperators
// No need for MapFilterOperatorDropdown, use FilterOperatorDropdown
// No need for MapFilterIcon, use FilterIcon
// No need for MapFilterValueCombobox, use FilterValueCombobox

// --- Main MapFilters Component ---
export interface MapFiltersProps {
  filters: Filter[]; 
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
  isMobile: boolean;
}

export function MapFilters({ filters, setFilters, isMobile }: MapFiltersProps) {
  const [open, setOpen] = useState(false);
  // Selected view should be FilterType
  const [selectedView, setSelectedView] = useState<FilterType | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [showActiveFilters, setShowActiveFilters] = useState(false);

  // Filter the generic filters to only those relevant to allowedMapFilterTypes
  const activeMapFilters = filters.filter(
    (filter) => 
      filter.value?.length > 0 && allowedMapFilterTypes.includes(filter.type)
  );
  // const filterCount = activeFilters.length;
  const filterCount = activeMapFilters.reduce((count, filter) => count + filter.value.length, 0);

  useEffect(() => {
    if (filterCount === 0) {
      setShowActiveFilters(false);
    }
  }, [filterCount]);

  const handleFilterButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isMobile) {
      if (filterCount > 0) {
        setShowActiveFilters(!showActiveFilters);
        setOpen(false);
      } else {
        setOpen(true);
        setShowActiveFilters(false);
      }
    } else {
      setOpen(!open);
    }
  };

  const handleAddFilter = () => {
    setShowActiveFilters(false);
    setOpen(true);
  };

  const handleFilterSelect = (currentValue: string) => {
    const currentFilterType = selectedView;
    if (!currentFilterType) return;

    const existingFilterIndex = filters.findIndex(f => f.type === currentFilterType);

    if (existingFilterIndex !== -1) {
        // Update existing filter (add value)
        const updatedFilters = [...filters];
        const existingFilter = updatedFilters[existingFilterIndex];
        if (!existingFilter.value.includes(currentValue)) {
            updatedFilters[existingFilterIndex] = {
                ...existingFilter,
                value: [...existingFilter.value, currentValue],
                operator: FilterOperator.IS_ANY_OF 
            };
             setFilters(updatedFilters);
        }
    } else {
        // Add new filter
        const newFilter: Filter = {
            id: nanoid(),
            type: currentFilterType, // Now this is FilterType
            operator: FilterOperator.IS, 
            value: [currentValue],
        };
        setFilters((prev) => [
            ...prev,
            newFilter,
        ]);
    }

    setSelectedView(null);
    setCommandInput("");
    // Keep popover open after selection might be better ux
    // setOpen(false); 
  };

  // removeFilterValue function remains the same conceptually
  const removeFilterValue = (filterId: string, valueToRemove: string) => {
      setFilters(prev => prev.map(f => {
          if (f.id === filterId) {
              const newValue = f.value.filter(v => v !== valueToRemove);
              return {
                  ...f,
                  value: newValue,
                  operator: newValue.length <= 1 ? FilterOperator.IS : f.operator
              };
          }
          return f;
      }).filter(f => f !== null) as Filter[]); 
  };

  return (
    <div className="relative">
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setSelectedView(null);
            setCommandInput("");
          }
        }}
      >
        <div className="relative"> {/* Container for button and potential preview */}
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-10 gap-2" 
              onClick={handleFilterButtonClick}
              onMouseEnter={() => !isMobile && filterCount > 0 && setShowActiveFilters(true)}
              onMouseLeave={() => !isMobile && setShowActiveFilters(false)}
            >
              <ListFilter className="h-4 w-4" />
              <span className="flex items-center gap-2">
                Filters
                {filterCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {filterCount}
                  </span>
                )}
              </span>
            </Button>
          </PopoverTrigger>

          {/* Active Filters Preview (Hover/Mobile Toggle) */}
          {showActiveFilters && filterCount > 0 && (
            <>
              {!isMobile && <div className="absolute left-0 w-full h-1 -bottom-1" onMouseEnter={() => setShowActiveFilters(true)} />}
              <div
                className={cn(
                  "absolute top-full mt-1 bg-popover rounded-md border shadow-md p-0 z-50 max-h-[calc(100vh-10rem)] overflow-y-auto",
                  isMobile ? "w-[calc(100vw-2rem)] left-1/2 -translate-x-1/2" : "min-w-[368px] right-0" 
                )}
                onMouseEnter={() => !isMobile && setShowActiveFilters(true)}
                onMouseLeave={() => !isMobile && setShowActiveFilters(false)}
              >
                 <div className="sticky top-0 p-2 border-b bg-popover/95 backdrop-blur-sm flex items-center justify-between z-10">
                  <div className="text-sm font-medium">Active Filters</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      // Only remove map-related filters
                      setFilters(prev => prev.filter(f => !allowedMapFilterTypes.includes(f.type)));
                      setShowActiveFilters(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
                <div className="p-2 space-y-2">
                    {activeMapFilters.map((filter) => (
                      <div key={filter.id} className="flex gap-1 items-center text-sm bg-muted/30 rounded-lg overflow-hidden hover:bg-muted/50 transition-colors">
                        <div className="flex gap-1.5 items-center bg-muted/50 px-2 py-1.5">
                          {/* Use generic FilterIcon */}
                          <FilterIcon type={filter.type} />
                          <span className="font-medium">{filter.type}</span>
                        </div>
                        {/* Use generic FilterOperatorDropdown */}
                        {/* <FilterOperatorDropdown 
                          filterType={filter.type}
                          operator={filter.operator}
                          filterValues={filter.value}
                          setOperator={(operator) => {
                            setFilters((prev) =>
                              prev.map((f) => (f.id === filter.id ? { ...f, operator } : f))
                            );
                          }}
                        /> */} 
                        {/* Operator Dropdown might need slight adaptation if imported directly */}
                         {/* Display operator simply for now */} 
                         <span className="px-1.5 py-1 text-muted-foreground text-xs">{filter.operator}</span>
                        {/* Use generic FilterValueCombobox */}
                         <FilterValueCombobox
                          filterType={filter.type}
                          filterValues={filter.value}
                          setFilterValues={(filterValues) => {
                              setFilters((prev) =>
                                  prev.map((f) =>
                                      f.id === filter.id ? { ...f, value: filterValues, operator: filterValues.length <= 1 ? FilterOperator.IS : FilterOperator.IS_ANY_OF } : f
                                  )
                              );
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFilters((prev) => prev.filter((f) => f.id !== filter.id));
                          }}
                          className="ml-auto h-7 w-7 mr-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleAddFilter}
                  >
                    <Plus className="h-4 w-4" />
                    Add Filter
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Popover Content for Adding/Selecting Filters */}
        <PopoverContent className={cn(
          "p-0",
          isMobile ? "w-screen max-w-[calc(100vw-2rem)]" : "w-[220px]"
        )} align={isMobile ? "center" : "end"}>
          <AnimateChangeInHeight>
            <Command>
              {selectedView && (
                <div className="flex items-center border-b border-muted/70">
                  <button
                    className="flex w-full items-center rounded-lg gap-2 px-3 py-2 text-sm font-light text-muted-foreground hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setSelectedView(null);
                      setCommandInput("");
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              )}
              <CommandInput
                placeholder={selectedView ? `Select ${selectedView}...` : "Filter by..."}
                className="h-9"
                value={commandInput}
                onInputCapture={(e) => {
                  setCommandInput(e.currentTarget.value);
                }}
              />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {selectedView ? (
                  <CommandGroup>
                    {/* Use mapFilterViewToFilterOptions but ensure key exists */}
                    {(mapFilterViewToFilterOptions[selectedView] || []).map(
                      (filter: FilterOption) => (
                        <CommandItem
                          className="group text-muted-foreground flex gap-2 items-center cursor-pointer"
                          key={filter.name}
                          value={filter.name}
                          onSelect={handleFilterSelect}
                        >
                           <Checkbox
                              // Check if the *specific value* for the *selected type* exists
                              checked={filters.some(f => f.type === selectedView && f.value.includes(filter.name))}
                              className="opacity-50 group-hover:opacity-100 group-data-[selected=true]:opacity-100"
                            />
                          {filter.icon}
                          <span className="text-accent-foreground">
                            {filter.name}
                          </span>
                        </CommandItem>
                      )
                    )}
                  </CommandGroup>
                ) : (
                  // Use mapFilterViewOptions to show only allowed filter types
                  mapFilterViewOptions.map(
                    (group: FilterOption[], index: number) => (
                      <Fragment key={index}>
                        <CommandGroup>
                          {group.map((filter: FilterOption) => (
                            <CommandItem
                              className="group text-muted-foreground flex gap-2 items-center cursor-pointer"
                              key={filter.name}
                              value={filter.name}
                              onSelect={(currentValue) => {
                                setSelectedView(currentValue as FilterType); // Use FilterType
                                setCommandInput("");
                              }}
                            >
                              {filter.icon}
                              <span className="text-accent-foreground">
                                {filter.name}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {index < mapFilterViewOptions.length - 1 && (
                          <CommandSeparator />
                        )}
                      </Fragment>
                    )
                  )
                )}
              </CommandList>
            </Command>
          </AnimateChangeInHeight>
        </PopoverContent>
      </Popover>
    </div>
  );
} 