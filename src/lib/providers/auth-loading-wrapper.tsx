'use client'

import { useUser } from '@clerk/nextjs'
import { useAuth } from './auth-context'
import { ReactNode } from 'react'

interface AuthLoadingWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthLoadingWrapper({ children, fallback }: AuthLoadingWrapperProps) {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser()
  const { loading: authLoading, user } = useAuth()

  // Wait for Clerk to load
  if (!clerkLoaded) {
    return fallback || <div>Loading authentication...</div>
  }

  // If signed in but auth context is still loading, wait
  if (isSignedIn && authLoading) {
    return fallback || <div>Loading profile...</div>
  }

  // If signed in but no user in context yet, wait a bit more
  if (isSignedIn && !authLoading && !user) {
    return fallback || <div>Syncing profile...</div>
  }

  return <>{children}</>
} 