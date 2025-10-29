'use server';

// TODO: Replace with simplified bookmarks system
// import { db } from '@/lib/db/client';
// import { projectTracking } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSupabaseServerClient, getServerAuthUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ProjectTrackingData {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  lastNotificationSent: string | null;
  metadata: any;
}

export async function getProjectTrackingStatus(projectId: string) {
  // TODO: Replace with bookmarks system
  return { data: null, error: null };
}

export async function trackProject(projectId: string, options: {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
} = {}) {
  try {
    const supabase = await createSupabaseServerClient();
    const { user, error } = await getServerAuthUser();
    
    if (!user || error) {
      return { data: null, error: error || 'User not authenticated'};
    }

    const existingTracking = await db
      .select()
      .from(projectTracking)
      .where(
        and(
          eq(projectTracking.projectId, projectId),
          eq(projectTracking.userId, user.id)
        )
      )
      .limit(1);

    if (existingTracking.length > 0) {
      return { data: existingTracking[0], error: null };
    }

    const result = await db
      .insert(projectTracking)
      .values({
        projectId,
        userId: user.id,
        notificationsEnabled: true,
        emailNotifications: options.emailNotifications ?? true,
        pushNotifications: options.pushNotifications ?? false,
      })
      .returning();

    revalidatePath(`/project/${projectId}`);
    
    return { data: result[0], error: null };
  } catch (error) {
    console.error('Error tracking project:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to track project' 
    };
  }
}

export async function untrackProject(projectId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { user, error } = await getServerAuthUser();

    if (!user || error) {
      return { data: null, error: error || 'User not authenticated'};
    }

    const result = await db
      .delete(projectTracking)
      .where(
        and(
          eq(projectTracking.projectId, projectId),
          eq(projectTracking.userId, user.id)
        )
      )
      .returning();

    revalidatePath(`/project/${projectId}`);
    
    return { data: result[0] || null, error: null };
  } catch (error) {
    console.error('Error untracking project:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to untrack project' 
    };
  }
}

export async function updateProjectTrackingSettings(projectId: string, settings: {
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}) {
  try {
    const supabase = await createSupabaseServerClient();
    const { user, error } = await getServerAuthUser();

    if (!user || error) {
      return { data: null, error: error || 'User not authenticated'};
    }

    const result = await db
      .update(projectTracking)
      .set({
        ...settings,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(projectTracking.projectId, projectId),
          eq(projectTracking.userId, user.id)
        )
      )
      .returning();

    revalidatePath(`/project/${projectId}`);
    
    return { data: result[0] || null, error: null };
  } catch (error) {
    console.error('Error updating project tracking settings:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Failed to update tracking settings' 
    };
  }
} 