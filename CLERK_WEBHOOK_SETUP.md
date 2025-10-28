# Clerk Webhook Setup Guide

This guide walks you through setting up Clerk webhooks to sync users to your `profiles` table.

## Why This is Needed

When users sign up via Clerk:
- Clerk creates a user account ✅
- RLS policies work (using `auth.jwt() ->> 'sub'`) ✅
- BUT your `profiles` table is empty ❌

Without profiles:
- Can't display usernames, avatars, personas
- Can't create articles (foreign key to `profiles.id`)
- Can't join companies (no `user_id` reference)
- Any JOIN with profiles fails

The webhook syncs Clerk users → `profiles` table automatically.

## Setup Steps

### 1. Deploy Your App (or Use ngrok for Local Testing)

**For Local Development:**
```bash
# Install ngrok
brew install ngrok

# Start your app
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**For Production:**
- Deploy to Vercel
- Use your production URL (e.g., https://connectcre.com)

### 2. Configure Webhook in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in the sidebar
4. Click **Add Endpoint**

5. **Enter Endpoint URL:**
   - Local: `https://961cf27cfe51.ngrok-free.app/api/webhooks/clerk`
   - Production: `https://connectcre.com/api/webhooks/clerk`

6. **Subscribe to Events:**
   - Check: `user.created`
   - Check: `user.updated`
   - Check: `user.deleted`

7. Click **Create**

8. **Copy the Signing Secret:**
   - Clerk will show you a signing secret (starts with `whsec_`)
   - Add it to your `.env.local`:
     ```
     CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     ```

### 3. Test the Webhook

#### Option A: Use Clerk Dashboard

1. In Clerk Dashboard → Webhooks
2. Click your webhook endpoint
3. Go to **Testing** tab
4. Click **Send Example** for `user.created`
5. Check the **Response** tab - should see 200 OK

#### Option B: Create a Real User

1. Go to your app's sign-up page
2. Create a new test account
3. Check your Supabase database:
   ```sql
   SELECT * FROM profiles;
   ```
4. You should see a new profile record with the Clerk user ID

### 4. Monitor Webhook Logs

In Clerk Dashboard → Webhooks → Your Endpoint:
- **Events** tab shows all webhook deliveries
- **Response** tab shows your API responses
- Green checkmarks = success
- Red X = failed (click to see error details)

## Troubleshooting

### Webhook Returns 400: Missing svix headers
- Check that you added the endpoint URL correctly
- Verify the endpoint is publicly accessible

### Webhook Returns 500: Failed to create profile
- Check your database connection
- Verify Supabase credentials in `.env.local`
- Check Supabase logs for SQL errors

### Profile Not Created
1. Check Clerk webhook logs (see if event was sent)
2. Check your Next.js logs (see if webhook was received)
3. Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
4. Check Supabase database for the profile

### Local Development Issues
- If using ngrok, make sure the URL hasn't expired (free tier expires after 2 hours)
- Restart ngrok and update the webhook URL in Clerk dashboard
- Make sure your app is running on port 3000

## What the Webhook Does

When a user signs up:
```
1. User clicks "Sign Up" → Clerk creates account
2. Clerk sends webhook → POST /api/webhooks/clerk
3. Webhook verifies signature → svix validates request
4. Webhook inserts profile → Supabase creates row:
   {
     clerk_id: "user_abc123",
     email: "user@example.com",
     full_name: "John Doe",
     avatar_url: "https://..."
   }
5. Profile exists → Articles, bookmarks, messages all work!
```

## Security Notes

- Webhook secret is used to verify requests are from Clerk
- NEVER commit `CLERK_WEBHOOK_SECRET` to git
- Always verify webhook signatures before processing
- The webhook handler uses Supabase client (respects RLS if needed)

## Next Steps

After webhook is working:
1. Test user signup flow end-to-end
2. Verify profile data is syncing correctly
3. Deploy to production and update webhook URL
4. Remove any test profiles from database
