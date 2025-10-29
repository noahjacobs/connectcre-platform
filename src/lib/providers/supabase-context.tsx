'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuthenticatedSupabase } from '@/hooks/use-authenticated-supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isLoading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useAuthenticatedSupabase();
  
  return (
    <SupabaseContext.Provider 
      value={{ 
        supabase,
        isLoading: supabase === null 
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

export function useRequiredSupabaseFromContext() {
  const { supabase } = useSupabase();
  if (!supabase) {
    throw new Error('Authentication required. User must be logged in to perform this operation.');
  }
  return supabase;
} 