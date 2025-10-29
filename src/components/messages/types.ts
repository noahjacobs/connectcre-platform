// Message-related types for the messages feature

// Basic user details type (moved from tracking feature)
export interface BasicUserDetails {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface Message {
  id: string;
  thread_id: string;
  created_at: string;
  content: string;
  sender_id: string; // ID of the sender (user or company)
  sender_type: 'user' | 'company'; // Type of the sender
  read_at: string | null;
  error?: string; // For optimistic UI errors
  // Optional nested sender info (if fetched)
  sender_profile?: BasicUserDetails | null; // For user sender
  sender_company?: SimpleCompanyProfile | null; // For company sender
}

// Represents a MessageThread from the perspective of one participant
export interface MessageThread {
  id: string; // Unique ID for this view (original_thread_id or original_thread_id-as-company_id)
  original_thread_id: string; // The actual UUID from the message_threads table
  other_participant: Participant;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  messages: Message[]; // All messages for the thread
}

// Raw thread data from Supabase (before transformation into MessageThread views)
export interface SupabaseMessageThread {
  id: string;
  participant_a_id: string;
  participant_a_type: 'user' | 'company';
  participant_b_id: string;
  participant_b_type: 'user' | 'company';
  last_message_at: string | null;
  metadata: any;
  messages: Message[]; // Initially fetched messages (need processing)
}

// General participant type (User or Company)
export interface Participant {
  type: 'user' | 'company';
  id: string;
  name: string;
  avatar_url?: string | null; // For users
  logo_url?: string | null; // For companies
}

// Simplified profiles used within messages component
interface SimpleUserProfile {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
}

interface SimpleCompanyProfile {
    id: string;
    name: string;
    logo_url?: string | null;
}

export interface GroupedMessages {
  date: string;
  messages: Message[];
} 