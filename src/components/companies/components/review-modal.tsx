'use client';

import { useState, useEffect, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/providers/auth-context";
import { AuthModal } from "@/components/ui/auth-modal";
import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateCompanyCache } from '@/components/companies';
import { useSupabase } from '@/lib/providers/supabase-context';

interface ReviewModalProps {
  companyId: string;
  companyName: string;
  companySlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, content: string) => void;
  existingReview?: {
    id?: string;
    rating: number;
    content: string;
  } | null;
}

export const ReviewModal = memo(({ 
  companyId, 
  companyName,
  companySlug,
  isOpen, 
  onClose, 
  onSubmit,
  existingReview = null
}: ReviewModalProps) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>(existingReview?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const { supabase } = useSupabase();

  // Update form when existingReview changes
  useEffect(() => {
    if (existingReview?.rating) {
      setRating(existingReview.rating);
    }
    
    if (existingReview?.content !== undefined) {
      setReview(existingReview.content || '');
    }
  }, [existingReview]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && existingReview) {
      setRating(existingReview.rating || 0);
      setReview(existingReview.content || '');
    }
  }, [isOpen, existingReview]);

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (rating === 0) {
      toast.error("Rating required", {
        description: "Please select a rating before submitting."
      });
      return;
    }

    if (!supabase) {
      toast.error("Service unavailable", {
        description: "Please try again in a moment."
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (existingReview && existingReview.id) {
        // Update existing review
        const { error } = await supabase
          .from('company_reviews')
          .update({
            rating,
            content: review || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id)
          .eq('user_id', user.id); // user.id is the UUID from profiles table

        if (error) throw error;
      } else {
        // Check if company exists in Supabase
        const { data: existingCompany, error: lookupError } = await supabase
          .from('companies')
          .select('id')
          .eq('id', companyId)
          .maybeSingle();

        if (lookupError) {
          console.error('Error looking up company:', lookupError);
          throw new Error('Failed to find company');
        }

        if (!existingCompany?.id) {
          throw new Error('Company not found');
        }

        // Check for existing review by this user
        const { data: existingUserReview, error: userReviewError } = await supabase
          .from('company_reviews')
          .select('id')
          .eq('company_id', existingCompany.id)
          .eq('user_id', user.id) // user.id is the UUID from profiles table
          .maybeSingle();

        if (userReviewError && userReviewError.code !== 'PGRST116') {
          console.error('Error checking existing review:', userReviewError);
          throw new Error('Failed to check existing reviews');
        }

        if (existingUserReview) {
          toast.error("Already reviewed", {
            description: "You have already reviewed this company."
          });
          return;
        }

        // Create the review
        const { error } = await supabase
          .from('company_reviews')
          .insert({
            company_id: existingCompany.id,
            user_id: user.id, // Use auth context user ID
            rating,
            content: review || null,
          });

        if (error) throw error;
      }

      // Invalidate company cache
      await invalidateCompanyCache(companyId);

      toast.success(existingReview ? "Review updated" : "Review submitted", {
        description: "Thank you for your feedback!"
      });

      // First close the modal to prevent re-render issues
      onClose();
      
      // Then notify parent about the update
      onSubmit(rating, review);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to submit review. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>
              {existingReview ? `Edit Review for ${companyName}` : `Review ${companyName}`}
            </DialogTitle>
            <DialogDescription>
              Share your experience working with {companyName}. Your review will help others make informed decisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="p-1 hover:scale-110 transition-transform"
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(value)}
                  >
                    <Star
                      className={cn(
                        "w-8 h-8",
                        value <= (hoverRating || rating)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300 dark:text-gray-600"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Your Review
              </label>
              <Textarea
                placeholder="Share your experience working with this company..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="h-32 text-base"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? "Submitting..." 
                  : existingReview 
                    ? "Update Review"
                    : "Submit Review"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal 
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={window.location.pathname}
      />
    </>
  );
}); 