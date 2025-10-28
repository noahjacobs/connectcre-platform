import { pgTable, text, timestamp, uuid, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';

export const messageThreads = pgTable('message_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  participant_a_id: uuid('participant_a_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  participant_b_id: uuid('participant_b_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  last_message_at: timestamp('last_message_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  messageThreadsAccessPolicy: pgPolicy("message_threads_access", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(participant_a_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))) OR participant_b_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`,
    withCheck: sql`(participant_a_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))) OR participant_b_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`
  }),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  thread_id: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
  sender_id: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  read_at: timestamp('read_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  messagesAccessPolicy: pgPolicy("messages_access", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(EXISTS (SELECT 1 FROM message_threads WHERE message_threads.id = thread_id AND (message_threads.participant_a_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))) OR message_threads.participant_b_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))))`,
    withCheck: sql`(sender_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`
  }),
}));
