import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Get the Clerk webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', {
      status: 400,
    });
  }

  // Handle the webhook event
  const eventType = evt.type;
  const supabase = await createServerSupabaseClient();

  try {
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      // Insert new profile
      const { error } = await supabase.from('profiles').insert({
        clerk_id: id,
        email: email_addresses[0]?.email_address || '',
        full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        avatar_url: image_url || null,
      });

      if (error) {
        console.error('Error creating profile:', error);
        return new Response('Error: Failed to create profile', {
          status: 500,
        });
      }

      console.log('✅ User profile created:', id);
    } else if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({
          email: email_addresses[0]?.email_address || '',
          full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_id', id);

      if (error) {
        console.error('Error updating profile:', error);
        return new Response('Error: Failed to update profile', {
          status: 500,
        });
      }

      console.log('✅ User profile updated:', id);
    } else if (eventType === 'user.deleted') {
      const { id } = evt.data;

      // Delete profile (cascade will handle related records)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('clerk_id', id);

      if (error) {
        console.error('Error deleting profile:', error);
        return new Response('Error: Failed to delete profile', {
          status: 500,
        });
      }

      console.log('✅ User profile deleted:', id);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error: Failed to process webhook', {
      status: 500,
    });
  }

  return new Response('Webhook processed successfully', { status: 200 });
}
