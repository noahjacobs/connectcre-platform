import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { profiles } from './profiles';
import { projects } from './projects';

export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  content: jsonb('content').$type<any>().notNull().default({}), // Rich text JSON
  images: jsonb('images').$type<string[]>().notNull().default([]),
  author_id: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  city: text('city'),
  neighborhood: text('neighborhood'),
  tags: text('tags').array().notNull().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  published_at: timestamp('published_at'),
}, (table) => ({
  articlesReadPolicy: pgPolicy("articles_read", {
    as: "permissive",
    for: "select",
    to: ["authenticated", "anon"],
    using: sql`(published_at IS NOT NULL)` // Anyone can read published articles
  }),
  articlesModifyPolicy: pgPolicy("articles_modify", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(author_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`,
    withCheck: sql`(author_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`
  }),
}));
