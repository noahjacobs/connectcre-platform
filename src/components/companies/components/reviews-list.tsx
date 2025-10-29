'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MoreHorizontal, ThumbsUp, Flag, Clock, User, Trash, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import { useSupabase } from "@/lib/providers/supabase-context";

interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    } | null;
    // New Clerk-style fields for compatibility
    avatar_url?: string;
    full_name?: string;
  };
}

interface ReviewsListProps {
  reviews: Review[];
  onReviewDeleted?: () => void;
  onEditReview?: (review: Review) => void;
}

export function ReviewsList({ reviews, onReviewDeleted, onEditReview }: ReviewsListProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');
  const { user } = useAuth();
  const { supabase } = useSupabase();

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleDeleteReview = async (reviewId: string) => {
    try {
      if (!supabase) {
        toast.error("Service unavailable", {
          description: "Please try again in a moment."
        });
        return;
      }
      
      const { error } = await supabase
        .from('company_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user?.id); // user?.id is the UUID from profiles table

      if (error) throw error;

      toast.success("Review deleted successfully");
      onReviewDeleted?.();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error("Failed to delete review", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  // Helper function to get user display name
  const getUserDisplayName = (reviewUser: Review['user']) => {
    return reviewUser.full_name || 
           reviewUser.user_metadata?.full_name || 
           'Anonymous User';
  };

  // Helper function to get user avatar URL
  const getUserAvatarUrl = (reviewUser: Review['user']) => {
    return reviewUser.avatar_url || 
           reviewUser.user_metadata?.avatar_url;
  };

  // Helper function to get user initials
  const getUserInitials = (reviewUser: Review['user']) => {
    const displayName = getUserDisplayName(reviewUser);
    return displayName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
        <Button
          variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSortBy('recent')}
        >
          Most Recent
        </Button>
        <Button
          variant={sortBy === 'rating' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSortBy('rating')}
        >
          Highest Rated
        </Button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <div
            key={review.id}
            className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 space-y-4"
          >
            {/* Review Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  {getUserAvatarUrl(review.user) ? (
                    <AvatarImage 
                      src={getUserAvatarUrl(review.user)} 
                      alt={getUserDisplayName(review.user)} 
                    />
                  ) : (
                    <AvatarFallback>
                      {getUserInitials(review.user)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {getUserDisplayName(review.user)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {user && (user.id === review.user.id) && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditReview?.(review)}
                    className="px-2 py-1 h-6"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteReview(review.id)}
                    className="px-2 py-1 h-6 text-red-500 hover:text-red-700"
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < review.rating
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-gray-300 dark:text-gray-600"
                  )}
                />
              ))}
            </div>

            {/* Review Content */}
            <p className="text-gray-600 dark:text-gray-300">
              {review.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 