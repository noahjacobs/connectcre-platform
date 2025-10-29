"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { createSupabaseServerClient, getServerAuthUser } from '@/lib/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
// TODO: Implement notification system
// import { triggerCommentNotification } from '@/components/tracking/actions/notification-triggers';

// Create a comment
export async function createComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; comment?: any; error?: string }> {
  try {
    // Use SSR client that respects user authentication
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { user, error: userError } = await getServerAuthUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Comment content cannot be empty' };
    }

    // Create the comment
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert([{
        post_id: postId,
        content: content.trim(),
        user_id: user.id,
        parent_id: parentId || null
      }])
      .select('*')
      .single();

    if (insertError) {
      console.error('[createComment] Error creating comment:', insertError);
      return { success: false, error: insertError.message };
    }

    // Trigger notification
    // TODO: Implement notification system
    // if (comment?.id) {
    //   await triggerCommentNotification(comment.id, postId);
    // }

    // Revalidate the post page
    revalidatePath(`/*/${postId}`);

    return { success: true, comment };
  } catch (error) {
    console.error('[createComment] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Delete a comment
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use SSR client that respects user authentication
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { user, error: userError } = await getServerAuthUser();
    
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // First, verify the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('[deleteComment] Error fetching comment:', fetchError);
      return { success: false, error: 'Comment not found' };
    }

    if (comment.user_id !== user.id) {
      return { success: false, error: 'You can only delete your own comments' };
    }

    // Delete the comment and all its replies (handled by cascade)
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('[deleteComment] Error deleting comment:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Revalidate the post page
    revalidatePath(`/*/${comment.post_id}`);

    return { success: true };
  } catch (error) {
    console.error('[deleteComment] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Link an article to a project
export async function linkArticleToProject(
  articleId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[linkArticleToProject] Linking article ${articleId} to project ${projectId}`);

    // Update the article with the project ID
    const { error } = await supabaseServer
      .from('articles')
      .update({ supabase_project_id: projectId })
      .eq('id', articleId);

    if (error) {
      console.error('[linkArticleToProject] Error linking article to project:', error);
      return { success: false, error: error.message };
    }

    console.log(`[linkArticleToProject] Successfully linked article ${articleId} to project ${projectId}`);
    
    // Invalidate relevant caches
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('[linkArticleToProject] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Unlink an article from a project
export async function unlinkArticleFromProject(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[unlinkArticleFromProject] Unlinking article ${articleId} from project`);

    // Update the article to remove the project ID
    const { error } = await supabaseServer
      .from('articles')
      .update({ supabase_project_id: null })
      .eq('id', articleId);

    if (error) {
      console.error('[unlinkArticleFromProject] Error unlinking article from project:', error);
      return { success: false, error: error.message };
    }

    console.log(`[unlinkArticleFromProject] Successfully unlinked article ${articleId} from project`);
    
    // Invalidate relevant caches
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('[unlinkArticleFromProject] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Invalidate post and project cache
export async function invalidatePostAndProjectCache({
  postSlug,
  cityName,
  projectSlug
}: {
  postSlug?: string;
  cityName?: string;
  projectSlug?: string;
}) {
  try {
    console.log('[invalidatePostAndProjectCache] Invalidating caches:', { postSlug, cityName, projectSlug });

    // Invalidate general caches
    revalidateTag('posts');
    revalidateTag('articles');
    revalidateTag('projects');
    
    // Invalidate specific post cache
    if (postSlug && cityName) {
      revalidateTag(`post:${cityName}:${postSlug}`);
      revalidatePath(`/${cityName}/${postSlug}`);
    }
    
    // Invalidate specific project cache
    if (projectSlug) {
      revalidateTag(`project:${projectSlug}`);
      revalidatePath(`/project/${projectSlug}`);
    }

    // Invalidate city-specific caches
    if (cityName) {
      revalidateTag(`posts:${cityName}`);
      revalidatePath(`/${cityName}`);
    }

    // Invalidate homepage
    revalidatePath('/');

    console.log('[invalidatePostAndProjectCache] Cache invalidation completed');
  } catch (error) {
    console.error('[invalidatePostAndProjectCache] Error invalidating caches:', error);
  }
} 