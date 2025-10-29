import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/providers/auth-context';
import { useSupabase } from "@/lib/providers/supabase-context";
import { toast } from 'sonner';
import { type UserCompany } from '@/hooks/use-user-companies';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyDialog } from '@/components/companies';
import { ThreadList } from './thread-list';
import { ActiveThreadView } from './active-thread-view';
import { 
  Message, 
  MessageThread, 
  SupabaseMessageThread,
  Participant,
  type BasicUserDetails
} from '../types';
// TODO: Implement user data fetching
// import { fetchMultipleUsersById } from '@/components/tracking/actions/user-data';
const fetchMultipleUsersById = async (userIds: string[]) => ({ users: [] });
import { PricingDialog } from '@/components/ui/pricing-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface MessagesProps {
  userCompanies: UserCompany[];
  isLoadingCompanies: boolean;
  initialThreadId?: string | null;
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
  onStartNewThread: (initiatingParticipant: Participant, otherParticipant: Participant) => Promise<boolean>;
  refreshUnreadCount?: () => void;
}

export function MessageTab({ userCompanies, isLoadingCompanies, initialThreadId = null, onClose, onUnreadCountChange, onStartNewThread, refreshUnreadCount }: MessagesProps) {
  const { user } = useAuth();
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [selectedCompanyForDialog, setSelectedCompanyForDialog] = useState<any | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleteMessageDialogOpen, setIsDeleteMessageDialogOpen] = useState(false);
  const [isDeleteMessageLoading, setIsDeleteMessageLoading] = useState(false);
  const { supabase } = useSupabase();

  // --- Mobile Dialog State ---
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

  // --- Participant Cache --- (NEW)
  const participantCache = useRef(new Map<string, Participant>()); // Cache fetched participant details

  // --- Subscription State --- (NEW)
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // --- Fetch and Update Participant Cache --- (NEW)
  const fetchAndCacheParticipants = async (participantIds: Set<string>, participantTypes: Map<string, 'user' | 'company'>) => {
    const userIdsToFetch = new Set<string>();
    const companyIdsToFetch = new Set<string>();

    participantIds.forEach(id => {
      if (!participantCache.current.has(id)) { // Only fetch if not cached
        const type = participantTypes.get(id);
        if (type === 'user') userIdsToFetch.add(id);
        else if (type === 'company') companyIdsToFetch.add(id);
      }
    });
    if (!supabase) return;

    const promises = [];
    if (userIdsToFetch.size > 0) {
      promises.push(
        fetchMultipleUsersById(Array.from(userIdsToFetch))
          .then(map => {
            map.forEach((details, id) => {
              participantCache.current.set(id, { 
                  type: 'user', 
                  id: id, 
                  name: details.name || `User ${id.substring(0,4)}`, 
                  avatar_url: details.avatar_url || null 
              });
            });
          })
          .catch(err => console.error("Error fetching user profiles:", err))
      );
    }
    if (companyIdsToFetch.size > 0) {
      promises.push(
        supabase.from('companies')
          .select('id, name, uploaded_logo_url, logo_url')
          .in('id', Array.from(companyIdsToFetch))
          .then(({ data, error }) => {
            if (error) console.error("Error fetching companies:", error);
            else (data || []).forEach(c => {
              participantCache.current.set(c.id, { 
                  type: 'company', 
                  id: c.id, 
                  name: c.name || 'Unknown Company', 
                  logo_url: c.uploaded_logo_url || c.logo_url || null 
              });
            });
          })
      );
    }
    // Add managed companies to cache if not already there
    userCompanies.forEach(uc => {
      if (uc.id && !participantCache.current.has(uc.id)) {
          participantCache.current.set(uc.id, { 
              type: 'company', 
              id: uc.id, 
              name: uc.name || 'Unnamed Company', 
              logo_url: uc.uploaded_logo_url || uc.logo_url || null 
          });
      }
    });

    await Promise.all(promises);
  };

  // Check for mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (!mobile && isMobileThreadOpen) {
        setIsMobileThreadOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileThreadOpen]);

  // Effect to handle automatically opening the mobile dialog when activeThreadId is set
  useEffect(() => {
    // Only trigger opening if activeThreadId changes to a non-null value on mobile
    if (isMobile && activeThreadId) {
      // Check if it's already open - if so, do nothing.
      // This prevents re-opening when closing.
      if (!isMobileThreadOpen) { 
          setIsMobileThreadOpen(true);
      }
    }
    // We DON'T want to automatically close it if activeThreadId becomes null here,
    // as closing is handled explicitly by the back button.
    // Remove isMobileThreadOpen from dependencies
  }, [isMobile, activeThreadId]);

  // --- Load Message Threads Effect --- (REFACTORED)
  useEffect(() => {
    if (user?.id && !isLoadingCompanies) {
      const timeoutId = setTimeout(() => {
        loadMessageThreads(userCompanies);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, isLoadingCompanies, JSON.stringify(userCompanies.map(uc => uc.id)), initialThreadId]);

  // --- Effect to set active thread from initialThreadId --- (REFINED)
  useEffect(() => {
    // Only proceed if initialThreadId is provided
    if (initialThreadId) {
      // Find the corresponding view ID (might include -as-companyId)
      // This needs to handle both user views (thread.id) and company views (thread.id-as-companyId)
      const targetView = messageThreads.find(t => 
        t.id === initialThreadId || // Matches user view ID
        (t.original_thread_id + '-as-' + t.other_participant.id === initialThreadId && t.other_participant.type === 'company') || // Heuristic for company view ID match - needs refinement if ID format changes
        (t.id.startsWith(initialThreadId + '-as-')) // Covers cases where initialThreadId is the base thread ID
      );
      const targetViewId = targetView?.id;

      // Only set active thread if:
      // 1. We found a target view ID.
      // 2. Threads are loaded (messageThreads.length > 0).
      // 3. The target ID is different from the currently active one.
      if (targetViewId && messageThreads.length > 0 && activeThreadId !== targetViewId) {
          // console.log(`Effect (initialThreadId): Setting active thread from initialThreadId: ${targetViewId}`);
          setActiveThreadId(targetViewId); 
          // Mobile dialog opening is handled by a separate effect watching activeThreadId
      }
    } 
    // Intentionally NOT clearing activeThreadId if initialThreadId becomes null.
    // This allows the user to navigate away from a message URL param without losing their active thread.
    // Dependencies: Only run when initialThreadId or the set of messageThreads change.
  }, [initialThreadId, messageThreads]); // Removed activeThreadId, isMobile, isMobileThreadOpen

  // --- Mark Read Effect ---
  useEffect(() => {
    if (activeThreadId && !isMobileThreadOpen) { // Only mark read if not handled by mobile dialog
      markMessagesAsRead(activeThreadId);
    }
  }, [activeThreadId, isMobileThreadOpen]); // Depend on mobile state too

  // --- Load Message Threads Function --- (REFACTORED)
  const loadMessageThreads = useCallback(async (currentUserCompanies: UserCompany[]) => {
    if (!user?.id || !supabase) return;
    setIsLoading(true);

    try {
      const currentUserId = user.id;
      const managedCompanyIds = currentUserCompanies.map(uc => uc.id).filter(Boolean);
      const hasManagedCompanies = managedCompanyIds.length > 0;

      // --- 1. Build Filter for Threads involving User or Managed Companies --- 
      const participantAFilters: string[] = [
        `participant_a_id.eq.${currentUserId},participant_a_type.eq.user`,
      ];
      const participantBFilters: string[] = [
        `participant_b_id.eq.${currentUserId},participant_b_type.eq.user`,
      ];
      if (hasManagedCompanies) {
        const companyIdsString = managedCompanyIds.join(',');
        participantAFilters.push(`participant_a_id.in.(${companyIdsString}),participant_a_type.eq.company`);
        participantBFilters.push(`participant_b_id.in.(${companyIdsString}),participant_b_type.eq.company`);
      }
      // Combine filters: (A is me OR B is me)
      const threadFilter = `or(or(${participantAFilters.join(',')}),or(${participantBFilters.join(',')}))`;

      // --- 2. Fetch Threads and Last Message --- 
      const { data: threads, error } = await supabase
        .from('message_threads')
        .select(`
          id,
          participant_a_id, participant_a_type,
          participant_b_id, participant_b_type,
          last_message_at,
          metadata,
          messages ( 
            id, thread_id, content, created_at, read_at,
            sender_id, sender_type
          )
        `)
        .or(threadFilter) // Filter based on participant A or B
        .order('created_at', { foreignTable: 'messages', ascending: false }) // Order messages within each thread
        // Note: We might not need to order threads here if we sort processed views later
        // .order('last_message_at', { ascending: false })
        .returns<SupabaseMessageThread[]>();

      if (error) throw error;

      // --- 3. Collect All Participant IDs and Types --- 
      const participantIds = new Set<string>();
      const participantTypes = new Map<string, 'user' | 'company'>();
      (threads || []).forEach(t => {
        participantIds.add(t.participant_a_id);
        participantTypes.set(t.participant_a_id, t.participant_a_type);
        participantIds.add(t.participant_b_id);
        participantTypes.set(t.participant_b_id, t.participant_b_type);
        // Also collect sender IDs from messages if needed (though should be covered by A/B)
        t.messages.forEach(m => {
            participantIds.add(m.sender_id);
            participantTypes.set(m.sender_id, m.sender_type);
        });
      });

      // --- 4. Fetch and Cache Participant Details --- 
      await fetchAndCacheParticipants(participantIds, participantTypes);

      // --- 5. Process Threads into Views --- 
      const transformedThreadsPromises = (threads || []).map((thread): MessageThread[] => {
        const threadResults: MessageThread[] = [];
        const normParticipantA = participantCache.current.get(thread.participant_a_id);
        const normParticipantB = participantCache.current.get(thread.participant_b_id);
        
        // Get messages sorted correctly (newest last)
        const sortedMessages = thread.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        
        // Ensure both participants were found in cache
        if (!normParticipantA || !normParticipantB) {
             console.warn("Could not find participant details in cache for thread:", thread.id);
             return []; // Skip this thread if participant info is missing
        }

        // --- Create View Function --- 
        const createThreadView = (viewPerspective: Participant): MessageThread | null => {
          // Determine the *other* participant for this view
          const otherParticipant = 
              (normParticipantA.type === viewPerspective.type && normParticipantA.id === viewPerspective.id) 
              ? normParticipantB 
              : normParticipantA;
              
          if (!otherParticipant) return null; // Should not happen if A & B exist

          // Calculate unread count from THIS perspective
          let unreadCount = 0;
          sortedMessages.forEach(message => {
            // Message is unread if sender is the other participant and read_at is null
            if (
              message.sender_type === otherParticipant.type &&
              message.sender_id === otherParticipant.id &&
              !message.read_at
            ) {
              unreadCount++;
            }
          });

          // Generate last message preview for THIS perspective
          let lastMessagePreview = 'No messages yet';
          if (lastMessage) {
            const content = lastMessage.content || '';
            // Check if last message was sent by the perspective participant
            const lastMsgSentByThisPerspective = 
                lastMessage.sender_type === viewPerspective.type && 
                lastMessage.sender_id === viewPerspective.id;
            const prefix = lastMsgSentByThisPerspective ? "You: " : "";
            lastMessagePreview = prefix + (content.length > 35 ? content.slice(0, 35) + '...' : content);
          }
          
          const viewId = viewPerspective.type === 'company' ? `${thread.id}-as-${viewPerspective.id}` : thread.id;

          return {
            id: viewId,
            original_thread_id: thread.id,
            other_participant: otherParticipant,
            last_message_at: thread.last_message_at || lastMessage?.created_at || new Date(0).toISOString(), // Fallback timestamp
            last_message_preview: lastMessagePreview,
            unread_count: unreadCount,
            messages: sortedMessages // Include sorted messages
          };
        };
        // --- End Create View Function --- 

        // --- Generate Views --- 
        threadResults.length = 0;
        const currentUserParticipant = participantCache.current.get(currentUserId);

        // Create view for the user perspective if user is participant A or B
        if (currentUserParticipant && (thread.participant_a_id === currentUserId || thread.participant_b_id === currentUserId)) {
            const userView = createThreadView(currentUserParticipant);
            if (userView) threadResults.push(userView);
        }

        // Create views for each managed company involved in the thread
        managedCompanyIds.forEach(companyId => {
            const companyParticipant = participantCache.current.get(companyId);
            if (companyParticipant && (thread.participant_a_id === companyId || thread.participant_b_id === companyId)) {
                const companyView = createThreadView(companyParticipant);
                 // Avoid duplicates if a thread is between two managed companies
                 if (companyView && !threadResults.some(v => v.id === companyView.id)) {
                    threadResults.push(companyView);
                 }            
             }
        });

        return threadResults;
      });
      // --- End Thread Processing --- 

      const transformedThreads = transformedThreadsPromises.flat();
      const uniqueThreads = Array.from(new Map(transformedThreads.map(t => [t.id, t])).values());
      const sortedUniqueThreads = uniqueThreads.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      
      setMessageThreads(sortedUniqueThreads);
      calculateUnreadCount(sortedUniqueThreads);

    } catch (error: any) {
      toast.error('Failed to load conversations');
      console.error("Error loading message threads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchAndCacheParticipants]); // Added fetchAndCacheParticipants dependency


  // --- Mark Messages Read --- (REFACTORED)
  const markMessagesAsRead = async (threadViewId: string) => {
    const currentView = messageThreads.find(t => t.id === threadViewId);
    if (!user?.id || !supabase || !currentView || !currentView.original_thread_id || !currentView.other_participant) return;
    
    const actualThreadId = currentView.original_thread_id;
    const otherParticipant = currentView.other_participant;

    try {
      // Update messages where sender is the other participant and read_at is null
      const { error, count } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', actualThreadId)
        .eq('sender_type', otherParticipant.type)
        .eq('sender_id', otherParticipant.id)
        .is('read_at', null);
         
      if (error) {
        console.error("Error marking messages as read:", error);
        toast.error("Couldn't mark messages as read.");
      } else if (count && count > 0) {
        // --- Start Local State Update --- 
        setMessageThreads(prevThreads => {
            const updated = prevThreads.map(thread => {
                if (thread.original_thread_id === actualThreadId) {
                    // Mark messages as read locally if sent by the other participant
                    const updatedMessages = thread.messages.map(msg => {
                         if (
                            msg.sender_type === otherParticipant.type &&
                            msg.sender_id === otherParticipant.id &&
                            !msg.read_at
                         ) {
                            return { ...msg, read_at: new Date().toISOString() };
                        }
                        return msg;
                    });
                    // Reset unread count only for the specific view that was active
                    // Check if it's already 0 from optimistic update before resetting again
                    const newUnreadCount = (thread.id === threadViewId && thread.unread_count > 0) ? 0 : thread.unread_count;
                    return { ...thread, messages: updatedMessages, unread_count: newUnreadCount };
                }
                return thread;
            });
            // Call calculateUnreadCount outside the map/setter
            calculateUnreadCount(updated);
            return updated;
        });
        // --- End Local State Update --- 
        
        // Notify parent if necessary (optional)
        if (refreshUnreadCount) {
          refreshUnreadCount();
        }
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  };

  // --- Calculate Unread Count --- (No change needed structurally)
  const calculateUnreadCount = (threads: MessageThread[]) => {
    if (!user) {
      setTimeout(() => onUnreadCountChange?.(0), 0);
      return;
    }
    const count = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0);
    setTimeout(() => onUnreadCountChange?.(count), 0);
  };

  // --- Handle Send Message --- (REFACTORED)
  const handleSendMessage = async () => {
    if (!message.trim() || !activeThreadId || !user?.id) {
      console.error('SendMessage Error: Missing message, activeThreadId, or user ID.', { message: !!message.trim(), activeThreadId, userId: user?.id });
      return;
    }

    const currentThreadView = messageThreads.find(t => t.id === activeThreadId);
    if (!currentThreadView || !currentThreadView.original_thread_id) {
      console.error('SendMessage Error: Could not find current thread view or original ID.', { activeThreadId, currentThreadView });
      return;
    }
    const actualThreadId = currentThreadView.original_thread_id;

    // Determine sender participant type and ID based on the view
    let senderParticipantId: string = user.id;
    let senderParticipantType: 'user' | 'company' = 'user';
    const companyViewMatch = currentThreadView.id.match(/-as-([a-f0-9\-]+)$/);
    if (companyViewMatch && companyViewMatch[1]) {
      senderParticipantId = companyViewMatch[1];
      senderParticipantType = 'company';
    }
    // console.log('SendMessage: Determined sender', { senderParticipantId, senderParticipantType });
    
    const tempMessageId = `temp-${Date.now()}`;
    const newMessageContent = message.trim();
    setMessage(''); // Clear input immediately

    // --- Start Cache Check/Fetch --- (MODIFIED FOR ASYNC)
    let senderJustFetched = false;
    if (!supabase) return;
    if (!participantCache.current.has(senderParticipantId)) {
        // console.log('SendMessage: Sender not in cache, attempting fetch...', { senderParticipantId, senderParticipantType });
        const idsToFetch = new Set<string>([senderParticipantId]);
        const typesMap = new Map<string, 'user' | 'company'>([[senderParticipantId, senderParticipantType]]);
        try {
          await fetchAndCacheParticipants(idsToFetch, typesMap);
          senderJustFetched = true; // Mark that we fetched
          // console.log('SendMessage: Cache fetch complete. Sender in cache now?', !!participantCache.current.get(senderParticipantId));
        } catch (err) {
          console.error("SendMessage: Failed to fetch sender details during send:", err);
          // Proceed with optimistic update anyway, UI might lack avatar initially
        }
    }
    // --- End Cache Check/Fetch ---

    // Create optimistic message with new sender fields
    const optimisticMessage: Message = {
      id: tempMessageId,
      content: newMessageContent,
      thread_id: actualThreadId,
      sender_id: senderParticipantId,
      sender_type: senderParticipantType,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    // Check cache for sender *before* optimistic update
    const senderInCache = participantCache.current.get(senderParticipantId);
    // console.log('SendMessage: Sender in cache BEFORE optimistic update?', !!senderInCache, { senderId: senderParticipantId, cacheKeys: Array.from(participantCache.current.keys()) });

    // Optimistic UI update
    const updatedThreads = messageThreads.map(thread => {
      if (thread.original_thread_id === actualThreadId) {
        // Check if this view represents the sender
        const isSenderView = 
            (thread.id === activeThreadId);
        
        // Check if the *other* view represents the sender (for preview update)
        const otherViewIsSender = 
            (senderParticipantType === 'user' && thread.other_participant.type === 'user' && thread.other_participant.id === senderParticipantId) || 
            (senderParticipantType === 'company' && thread.other_participant.type === 'company' && thread.other_participant.id === senderParticipantId);

        const newMessages = [...thread.messages, optimisticMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastMsg = newMessages[newMessages.length - 1];
        let preview = 'No messages yet';
        if(lastMsg) {
             const isSentByPerspective = lastMsg.sender_id === (thread.id.includes('-as-') ? thread.id.split('-as-')[1] : user?.id) && 
                                       lastMsg.sender_type === (thread.id.includes('-as-') ? 'company' : 'user');
             const prefix = isSentByPerspective ? "You: " : "";
             preview = prefix + (lastMsg.content.length > 35 ? lastMsg.content.slice(0, 35) + '...' : lastMsg.content);
        }

        return {
          ...thread,
          messages: newMessages,
          last_message_at: optimisticMessage.created_at,
          last_message_preview: preview, 
          // Increment unread count for the *other* view(s)
          unread_count: isSenderView ? thread.unread_count : thread.unread_count + 1 
        };
      }
      return thread;
    }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    // Apply state update AFTER potential cache fetch completes
    setMessageThreads(updatedThreads);
    calculateUnreadCount(updatedThreads);
    
    setIsSending(true);
    try {
      // Insert message with new sender fields
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          content: newMessageContent,
          thread_id: actualThreadId,
          sender_id: senderParticipantId,
          sender_type: senderParticipantType
        })
        .select('*') // Remove problematic FK hints, just select the message data
        .single();

      if (error) {
        console.error('SendMessage Error: Supabase insert failed.', error);
        throw error;
      }
      
      // console.log('SendMessage: Insert successful, inserted message:', insertedMessage);

      // Update message ID from temp to actual
      setMessageThreads(threads => {
          const finalUpdated = threads.map(thread => {
            if (thread.original_thread_id === actualThreadId) {
                // --- Start Cache Update --- (MOVED UP)
                // Add sender details to participant cache if fetched and not present *before* state update
                // We use the senderParticipantId/Type determined earlier, as insertedMessage won't have joined data now
                 if (senderParticipantType === 'user' && !participantCache.current.has(senderParticipantId)) {
                      // Fetch user details if needed (or rely on initial fetch)
                      // For now, just ensure the cache doesn't cause issues if details aren't present yet
                      // console.log('SendMessage: User sender not in cache, might need details later.', senderParticipantId);
                 } else if (senderParticipantType === 'company' && !participantCache.current.has(senderParticipantId)) {
                      // Fetch company details if needed (or rely on initial fetch)
                      // console.log('SendMessage: Company sender not in cache, might need details later.', senderParticipantId);
                 }
                 // --- End Cache Update --- 
                
                const updatedMessages = thread.messages.map(msg => { 
                    if (msg.id === tempMessageId) {
                      // console.log('SendMessage StateUpdate: Replacing temp msg', msg, 'with inserted msg', insertedMessage);
                      if (!insertedMessage.sender_id) {
                        console.error('SendMessage StateUpdate ERROR: insertedMessage is missing sender_id!', insertedMessage);
                      }
                      return insertedMessage; // Replace temp with real
                    }
                    return msg;
                });

                return {
                    ...thread,
                    messages: updatedMessages,
                    last_message_at: insertedMessage.created_at, // Ensure this updates too
              };
            }
            return thread;
          }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()); // Re-sort after timestamp update
          calculateUnreadCount(finalUpdated);
          // console.log("SendMessage: Final state update applied. Active thread messages:", finalUpdated.find(t => t.original_thread_id === actualThreadId)?.messages);
          return finalUpdated;
      });

      if (refreshUnreadCount) refreshUnreadCount();

    } catch (error) {
      toast.error('Failed to send message');
      console.error('SendMessage Error: Catch block reached.', error);
      // Revert optimistic update
      setMessageThreads(threads => {
          const reverted = threads.map(thread => {
              if (thread.original_thread_id === actualThreadId) {
                  const revertedMessages = thread.messages.filter(msg => msg.id !== tempMessageId);
                  const lastMsg = revertedMessages[revertedMessages.length - 1];
                  let preview = 'No messages yet';
                  if (lastMsg) {
                      const isSentByPerspective = lastMsg.sender_id === (thread.id.includes('-as-') ? thread.id.split('-as-')[1] : user?.id) &&
                          lastMsg.sender_type === (thread.id.includes('-as-') ? 'company' : 'user');
                      const prefix = isSentByPerspective ? "You: " : "";
                      preview = prefix + (lastMsg.content.length > 35 ? lastMsg.content.slice(0, 35) + '...' : lastMsg.content);
                  }
                  return {
                      ...thread,
                      messages: revertedMessages,
                      last_message_at: lastMsg?.created_at || thread.last_message_at, // Revert timestamp
                      last_message_preview: preview, // Revert preview
                      unread_count: thread.unread_count > 0 ? thread.unread_count -1 : 0 // Decrement unread if needed
                  };
              }
              return thread;
          }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          calculateUnreadCount(reverted);
          return reverted;
      });
      setMessage(newMessageContent);
    } finally {
      setIsSending(false);
    }
  };

  // --- Delete Thread --- (No schema changes needed, uses original_thread_id)
  const handleDeleteThread = async () => {
    const threadViewToDelete = messageThreads.find(t => t.id === threadToDelete);
    if (!threadViewToDelete || !threadViewToDelete.original_thread_id || !supabase) {
      console.error('DeleteThread Error: Could not find thread view or original ID.', { threadToDelete, threadViewToDelete });
      setThreadToDelete(null); // Reset state even if not found
      setIsDeleteDialogOpen(false); // Close dialog
      return;
    }
    const actualThreadIdToDelete = threadViewToDelete.original_thread_id;
    
    setIsDeleteLoading(true);
    try {
      // console.log('Attempting to delete thread with original ID:', actualThreadIdToDelete);
      // Deletion RLS policy should handle permissions
      const { error } = await supabase
        .from('message_threads')
        .delete()
        .eq('id', actualThreadIdToDelete);
        
      if (error) {
        console.error('DeleteThread Error: Supabase delete failed.', error);
        throw error; // Re-throw to be caught by the catch block
      }
      
      // console.log('DeleteThread Success: Thread deleted on server.');
      // Optimistic UI update: Filter out all views related to this original thread ID
      setMessageThreads(threads => threads.filter(t => t.original_thread_id !== actualThreadIdToDelete));
      
      // If the currently active thread was deleted, clear it
      if (activeThreadId?.startsWith(actualThreadIdToDelete)) {
        // console.log('DeleteThread: Clearing active thread ID.');
        setActiveThreadId(null);
      }
      toast.success('Conversation deleted successfully');
    } catch (error: any) {
      console.error('DeleteThread Error: Catch block reached.', error);
      // Display error based on Supabase error if available
      const errorMessage = error?.message || 'Failed to delete conversation. Please try again.';
      toast.error(errorMessage);
    } finally {
      // console.log('DeleteThread: Finalizing delete process.');
      setIsDeleteLoading(false);
      setIsDeleteDialogOpen(false);
      setThreadToDelete(null); // Always reset the ID to delete
    }
  };

  // --- Find Active Thread --- (No changes needed)
  const activeThread = messageThreads.find(thread => thread.id === activeThreadId);

  // --- Handle Company Click --- (No changes needed)
  const handleCompanyClick = async (companyId: string) => {
    if (!supabase) return;
    try {
      const { data: company, error } = await supabase
        .from('companies').select('*').eq('id', companyId).single();
      if (error) throw error;
      if (company) setSelectedCompanyForDialog({
        _id: company.id,
        name: company.name,
        company_id: company.id,
        slug: { current: company.slug || '' },
        logo: company.logo_url ? { asset: { url: company.logo_url } } : undefined,
        uploaded_logo_url: company.uploaded_logo_url,
        description: company.description || '',
        primaryRole: company.role,
        location: company.city ? `${company.city}, ${company.state || ''}` : null,
        projectCount: company.project_count || 0,
        rating: company.rating || null,
        reviewCount: company.review_count || 0,
        is_verified: company.is_verified || false,
        status: company.status || 'active',
        contact: {
          email: company.contact_email || null,
          phone: company.contact_phone || null,
          website: company.website_url || null
        }
      });
    } catch (error) {
      console.error('Error fetching company data for dialog:', error);
      toast.error('Failed to load company profile details');
    }
  };

  // --- Handle Select Thread --- (MODIFIED ORDER & LOGS)
  const handleSelectThread = (threadId: string) => {    
    // Set active thread ID FIRST
    setActiveThreadId(threadId);

    // Open mobile view if needed
    if (isMobile) {
      setIsMobileThreadOpen(true);
    }

    // --- Start Optimistic Count Update (Now second) ---
    const selectedThread = messageThreads.find(t => t.id === threadId);
    if (selectedThread && selectedThread.unread_count > 0) {
      setMessageThreads(prevThreads => {
        const updatedThreads = prevThreads.map(t => 
          t.id === threadId ? { ...t, unread_count: 0 } : t
        );
        // Notify parent immediately with the optimistic count
        calculateUnreadCount(updatedThreads); 
        return updatedThreads;
      });
    }
    // --- End Optimistic Count Update ---

    // markMessagesAsRead will be called by the useEffect hook watching activeThreadId
  };

  // --- Handle Close Mobile Thread --- (No changes needed)
  const handleCloseMobileThread = () => {
    setIsMobileThreadOpen(false);
  };

  // --- Handle Open Delete Dialogs --- (No changes needed)
  const handleOpenDeleteThreadDialog = (threadId: string) => {
    setThreadToDelete(threadId);
    setIsDeleteDialogOpen(true);
  };
  const handleOpenDeleteMessageDialog = (messageId: string) => {
    setMessageToDelete(messageId);
    setIsDeleteMessageDialogOpen(true);
  };

  // --- Handle Retry Send --- (REFACTORED)
  const handleRetrySend = async (failedMessage: Message) => {
    const currentActiveThread = messageThreads.find(t => t.id === activeThreadId);
    if (!currentActiveThread || !user?.id || !failedMessage.id.startsWith('error-') || !supabase) return;
    
    const actualThreadId = currentActiveThread.original_thread_id;
    const originalTempId = failedMessage.id.replace('error-', '');
    const messageContent = failedMessage.content;
    // Get sender details from the failed message itself
    const senderParticipantId = failedMessage.sender_id;
    const senderParticipantType = failedMessage.sender_type;

    // Optimistic UI: Back to sending state
    setMessageThreads(currentThreads =>
      currentThreads.map(thread => thread.id === activeThreadId ? { ...thread, messages: thread.messages.map(msg => msg.id === failedMessage.id ? { ...msg, id: originalTempId, error: undefined } : msg) } : thread)
    );
    
    setIsSending(true);
    try {
      // Insert with correct sender details
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({ content: messageContent, thread_id: actualThreadId, sender_id: senderParticipantId, sender_type: senderParticipantType })
        .select()
        .single();

      if (error) throw error;

      // Update message ID from temp to actual
      setMessageThreads(currentThreads =>
        currentThreads.map(thread => thread.id === activeThreadId ? { ...thread, messages: thread.messages.map(msg => msg.id === originalTempId ? insertedMessage : msg) } : thread)
      );

    } catch (error) {
      console.error('Error retrying message:', error);
      toast.error('Failed to send message again');
      // Revert back to error state
      setMessageThreads(currentThreads =>
        currentThreads.map(thread => thread.id === activeThreadId ? { ...thread, messages: thread.messages.map(msg => msg.id === originalTempId ? { ...failedMessage, id: `error-${originalTempId}` } : msg) } : thread)
      );
    } finally {
      setIsSending(false);
    }
  };

  // --- Handle Delete Message --- (REFACTORED)
  const handleDeleteMessage = async () => {
    if (!messageToDelete || !activeThreadId || !user?.id) {
       console.error("DeleteMessage: Pre-check failed", { messageToDelete, activeThreadId, userId: user?.id }); // Added log
       return;
    }

    const messageIdToDelete = messageToDelete;
    const currentActiveThreadView = messageThreads.find(t => t.id === activeThreadId);
    const messageBeingDeleted = currentActiveThreadView?.messages.find(m => m.id === messageIdToDelete);
    
    if (!currentActiveThreadView || !messageBeingDeleted) {
       console.error("DeleteMessage: Message or Thread View not found", { messageIdToDelete, currentActiveThreadView, messageBeingDeleted }); // Added log
       // Clear state even if not found, just in case
       setIsDeleteMessageDialogOpen(false);
       setMessageToDelete(null);
       return; 
    }

    // Determine sender of the message being deleted
    const senderParticipantId = messageBeingDeleted.sender_id;
    const senderParticipantType = messageBeingDeleted.sender_type;
    // console.log("DeleteMessage: Message details", { messageIdToDelete, senderParticipantId, senderParticipantType }); // Added log

    // Check permissions client-side (match RLS logic)
    const isMyUserMessage = senderParticipantType === 'user' && senderParticipantId === user.id;
    // Ensure userCompanies is loaded before checking
    const isMyCompanyMessage = senderParticipantType === 'company' && userCompanies && userCompanies.some(c => c.id === senderParticipantId);
    // console.log("DeleteMessage: Permission check", { isMyUserMessage, isMyCompanyMessage, userId: user.id, userCompanies }); // Added log

    if (!isMyUserMessage && !isMyCompanyMessage) {
      console.warn("DeleteMessage: Permission denied client-side."); // Added log
      toast.error("You can only delete your own messages.");
      setIsDeleteMessageDialogOpen(false); // Close dialog if no permission
      setMessageToDelete(null);
      return;
    }

    // Reset state variables *before* async operation
    const originalMessageToDelete = messageToDelete; // Store ID before resetting
    setMessageToDelete(null); 
    setIsDeleteMessageLoading(true);
    setIsDeleteMessageDialogOpen(false); // Close dialog immediately

    // Optimistic UI: Remove the message
    const originalThreads = messageThreads;
    const updateThreadsOptimistically = (threads: MessageThread[]) => 
      threads.map(thread => {
        if (thread.original_thread_id === currentActiveThreadView.original_thread_id) {
          const remainingMessages = thread.messages.filter(msg => msg.id !== messageIdToDelete);
          // Recalculate preview and last message time based on remaining messages
          const lastMsg = remainingMessages[remainingMessages.length - 1];
          let preview = 'No messages yet';
          if (lastMsg) {
              // Determine if the *new* last message was sent from this view's perspective
              const viewPerspectiveId = thread.id.includes('-as-') ? thread.id.split('-as-')[1] : user?.id;
              const viewPerspectiveType = thread.id.includes('-as-') ? 'company' : 'user';
              const isSentByPerspective = lastMsg.sender_id === viewPerspectiveId && lastMsg.sender_type === viewPerspectiveType;
              const prefix = isSentByPerspective ? "You: " : "";
              preview = prefix + (lastMsg.content.length > 35 ? lastMsg.content.slice(0, 35) + '...' : lastMsg.content);
          }
          return {
            ...thread,
            messages: remainingMessages,
            last_message_preview: preview,
            // Update last_message_at to the timestamp of the new last message, or keep original if no messages left
            last_message_at: lastMsg?.created_at || thread.last_message_at, 
          };
        }
        return thread;
      }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    // console.log("DeleteMessage: Optimistic UI update applied for message ID:", originalMessageToDelete); // Changed log variable
    setMessageThreads(updateThreadsOptimistically(messageThreads));
    if (!supabase) return;
    try {
      // console.log("DeleteMessage: Calling Supabase delete for message ID:", originalMessageToDelete); // Changed log variable
      // Delete based on message ID, RLS handles permission
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', originalMessageToDelete); // Use stored ID

      if (error) {
        console.error("DeleteMessage: Supabase delete error", error); // Added log
        throw error;
      }

      // console.log("DeleteMessage: Supabase delete successful for message ID:", originalMessageToDelete); // Changed log variable
      toast.success('Message deleted');
      // Recalculate unread counts after successful server delete
      setMessageThreads(currentThreads => {
        const finalThreads = updateThreadsOptimistically(currentThreads); // Ensure the list is consistently updated before calculating count
        calculateUnreadCount(finalThreads); 
        return finalThreads;
      });

    } catch (error: any) {
      console.error("DeleteMessage: Catch block reached", error); // Added log
      toast.error('Failed to delete message. Reverted local change.');
      // Revert UI state and recalculate count based on original state
      setMessageThreads(originalThreads); 
      calculateUnreadCount(originalThreads); 
    } finally {
      // console.log("DeleteMessage: Finalizing for message ID:", originalMessageToDelete); // Changed log variable
      setIsDeleteMessageLoading(false);
      // No need to close dialog or reset messageToDelete here, already done
    }
  };

  // --- Define Current User Participant --- (ROBUST FALLBACK)
  const currentUser: Participant | null = user ? {
    type: 'user',
    id: user.id,
    // Prioritize full_name, then email, then fallback
    name: user.full_name || user.email || 'Personal Profile', 
    avatar_url: user.avatar_url || null,
  } : null;

  // --- Return JSX --- (Structure remains same, props passed down use new types)
  return (
    <>
      <div className={cn(
        "w-full flex flex-row border-b rounded-lg overflow-hidden bg-card shadow-sm",
        "h-[calc(100dvh)] md:h-[calc(100dvh-49px)]",
      )}>
        {isLoading ? (
           <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        // ) : !isProPlan ? (
        //   <div className="flex-1 flex items-center justify-center p-6">
        //     <EmptyState
        //       icons={[Handshake]}
        //       title="Upgrade to Pro for Messaging"
        //       description="Connect directly with developers, brokers, and capital providers. Submit bids, discuss deals, and grow your network with DevProjects Pro."
        //       action={{
        //         label: 'Upgrade to Pro',
        //         onClick: () => setShowPricingDialog(true)
        //     }}
        //     />
        //   </div>
        ) : (
          <>
            {/* ThreadList: Props use updated types */}
            <ThreadList
              threads={messageThreads}
              activeThreadId={activeThreadId}
              isLoading={isLoading && messageThreads.length === 0}
              user={currentUser}
              onSelectThread={handleSelectThread}
              onDeleteThread={handleOpenDeleteThreadDialog}
              className={cn(
                "w-full md:w-1/3 md:max-w-sm border-r shrink-0 bg-background/50",
                (isMobile && isMobileThreadOpen) ? "hidden" : "",
                (!isMobile && activeThreadId) ? "hidden md:flex" : "flex md:flex"
              )}
            />

            {/* ActiveThreadView (Desktop): Props use updated types */}
            {!isMobile && activeThread && (
              <ActiveThreadView
                key={activeThread.id} 
                thread={activeThread} // Passed thread uses new structure
                user={currentUser}
                userCompanies={userCompanies}
                participantCache={participantCache}
                selectedCompanyId={activeThread.id.includes('-as-') ? activeThread.id.split('-as-')[1] : null}
                setSelectedCompanyId={() => {}} 
                isLoading={isLoading && !!activeThreadId && !activeThread}
                isSending={isSending}
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
                onBack={() => setActiveThreadId(null)} 
                onDeleteThread={() => { if (activeThread) handleOpenDeleteThreadDialog(activeThread.id); }}
                onCompanyClick={handleCompanyClick}
                onOpenDeleteMessageDialog={handleOpenDeleteMessageDialog}
                onRetrySend={handleRetrySend}
                onStartNewThread={async (initiator, other) => { 
                  await onStartNewThread(initiator, other); 
                }}
                className={cn("flex-1 flex flex-col", !activeThread && "hidden")}
              />
            )}

            {/* ActiveThreadView (Mobile Dialog): Props use updated types */}
            {isMobile && (
              <Dialog open={isMobileThreadOpen} onOpenChange={setIsMobileThreadOpen}>
                <VisuallyHidden><DialogTitle>Active Thread</DialogTitle></VisuallyHidden>
                <DialogContent 
                   showCloseButton={false} 
                   className={cn(
                     "w-full h-full",
                     "max-w-full",
                     "p-0 border-0 rounded-none bg-background",
                     "z-50 flex flex-col",
                     "pt-safe pb-safe",
                     "overflow-hidden",
                   )} 
                   onInteractOutside={(e) => e.preventDefault()}
                >
                   {activeThread && (
                       <ActiveThreadView
                          key={activeThread.id}
                          thread={activeThread} // Passed thread uses new structure
                          user={currentUser}
                          userCompanies={userCompanies}
                          participantCache={participantCache}
                          selectedCompanyId={activeThread.id.includes('-as-') ? activeThread.id.split('-as-')[1] : null}
                          setSelectedCompanyId={() => {}} 
                          isLoading={isLoading && !!activeThreadId && !activeThread}
                          isSending={isSending}
                          message={message}
                          setMessage={setMessage}
                          onSendMessage={handleSendMessage}
                          onBack={handleCloseMobileThread}
                          onDeleteThread={() => { if (activeThread) handleOpenDeleteThreadDialog(activeThread.id); }}
                          onCompanyClick={handleCompanyClick}
                          onOpenDeleteMessageDialog={handleOpenDeleteMessageDialog}
                          onRetrySend={handleRetrySend}
                          onStartNewThread={async (initiator, other) => {
                            await onStartNewThread(initiator, other);
                          }}
                          className="flex-1 flex flex-col"
                        />
                   )}
                </DialogContent>
              </Dialog>
            )}
             
            {/* --- Dialogs --- */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this conversation thread and all its messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleteLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteThread} disabled={isDeleteLoading}>
                    {isDeleteLoading ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
                    Delete Thread
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteMessageDialogOpen} onOpenChange={setIsDeleteMessageDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this message.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleteMessageLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteMessage} disabled={isDeleteMessageLoading}>
                    {isDeleteMessageLoading ? <Loader2 className="mr-0.5 h-4 w-4 animate-spin" /> : null}
                    Delete Message
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {selectedCompanyForDialog && <CompanyDialog company={selectedCompanyForDialog} onClose={() => setSelectedCompanyForDialog(null)} userCompanies={userCompanies} />}
          </>
        )}
      </div>
      <PricingDialog 
        isOpen={showPricingDialog} 
        onOpenChange={setShowPricingDialog} 
      />
    </>
  );
} 