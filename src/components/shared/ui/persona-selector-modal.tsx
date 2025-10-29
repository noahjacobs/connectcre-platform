'use client';

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PERSONA_OPTIONS } from "@/lib/utils/personas";
import { useSession } from '@clerk/nextjs';

interface PersonaSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PersonaSelectorModal({ open, onOpenChange }: PersonaSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { user, refreshSession } = useAuth();
    const { session } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    // Get Supabase client from context
    const { supabase } = useSupabase();

    const filteredPersonas = PERSONA_OPTIONS.filter(persona =>
        persona.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePersonaSelect = async (persona: string) => {
        if (!supabase) {
            toast.error('Authentication required');
            return;
        }

        try {
            setIsLoading(true);
            
            // Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    persona,
                    welcome_existing: true  // Mark that user has completed the welcome flow
                })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            await refreshSession();
            toast.success('Profile updated successfully');
            onOpenChange(false);
        } catch (error) {
            toast.error('Error updating profile');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] min-h-[80vh] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center mb-4">
                        What best describes your role?
                    </DialogTitle>
                </DialogHeader>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                        placeholder="Search roles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Grid of Persona Options */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2">
                    {filteredPersonas.map((persona, index, array) => {
                        const Icon = persona.icon;
                        const isOther = persona.value === 'Other';
                        const isLastItem = index === array.length - 1;
                        const remainingItems = array.length % 3;
                        // If it's "Other" and there are 1 or 2 items in the last row, span the remaining columns
                        const shouldSpan = isOther && isLastItem && remainingItems !== 0;
                        const spanClass = remainingItems === 1 ? "col-span-3" : remainingItems === 2 ? "col-span-2" : "";
                        
                        return (
                            <button
                                key={persona.value}
                                onClick={() => handlePersonaSelect(persona.value)}
                                disabled={isLoading}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-lg",
                                    "bg-zinc-50 dark:bg-zinc-800/50",
                                    "border border-zinc-200 dark:border-zinc-800",
                                    "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                    "transition-colors",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "h-[120px]",
                                    shouldSpan && spanClass
                                )}
                            >
                                <Icon className="w-6 h-6 mb-2 text-zinc-600 dark:text-zinc-400" />
                                <span className="text-sm text-center font-medium leading-tight min-h-10 flex items-center">
                                    {persona.value}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
} 