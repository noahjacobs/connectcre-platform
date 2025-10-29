import { createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/privacy-policy',
  '/tou',
  '/auth(.*)',
  '/api/webhooks(.*)',
  '/api/newsletter(.*)',
  '/api/send-feedback-email(.*)',
  // Add any other public routes
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/tracking(.*)',
  '/company(.*)',
  '/directory(.*)',
  '/messages(.*)',
  '/data(.*)',
]);

export { isPublicRoute, isProtectedRoute }; 