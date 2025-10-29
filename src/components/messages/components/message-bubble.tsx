import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, MoreHorizontal, Trash2, XCircle } from "lucide-react";
import { Message, Participant } from "../types"; // Removed unused User, UserCompany
import { formatMessageTime, getInitials } from "../utils";
// Assuming message-loading is now in ui directory
// import { MessageLoading } from '@/components/ui/message-loading';

interface MessageBubbleProps {
  message: Message;
  // Removed isUser, currentUser, sendingCompany, otherPartyCompany, otherPartyUser
  sender: Participant | null; // The resolved sender of THIS message
  viewingIdentity: Participant | null; // The participant the current user is viewing AS
  isSending: boolean; // To show loading/pending state
  isError: boolean; // To show error state
  onOpenDeleteMessageDialog: (messageId: string) => void; // Use new prop name
  onRetrySend: (message: Message) => void; // Handler to retry sending failed message
}

// Removed useSenderInfo hook

// Memoize the SenderAvatar component at the module level
const SenderAvatar = React.memo(function SenderAvatar({ 
  avatarUrl, 
  name, 
  initials 
}: { 
  avatarUrl: string | null;
  name: string; 
  initials: string; 
}) {
  return (
    <Avatar className="h-6 w-6 shrink-0">
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          // Use contain to avoid cropping logos
          className="object-contain"
        />
      ) : (
        <AvatarFallback className="text-xs">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
});
SenderAvatar.displayName = 'SenderAvatar';

// Memoize the MessageActions component at the module level
const MessageActions = React.memo(function MessageActions({
  // Renamed isUser to isOwnMessage
  isOwnMessage,
  hasFailed,
  message,
  onRetrySend,
  onOpenDeleteMessageDialog
}: {
  isOwnMessage: boolean;
  hasFailed: boolean;
  message: Message;
  onRetrySend: (message: Message) => void;
  onOpenDeleteMessageDialog: (messageId: string) => void;
}) {
  return (
    <div className="shrink-0 self-center h-6 w-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
              hasFailed && "opacity-100! text-destructive hover:text-destructive hover:bg-destructive/10"
            )}
          >
            {hasFailed ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">Message options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
          {hasFailed && (
            <DropdownMenuItem onClick={() => onRetrySend(message)} className="cursor-pointer text-blue-600 focus:text-blue-700">
              Retry Sending
            </DropdownMenuItem>
          )}
          {/* Only show delete if it's your message, not optimistic, and not failed */}
          {isOwnMessage && !message.id.startsWith('temp-') && !hasFailed && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => onOpenDeleteMessageDialog(message.id)}
            >
              <Trash2 className="h-4 w-4 mr-0.5" />
              Delete Message
            </DropdownMenuItem>
          )}
          {/* Copy Text is always available */}
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)} className="cursor-pointer">
            Copy Text
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
MessageActions.displayName = 'MessageActions';

export const MessageBubble = React.memo(function MessageBubble({
  message,
  sender,
  viewingIdentity,
  isSending,
  isError,
  // Removed unused props
  onOpenDeleteMessageDialog,
  onRetrySend
}: MessageBubbleProps) {
  const isOptimistic = message.id.startsWith('temp-');
  const hasFailed = message.id.startsWith('error-');

  // Determine if the message is from the current viewing identity
  const isOwnMessage = !!(sender && viewingIdentity && 
                         sender.id === viewingIdentity.id && 
                         sender.type === viewingIdentity.type);

  // Use sender prop directly
  const senderName = sender?.name || 'Unknown';
  const senderAvatarUrl = sender?.avatar_url || sender?.logo_url || null;
  const senderInitials = sender ? getInitials(sender.name) : '?';

  // Memoize the status icon getter
  const getStatusIcon = React.useCallback(() => {
    if (hasFailed) return null;
    if (isOptimistic || isSending) return <Clock className="h-3 w-3" />;
    if (message.read_at) return <CheckCheck className="h-3 w-3" />;
    return <Check className="h-3 w-3" />;
  }, [hasFailed, isOptimistic, isSending, message.read_at]);

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 group w-full mb-3",
        // Use isOwnMessage for alignment
        isOwnMessage ? "justify-end pl-10" : "justify-start pr-10"
      )}
    >
      {!isOwnMessage && (
        <>
          {/* Use derived sender info */}
          <SenderAvatar 
            avatarUrl={senderAvatarUrl}
            name={senderName} 
            initials={senderInitials} 
          />
          <div className={cn("flex flex-col items-start")}>
            <div className={cn("flex items-center gap-1.5")}>
              <div className={cn(
                "max-w-md rounded-xl py-2 px-3 shadow-sm relative text-sm",
                "bg-muted text-foreground rounded-bl-none"
              )}>
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <div className={cn("text-[10px] mt-1 text-muted-foreground justify-start select-none")}>
                  {formatMessageTime(message.created_at)}
                </div>
              </div>
              <MessageActions 
                isOwnMessage={isOwnMessage} // Pass isOwnMessage
                hasFailed={hasFailed}
                message={message}
                onRetrySend={onRetrySend}
                onOpenDeleteMessageDialog={onOpenDeleteMessageDialog}
              />
            </div>
          </div>
        </>
      )}

      {isOwnMessage && (
        <>
          <div className={cn("flex flex-col items-end")}>
            <div className={cn("flex items-center gap-1.5")}>
              <MessageActions 
                isOwnMessage={isOwnMessage} // Pass isOwnMessage
                hasFailed={hasFailed}
                message={message}
                onRetrySend={onRetrySend}
                onOpenDeleteMessageDialog={onOpenDeleteMessageDialog}
              />
              <div className={cn(
                "max-w-md rounded-xl py-2 px-3 shadow-sm relative text-sm",
                "bg-primary text-primary-foreground rounded-br-none",
                (isOptimistic || hasFailed) && "opacity-80"
              )}>
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <div className={cn(
                  "text-[10px] mt-1 flex items-center gap-1 select-none",
                  "text-primary-foreground/70 justify-end"
                )}>
                  <span>{formatMessageTime(message.created_at)}</span>
                  {getStatusIcon()}
                </div>
              </div>
            </div>
          </div>
          {/* Use derived sender info */}
          <SenderAvatar 
            avatarUrl={senderAvatarUrl}
            name={senderName} 
            initials={senderInitials} 
          />
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - simplified based on new props
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.read_at === nextProps.message.read_at &&
    prevProps.sender?.id === nextProps.sender?.id && // Compare sender ID
    prevProps.viewingIdentity?.id === nextProps.viewingIdentity?.id && // Compare viewer ID
    prevProps.isSending === nextProps.isSending &&
    prevProps.isError === nextProps.isError
  );
}); 