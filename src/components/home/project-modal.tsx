import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PostLayout } from '@/components/posts';
import type { Post } from "@/components/posts/types";
import type { Project } from '@/lib/types';
import type { ProjectUpdate } from '@/components/projects/types';

interface ProjectModalData {
  post: Post;
  project: Project | null;
  relatedPosts: Post[];
  comments: any[];
  projectCompanies: any[];
  projectUpdates: ProjectUpdate[];
}

interface ProjectModalProps {
  showModal: boolean;
  isLoading: boolean;
  error: string | null;
  modalData: ProjectModalData | null;
  hasAccess: boolean;
  isAccessLoading: boolean;
  onClose: () => void;
}

export function ProjectModal({
  showModal,
  isLoading,
  error,
  modalData,
  hasAccess,
  isAccessLoading,
  onClose
}: ProjectModalProps) {
  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 m-0" // Higher z-index if needed
          onClick={onClose} // Close on backdrop click
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-background w-full h-full overflow-y-auto shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
          >
            {/* Close Button */} 
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 z-50 p-2 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-colors"
              aria-label="Close project details"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content Area - Add class for scrolling */} 
            <div className="flex-1 overflow-y-auto modal-scroll-container">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              {!isLoading && error && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    {error}
                  </p>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </div>
              )}
              {!isLoading && !error && modalData?.post && (
                 <PostLayout
                  initialHasAccess={hasAccess}
                  isInitialAccessLoading={isAccessLoading}
                  post={modalData.post}
                  project={modalData.project}
                  relatedPosts={modalData.relatedPosts}
                  comments={modalData.comments}
                  projectCompanies={modalData.projectCompanies}
                  projectUpdates={modalData.projectUpdates}
                  citySlug={modalData.post.city_name || ''}
                  neighborhoodSlug={modalData.post.neighborhood_name}
                  onCloseModal={onClose}
                  isModalView={true}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 