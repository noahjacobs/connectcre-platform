import { pgTable, text, timestamp, uuid, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  item_type: text('item_type').notNull(), // article | project
  item_id: uuid('item_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  bookmarksAccessPolicy: pgPolicy("bookmarks_access", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`,
    withCheck: sql`(user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`
  }),
}));
