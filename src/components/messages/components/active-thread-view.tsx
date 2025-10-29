import * as React from 'react';
import { Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageHeader } from "./message-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { Message, MessageThread, Participant } from "../types";
import { groupMessagesByDate } from "../utils";
import { MessageIdentitySelector } from './message-identity-selector';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSupabase } from "@/lib/providers/supabase-context";
import { type UserCompany } from "@/hooks/use-user-companies";

interface User {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface ActiveThreadViewProps {
  thread: MessageThread | null | undefined;
  user: User | null;
  userCompanies: UserCompany[];
  participantCache: React.MutableRefObject<Map<string, Participant>>;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  isLoading: boolean;
  isSending: boolean;
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
  onBack: () => void;
  onDeleteThread: () => void;
  onCompanyClick: (companyId: string) => void;
  onOpenDeleteMessageDialog: (messageId: string) => void;
  onRetrySend: (failedMessage: Message) => void;
  onStartNewThread: (sender: Participant, recipient: Participant) => Promise<void>;
  className?: string;
}

export function ActiveThreadView({
  thread,
  user,
  userCompanies,
  participantCache,
  selectedCompanyId,
  setSelectedCompanyId,
  isLoading,
  isSending,
  message,
  setMessage,
  onSendMessage,
  onBack,
  onDeleteThread,
  onCompanyClick,
  onOpenDeleteMessageDialog,
  onRetrySend,
  onStartNewThread,
  className
}: ActiveThreadViewProps) {

  const router = useRouter();
  const pathname = usePathname();
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const { supabase } = useSupabase();

  // Add effect to scroll to input when thread opens
  useEffect(() => {
    if (thread && inputContainerRef.current) {
      // Small delay to ensure dialog is fully rendered
      const timeoutId = setTimeout(() => {
        inputContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [thread]);

  const [showNewThreadDialog, setShowNewThreadDialog] = React.useState(false);
  const [newThreadIdentity, setNewThreadIdentity] = React.useState<{ type: 'user' | 'company'; id: string | null } | null>(null);

  const [showIdentitySelector, setShowIdentitySelector] = useState(false);
  const [pendingNewThreadParticipants, setPendingNewThreadParticipants] = useState<{sender: Participant, recipient: Participant} | null>(null);

  const handleSendMessage = React.useCallback(() => {
    onSendMessage();
  }, [onSendMessage]);

  // Create the currentUserParticipant object
  const currentUserParticipant: Participant | null = user
    ? { type: 'user', id: user.id, name: user.name || 'Personal Profile', avatar_url: user.avatar_url || null }
    : null;

  // Define the handler for when an identity is selected in the child component
  const handleSelectIdentity = async (sender: Participant) => {
    if (!thread?.other_participant || !supabase) {
      console.error('[handleSelectIdentity] Cannot start thread: Missing recipient info.');
      toast.error('Cannot determine recipient to start conversation.');
      return;
    }

    const recipient = thread.other_participant;

    // Check if the selected sender is the same as the established one for this view
    if (sender.type === viewingIdentity?.type && sender.id === viewingIdentity?.id) {
      setShowIdentitySelector(false); // Just close selector if same identity clicked
      return; 
    }

    // Check if a thread already exists with the selected sender & current recipient
    try {
      // ERROR: Query logic below is outdated (uses user_id, company_id)
      // Needs to query based on participant_a/b_type and participant_a/b_id
      // Determine normalized A and B based on selected sender and current recipient
      const participants = [sender, recipient];
      participants.sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return a.id.localeCompare(b.id);
      });
      const normA = participants[0];
      const normB = participants[1];
      
      // Build the query using new schema
      const { count, error } = await supabase
        .from('message_threads')
        .select('id', { count: 'exact' })
        .eq('participant_a_type', normA.type)
        .eq('participant_a_id', normA.id)
        .eq('participant_b_type', normB.type)
        .eq('participant_b_id', normB.id);

      if (error) {
        console.error('[handleSelectIdentity] Error checking thread existence:', error);
        throw new Error('Failed to check for existing conversation.');
      }

      if (count !== null && count > 0) {
        // Thread exists - join it directly
        onStartNewThread(sender, recipient);
        setShowIdentitySelector(false); 
      } else {
        // Thread does NOT exist - show confirmation dialog
        setPendingNewThreadParticipants({ sender, recipient });
        setShowNewThreadDialog(true);
        setShowIdentitySelector(false); 
      }

    } catch (error: any) {
      toast.error(error.message || 'Error checking for conversation.');
      setShowIdentitySelector(false);
    }
  };

  // Renamed establishedSenderIdentity to viewingIdentity
  const viewingIdentity: Participant | null = React.useMemo(() => {
    if (!thread || !user) return currentUserParticipant;

    // Determine default sender based on thread context (e.g., if user is viewing as a company)
    const viewingAsCompanyId = thread.id.includes('-as-') ? thread.id.split('-as-')[1] : null;
    
    if (viewingAsCompanyId) {
      const company = userCompanies.find(c => c.id === viewingAsCompanyId);
      if (company) {
        return {
          type: 'company',
          id: company.id,
          name: company.name,
          // Use combined logo url
          logo_url: company.uploaded_logo_url || company.logo_url || null,
          // Added missing avatar_url field, should be null for company
          avatar_url: null
        };
      }
    }
    // Default to the current user participant if not viewing as a company
    return currentUserParticipant; 
  }, [thread, user, userCompanies, currentUserParticipant]);

  React.useEffect(() => {
    // Update selectedCompanyId based on the determined viewingIdentity
    if (viewingIdentity && viewingIdentity.type === 'company') {
      setSelectedCompanyId(viewingIdentity.id);
    } else {
      setSelectedCompanyId(null);
    }
  }, [viewingIdentity, setSelectedCompanyId]);

  // sendingCompany derived based on selectedCompanyId (used by MessageInput/IdentitySelector, keep for now)
  const sendingCompany = React.useMemo(() => 
    userCompanies.find(c => c.id === selectedCompanyId),
    [userCompanies, selectedCompanyId]
  );

  const groupedMessages = React.useMemo(() => 
    thread ? groupMessagesByDate(thread.messages) : [],
    [thread]
  );

  const handleConfirmNewThread = () => {
    if (!pendingNewThreadParticipants) {
      console.error('Cannot confirm new thread: No pending participants.');
      return;
    }

    const { sender, recipient } = pendingNewThreadParticipants;

    onStartNewThread(sender, recipient);

    setShowNewThreadDialog(false);
    setPendingNewThreadParticipants(null);
  };

  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={cn("flex-1 items-center justify-center p-10 text-center hidden md:flex flex-col", className)}>
        <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Choose a conversation from the list on the left to view messages.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col bg-card w-full h-full",
        "relative overflow-hidden",
        className
      )}
    >
      <MessageHeader
        thread={thread}
        onBack={onBack}
        onCompanyClick={onCompanyClick}
        onDeleteThread={onDeleteThread}
      />
      <div 
        className="flex-1 min-h-0 overflow-hidden flex flex-col"
      >
        <MessageList
          className="flex-1 min-h-0 overflow-y-auto"
          thread={thread}
          participantCache={participantCache}
          viewingIdentity={viewingIdentity}
          groupedMessages={groupedMessages}
          isLoading={false}
          isSending={isSending}
          onOpenDeleteMessageDialog={onOpenDeleteMessageDialog}
          onRetrySend={onRetrySend}
        />
      </div>
      <div 
        ref={inputContainerRef}
        className={cn(
          "shrink-0 w-full bg-background border-t"
        )}
      >
        {user && thread && userCompanies.length > 0 && (
          <div className="px-3 pt-3">
            <MessageIdentitySelector
              userCompanies={userCompanies}
              viewingIdentity={viewingIdentity}
              currentUser={currentUserParticipant}
              onSelectIdentity={handleSelectIdentity}
              className="mb-2"
            />
          </div>
        )}
        <div className="pb-safe w-full">
          <MessageInput
            message={message}
            setMessage={setMessage}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            className={cn(
              (!user || userCompanies.length === 0) && "border-t",
              "w-full"
            )}
          />
        </div>
      </div>
      <AlertDialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing your identity requires starting a new conversation thread with {pendingNewThreadParticipants?.recipient.name || 'this participant'}.
              Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNewThreadParticipants(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNewThread}>
              Start New Thread
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 