"use client";

import { useState, useRef, Fragment } from 'react';
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
import { ListFilter, Building2, Signal, LayoutGrid, MapPin, Star, Clock, X, Plus, ArrowLeft, Activity } from "lucide-react";
import { nanoid } from "nanoid";
import * as React from "react";
import { AnimateChangeInHeight } from "@/components/ui/filters";
import {
  DueDate,
  Filter,
  FilterOperator,
  FilterOption,
  FilterType,
  filterViewOptions,
  filterViewToFilterOptions,
  FilterValueCombobox,
  FilterValueDateCombobox,
} from "@/components/ui/filters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the filterOperators function first
const filterOperators = ({
  filterType,
  filterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
}): FilterOperator[] => {
  switch (filterType) {
    case FilterType.CATEGORY:
    case FilterType.ACTIVITY:
    case FilterType.PROPERTY_TYPE:
    case FilterType.LOCATION:
    case FilterType.RATING:
    case FilterType.EXPERIENCE:
      if (Array.isArray(filterValues) && filterValues.length > 1) {
        return [FilterOperator.IS_ANY_OF, FilterOperator.IS_NOT];
      } else {
        return [FilterOperator.IS, FilterOperator.IS_NOT];
      }
    default:
      return [];
  }
};

// Then define the FilterOperatorDropdown component
export const FilterOperatorDropdown = ({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: FilterType;
  operator: FilterOperator;
  filterValues: string[];
  setOperator: (operator: FilterOperator) => void;
}) => {
  const operators = filterOperators({ filterType, filterValues });
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      modal={false}
    >
      <DropdownMenuTrigger 
        className="bg-muted hover:bg-muted/50 px-1.5 py-1 text-muted-foreground hover:text-primary transition shrink-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {operator}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-fit min-w-fit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {operators.map((op: FilterOperator) => (
          <DropdownMenuItem
            key={op}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOperator(op);
              setOpen(false);
            }}
          >
            {op}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Then define the FilterIcon component
const FilterIcon = ({ type }: { type: FilterType }) => {
  switch (type) {
    case FilterType.CATEGORY:
      return <Building2 className="h-4 w-4" />;
    case FilterType.ACTIVITY:
      return <Activity className="h-4 w-4" />;
    case FilterType.PROPERTY_TYPE:
      return <LayoutGrid className="h-4 w-4" />;
    case FilterType.LOCATION:
      return <MapPin className="h-4 w-4" />;
    case FilterType.RATING:
      return <Star className="h-4 w-4" />;
    case FilterType.EXPERIENCE:
      return <Clock className="h-4 w-4" />;
    default:
      return <ListFilter className="h-4 w-4" />;
  }
};

export interface FilterSelectionProps {
  filters: Filter[];
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
  isMobile: boolean;
}

export function FilterSelection({ filters, setFilters, isMobile }: FilterSelectionProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedView, setSelectedView] = React.useState<FilterType | null>(null);
  const [commandInput, setCommandInput] = React.useState("");
  const [showActiveFilters, setShowActiveFilters] = React.useState(false);
  const commandInputRef = React.useRef<HTMLInputElement>(null);

  const activeFilters = filters.filter((filter) => filter.value?.length > 0);
  // const filterCount = activeFilters.length;
  const filterCount = activeFilters.reduce((count, filter) => count + filter.value.length, 0);


  // Reset states when filters change
  React.useEffect(() => {
    if (filterCount === 0) {
      setShowActiveFilters(false);
    }
  }, [filterCount]);

  const handleFilterButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isMobile) {
      if (filterCount > 0) {
        // If we have filters, toggle active filters view
        setShowActiveFilters(!showActiveFilters);
        setOpen(false);
      } else {
        // If no filters, open filter selection
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
    setFilters((prev) => [
      ...prev,
      {
        id: nanoid(),
        type: selectedView!,
        operator: FilterOperator.IS,
        value: [currentValue],
      },
    ]);
    setSelectedView(null);
    setCommandInput("");
    setOpen(false);
    setShowActiveFilters(false);
  };

  return (
    <div className="w-full">
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
        <div className="relative w-full">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-9 gap-2 w-full"
              onClick={handleFilterButtonClick}
              onMouseEnter={() => !isMobile && setShowActiveFilters(true)}
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

          {/* Active Filters Preview */}
          {showActiveFilters && !open && filterCount > 0 && (
            <>
              {/* Invisible bridge to maintain hover state */}
              {!isMobile && (
                <div 
                  className="absolute left-0 w-full h-1 -bottom-1"
                  onMouseEnter={() => setShowActiveFilters(true)}
                />
              )}
              <div 
                className={cn(
                  "absolute top-full mt-1 bg-popover rounded-md border shadow-md p-0 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto",
                  isMobile 
                    ? "w-[calc(100vw-2rem)]" 
                    : "w-[400px]"
                )}
                onMouseEnter={() => !isMobile && setShowActiveFilters(true)}
                onMouseLeave={() => !isMobile && setShowActiveFilters(false)}
                style={!isMobile ? { 
                  transform: 'translateX(calc(-50% + 50px))',
                  right: 'auto'
                } : undefined}
              >
                <div className="sticky top-0 p-2 border-b bg-popover/95 backdrop-blur-sm flex items-center justify-between">
                  <div className="text-sm font-medium">Active Filters</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFilters([]);
                      setShowActiveFilters(false);
                    }}
                  >
                    Clear all
                  </Button>
                </div>
                <div className="p-2 space-y-2">
                  {activeFilters.map((filter) => (
                    <div key={filter.id} className="flex gap-1 items-center text-sm bg-muted/30 rounded-lg overflow-hidden hover:bg-muted/50 transition-colors">
                      <div className="flex gap-1.5 items-center bg-muted/50 px-2 py-1.5">
                        <FilterIcon type={filter.type} />
                        <span className="font-medium">{filter.type}</span>
                      </div>
                      <FilterOperatorDropdown
                        filterType={filter.type}
                        operator={filter.operator}
                        filterValues={filter.value}
                        setOperator={(operator) => {
                          setFilters((prev) =>
                            prev.map((f) => (f.id === filter.id ? { ...f, operator } : f))
                          );
                        }}
                      />
                      {filter.type === FilterType.CREATED_DATE ||
                      filter.type === FilterType.UPDATED_DATE ||
                      filter.type === FilterType.DUE_DATE ? (
                        <FilterValueDateCombobox
                          filterType={filter.type}
                          filterValues={filter.value}
                          setFilterValues={(filterValues) => {
                            setFilters((prev) =>
                              prev.map((f) =>
                                f.id === filter.id ? { ...f, value: filterValues } : f
                              )
                            );
                          }}
                        />
                      ) : (
                        <FilterValueCombobox
                          filterType={filter.type}
                          filterValues={filter.value}
                          setFilterValues={(filterValues) => {
                            setFilters((prev) =>
                              prev.map((f) =>
                                f.id === filter.id ? { ...f, value: filterValues } : f
                              )
                            );
                          }}
                        />
                      )}
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
                    <Plus className="h-4 w-4 mr-0.5" />
                    Add Filter
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <PopoverContent className={cn(
          "p-0",
          isMobile ? "w-screen max-w-[calc(100vw-2rem)]" : "w-[200px]"
        )} align="start">
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
                placeholder={selectedView ? selectedView : "Filter..."}
                className="h-9"
                value={commandInput}
                onInputCapture={(e) => {
                  setCommandInput(e.currentTarget.value);
                }}
                ref={commandInputRef}
              />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {selectedView ? (
                  <CommandGroup>
                    {filterViewToFilterOptions[selectedView].map(
                      (filter: FilterOption) => (
                        <CommandItem
                          className="group text-muted-foreground flex gap-2 items-center cursor-pointer"
                          key={filter.name}
                          value={filter.name}
                          onSelect={handleFilterSelect}
                        >
                          {filter.icon}
                          <span className="text-accent-foreground">
                            {filter.name}
                          </span>
                          {filter.label && (
                            <span className="text-muted-foreground text-xs ml-auto">
                              {filter.label}
                            </span>
                          )}
                        </CommandItem>
                      )
                    )}
                  </CommandGroup>
                ) : (
                  filterViewOptions.map(
                    (group: FilterOption[], index: number) => (
                      <React.Fragment key={index}>
                        <CommandGroup>
                          {group.map((filter: FilterOption) => (
                            <CommandItem
                              className="group text-muted-foreground flex gap-2 items-center cursor-pointer"
                              key={filter.name}
                              value={filter.name}
                              onSelect={(currentValue) => {
                                setSelectedView(currentValue as FilterType);
                                setCommandInput("");
                                commandInputRef.current?.focus();
                              }}
                            >
                              {filter.icon}
                              <span className="text-accent-foreground">
                                {filter.name}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {index < filterViewOptions.length - 1 && (
                          <CommandSeparator />
                        )}
                      </React.Fragment>
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

