"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getFingerprint, checkIPBeforeRequest } from '@/lib/utils/fingerprint'
import { trackArticleView, getArticleViewCount } from '@/components/posts/actions/post-analytics'

interface ArticleViewsContextType {
  viewedArticles: string[]
  addArticleView: (articleId: string) => Promise<void>
  hasReachedLimit: boolean
  MAX_FREE_ARTICLES: number
  isLoading: boolean
  isBlocked: boolean
  blockReason?: string
}

const ArticleViewsContext = createContext<ArticleViewsContextType | undefined>(undefined)

export function ArticleViewsProvider({ children }: { children: React.ReactNode }) {
  const [viewedArticles, setViewedArticles] = useState<string[]>([])
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState<string>()
  const MAX_FREE_ARTICLES = 5

  useEffect(() => {
    const checkViewCount = async () => {
      try {
        // First check if IP is blocked by calling our API endpoint
        const ipCheck = await checkIPBeforeRequest()
        if (!ipCheck.allowed) {
          setIsBlocked(true)
          setBlockReason(ipCheck.blockReason || 'Access blocked due to suspicious activity')
          setIsLoading(false)
          return
        }

        // If IP is not blocked, proceed with fingerprint check
        const fingerprint = await getFingerprint()
        const viewData = await getArticleViewCount(fingerprint, 30)
        setHasReachedLimit(viewData.count >= MAX_FREE_ARTICLES)
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking view count:', error)
        
        // Check if error is due to IP blocking
        if (error instanceof Error && error.message.includes('Access blocked')) {
          setIsBlocked(true)
          setBlockReason(error.message)
        }
        
        setIsLoading(false)
      }
    }

    checkViewCount()
  }, [])

  const addArticleView = useCallback(async (articleId: string) => {
    try {
      // If already blocked, don't attempt to track
      if (isBlocked) {
        console.warn('Cannot track article view: IP is blocked')
        return
      }

      const fingerprint = await getFingerprint()

      const viewData = await getArticleViewCount(fingerprint)
      const willSeeUpsell = viewData.count >= MAX_FREE_ARTICLES

      await trackArticleView(articleId, fingerprint, willSeeUpsell)
      
      if (!viewedArticles.includes(articleId)) {
        setViewedArticles(prev => [...prev, articleId])
      }

      if (willSeeUpsell) {
        if (!hasReachedLimit) {
            setHasReachedLimit(true);
        }
      } else {
        setHasReachedLimit((viewData.count + 1) >= MAX_FREE_ARTICLES);
      }

    } catch (error) {
      console.error('Error tracking article view:', error)
      
      // Check if error is due to IP blocking
      if (error instanceof Error && error.message.includes('Access blocked')) {
        setIsBlocked(true)
        setBlockReason(error.message)
      }
    }
  }, [viewedArticles, MAX_FREE_ARTICLES, hasReachedLimit, isBlocked])

  const value = useMemo(() => ({
    viewedArticles, 
    addArticleView, 
    hasReachedLimit,
    MAX_FREE_ARTICLES,
    isLoading,
    isBlocked,
    blockReason
  }), [
    viewedArticles, 
    addArticleView,
    hasReachedLimit,
    MAX_FREE_ARTICLES,
    isLoading,
    isBlocked,
    blockReason
  ])

  return (
    <ArticleViewsContext.Provider value={value}>
      {children}
    </ArticleViewsContext.Provider>
  )
}

export function useArticleViews() {
  const context = useContext(ArticleViewsContext)
  if (context === undefined) {
    throw new Error('useArticleViews must be used within an ArticleViewsProvider')
  }
  return context
} 