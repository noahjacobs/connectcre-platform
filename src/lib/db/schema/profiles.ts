import { pgTable, text, timestamp, uuid, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerk_id: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  full_name: text('full_name'),
  avatar_url: text('avatar_url'),
  persona: text('persona'), // Developer, Broker, Architect, etc.
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  profilesAccessPolicy: pgPolicy("profiles_access", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))`,
    withCheck: sql`(clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))`
  }),
}));
