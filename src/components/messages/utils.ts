import { Message, MessageThread, Participant } from './types';
import { toast } from "sonner";
import { type SupabaseClient } from "@supabase/supabase-js";
import { navigateToTab } from "@/lib/utils";
import { type UserCompany } from "@/hooks/use-user-companies";
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Define User interface locally to avoid conflicts
interface User {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export const getInitials = (name: string): string => {
  if (!name) return 'U';
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export const formatTimeAgo = (date: string): string => {
  if (!date) return '';
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + 'y ago';

    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + 'mo ago';

    interval = seconds / 604800; // weeks
    if (interval > 1) return Math.floor(interval) + 'w ago';

    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + 'd ago';

    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + 'h ago';

    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + 'm ago';

    return 'just now';
  } catch (e) {
    console.error("Error formatting time ago:", e);
    return 'invalid date';
  }
};

export const formatMessageTime = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) { // Within the last week
      return `${date.toLocaleDateString([], { weekday: 'short' })}, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
  } catch (e) {
    console.error("Error formatting message time:", e);
    return 'invalid date';
  }
};

/*
// Likely outdated due to schema changes (sender_id -> sender_participant_id/type)
// and preview logic being handled in message-tab.tsx based on perspective.
export const getLastMessageExcerpt = (thread: MessageThread, userId: string | undefined): string => {
  if (!thread.messages || thread.messages.length === 0) {
    return 'No messages yet';
  }
  const lastMessage = thread.messages[thread.messages.length - 1];
  if (!lastMessage) return 'No messages yet';
  
  const content = lastMessage.content;
  // ERROR: lastMessage.sender_id doesn't exist, needs sender_participant_id/type check against perspective
  const prefix = lastMessage.sender_id === userId ? "You: " : ""; 
  const excerpt = content.length > 35 ? content.slice(0, 35) + '...' : content;
  return prefix + excerpt;
};
*/

export const groupMessagesByDate = (messages: Message[]): { date: string; messages: Message[] }[] => {
  if (!messages || messages.length === 0) return [];

  const groups: { date: string; messages: Message[] }[] = [];
  let currentDateLabel = '';
  let currentGroup: Message[] = [];

  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 864e5).toLocaleDateString();

  messages.forEach(msg => {
    if (!msg || !msg.created_at) return; // Skip invalid messages
    
    try {
      const msgDate = new Date(msg.created_at);
      const msgDateString = msgDate.toLocaleDateString();
      let dateLabel = '';

      if (msgDateString === today) {
        dateLabel = 'Today';
      } else if (msgDateString === yesterday) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = msgDate.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }

      if (dateLabel !== currentDateLabel) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDateLabel, messages: currentGroup });
        }
        currentDateLabel = dateLabel;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    } catch (e) {
      console.error("Error processing message date:", msg, e);
      // Skip message if date is invalid
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ date: currentDateLabel, messages: currentGroup });
  }

  return groups;
};

export async function startOrNavigateToMessageThread(
    supabase: SupabaseClient | null,
    currentUser: User, // Auth context user
    userCompanies: UserCompany[], // Companies managed by the user
    initiatingParticipant: Participant, // The identity the user is acting AS (self or a managed company)
    otherParticipant: Participant, // The identity the user wants to message
    router: AppRouterInstance,
    pathname: string
): Promise<boolean> {
    if (!supabase) {
        toast.error("Database connection error. Please try again.");
        return false;
    }
    if (!currentUser?.id) {
        toast.error("Authentication error. Please sign in again.");
        return false;
    }
    if (!initiatingParticipant || !otherParticipant) {
       toast.error("Invalid participants for messaging.");
       return false;
    }
    // Basic validation: cannot message self
    if (initiatingParticipant.type === otherParticipant.type && initiatingParticipant.id === otherParticipant.id) {
        toast.error("You cannot start a conversation with yourself.");
        return false;
    }
    // Further validation: ensure types are user or company
    if (!['user', 'company'].includes(initiatingParticipant.type) || !['user', 'company'].includes(otherParticipant.type)) {
        toast.error("Messaging only supported between users and companies.");
        return false;
    }

    try {
        // 1. Normalize Participant Order (alphabetical by type, then id)
        const participants = [initiatingParticipant, otherParticipant];
        participants.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return a.id.localeCompare(b.id);
        });
        const normParticipantA = participants[0];
        const normParticipantB = participants[1];

        // 2. Query for Existing Thread
        const { data: existingThread, error: findError } = await supabase
            .from('message_threads')
            .select('id')
            .eq('participant_a_type', normParticipantA.type)
            .eq('participant_a_id', normParticipantA.id)
            .eq('participant_b_type', normParticipantB.type)
            .eq('participant_b_id', normParticipantB.id)
            .maybeSingle();

        if (findError) {
            console.error('Error finding message thread:', findError);
            throw new Error('Database error checking for existing conversation.');
        }

        let threadId: string;
        let isNewThread = false;

        // 3. Create Thread if Not Found
        if (existingThread) {
            threadId = existingThread.id;
        } else {
            const { data: newThread, error: createError } = await supabase
                .from('message_threads')
                .insert({
                    participant_a_type: normParticipantA.type as 'user' | 'company', // Cast required
                    participant_a_id: normParticipantA.id,
                    participant_b_type: normParticipantB.type as 'user' | 'company', // Cast required
                    participant_b_id: normParticipantB.id,
                    // last_message_at will be updated by trigger when first message arrives
                    metadata: { created_by: currentUser.id } // Optional: Track who initiated
                })
                .select('id')
                .single();

            if (createError || !newThread) {
                console.error('Error creating message thread:', createError);
                throw new Error('Failed to create new conversation.');
            }
            threadId = newThread.id;
            isNewThread = true;
        }

        // Send email notification if this is a new thread
        if (isNewThread) {
            await sendThreadCreationNotification(supabase, otherParticipant, threadId);
        }

        // 4. Determine the specific VIEW ID based on the initiating participant
        let viewId: string;
        if (initiatingParticipant.type === 'company') {
            viewId = `${threadId}-as-${initiatingParticipant.id}`;
        } else {
            viewId = threadId; // User perspective uses the original thread ID as view ID
        }

        // 5. Construct Navigation URL (using viewId) and Navigate
        const targetPath = '/messages'; // Navigate to the messages page
        const params = new URLSearchParams();
        // Use the calculated viewId for the URL parameter
        params.set('messages', viewId); 

        const newUrl = `${targetPath}?${params.toString()}`;
        // console.log("Navigating to (using view ID):", newUrl);
        router.push(newUrl);
        
        return true; // Indicate success

    } catch (error: any) {
        console.error('Error starting/navigating to message thread:', error);
        toast.error(`Failed to open conversation: ${error.message || 'Please try again.'}`);
        return false; // Indicate failure
    }
}

// Send email notification when a new thread is created
export async function sendThreadCreationNotification(
  supabase: SupabaseClient | null,
  otherParticipant: Participant,
  threadId: string
): Promise<void> {
  // Only send notification if the other participant is a company
  if (!supabase || otherParticipant.type !== 'company') {
    return;
  }

  try {
    // Fetch company details to get the name
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', otherParticipant.id)
      .single();

    if (companyError || !companyData) {
      console.error('Error fetching company details for notification:', companyError);
      return;
    }

    const companyName = companyData.name;
    const companyDialogUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/directory?company=${otherParticipant.id}`;

    // Send email notification to admin team
    await fetch('/api/send-feedback-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'thread_created',
        record: {
          company_name: companyName,
          company_id: otherParticipant.id,
          thread_id: threadId,
          company_dialog_url: companyDialogUrl,
        },
        toEmailOverride: 'jonathan@devprojects.ai,noah@devprojects.ai'
      }),
    });
  } catch (error) {
    console.error('Error sending thread creation notification:', error);
    // Don't throw here - we don't want to break thread creation if email fails
  }
}

// ... other utils maybe ... 