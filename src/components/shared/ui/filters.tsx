'use client';

import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, createSafeResizeObserver } from "@/lib/utils";
import {
  Calendar,
  CalendarPlus,
  CalendarSync,
  Check,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
  CircleEllipsis,
  CircleX,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Tag,
  UserCircle,
  X,
  Building2,
  DollarSign,
  LayoutGrid,
  MapPin,
  Star,
  Clock,
  Signal,
  Activity as ActivityIcon,
  Briefcase,
  Construction,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = createSafeResizeObserver((entries) => {
        // We only have one entry, so we can use entries[0].
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      if (resizeObserver) {
        resizeObserver.observe(containerRef.current);
        return () => {
          // Cleanup the observer when the component is unmounted
          resizeObserver.disconnect();
        };
      }
    }
  }, []);

  return (
    <motion.div
      className={cn(className, "overflow-hidden")}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, dampping: 0.2, ease: "easeIn" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

export enum FilterType {
  STATUS = "Status",
  ASSIGNEE = "Assignee",
  LABELS = "Labels",
  PRIORITY = "Priority",
  DUE_DATE = "Due date",
  CREATED_DATE = "Created date",
  UPDATED_DATE = "Updated date",
  CATEGORY = "Category",
  ACTIVITY = "Activity",
  PROPERTY_TYPE = "Property Type",
  LOCATION = "Location",
  RATING = "Rating",
  EXPERIENCE = "Experience",
  PROJECT_STATUS = "Project Status",
}

export enum FilterOperator {
  IS = "is",
  IS_NOT = "is not",
  IS_ANY_OF = "is any of",
  INCLUDE = "include",
  DO_NOT_INCLUDE = "do not include",
  INCLUDE_ALL_OF = "include all of",
  INCLUDE_ANY_OF = "include any of",
  EXCLUDE_ALL_OF = "exclude all of",
  EXCLUDE_IF_ANY_OF = "exclude if any of",
  BEFORE = "before",
  AFTER = "after",
  IS_ONE_OF = "is one of",
}

export enum Status {
  BACKLOG = "Backlog",
  TODO = "Todo",
  IN_PROGRESS = "In Progress",
  IN_REVIEW = "In Review",
  DONE = "Done",
  CANCELLED = "Cancelled",
}

export enum Assignee {
  ANDREW_LUO = "Andrew Luo",
  NO_ASSIGNEE = "No assignee",
}

export enum Labels {
  BUG = "Bug",
  FEATURE = "Feature",
  HOTFIX = "Hotfix",
  RELEASE = "Release",
}

export enum Priority {
  URGENT = "Urgent",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum DueDate {
  IN_THE_PAST = "in the past",
  IN_24_HOURS = "24 hours from now",
  IN_3_DAYS = "3 days from now",
  IN_1_WEEK = "1 week from now",
  IN_1_MONTH = "1 month from now",
  IN_3_MONTHS = "3 months from now",
}

export enum Category {
  ARCHITECT = "Architect",
  ASSET_MANAGER = "Asset Manager",
  BROKER = "Broker",
  CAPITAL_ADVISORY = "Capital Advisory",
  CAPITAL_MARKETS = "Capital Markets",
  CONSTRUCTION = "Construction",
  CONSULTANT = "Consultant",
  DEVELOPER = "Developer",
  ENGINEER = "Engineer",
  FACILITIES_MANAGEMENT = "Facilities Management",
  FINANCE = "Finance",
  GENERAL_CONTRACTOR = "General Contractor",
  HUMAN_RESOURCES = "Human Resources",
  INSURANCE = "Insurance",
  INTERIOR_DESIGNER = "Interior Designer",
  INVESTMENT_SALES = "Investment Sales",
  INVESTOR_RELATIONS = "Investor Relations",
  JV_EQUITY = "JV Equity",
  LANDSCAPE_ARCHITECT = "Landscape Architect",
  LEASING = "Leasing",
  LEGAL_SERVICES = "Legal Services",
  LENDER = "Lender",
  MANUFACTURER = "Manufacturer",
  MATERIALS = "Materials",
  PROPERTY_MANAGER = "Property Manager",
  OTHER = "Other"
}

export enum ProjectStatus {
  PROPOSED = "Proposed",
  APPROVED = "Approved",
  UNDER_CONSTRUCTION = "Under Construction",
  COMPLETED = "Completed"
}

export enum PropertyType {
  APARTMENTS = "Apartments",
  CONDOS = "Condos",
  RETAIL = "Retail",
  OFFICE = "Office",
  PARKING = "Parking"
}

export enum Experience {
  UNDER_5 = "Under 5 completed",
  FIVE_TO_10 = "5-10 completed",
  TEN_TO_20 = "10-20 completed",
  OVER_20 = "20+ completed"
}

export enum Activity {
  UNDER_5 = "Under 5 active projects",
  FIVE_TO_10 = "5-10 active projects",
  TEN_TO_20 = "10-20 active projects",
  OVER_20 = "20+ active projects"
}

export enum Location {
  ATLANTA_GA = "Atlanta, GA",
  AUSTIN_TX = "Austin, TX",
  CHICAGO_IL = "Chicago, IL",
  DALLAS_TX = "Dallas, TX",
  DETROIT_MI = "Detroit, MI",
  LOS_ANGELES_CA = "Los Angeles, CA",
  NEW_YORK_NY = "New York, NY",
  SAN_FRANCISCO_CA = "San Francisco, CA",
  SEATTLE_WA = "Seattle, WA",
  TORONTO_CANADA = "Toronto, Canada",
  WASHINGTON_DC = "Washington D.C."
}

export enum Rating {
  FIVE_STARS = "5+ Stars",
  FOUR_STARS = "4+ Stars",
  THREE_STARS = "3+ Stars"
}

export type FilterOption = {
  name: FilterType | Status | Assignee | Labels | Priority | DueDate | Category | ProjectStatus | PropertyType | Experience | Location | Rating | Activity;
  icon: React.ReactNode | undefined;
  label?: string;
};

export type Filter = {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string[];
};

export const FilterIcon = ({
  type,
}: {
  type: FilterType | Status | Assignee | Labels | Priority | DueDate | Category | ProjectStatus | PropertyType | Experience | Location | Rating | Activity;
}) => {
  switch (type) {
    case Assignee.ANDREW_LUO:
      return (
        <Avatar className="size-3.5 rounded-full text-[9px] text-white">
          <AvatarFallback className="bg-orange-300">AL</AvatarFallback>
        </Avatar>
      );
    case Assignee.NO_ASSIGNEE:
      return <UserCircle className="size-3.5" />;
    case FilterType.STATUS:
      return <CircleDashed className="size-3.5" />;
    case FilterType.ASSIGNEE:
      return <UserCircle className="size-3.5" />;
    case FilterType.LABELS:
      return <Tag className="size-3.5" />;
    case FilterType.PRIORITY:
      return <SignalHigh className="size-3.5" />;
    case FilterType.DUE_DATE:
      return <Calendar className="size-3.5" />;
    case FilterType.CREATED_DATE:
      return <CalendarPlus className="size-3.5" />;
    case FilterType.UPDATED_DATE:
      return <CalendarSync className="size-3.5" />;
    case Status.BACKLOG:
      return <CircleDashed className="size-3.5 text-muted-foreground" />;
    case Status.TODO:
      return <Circle className="size-3.5 text-primary" />;
    case Status.IN_PROGRESS:
      return <CircleDotDashed className="size-3.5 text-yellow-400" />;
    case Status.IN_REVIEW:
      return <CircleEllipsis className="size-3.5 text-green-400" />;
    case Status.DONE:
      return <CircleCheck className="size-3.5 text-blue-400" />;
    case Status.CANCELLED:
      return <CircleX className="size-3.5 text-muted-foreground" />;
    case Priority.URGENT:
      return <CircleAlert className="size-3.5" />;
    case Priority.HIGH:
      return <SignalHigh className="size-3.5" />;
    case Priority.MEDIUM:
      return <SignalMedium className="size-3.5" />;
    case Priority.LOW:
      return <SignalLow className="size-3.5" />;
    case Labels.BUG:
      return <div className="bg-red-400 rounded-full size-2.5" />;
    case Labels.FEATURE:
      return <div className="bg-blue-400 rounded-full size-2.5" />;
    case Labels.HOTFIX:
      return <div className="bg-amber-400 rounded-full size-2.5" />;
    case Labels.RELEASE:
      return <div className="bg-green-400 rounded-full size-2.5" />;
    case FilterType.CATEGORY:
      return <Briefcase className="size-3.5" />;
    case FilterType.PROPERTY_TYPE:
      return <Building2 className="size-3.5" />;
    case FilterType.LOCATION:
      return <MapPin className="size-3.5" />;
    case FilterType.RATING:
      return <Star className="size-3.5" />;
    case FilterType.EXPERIENCE:
      return <Clock className="size-3.5" />;
    case FilterType.ACTIVITY:
      return <ActivityIcon className="size-3.5" />;
  }
};

export const filterViewOptions: FilterOption[][] = [
  [
    {
      name: FilterType.CATEGORY,
      icon: <Briefcase className="size-3.5" />,
    },
    {
      name: FilterType.ACTIVITY,
      icon: <ActivityIcon className="size-3.5" />,
    },
    {
      name: FilterType.PROPERTY_TYPE,
      icon: <Building2 className="size-3.5" />,
    },
  ],
  [
    {
      name: FilterType.LOCATION,
      icon: <MapPin className="size-3.5" />,
    },
    {
      name: FilterType.RATING,
      icon: <Star className="size-3.5" />,
    },
    {
      name: FilterType.EXPERIENCE,
      icon: <Clock className="size-3.5" />,
    },
  ],
];

export const statusFilterOptions: FilterOption[] = Object.values(Status).map(
  (status) => ({
    name: status,
    icon: <FilterIcon type={status} />,
  })
);

export const assigneeFilterOptions: FilterOption[] = Object.values(
  Assignee
).map((assignee) => ({
  name: assignee,
  icon: <FilterIcon type={assignee} />,
}));

export const labelFilterOptions: FilterOption[] = Object.values(Labels).map(
  (label) => ({
    name: label,
    icon: <FilterIcon type={label} />,
  })
);

export const priorityFilterOptions: FilterOption[] = Object.values(
  Priority
).map((priority) => ({
  name: priority,
  icon: <FilterIcon type={priority} />,
}));

export const dateFilterOptions: FilterOption[] = Object.values(DueDate).map(
  (date) => ({
    name: date,
    icon: undefined,
  })
);

export const categoryFilterOptions: FilterOption[] = Object.values(Category).map(
  (category) => ({
    name: category,
    icon: <Briefcase className="size-3.5" />,
  })
);

export const projectStatusFilterOptions: FilterOption[] = Object.values(ProjectStatus).map(
  (status) => ({
    name: status,
    icon: <Construction className="size-3.5" />,
  })
);

export const propertyTypeFilterOptions: FilterOption[] = Object.values(PropertyType).map(
  (type) => ({
    name: type,
    icon: <Building2 className="size-3.5" />,
  })
);

export const experienceFilterOptions: FilterOption[] = Object.values(Experience).map(
  (exp) => ({
    name: exp,
    icon: <Clock className="size-3.5" />,
  })
);

export const activityFilterOptions: FilterOption[] = Object.values(Activity).map(
  (activity) => ({
    name: activity,
    icon: <ActivityIcon className="size-3.5" />,
  })
);

export const locationFilterOptions: FilterOption[] = Object.values(Location).map(
  (location) => ({
    name: location,
    icon: <MapPin className="size-3.5" />,
  })
);

export const ratingFilterOptions: FilterOption[] = Object.values(Rating).map(
  (rating) => ({
    name: rating,
    icon: <Star className="size-3.5" />,
  })
);

export const filterViewToFilterOptions: Record<FilterType, FilterOption[]> = {
  [FilterType.CATEGORY]: Object.values(Category).map((value) => ({
    name: value,
    icon: <Briefcase className="size-3.5" />,
  })),
  [FilterType.ACTIVITY]: Object.values(Activity).map((value) => ({
    name: value,
    icon: <ActivityIcon className="size-3.5" />,
  })),
  [FilterType.PROPERTY_TYPE]: Object.values(PropertyType).map((value) => ({
    name: value,
    icon: <Building2 className="size-3.5" />,
  })),
  [FilterType.LOCATION]: Object.values(Location).map((value) => ({
    name: value,
    icon: <MapPin className="size-3.5" />,
  })),
  [FilterType.RATING]: Object.values(Rating).map((value) => ({
    name: value,
    icon: <Star className="size-3.5" />,
  })),
  [FilterType.EXPERIENCE]: Object.values(Experience).map((value) => ({
    name: value,
    icon: <Clock className="size-3.5" />,
  })),
  [FilterType.PROJECT_STATUS]: projectStatusFilterOptions,
  [FilterType.STATUS]: [],
  [FilterType.ASSIGNEE]: [],
  [FilterType.LABELS]: [],
  [FilterType.PRIORITY]: [],
  [FilterType.DUE_DATE]: [],
  [FilterType.CREATED_DATE]: [],
  [FilterType.UPDATED_DATE]: [],
};

export const FilterValueCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const nonSelectedFilterValues = filterViewToFilterOptions[filterType]?.filter(
    (filter) => !filterValues.includes(filter.name)
  );
  return (
    <Popover
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger
        className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition
  text-muted-foreground hover:text-primary shrink-0"
      >
        <div className="flex gap-1.5 items-center">
          {filterType !== FilterType.PRIORITY && (
            <div
              className={cn(
                "flex items-center flex-row",
                filterType === FilterType.LABELS ? "-space-x-1" : "-space-x-1.5"
              )}
            >
              <AnimatePresence mode="popLayout">
                {filterValues?.slice(0, 3).map((value) => (
                  <motion.div
                    key={value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FilterIcon type={value as FilterType} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {filterValues?.length === 1
            ? filterValues?.[0]
            : `${filterValues?.length} selected`}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={filterType}
              className="h-9"
              value={commandInput}
              onInputCapture={(e) => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filterValues.map((value) => (
                  <CommandItem
                    key={value}
                    className="group flex gap-2 items-center"
                    onSelect={() => {
                      setFilterValues(filterValues.filter((v) => v !== value));
                      setTimeout(() => {
                        setCommandInput("");
                      }, 200);
                      setOpen(false);
                    }}
                  >
                    <Checkbox checked={true} />
                    <FilterIcon type={value as FilterType} />
                    {value}
                  </CommandItem>
                ))}
              </CommandGroup>
              {nonSelectedFilterValues?.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {nonSelectedFilterValues.map((filter: FilterOption) => (
                      <CommandItem
                        className="group flex gap-2 items-center"
                        key={filter.name}
                        value={filter.name}
                        onSelect={(currentValue: string) => {
                          setFilterValues([...filterValues, currentValue]);
                          setTimeout(() => {
                            setCommandInput("");
                          }, 200);
                          setOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          className="opacity-0 group-data-[selected=true]:opacity-100"
                        />
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
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

export const FilterValueDateCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  return (
    <Popover
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger
        className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition
  text-muted-foreground hover:text-primary shrink-0"
      >
        {filterValues?.[0]}
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={filterType}
              className="h-9"
              value={commandInput}
              onInputCapture={(e) => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filterViewToFilterOptions[filterType].map(
                  (filter: FilterOption) => (
                    <CommandItem
                      className="group flex gap-2 items-center"
                      key={filter.name}
                      value={filter.name}
                      onSelect={(currentValue: string) => {
                        setFilterValues([currentValue]);
                        setTimeout(() => {
                          setCommandInput("");
                        }, 200);
                        setOpen(false);
                      }}
                    >
                      <span className="text-accent-foreground">
                        {filter.name}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto",
                          filterValues.includes(filter.name)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

export const filterOperators = ({
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
