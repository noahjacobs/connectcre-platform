'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    User,
    Upload,
} from "lucide-react";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import { useSupabase } from "@/lib/providers/supabase-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PERSONA_OPTIONS, PersonaValue } from "@/lib/utils/personas";
import React from "react";
import { useTheme } from "next-themes";
import { useSubscription } from "@/lib/providers/subscription-context";
import { useSession } from '@clerk/nextjs';

type UserPersona = PersonaValue;

interface ProfileFormData {
    full_name: string;
    avatar_url: string;
    email: string;
    subscription?: string;
    persona: UserPersona;
    theme: string;
}

interface ProfileFormProps {
    onClose: () => void;
    onShowPricing: () => void;
}

interface SubscriptionStatusProps {
    onManageClick: () => void;
    isLoading: boolean;
}

function SubscriptionStatus({ onManageClick, isLoading }: SubscriptionStatusProps) {
    const { subscription, tier, hasActivePlan, hasMembershipAccess, isLoading: isSubscriptionLoading } = useSubscription();
    
    if (isSubscriptionLoading) {
        return <div className="text-sm text-zinc-500">Loading status...</div>;
    }

    if (hasMembershipAccess && !hasActivePlan) {
        return (
            <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-zinc-500">Team Membership</span>
            </div>
        );
    }
    
    if (hasActivePlan) {
        return (
            <div className="flex items-center justify-between mt-1">
                <div>
                    <span className="text-sm text-zinc-500">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                    {subscription?.current_period_end && (
                        <span className="block text-xs text-zinc-400">
                            Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                    )}
                </div>
                <button
                    onClick={onManageClick}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Loading...' : 'Manage'}
                </button>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-zinc-500">No active subscription</span>
            <button
                onClick={onManageClick}
                disabled={isLoading}
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Loading...' : 'Subscribe'}
            </button>
        </div>
    );
}

export interface ProfileFormRef {
    handleCancel: () => void;
}

export const ProfileEditForm = forwardRef<ProfileFormRef, ProfileFormProps>(function ProfileEditForm({ onClose, onShowPricing }, ref) {
    const { user, refreshSession } = useAuth();
    const { theme, setTheme } = useTheme();
    const { subscription, hasActivePlan } = useSubscription();
    const { session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [originalPersona, setOriginalPersona] = useState<UserPersona>('Other');
    const [originalTheme, setOriginalTheme] = useState<string>(theme || 'system');
    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: user?.full_name || '',
        avatar_url: user?.avatar_url || '',
        email: user?.email || '',
        subscription: user?.user_type || '',
        persona: originalPersona,
        theme: theme || 'system'
    });
    const router = useRouter();
    const [showPricingDialog, setShowPricingDialog] = useState(false);

    // Get Supabase client from context
    const { supabase } = useSupabase();

    useEffect(() => {
        async function loadProfile() {
            if (!user?.id || !supabase) return;
            
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url, persona, theme')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    const profileTheme = data.theme || 'system';
                    setOriginalPersona(data.persona || 'Other');
                    setOriginalTheme(profileTheme);
                    setTheme(profileTheme);
                    setFormData(prev => ({
                        ...prev,
                        full_name: data.full_name || prev.full_name,
                        avatar_url: data.avatar_url || prev.avatar_url,
                        persona: data.persona || prev.persona,
                        theme: profileTheme
                    }));
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                toast.error('Error loading profile data');
            }
        }

        loadProfile();
    }, [user?.id, supabase]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id || !supabase) return;

        try {
            setIsLoading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Avatar uploaded successfully');
        } catch (error) {
            toast.error('Error uploading avatar');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Revert theme to original value
        setTheme(originalTheme);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!supabase) {
            toast.error('Authentication required');
            return;
        }
        
        try {
            setIsLoading(true);

            // Check if any values have changed
            const hasChanges = 
                        formData.full_name !== (user?.full_name || '') ||
        formData.avatar_url !== (user?.avatar_url || '') ||
                formData.persona !== originalPersona ||
                formData.theme !== originalTheme;

            if (!hasChanges) {
                handleCancel();
                return;
            }
            
            // Note: With Clerk auth, we only update the profiles table
            // User metadata is managed by Clerk, not Supabase auth

            // Update profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    avatar_url: formData.avatar_url,
                    persona: formData.persona,
                    theme: formData.theme
                })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            // Successfully saved, update original values to prevent reversion
            setOriginalTheme(formData.theme);
            setOriginalPersona(formData.persona);
            
            // Refresh the auth session to update the context with new user data
            await refreshSession();
            
            toast.success('Profile updated successfully');
            onClose();
        } catch (error) {
            // If save fails, revert theme to original
            setTheme(originalTheme);
            setFormData(prev => ({ ...prev, theme: originalTheme }));
            toast.error('Error updating profile');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        if (!hasActivePlan) {
            onShowPricing();
            return;
        }

        if (!user?.id) {
            toast.error('User not found');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                toast.error('Could not create customer portal session.');
            }
        } catch (error) {
            console.error('Error creating customer portal session:', error);
            toast.error('Failed to open customer portal.');
        } finally {
            setIsLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleCancel
    }));

    return (
        <>
            <div className={cn(
                "w-full max-w-md mx-auto",
                "bg-white dark:bg-background",
                "rounded-2xl overflow-hidden space-y-1",
            )}>
                {/* Header with Avatar */}
                <div className="px-2 pt-3 pb-3">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-full overflow-hidden">
                                <Avatar className="w-full h-full">
                                    <AvatarImage 
                                        src={formData.avatar_url} 
                                        alt={user?.full_name || user?.email || undefined} 
                                    />
                                    <AvatarFallback>
                                        {(user?.full_name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                                <Upload className="w-5 h-5 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                            </label>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                                Edit Profile
                            </h3>
                            <p className="text-sm text-zinc-500">
                                {user?.email || user?.full_name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="px-2 space-y-4">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Name
                        </label>
                        <div className="relative mt-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                value={formData.full_name}
                                placeholder={user?.email?.split('@')[0] || 'Your name'}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full h-10 pl-10 pr-4 rounded-lg
                                    bg-zinc-50 dark:bg-zinc-800/50
                                    text-zinc-900 dark:text-zinc-100
                                    border border-zinc-200 dark:border-zinc-800
                                    focus:outline-hidden focus:ring-2 focus:ring-blue-500/20
                                    transition-all"
                            />
                        </div>
                    </div>

                    {/* Persona Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Professional Role
                        </label>
                        <Select
                            value={formData.persona}
                            onValueChange={(value: UserPersona) => 
                                setFormData(prev => ({ ...prev, persona: value }))
                            }
                        >
                            <SelectTrigger className="w-full h-10 mt-1 pl-3 pr-4 rounded-lg
                                bg-zinc-50 dark:bg-zinc-800/50
                                text-zinc-900 dark:text-zinc-100
                                border border-zinc-200 dark:border-zinc-800
                                focus:outline-hidden focus:ring-2 focus:ring-blue-500/20
                                transition-all">
                                <SelectValue className="pl-6" placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                                {PERSONA_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <SelectItem 
                                            key={option.value} 
                                            value={option.value}
                                            className="hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="w-4 h-4 text-zinc-400" />
                                                {option.value}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subscription */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Subscription
                        </label>
                        <SubscriptionStatus 
                            onManageClick={handleManageSubscription}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Theme Toggle */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Theme
                        </label>
                        <ThemeToggle 
                            value={formData.theme} 
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, theme: value }));
                                setTheme(value);
                            }}
                        />
                    </div>

                    {/* Location & Website */}
                    {/* <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full h-10 pl-10 pr-4 rounded-lg
                                        bg-zinc-50 dark:bg-zinc-800/50
                                        text-zinc-900 dark:text-zinc-100
                                        border border-zinc-200 dark:border-zinc-800
                                        focus:outline-hidden focus:ring-2 focus:ring-blue-500/20
                                        transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Website
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                    className="w-full h-10 pl-10 pr-4 rounded-lg
                                        bg-zinc-50 dark:bg-zinc-800/50
                                        text-zinc-900 dark:text-zinc-100
                                        border border-zinc-200 dark:border-zinc-800
                                        focus:outline-hidden focus:ring-2 focus:ring-blue-500/20
                                        transition-all"
                                />
                            </div>
                        </div>
                    </div> */}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 h-10 rounded-lg
                                bg-zinc-100 dark:bg-zinc-800
                                text-zinc-600 dark:text-zinc-400
                                hover:bg-zinc-200 dark:hover:bg-zinc-700
                                transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-10 rounded-lg
                                bg-blue-600 hover:bg-blue-700
                                text-white
                                transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}); 