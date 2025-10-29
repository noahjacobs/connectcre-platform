"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { createSupabaseServerClient, getServerAuthUser } from '@/lib/supabase/server';
import { revalidatePath } from "next/cache";
import { Project } from '@/components/projects/types';
import type { Post } from '@/components/posts/types'; // Import from posts feature
import { normalizeAddress } from '@/lib/utils';
// TODO: Implement notification system
// import { triggerProjectStatusChangeNotification } from '@/components/tracking/actions/notification-triggers';

// Interface for form data that extends Project with additional fields
interface ProjectFormData extends Partial<Project> {
  propertyType?: string;
  units?: number;
  squareFootage?: number;
  proposedDate?: string;
}

// Geocoding helper function
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  
  if (!MAPBOX_ACCESS_TOKEN || !address) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );
    
    if (!response.ok) {
      console.error('Geocoding API request failed');
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      return { latitude, longitude };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export async function createSupabaseProjectFromPost(
  postData: Omit<Post, 'body'>, // Removed _id requirement since Post now has id
  formData: ProjectFormData // Use extended interface
): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    console.log('[createSupabaseProjectFromPost] Starting with postData:', {
      title: postData.title,
      address: postData.address,
      id: postData.id
    });

    // Prepare the project data
    const projectData: any = {
      title: formData.title || postData.title,
      slug: formData.slug || postData.slug,
      description: formData.description || postData.subtitle,
      address: formData.address || postData.address,
      normalized_address: normalizeAddress(formData.address || postData.address),
      city_slug: postData.city_name ? postData.city_name.toLowerCase().replace(/\s+/g, '-') : null,
      neighborhood_slug: postData.neighborhood_name ? postData.neighborhood_name.toLowerCase().replace(/\s+/g, '-') : null,
      status: formData.status || 'proposed',
      uses: formData.uses,
      property_type: formData.propertyType, // Now using ProjectFormData interface
      units: formData.units, // Now using ProjectFormData interface
      square_footage: formData.squareFootage, // Now using ProjectFormData interface
      proposed_date: formData.proposedDate, // Now using ProjectFormData interface
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try to geocode the address
    if (projectData.address) {
      const coords = await geocodeAddress(projectData.address);
      if (coords) {
        projectData.latitude = coords.latitude;
        projectData.longitude = coords.longitude;
      }
    }

    // Create the project
    const { data: project, error } = await supabaseServer
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('[createSupabaseProjectFromPost] Error creating project:', error);
      return { success: false, error: error.message };
    }

    console.log('[createSupabaseProjectFromPost] Successfully created project:', project.id);

    // Link the article to the project
    if (postData.id) {
      const { error: linkError } = await supabaseServer
        .from('articles')
        .update({ project_id: project.id })
        .eq('id', postData.id);

      if (linkError) {
        console.warn('[createSupabaseProjectFromPost] Error linking article to project:', linkError);
        // Don't fail the whole operation for this
      }
    }

    revalidatePath('/');
    
    return { success: true, project: project as Project };
  } catch (error) {
    console.error('[createSupabaseProjectFromPost] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateSupabaseProject(
  projectId: string, // Supabase project UUID
  updateData: Partial<Project> // Allow partial updates
): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    console.log('[updateSupabaseProject] Updating project:', projectId, updateData);

    // Prepare update data
    const cleanUpdateData: any = { ...updateData };
    
    // Normalize address if provided
    if (cleanUpdateData.address) {
      cleanUpdateData.normalized_address = normalizeAddress(cleanUpdateData.address);
    }

    // Always update the updated_at timestamp
    cleanUpdateData.updated_at = new Date().toISOString();

    // Try to geocode address if it's being updated
    if (cleanUpdateData.address && cleanUpdateData.address !== '') {
      const coords = await geocodeAddress(cleanUpdateData.address);
      if (coords) {
        cleanUpdateData.latitude = coords.latitude;
        cleanUpdateData.longitude = coords.longitude;
      }
    }

    const { data: updatedProject, error } = await supabaseServer
      .from('projects')
      .update(cleanUpdateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('[updateSupabaseProject] Error updating project:', error);
      return { success: false, error: error.message };
    }

    console.log('[updateSupabaseProject] Successfully updated project:', updatedProject.id);

    revalidatePath('/');
    
    return { success: true, project: updatedProject as Project };
  } catch (error) {
    console.error('[updateSupabaseProject] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateSupabaseProjectStatus(
  projectSlug: string, // Identify project by slug
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use SSR client that respects user authentication
    const supabase = await createSupabaseServerClient();
    
    // Get current user for tracking who made the change
    const { user, error: userError } = await getServerAuthUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    // First, get the current project to check the old status
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('slug', projectSlug)
      .single();

    if (fetchError) {
      console.error('[updateSupabaseProjectStatus] Error fetching current project:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const oldStatus = currentProject.status;

    // Update the project status
    const { error } = await supabase
      .from('projects')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('slug', projectSlug);

    if (error) {
      console.error('[updateSupabaseProjectStatus] Error updating project status:', error);
      return { success: false, error: error.message };
    }

    // Trigger notification if status actually changed
    // TODO: Implement notification system
    // if (oldStatus && oldStatus !== newStatus) {
    //   await triggerProjectStatusChangeNotification(
    //     currentProject.id,
    //     oldStatus,
    //     newStatus,
    //     user.id
    //   );
    // }

    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('[updateSupabaseProjectStatus] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 