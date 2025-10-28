import { pgTable, text, timestamp, uuid, boolean, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  logo_url: text('logo_url'),
  website_url: text('website_url'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  categories: text('categories').array().notNull().default([]),
  status: text('status').notNull().default('pending'), // pending | approved
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companiesReadPolicy: pgPolicy("companies_read", {
    as: "permissive",
    for: "select",
    to: ["authenticated"],
    using: sql`true` // All authenticated users can read companies
  }),
  companiesModifyPolicy: pgPolicy("companies_modify", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = id AND company_members.user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))))`,
    withCheck: sql`(EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = id AND company_members.user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text)))))`
  }),
}));

export const companyMembers = pgTable('company_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  company_id: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull(),
  role: text('role').notNull().default('member'), // owner | admin | member
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  companyMembersReadPolicy: pgPolicy("company_members_read", {
    as: "permissive",
    for: "select",
    to: ["authenticated"],
    using: sql`true` // All authenticated users can see company members
  }),
  companyMembersModifyPolicy: pgPolicy("company_members_modify", {
    as: "permissive",
    for: "all",
    to: ["authenticated"],
    using: sql`(user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`,
    withCheck: sql`(user_id = (SELECT id FROM profiles WHERE clerk_id = (SELECT (auth.jwt() ->> 'sub'::text))))`
  }),
}));
