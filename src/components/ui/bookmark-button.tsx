"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from "@/lib/providers/auth-context";
import { toast } from "sonner";
import { AuthModal } from "./auth-modal";

interface BookmarkButtonProps {
  companyId?: string;
  projectId?: string;
  articleId?: string;
  onBookmarkUpdate?: () => void;
}

const animations = {
  icon: {
    initial: { scale: 1, rotate: 0 },
    tapActive: { scale: 0.85, rotate: -10 },
    tapCompleted: { scale: 1, rotate: 0 },
  },
  burst: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: [0, 1.4, 1], opacity: [0, 0.4, 0] },
    transition: { duration: 0.7, ease: "easeOut" },
  },
  particles: (index: number) => {
    const angle = (index / 5) * (2 * Math.PI);
    const radius = 18 + Math.random() * 8;
    const scale = 0.8 + Math.random() * 0.4;
    const duration = 0.6 + Math.random() * 0.1;

    return {
      initial: { scale: 0, opacity: 0.3, x: 0, y: 0 },
      animate: {
        scale: [0, scale, 0],
        opacity: [0.3, 0.8, 0],
        x: [0, Math.cos(angle) * radius],
        y: [0, Math.sin(angle) * radius * 0.75],
      },
      transition: { duration, delay: index * 0.04, ease: "easeOut" },
    };
  },
};

export function BookmarkButton({ companyId, projectId, articleId, onBookmarkUpdate }: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Check if item is saved on mount
  React.useEffect(() => {
    async function checkIfSaved() {
      if (!user || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        let { data: savedItem } = { data: null };

        if (companyId) {
          ({ data: savedItem } = await supabase
            .from('saved_items_view')
            .select()
            .eq('user_id', user.id)
            .eq('item_id', companyId)
            .eq('item_type', 'company')
            .single());
        } else if (projectId) {
          ({ data: savedItem } = await supabase
            .from('saved_items_view')
            .select()
            .eq('user_id', user.id)
            .eq('item_id', projectId)
            .eq('item_type', 'project')
            .single());
        } else if (articleId) {
          ({ data: savedItem } = await supabase
            .from('saved_items_view')
            .select()
            .eq('user_id', user.id)
            .eq('item_id', articleId)
            .eq('item_type', 'post')
            .single());
        }

        setIsSaved(!!savedItem);
      } catch (error) {
        console.error('Error checking saved status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkIfSaved();
  }, [user, companyId, projectId, articleId, supabase]);

  const handleClick = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!supabase) {
      toast.error("Authentication required");
      return;
    }

    try {
      let table: string;
      let idField: string;
      let idValue: string;
      let itemType: string;

      if (companyId) {
        table = 'saved_companies';
        idField = 'company_id';
        idValue = companyId;
        itemType = 'company';
      } else if (projectId) {
        table = 'saved_projects';
        idField = 'project_id';
        idValue = projectId;
        itemType = 'project';
      } else if (articleId) {
        table = 'saved_articles';
        idField = 'article_id';
        idValue = articleId;
        itemType = 'post';
      } else {
        throw new Error('No valid ID provided');
      }

      if (isSaved) {
        // Delete the saved item
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id)
          .eq(idField, idValue);

        if (error) throw error;
        setIsSaved(false);
        toast.success("The item has been removed from your saved items.");
        
        // Immediately trigger the callback to update parent components
        if (onBookmarkUpdate) {
          onBookmarkUpdate();
        }
      } else {
        // Save the item
        const { error } = await supabase
          .from(table)
          .insert({
            user_id: user.id,
            [idField]: idValue,
          });

        if (error) throw error;
        setIsSaved(true);
        toast.success("The item has been added to your saved items.");
        
        // Immediately trigger the callback to update parent components
        if (onBookmarkUpdate) {
          onBookmarkUpdate();
        }
      }
    } catch (error) {
      console.error('Error toggling saved status:', error);
      toast.error("There was an error updating your saved items.");
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bookmark className="opacity-40" size={16} />
      </Button>
    );
  }

  return (
    <>
      <div className="relative flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          aria-pressed={isSaved}
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isSaved ? 1.1 : 1 }}
          whileTap={
            isSaved ? animations.icon.tapCompleted : animations.icon.tapActive
          }
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="relative flex items-center justify-center"
        >
          <Bookmark className="opacity-60" size={16} aria-hidden="true" />

          <Bookmark
            className="absolute inset-0 text-blue-500 fill-blue-500 transition-all duration-300"
            size={16}
            aria-hidden="true"
            style={{ opacity: isSaved ? 1 : 0 }}
          />

          <AnimatePresence>
            {isSaved && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 80%)",
                }}
                {...animations.burst}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </Button>

      <AnimatePresence>
        {isSaved && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-blue-500"
                style={{
                  width: `${4 + Math.random() * 2}px`,
                  height: `${4 + Math.random() * 2}px`,
                  filter: "blur(1px)",
                  transform: "translate(-50%, -50%)",
                }}
                initial={animations.particles(i).initial}
                animate={animations.particles(i).animate}
                transition={animations.particles(i).transition}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <AuthModal 
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div />}
        returnTo={`/`}
      />
    </>
  );
}
