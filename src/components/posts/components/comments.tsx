'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare, Trash2, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { AuthModal } from '@/components/ui/auth-modal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { createComment, deleteComment } from '@/components/posts/actions/post-mutations';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
    } | null;
    // New Clerk-style fields for compatibility
    avatar_url?: string;
    full_name?: string;
  } | null;
}

interface CommentsProps {
  postId: string;
  initialComments?: Comment[];
  onCommentCountChange?: (count: number) => void;
}

export default function Comments({ postId, initialComments = [], onCommentCountChange }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    // Count all comments (top-level + replies)
    onCommentCountChange?.(comments.length);
  }, [comments.length, onCommentCountChange]);

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!user) return;
    
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await createComment(postId, content.trim(), parentId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create comment');
      }

      const commentWithUser = {
        ...result.comment,
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            avatar_url: user.avatar_url,
            full_name: user.full_name
          }
        }
      };

      setComments([commentWithUser, ...comments]);
      parentId ? setReplyContent('') : setNewComment('');
      setReplyingTo(null);
      toast.success(parentId ? 'Reply added!' : 'Comment added successfully!');
    } catch (error) {
      console.error('Comment submission error:', error);
      toast.error('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const result = await deleteComment(commentId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete comment');
      }
      
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
      toast.success('Comment and replies deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "group relative flex gap-4",
        isReply && "ml-12 pt-0"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={comment.user?.avatar_url || comment.user?.user_metadata?.avatar_url || ''} />
        <AvatarFallback>
          {(comment.user?.full_name || comment.user?.user_metadata?.full_name)?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {comment.user?.full_name || comment.user?.user_metadata?.full_name || 'Anonymous'}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/90">{comment.content}</p>
        
        {user && !isReply && (
          <div className="flex items-center gap-4 pt-1 pb-2">
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>
        )}

        {replyingTo === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => handleSubmit(e, comment.id)}
                disabled={isSubmitting || !replyContent.trim()}
              >
                {isSubmitting ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
                Reply
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {user?.id && comment.user?.id && user.id === comment.user.id && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDelete(comment.id)}
          className="h-8 w-8 shrink-0
            flex items-center justify-center rounded-full
            bg-white dark:bg-zinc-800 shadow-md
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </motion.button>
      )}
    </motion.div>
  );

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comments
      </h2>

      {/* <div className="bg-muted p-4 rounded-lg mb-6">
        <p className="text-sm text-muted-foreground">
          We are currently migrating comments from our previous system. Some comments may temporarily be unavailable during this process.
        </p>
      </div> */}

      {user ? (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="mb-2 text-base"
            rows={3}
          />
          <Button 
            type="submit" 
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting && <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />}
            Post Comment
          </Button>
        </form>
      ) : (
        <div className="bg-muted p-4 rounded-lg mb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to leave a comment
          </p>
          <AuthModal 
            trigger={
              <Button variant="default" className="w-full sm:w-auto">
                Sign in to comment
              </Button>
            }
          />
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-6">
          {comments.map((comment) => 
            !comment.parent_id && (
              <div key={comment.id}>
                {renderComment(comment)}
                <div className="space-y-4 mt-4">
                  {comments
                    .filter(reply => reply.parent_id === comment.id)
                    .map(reply => renderComment(reply, true))
                  }
                </div>
              </div>
            )
          )}
        </div>
      </AnimatePresence>
    </div>
  );
} 