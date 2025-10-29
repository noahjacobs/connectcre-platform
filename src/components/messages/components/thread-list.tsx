import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare } from "lucide-react";
import { ThreadListItem } from "./thread-list-item";
import { MessageThread } from '../types';

interface User {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface ThreadListProps {
  threads: MessageThread[];
  activeThreadId: string | null;
  isLoading: boolean;
  user: User | null;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  className?: string;
}

export function ThreadList({
  threads,
  activeThreadId,
  isLoading,
  user,
  onSelectThread,
  onDeleteThread,
  className,
}: ThreadListProps) {
  return (
          <div className={cn("flex flex-col h-full bg-background/50 border-r", className)}>
              <div className="p-4 border-b max-h-[53px] flex items-center">
        <h2 className="text-lg font-semibold">Conversations</h2>
        {/* Add search/filter input here later if needed */}
      </div>
      
      {/* Dedicated scroll area with fixed height on mobile */}
      <ScrollArea className={cn(
        "flex-1",
        "h-[calc(100dvh-var(--header-height,49px)-var(--tab-height,45px)-57px)]", // 57px is header height (4+16+4 + borders)
        "md:h-auto" // Use auto height on desktop
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-10 text-center">
             <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
             <h3 className="font-medium mb-1">No Conversations</h3>
             <p className="text-sm text-muted-foreground">
               Start messaging companies from the Directory.
             </p>
             <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = '/directory'}>
               Browse Directory
             </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                user={user}
                onSelect={() => onSelectThread(thread.id)}
                onDelete={() => onDeleteThread(thread.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 