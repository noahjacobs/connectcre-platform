import { pgTable, text, timestamp, uuid, real, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './companies';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  address: text('address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  city: text('city'),
  neighborhood: text('neighborhood'),
  status: text('status').notNull().default('proposed'), // proposed | approved | under_construction | completed
  property_types: text('property_types').array().notNull().default([]),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().notNull().default({}),
  company_id: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  published_at: timestamp('published_at'),
}, (table) => ({
  projectsReadPolicy: pgPolicy("projects_read", {
    as: "permissive",
    for: "select",
    to: ["authenticated", "anon"],
    using: sql`(published_at IS NOT NULL)` // Anyone can read published projects
  }),
  projectsModifyPolicy: pgPolicy("projects_modify", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(company_id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))))`,
    withCheck: sql`(company_id IN (SELECT company_id FROM company_members WHERE user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))))`
  }),
}));
