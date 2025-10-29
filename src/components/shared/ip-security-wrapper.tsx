'use client'

import React, { useEffect, useState } from 'react'
import { useArticleViews } from '@/lib/providers/article-views'
import { BlockedAccess } from '@/components/blocked-access'

interface IPSecurityWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function IPSecurityWrapper({ children, fallback }: IPSecurityWrapperProps) {
  const { isBlocked, blockReason, isLoading } = useArticleViews()

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    )
  }

  // Show blocked access if IP is blocked
  if (isBlocked) {
    return <BlockedAccess reason={blockReason} />
  }

  return <>{children}</>
}

// Higher-order component version
export function withIPSecurity<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  const WrappedComponent = (props: T) => {
    return (
      <IPSecurityWrapper>
        <Component {...props} />
      </IPSecurityWrapper>
    )
  }

  WrappedComponent.displayName = `withIPSecurity(${Component.displayName || Component.name})`
  return WrappedComponent
} 