'use client';

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/context/auth-context";
import { useSupabase } from './supabase-context';

const ThemeSyncContext = createContext({
  synced: false
});

export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const [synced, setSynced] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const lastSyncedUserId = useRef<string | null>(null);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    // Only sync when:
    // 1. User is loaded for the first time
    // 2. User changes (different user logs in)
    // 3. We haven't synced yet
    if (!user?.id || !supabase || (synced && lastSyncedUserId.current === user.id && initialSyncDone.current)) {
      return;
    }

    const syncUserTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Failed to fetch user theme:', error);
          setSynced(true);
          lastSyncedUserId.current = user.id;
          initialSyncDone.current = true;
          return;
        }
        
        // Only apply theme if:
        // 1. We have theme data from database
        // 2. It's different from current theme
        // 3. This is the first sync for this user (avoid overriding user's active changes)
        if (data?.theme && data.theme !== theme && lastSyncedUserId.current !== user.id) {
          console.log(`Syncing theme from ${theme} to ${data.theme} for user ${user.id}`);
          setTheme(data.theme);
        }
        
        setSynced(true);
        lastSyncedUserId.current = user.id;
        initialSyncDone.current = true;
      } catch (error) {
        console.warn('Error syncing theme:', error);
        setSynced(true);
        lastSyncedUserId.current = user.id;
        initialSyncDone.current = true;
      }
    };

    syncUserTheme();
  }, [user?.id, theme, setTheme, synced, supabase]);

  // Reset sync state when user changes
  useEffect(() => {
    if (!user?.id) {
      setSynced(false);
      lastSyncedUserId.current = null;
      initialSyncDone.current = false;
    }
  }, [user?.id]);

  return (
    <ThemeSyncContext.Provider value={{ synced }}>
      {children}
    </ThemeSyncContext.Provider>
  );
}

export const useThemeSync = () => useContext(ThemeSyncContext); 