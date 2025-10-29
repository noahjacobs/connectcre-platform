'use client';

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Search, 
  ArrowRight, 
  X, 
  Loader2,
  Bell,
  Plus,
  Sparkles,
  Radar,
  Handshake
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { searchCompanies } from "@/components/companies";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface Company {
  _id: string;
  name: string;
  logo?: {
    asset: {
      url: string;
    };
  };
}

interface ClaimUpsellProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimExisting: (company: Company) => void;
  onAddNew: (name: string) => void;
}

export function ClaimUpsell({ 
  isOpen, 
  onClose, 
  onClaimExisting,
  onAddNew
}: ClaimUpsellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const features = [
    {
      icon: Radar,
      title: "Track Market Demand",
      description: "See how many developers are searching for services like yours each month, and put your business on our map",
      color: "text-blue-500"
    },
    {
      icon: Handshake,
      title: "Get Real Project Leads",
      description: "Get notified the moment developers need your services for their projects",
      color: "text-emerald-500"
    },
    {
      icon: Bell,
      title: "Never Miss an Opportunity",
      description: "Get alerted instantly when someone is interested in working with your company",
      color: "text-purple-500"
    }
  ];

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchCompanies(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching companies:', error);
        setSearchResults([]);
      }
      setIsSearching(false);
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => 
        searchResults.length ? Math.min(i + 1, searchResults.length) : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === 0 && searchQuery) {
        onAddNew(searchQuery);
      } else if (searchResults.length) {
        onClaimExisting(searchResults[selectedIndex - 1]);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-[600px] sm:h-[min(calc(100vh-4rem),550px)] p-0 m-0 border-none bg-transparent">
        <VisuallyHidden>
          <DialogTitle>Claim Your Company Profile</DialogTitle>
        </VisuallyHidden>
        <div className="relative flex flex-col h-full overflow-hidden rounded-3xl bg-background dark:bg-zinc-900">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-30 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-white"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Header */}
          <div className="relative bg-[#3B5BDB] p-4 pb-10 sm:p-6 sm:pb-9">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/90 mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Get Discovered</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Claim Your Company Profile
              </h2>
              <p className="mt-2 text-sm sm:text-base text-blue-100/90">
                Connect with <span className="hidden sm:inline">more </span>clients and unlock powerful insights
              </p>
            </div>
            
            {/* Background Pattern */}
            <div 
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `
                  linear-gradient(to bottom right, rgba(59, 91, 219, 0.8) 0%, rgba(59, 91, 219, 0.9) 100%),
                  linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 20px 20px, 20px 20px',
                backgroundPosition: '0 0, -1px -1px, -1px -1px'
              }}
            />
          </div>

          {/* Command Menu */}
          <div className="absolute left-4 right-4 sm:left-6 sm:right-6 top-[116px] sm:top-32 z-20">
            <div className="bg-background rounded-lg border shadow-xl">
              <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <Search className="mr-0.5 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
              </div>
              {searchQuery && (
                <div className="min-h-[120px] max-h-[300px] overflow-y-auto overflow-x-hidden">
                  <AnimatePresence mode="wait">
                    <div className="p-2">
                      {/* Create new option */}
                      <motion.button
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left",
                          "bg-blue-50 dark:bg-blue-900/20",
                          "hover:bg-blue-100 dark:hover:bg-blue-900/40",
                          "transition-colors duration-200",
                          selectedIndex === 0 && "ring-2 ring-blue-500"
                        )}
                        onClick={() => onAddNew(searchQuery)}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            Create New Company
                          </div>
                          <div className="text-sm text-blue-600/70 dark:text-blue-400/70 truncate">
                            "{searchQuery}"
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </motion.button>

                      {/* Loading State */}
                      {isSearching && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Searching...
                        </motion.div>
                      )}

                      {/* Empty State */}
                      {!isSearching && searchResults.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          <Building2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p>No existing companies found</p>
                          <p className="text-xs opacity-70">Try creating a new one</p>
                        </motion.div>
                      )}

                      {/* Results */}
                      {!isSearching && searchResults.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {searchResults.map((company, index) => (
                            <motion.button
                              key={company._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-md text-left",
                                "hover:bg-accent",
                                "transition-colors duration-200",
                                selectedIndex === index + 1 && "bg-accent"
                              )}
                              onClick={() => onClaimExisting(company)}
                            >
                              <div className="relative w-10 h-10 bg-muted rounded-md flex items-center justify-center shrink-0">
                                {company.logo?.asset?.url ? (
                                  <Image
                                    src={company.logo.asset.url}
                                    alt={company.name}
                                    width={40}
                                    height={40}
                                    className="rounded-md"
                                  />
                                ) : (
                                  <Building2 className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {company.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Click to claim
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="flex-1 overflow-y-auto p-4 pt-10 sm:p-6 sm:pt-12">
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    "bg-linear-to-br from-white/10 to-white/5",
                    "ring-1 ring-white/20 shadow-inner"
                  )}>
                    <feature.icon className={cn("h-5 w-5", feature.color)} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}

              <p className="text-center text-xs text-muted-foreground">
                Free to claim • Verified within 24 hours
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 