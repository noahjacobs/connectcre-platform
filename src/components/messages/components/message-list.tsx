import * as React from 'react';
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { cn } from "@/lib/utils";
import { Building2, ArrowDown, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { MessageBubble } from "./message-bubble";
import { GroupedMessages, Message, MessageThread, Participant } from "../types";
import { groupMessagesByDate } from '../utils';

interface MessageListProps {
  thread: MessageThread | null | undefined;
  participantCache: React.MutableRefObject<Map<string, Participant>>;
  viewingIdentity: Participant | null;
  groupedMessages: GroupedMessages[];
  isLoading: boolean;
  isSending: boolean;
  onOpenDeleteMessageDialog: (messageId: string) => void;
  onRetrySend: (message: Message) => void;
  className?: string;
}

export function MessageList({
  thread,
  participantCache,
  viewingIdentity,
  groupedMessages,
  isLoading,
  isSending,
  onOpenDeleteMessageDialog,
  onRetrySend,
  className
}: MessageListProps) {
  const { scrollRef, isAtBottom, scrollToBottom, disableAutoScroll } = useAutoScroll({
    smooth: true,
    content: thread?.messages.length || 0,
  });

  return (
    <div className={cn("flex-1 relative bg-background/30 overflow-hidden", className)}>
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto p-4 md:p-6 scroll-smooth"
        onWheel={disableAutoScroll}
        onTouchMove={disableAutoScroll}
      >
        {thread?.messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-base font-medium mb-1">Start the conversation</h3>
            <p className="text-sm max-w-xs">
              Send your first message to begin communication with {thread?.other_participant?.name || 'this participant'}.
            </p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              {/* Date Separator */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted/60"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background/30 px-2 text-xs text-muted-foreground font-medium rounded-full">
                    {group.date}
                  </span>
                </div>
              </div>

              {/* Messages for the date */}
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const sender = participantCache.current.get(msg.sender_id);
                  
                  if (!sender) {
                    console.error(`Sender participant with ID ${msg.sender_id} not found in cache.`);
                    return (
                      <div key={msg.id} className="text-xs text-destructive">
                        Error: Could not load sender details for message.
                      </div>
                    );
                  }
                    
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      sender={sender}
                      viewingIdentity={viewingIdentity}
                      isSending={msg.id.startsWith('temp-') && isSending}
                      isError={msg.id.startsWith('error-')}
                      onOpenDeleteMessageDialog={onOpenDeleteMessageDialog}
                      onRetrySend={onRetrySend}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
        {/* Empty div to ensure scroll ref works correctly */}
        <div className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <Button
          onClick={() => scrollToBottom()}
          size="icon"
          variant="outline"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md h-8 w-8 z-10 bg-background hover:bg-muted"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 