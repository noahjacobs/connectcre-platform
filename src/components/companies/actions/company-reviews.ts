"use server";

import { supabaseServer } from '@/lib/supabase/server';

// Types for company reviews
interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
    };
  };
}

export async function fetchReviews(companyId: string): Promise<Review[]> {
  if (!companyId) return [];

  try {
    // Fetch reviews with user profile data using a join
    const { data: reviews, error: reviewsError } = await supabaseServer
      .from('company_reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        user_id,
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url,
          clerk_id
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error(`Error fetching reviews for company ${companyId}:`, reviewsError);
      return [];
    }

    if (!reviews || reviews.length === 0) {
      return [];
    }

    // Transform the data to match the expected format
    const reviewsWithUsers: Review[] = reviews
      .map(review => {
        // Handle both array and single object format for profiles
        const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
        
        if (!profile) {
          console.warn(`No profile found for review ${review.id}`);
          return null;
        }

        return {
          id: review.id,
          rating: review.rating,
          content: review.content,
          created_at: review.created_at,
          user: {
            id: review.user_id,
            email: profile.email || 'Unknown',
            user_metadata: {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url
            }
          }
        };
      })
      .filter(Boolean) as Review[];

    return reviewsWithUsers;

  } catch (error) {
    console.error(`Error fetching reviews for company ${companyId}:`, error);
    return [];
  }
}

export async function fetchCompanyApprovals() {
  try {
    // Fetch company approvals with user profile data using a join
    const { data, error } = await supabaseServer
      .from('company_approvals')
      .select(`
        id,
        company_id,
        user_id,
        status,
        submitted_at,
        reviewed_at,
        feedback,
        verification_document_url,
        metadata,
        companies!inner (
          id,
          name,
          logo_url,
          uploaded_logo_url,
          is_verified
        ),
        profiles!inner(
          id,
          email,
          full_name,
          avatar_url,
          clerk_id
        )
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching company approvals:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data to match the expected format
    const approvalsWithUsers = data.map(approval => {
      // Handle both array and single object format
      const companyData = Array.isArray(approval.companies) ? approval.companies[0] : approval.companies;
      const profile = Array.isArray(approval.profiles) ? approval.profiles[0] : approval.profiles;
      
      return {
        id: approval.id,
        company_id: approval.company_id,
        user_id: approval.user_id,
        status: approval.status,
        submitted_at: approval.submitted_at,
        reviewed_at: approval.reviewed_at,
        feedback: approval.feedback,
        verification_document_url: approval.verification_document_url,
        metadata: approval.metadata,
        companyData: companyData || {
          id: approval.company_id,
          name: 'Unknown Company',
          logo_url: null,
          uploaded_logo_url: null,
          is_verified: false
        },
        profiles: profile ? {
          id: profile.id,
          email: profile.email || 'Unknown',
          user_metadata: {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          }
        } : {
          id: approval.user_id,
          email: 'Unknown',
          user_metadata: {
            full_name: undefined,
            avatar_url: undefined
          }
        }
      };
    });

    return approvalsWithUsers;

  } catch (error) {
    console.error('Error fetching company approvals:', error);
    return [];
  }
} 