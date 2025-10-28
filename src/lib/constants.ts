// App-wide constants
export const APP_NAME = 'ConnectCRE';
export const APP_DESCRIPTION = 'Commercial Real Estate News & Projects Platform';

// Property types
export const PROPERTY_TYPES = [
  'Residential',
  'Commercial',
  'Mixed-Use',
  'Industrial',
  'Retail',
  'Office',
  'Hospitality',
  'Healthcare',
  'Education',
] as const;

// Project statuses
export const PROJECT_STATUSES = [
  'proposed',
  'approved',
  'under_construction',
  'completed',
] as const;

// User personas
export const USER_PERSONAS = [
  'Developer',
  'Broker',
  'Architect',
  'Contractor',
  'Investor',
  'Property Manager',
  'Other',
] as const;

// Company categories
export const COMPANY_CATEGORIES = [
  'Developer',
  'Architecture',
  'Engineering',
  'Construction',
  'Brokerage',
  'Property Management',
  'Investment',
  'Legal',
  'Other',
] as const;

// Pagination
export const ARTICLES_PER_PAGE = 12;
export const PROJECTS_PER_PAGE = 12;
export const COMPANIES_PER_PAGE = 20;
