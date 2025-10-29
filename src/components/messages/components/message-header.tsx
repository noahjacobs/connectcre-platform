import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Participant, MessageThread } from '../types';
import { cn } from '@/lib/utils';
import { ArrowLeft, Building2, MoreVertical, Trash2 } from 'lucide-react';
import { getInitials } from '../utils';

interface MessageHeaderProps {
  thread: MessageThread;
  onBack: () => void;
  onCompanyClick: (id: string) => void;
  onDeleteThread: (id: string) => void;
  className?: string;
}

export function MessageHeader({
  thread,
  onBack,
  onCompanyClick,
  onDeleteThread,
  className
}: MessageHeaderProps) {

  // Use the reliable other_participant data
  const participant = thread.other_participant;
  const participantIsCompany = participant.type === 'company';

  // Handler for clicking the participant info or the dropdown item
  const handleViewProfileClick = () => {
    if (participantIsCompany && participant.id) {
      onCompanyClick(participant.id);
    }
    // If participant is a user, we might want a different action or no action.
    // Currently, clicking a user participant does nothing.
  };

  // We need the original thread ID for deletion
  const threadIdForDelete = thread.original_thread_id || thread.id;

  return (
    <div className={cn(
              "px-3 py-2 border-b flex items-center gap-3 shadow-sm bg-card", // Adjusted padding slightly
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Back to threads</span>
      </Button>
      
      {/* Make clickable only if it's a company profile */}
      <div
        className={cn(
          "flex items-center gap-3 group flex-1 min-w-0",
          participantIsCompany && "cursor-pointer"
        )}
        onClick={participantIsCompany ? handleViewProfileClick : undefined}
        title={participantIsCompany ? `View ${participant.name} profile` : participant.name}
      >
        <Avatar className="h-9 w-9 shrink-0">
          {participant.type === 'company' && participant.logo_url ? (
            <AvatarImage 
              src={participant.logo_url} 
              alt={participant.name || 'Logo'} 
              className="object-contain p-1" // Add padding for logos
            />
          ) : participant.type === 'user' && participant.avatar_url ? (
            <AvatarImage 
              src={participant.avatar_url} 
              alt={participant.name || 'Avatar'} 
              className="object-cover" // Use cover for user avatars
            />
          ) : (
            <AvatarFallback className="text-sm bg-muted text-muted-foreground">
              {getInitials(participant.name || '?')}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium truncate text-sm", 
            participantIsCompany && "group-hover:text-primary transition-colors"
            )}>
            {participant.name || 'Unknown Participant'}
          </h4>
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Conversation options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Show View Profile only if participant is a company */}
          {participantIsCompany && (
            <DropdownMenuItem onClick={handleViewProfileClick} className="cursor-pointer">
            <Building2 className="h-4 w-4 mr-0.5" /> View Company Profile
          </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            // Pass the correct ID (composite or original) needed by the handler
            onClick={() => onDeleteThread(threadIdForDelete)} 
          >
            <Trash2 className="h-4 w-4 mr-0.5" /> Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 