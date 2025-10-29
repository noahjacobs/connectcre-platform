import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise: Promise<any> | null = null

export interface FingerprintResult {
  visitorId: string
  isBlocked: boolean
  blockReason?: string
}

/**
 * Get fingerprint (client-side only)
 */
export async function getFingerprint(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
  }
  
  const fp = await fpPromise
  const result = await fp.get()
  return result.visitorId
}

/**
 * Check if IP should be blocked before processing request (client-side API call)
 */
export async function checkIPBeforeRequest(): Promise<{
  allowed: boolean
  blockReason?: string
}> {
  try {
    const response = await fetch('/api/check-ip-security')
    
    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 403) {
        return {
          allowed: false,
          blockReason: errorData.reason || 'Access blocked due to suspicious activity'
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking IP security:', error)
    // Allow request if check fails to prevent legitimate users from being blocked
    return { allowed: true }
  }
} 