'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSupabase } from './supabase-context';
import type { SupabaseClient } from '@supabase/supabase-js';

type Provider = 'google' | 'linkedin';

interface SignInOptions {
  redirectTo?: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  user_type?: string | null;
  clerk_id?: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  clerk_id: string | null;
  email: string | null;
}

interface AuthResponse {
  data: { user: AuthUser | null; session: any | null };
  error: any | null;
}

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  supabase: SupabaseClient | null;
  signIn: (provider: Provider, options?: SignInOptions) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<AuthResponse>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  supabase: null,
  signIn: async () => {},
  signInWithEmail: async () => ({ data: { user: null, session: null }, error: null }),
  signUpWithEmail: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => {},
  sendMagicLink: async () => ({ data: { user: null, session: null }, error: null }),
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isProcessingInviteRef = useRef(false);
  const profileCacheRef = useRef<Map<string, UserProfile>>(new Map());
  const router = useRouter();
  const { supabase: supabaseClient } = useSupabase();

  // Fetch user profile with caching and migration support
  const fetchUserProfile = useCallback(async (clerkUserId: string, email?: string): Promise<UserProfile | null> => {
    if (!supabaseClient) return null;
    
    // Check cache first
    const cached = profileCacheRef.current.get(clerkUserId);
    if (cached) return cached;

    try {
      // Try to find by clerk_id first
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name, avatar_url, user_type, clerk_id, email')
        .eq('clerk_id', clerkUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn(`Error fetching profile for user ${clerkUserId}:`, error.message);
        return null;
      }

      // Cache successful result
      if (data) {
        profileCacheRef.current.set(clerkUserId, data);
        return data;
      }

      // Profile not found - migration should be handled by syncUserData
      return null;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      return null;
    }
  }, [supabaseClient]);

  // Check and accept pending company invites
  const checkAndAcceptPendingInvites = useCallback(async (currentUser: AuthUser) => {
    if (!currentUser?.email || isProcessingInviteRef.current || !supabaseClient) return;

    try {
      isProcessingInviteRef.current = true;

      const { data: invites, error: fetchError } = await supabaseClient
        .from('company_invites')
        .select('id, company_id')
        .eq('invited_email', currentUser.email)
        .eq('status', 'pending');

      if (fetchError) {
        console.error('Error fetching pending invites:', fetchError);
        return;
      }

      if (invites && invites.length > 0) {
        for (const invite of invites) {
          try {
            const response = await fetch('/api/company/accept-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inviteId: invite.id }),
            });
            const result = await response.json();
            
            if (!response.ok) {
              if (response.status === 402) {
                toast.error('Could not accept invite: Seat limit reached.');
              }
            } else if (result.success && result.redirectUrl) {
              toast.success('Successfully accepted invite and joined company!');
              router.push(result.redirectUrl);
              return;
            }
          } catch (error) {
            console.error(`Error accepting invite ${invite.id}:`, error);
          }
        }
      }
    } finally {
      isProcessingInviteRef.current = false;
    }
  }, [router, supabaseClient]);

  // Convert Clerk user to AuthUser format with profile sync
  const convertClerkUserToAuthUser = useCallback(async (clerkUser: any): Promise<AuthUser | null> => {
    if (!clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const clerkUserId = clerkUser.id;

    // Call server-side migration/sync - this handles everything
    let serverUser = null;
    try {
      const response = await fetch('/api/migrate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        serverUser = result.user;
        
        // Clear cache and cache the new profile data
        profileCacheRef.current.clear();
        
        if (serverUser) {
          profileCacheRef.current.set(clerkUserId, {
            id: serverUser.id,
            full_name: serverUser.full_name,
            avatar_url: serverUser.avatar_url,
            user_type: serverUser.user_type,
            clerk_id: serverUser.clerk_id,
            email: serverUser.email,
          });
        }
      } else {
        console.error('[convertClerkUserToAuthUser] Server sync failed:', response.status);
      }
    } catch (error) {
      console.error('[convertClerkUserToAuthUser] Server sync error:', error);
    }

    // If server returned user data, use it directly
    if (serverUser) {
      return {
        id: serverUser.id,
        clerk_id: serverUser.clerk_id,
        email: serverUser.email,
        full_name: serverUser.full_name,
        avatar_url: serverUser.avatar_url,
        user_type: serverUser.user_type,
      };
    }

    // Fallback: try to fetch profile directly (shouldn't be needed)
    let profile = await fetchUserProfile(clerkUserId, email);

    // If profile still not found, wait a bit and retry once
    if (!profile) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      profile = await fetchUserProfile(clerkUserId, email);
    }

    if (!profile?.id) {
      console.error('Profile missing after server sync for Clerk ID:', clerkUserId);
      return null;
    }

    return {
      id: profile.id,
      clerk_id: clerkUserId,
      email,
      full_name: profile.full_name || clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
      avatar_url: profile.avatar_url || clerkUser.imageUrl || null,
      user_type: profile.user_type || 'user',
    };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (provider: Provider, options?: SignInOptions) => {
    try {
      const providerMap: Record<Provider, string> = {
        google: 'google',
        linkedin: 'linkedin_oidc',
      };

      const clerkProvider = providerMap[provider];
      if (!clerkProvider) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      if (typeof window !== 'undefined') {
        const redirectUrl = options?.redirectTo || window.location.origin;
        window.location.href = `/sign-in/sso-callback?provider=${clerkProvider}&redirect_url=${encodeURIComponent(redirectUrl)}`;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Sign in failed. Please try again.');
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    // TODO: Implement with Clerk's email/password auth
    return {
      data: { user: null, session: null },
      error: { message: 'Email/password sign-in not implemented with Clerk yet' }
    };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    // TODO: Implement with Clerk's email/password auth
    return {
      data: { user: null, session: null },
      error: { message: 'Email/password sign-up not implemented with Clerk yet' }
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      setUser(null);
      isProcessingInviteRef.current = false;
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      toast.error('Sign out failed. Please try again.');
    }
  }, [clerkSignOut]);

  const sendMagicLink = useCallback(async (email: string, redirectTo?: string): Promise<AuthResponse> => {
    // TODO: Implement with Clerk's magic link
    return {
      data: { user: null, session: null },
      error: { message: 'Magic link not implemented with Clerk yet' }
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      if (clerkUser) {
        profileCacheRef.current.clear();
        const authUser = await convertClerkUserToAuthUser(clerkUser);
        setUser(authUser);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      setLoading(false);
    }
  }, [clerkUser, convertClerkUserToAuthUser]);

  // Update user state when Clerk user changes
  useEffect(() => {
    const updateUser = async () => {
      
      if (!isLoaded) {
        setLoading(true);
        return;
      }

      if (isSignedIn && clerkUser && supabaseClient) {
        try {
          setLoading(true);
          const authUser = await convertClerkUserToAuthUser(clerkUser);
          
          if (!authUser) {
            console.error('Failed to convert Clerk user to AuthUser');
            setUser(null);
          } else {
            setUser(authUser);

            // Check for pending invites
            if (!isProcessingInviteRef.current) {
              checkAndAcceptPendingInvites(authUser);
            }
          }
        } catch (error) {
          console.error('Error with profile sync:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    updateUser();
  }, [isLoaded, isSignedIn, clerkUser?.id, convertClerkUserToAuthUser, checkAndAcceptPendingInvites, supabaseClient]);

  const value = useMemo(() => ({
    user,
    loading,
    supabase: supabaseClient,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendMagicLink,
    refreshSession,
  }), [
    user, 
    loading, 
    supabaseClient,
    signIn, 
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendMagicLink,
    refreshSession,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider as AuthContextProvider }; 