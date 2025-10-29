import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CircleDot, MoreVertical, Trash2 } from "lucide-react";
import { MessageThread } from '../types';
import { formatTimeAgo, getInitials } from "../utils";

interface User {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface ThreadListItemProps {
  thread: MessageThread;
  isActive: boolean;
  user: User | null;
  onSelect: () => void;
  onDelete: () => void;
}

export function ThreadListItem({
  thread,
  isActive,
  user,
  onSelect,
  onDelete,
}: ThreadListItemProps) {
  const { other_participant, last_message_at, last_message_preview, unread_count } = thread;
  const hasUnread = unread_count > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors relative group",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:z-10",
        isActive ? "bg-muted" : "hover:bg-accent/50",
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
    >
      <Avatar className="h-10 w-10 shrink-0">
        {other_participant.type === 'company' && other_participant.logo_url ? (
          <AvatarImage 
            src={other_participant.logo_url} 
            alt={other_participant.name || 'Logo'} 
            className="object-contain p-1"
          />
        ) : other_participant.type === 'user' && other_participant.avatar_url ? (
          <AvatarImage 
            src={other_participant.avatar_url} 
            alt={other_participant.name || 'Avatar'} 
            className="object-cover"
          />
        ) : (
          <AvatarFallback className="text-sm bg-muted text-muted-foreground">
            {getInitials(other_participant.name || 'P')}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className={cn(
            "font-medium truncate text-sm max-w-[180px] md:max-w-[200px]",
            hasUnread && !isActive && "font-semibold"
          )}>
            {other_participant.name || 'Unknown Participant'}
          </h4>
          <div className="flex items-center ml-2 gap-1 shrink-0">
            {hasUnread && !isActive && (
              <span aria-label={`${unread_count} unread message${unread_count > 1 ? 's' : ''}`}>
                <CircleDot className="h-2.5 w-2.5 text-primary fill-primary shrink-0" />
              </span>
            )}
            <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(last_message_at)}
            </span>
          </div>
        </div>
        <p className={cn(
          "text-xs truncate",
          hasUnread && !isActive ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {last_message_preview}
        </p>
      </div>
      
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
              aria-label="Thread options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={(e) => { 
                e.stopPropagation();
                onDelete(); 
              }}
            >
              <Trash2 className="h-4 w-4 mr-0.5" />
              Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 