'use client'

import { useState } from 'react';
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from '@/lib/providers/auth-context';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Loader2, Building2, User } from 'lucide-react';
import { AuthModal } from '@/components/ui/auth-modal';
import { UserCompany } from '@/hooks/use-user-companies';
import { useRouter } from 'next/navigation';
import { PricingDialog } from '@/components/ui/pricing-dialog';
import { useSubscription } from '@/lib/providers/subscription-context';
import { sendThreadCreationNotification } from '@/components/messages/utils';

// Type for user's managed companies (mirrors client-layout)
interface ManagedCompany {
  id: string; // Supabase company ID
  name: string;
  logo_url?: string | null;
}

// Type for the target companies passed as props
interface TargetCompany {
  id: string; // Supabase company ID
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    is_verified: boolean;
  };
  role: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ContactDevelopersProps {
  targetCompanies: TargetCompany[];
  projectSlug: string | null;
  projectName?: string | null;
  trigger: React.ReactNode;
  userCompanies: UserCompany[];
}

export function ContactDevelopers({ 
  targetCompanies,
  projectSlug,
  projectName,
  trigger,
  userCompanies
}: ContactDevelopersProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [interestType, setInterestType] = useState('general');
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedSenderIdentity, setSelectedSenderIdentity] = useState<'personal' | string>('personal'); // 'personal' or company ID
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const { hasMembershipAccess } = useSubscription();
  const { supabase } = useSupabase();

  const handleSendMessageToDevelopers = async () => {
    // console.log('[ContactDevelopers] handleSendMessageToDevelopers called');
    if (!user || !supabase) {
      // console.log('[ContactDevelopers] User not logged in, showing auth modal');
      setDialogOpen(false); // Close current dialog first
      setShowAuthModal(true);
      return;
    }
    if (!messageContent.trim()) {
      // console.log('[ContactDevelopers] Message content is empty');
      toast.error("Please enter a message.");
      return;
    }
    if (!projectSlug) {
        // console.log('[ContactDevelopers] Project slug is missing');
        toast.error("Cannot send message: project identifier is missing.");
        return;
    }
    if (!targetCompanies || targetCompanies.length === 0) {
      // console.log('[ContactDevelopers] No target companies provided');
      toast.error("No project team found to contact.");
      return;
    }

    // console.log('[ContactDevelopers] Starting message sending process...');
    setIsSendingMessage(true);
    toast.loading("Sending message(s)...");

    try {
      const senderId = user.id;
      const sendingCompanyId = selectedSenderIdentity !== 'personal' ? selectedSenderIdentity : null;
      const finalMessage = `Regarding ${projectName || 'project ' + projectSlug}:
Interest Type: ${interestType.charAt(0).toUpperCase() + interestType.slice(1)}
Message: ${messageContent}`;
      // console.log('[ContactDevelopers] Sender:', { senderId, sendingCompanyId, selectedSenderIdentity });
      // console.log('[ContactDevelopers] Target companies (IDs):', targetCompanies.map(c => c.companies.id));

      const messagePromises = targetCompanies.map(async (target) => {
        const targetCompanyId = target.companies.id;
        // console.log(`[ContactDevelopers] Processing target company (Supabase ID: ${targetCompanyId})`);

        if (!targetCompanyId) {
          console.warn(`[ContactDevelopers] Missing Supabase company ID for a target company entry. Skipping.`);
          return; // Skip if no ID
        }

        // Determine participant types and IDs based on sender identity
        let initiatingParticipantType: 'user' | 'company';
        let initiatingParticipantId: string;
        let targetParticipantType: 'user' | 'company' = 'company';
        let targetParticipantId: string = targetCompanyId;

        if (sendingCompanyId) {
          // User is sending as a company
          initiatingParticipantType = 'company';
          initiatingParticipantId = sendingCompanyId;
        } else {
          // User is sending as themselves (personal)
          initiatingParticipantType = 'user';
          initiatingParticipantId = senderId;
        }

        // Normalize participant order (alphabetical by type, then id) as per schema constraint
        const participants = [
          { type: initiatingParticipantType, id: initiatingParticipantId },
          { type: targetParticipantType, id: targetParticipantId }
        ];
        participants.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
          return a.id.localeCompare(b.id);
        });
        const participantA = participants[0];
        const participantB = participants[1];

        // Find or Create Thread with metadata filter for project slug
        const threadMetadata = { project_slug: projectSlug };
        let threadId: string | null = null;

        // console.log(`[ContactDevelopers] Looking for thread between participants:`, {
        //   participantA,
        //   participantB,
        //   metadata: threadMetadata
        // });

        const { data: existingThread, error: threadFindError } = await supabase
            .from('message_threads')
            .select('id')
            .eq('participant_a_type', participantA.type)
            .eq('participant_a_id', participantA.id)
            .eq('participant_b_type', participantB.type)
            .eq('participant_b_id', participantB.id)
            .eq('metadata->>project_slug', projectSlug)
            .maybeSingle();

        if (threadFindError) {
           console.error(`[ContactDevelopers] Error finding thread for company ${targetCompanyId}:`, threadFindError);
           // Continue to attempt creation
        }

        let isNewThread = false;
        if (existingThread) {
          threadId = existingThread.id;
          // console.log(`[ContactDevelopers] Found existing thread ID: ${threadId}`);
        } else {
          // console.log(`[ContactDevelopers] No existing thread found for company ${targetCompanyId}. Attempting to create new thread.`);
          const insertData = {
            participant_a_type: participantA.type,
            participant_a_id: participantA.id,
            participant_b_type: participantB.type,
            participant_b_id: participantB.id,
            metadata: threadMetadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString()
          };
          
          const { data: newThread, error: createError } = await supabase
            .from('message_threads')
            .insert(insertData)
            .select('id')
            .single();

          if (createError) {
            console.error(`[ContactDevelopers] Error creating thread for company ${targetCompanyId}:`, createError);
            // Throw or return to stop this specific promise
            throw new Error(`Failed to create thread for ${targetCompanyId}`); 
          }
          threadId = newThread.id;
          isNewThread = true;
          // console.log(`[ContactDevelopers] Created new thread ID: ${threadId}`);
        }

        // Send email notification if this is a new thread
        if (isNewThread && threadId) {
          const targetParticipant = {
            type: 'company' as const,
            id: targetCompanyId,
            name: target.companies.name,
            logo_url: target.companies.uploaded_logo_url || target.companies.logo_url
          };
          await sendThreadCreationNotification(targetParticipant, threadId);
        }

        if (!threadId) {
          console.error(`[ContactDevelopers] Failed to get thread ID for company ${targetCompanyId}`);
          throw new Error(`Failed to get thread ID for ${targetCompanyId}`); 
        }

        // Insert Message with correct sender_type and sender_id
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            sender_type: initiatingParticipantType,
            sender_id: initiatingParticipantId,
            content: finalMessage,
            created_at: new Date().toISOString(),
          });

        if (messageError) {
          console.error(`[ContactDevelopers] Error sending message to thread ${threadId} for company ${targetCompanyId}:`, messageError);
          throw new Error(`Failed to send message for ${targetCompanyId}`);
        } else {
          // console.log(`[ContactDevelopers] Successfully sent message to thread ${threadId} for company ${targetCompanyId}`);
        }
      }); // End map

      // Wait for all message sending attempts
      await Promise.all(messagePromises);
      // console.log('[ContactDevelopers] Finished processing all target companies.');

      toast.dismiss(); // Dismiss loading toast
      toast.success("Message sent successfully to the project team!");
      setMessageContent(''); // Clear message input
      setDialogOpen(false); // Close dialog
      router.push('/messages?messages=true'); // Redirect to messages dashboard

    } catch (error) {
      console.error("[ContactDevelopers] Error sending message(s):", error);
      toast.dismiss(); // Dismiss loading toast
      // Provide a more specific error if possible, otherwise generic
      const message = error instanceof Error ? error.message : "An error occurred while sending the message(s).";
      toast.error(message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild onClick={(e) => {
          if (!user) {
            e.preventDefault();
            setShowAuthModal(true);
          } else if (!hasMembershipAccess) {
            e.preventDefault();
            setShowPricingDialog(true);
          }
        }}>
          {trigger}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Project Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Send a message to the companies involved in this project to express your interest or ask questions.
            </p>

            {/* "Send As" Selector */}
            {userCompanies.length > 0 && (
              <div className="space-y-2">
                <Label>Send As</Label>
                <Select value={selectedSenderIdentity} onValueChange={setSelectedSenderIdentity}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      {selectedSenderIdentity === 'personal' ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                            {user?.avatar_url ? (
                              <Image src={user.avatar_url} alt="You" width={24} height={24} className="object-contain"/>
                            ) : (
                              <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <span className="truncate">{user?.full_name || user?.email || 'Personal Account'}</span>
                        </>
                      ) : (
                        userCompanies.find(c => c.id === selectedSenderIdentity) && (
                          <>
                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                              {userCompanies.find(c => c.id === selectedSenderIdentity)?.logo_url ? (
                                <img 
                                  src={userCompanies.find(c => c.id === selectedSenderIdentity)!.logo_url!} 
                                  alt={userCompanies.find(c => c.id === selectedSenderIdentity)!.name} 
                                  className="w-full h-full object-contain" 
                                />
                              ) : (
                                <Building2 className="h-3.5 w-3.5 text-gray-600 dark:text-zinc-400" />
                              )}
                            </div>
                            <span className="truncate">
                              {userCompanies.find(c => c.id === selectedSenderIdentity)?.name}
                            </span>
                          </>
                        )
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal" className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                          {user?.avatar_url ? (
                            <Image src={user.avatar_url} alt="You" width={24} height={24} className="object-contain"/>
                          ) : (
                            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <span className="truncate">{user?.full_name || user?.email || 'Personal Account'}</span>
                      </div>
                    </SelectItem>
                    {userCompanies.length > 0 && (
                      <>
                        <div className="px-2 py-1.5">
                          <div className="text-xs text-muted-foreground font-medium">Your Companies</div>
                        </div>
                        {userCompanies.map(company => (
                          <SelectItem key={company.id} value={company.id} className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {company.logo_url ? (
                                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                                ) : (
                                  <Building2 className="h-3.5 w-3.5 text-gray-600 dark:text-zinc-400" />
                                )}
                              </div>
                              <span className="truncate">{company.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contact-interest">Interest Type</Label>
              <Select value={interestType} onValueChange={setInterestType}>
                <SelectTrigger id="contact-interest">
                  <SelectValue placeholder="Select your interest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="investment">Investment Opportunity</SelectItem>
                  <SelectItem value="services">Service Provider</SelectItem>
                  <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                placeholder={`Express your interest or ask a question about ${projectName || 'this project'}...`}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSendMessageToDevelopers}
              disabled={isSendingMessage || !targetCompanies || targetCompanies.length === 0}
            >
              {isSendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isSendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Your message will be shared with the project team.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        trigger={<div style={{ display: 'none' }} />} // Hidden trigger
        returnTo={projectSlug ? `/project/${projectSlug}` : undefined}
      />
      <PricingDialog
        isOpen={showPricingDialog}
        onOpenChange={setShowPricingDialog}
      />
    </>
  );
} 