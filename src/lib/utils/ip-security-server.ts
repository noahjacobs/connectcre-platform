import 'server-only'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

// Rate limiting constants
const MAX_FINGERPRINTS_PER_IP = 10 // Max unique fingerprints from same IP in time window
const MAX_REQUESTS_PER_MINUTE = 30 // Max requests per minute from same IP
const TIME_WINDOW_HOURS = 24 // Time window for fingerprint tracking

export interface IPSecurityCheck {
  isBlocked: boolean
  blockReason?: string
  shouldBlock?: boolean
  fingerprintCount?: number
}

/**
 * Extract client IP address from Next.js request
 */
export function getClientIP(request: NextRequest | Request): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to remote address (might not be available in serverless)
  return '127.0.0.1'
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: NextRequest | Request): string {
  return request.headers.get('user-agent') || 'Unknown'
}

/**
 * Check if an IP address is blocked and should be blocked
 */
export async function checkIPSecurity(ipAddress: string): Promise<IPSecurityCheck> {
  try {
    // Check if IP is already blocked
    const { data: ipData, error: ipError } = await supabaseServer
      .from('ip_blocking')
      .select('*')
      .eq('ip_address', ipAddress)
      .maybeSingle()

    if (ipError && ipError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking IP blocking status:', ipError)
      return { isBlocked: false }
    }

    // If IP is already blocked, return blocked status
    if (ipData?.is_blocked) {
      return {
        isBlocked: true,
        blockReason: ipData.block_reason || 'IP address blocked for suspicious activity'
      }
    }

    // Check for suspicious activity patterns
    const suspiciousActivity = await detectSuspiciousActivity(ipAddress)
    
    return {
      isBlocked: false,
      shouldBlock: suspiciousActivity.shouldBlock,
      fingerprintCount: suspiciousActivity.fingerprintCount
    }
  } catch (error) {
    console.error('Error in IP security check:', error)
    return { isBlocked: false }
  }
}

/**
 * Detect suspicious activity from an IP address
 */
async function detectSuspiciousActivity(ipAddress: string): Promise<{
  shouldBlock: boolean
  fingerprintCount: number
  reason?: string
}> {
  const timeWindowStart = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  try {
    // Count unique fingerprints from this IP in the time window
    const { data: fingerprintData, error: fingerprintError } = await supabaseServer
      .from('fingerprint_ip_tracking')
      .select('fingerprint_id')
      .eq('ip_address', ipAddress)
      .gte('created_at', timeWindowStart)

    if (fingerprintError) {
      console.error('Error checking fingerprint activity:', fingerprintError)
      return { shouldBlock: false, fingerprintCount: 0 }
    }

    const uniqueFingerprints = new Set(fingerprintData?.map(d => d.fingerprint_id) || [])
    const fingerprintCount = uniqueFingerprints.size

    // Check if IP has used too many different fingerprints
    if (fingerprintCount >= MAX_FINGERPRINTS_PER_IP) {
      return {
        shouldBlock: true,
        fingerprintCount,
        reason: `Too many unique fingerprints (${fingerprintCount}) from single IP in ${TIME_WINDOW_HOURS}h`
      }
    }

    // Check request frequency (count all requests from this IP in last minute)
    const lastMinute = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentRequests, error: recentError } = await supabaseServer
      .from('fingerprint_ip_tracking')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('created_at', lastMinute)

    if (recentError) {
      console.error('Error checking recent requests:', recentError)
    } else if (recentRequests && recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
      return {
        shouldBlock: true,
        fingerprintCount,
        reason: `Too many requests (${recentRequests.length}) per minute`
      }
    }

    return { shouldBlock: false, fingerprintCount }
  } catch (error) {
    console.error('Error in suspicious activity detection:', error)
    return { shouldBlock: false, fingerprintCount: 0 }
  }
}

/**
 * Block an IP address
 */
export async function blockIP(ipAddress: string, reason: string): Promise<boolean> {
  try {
    const now = new Date().toISOString()
    
    const { error } = await supabaseServer
      .from('ip_blocking')
      .upsert({
        ip_address: ipAddress,
        is_blocked: true,
        blocked_at: now,
        block_reason: reason,
        updated_at: now
      }, {
        onConflict: 'ip_address'
      })

    if (error) {
      console.error('Error blocking IP:', error)
      return false
    }

    console.log(`Blocked IP ${ipAddress}: ${reason}`)
    return true
  } catch (error) {
    console.error('Error in blockIP:', error)
    return false
  }
}

/**
 * Track IP and fingerprint association
 */
export async function trackIPFingerprint(
  fingerprintId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    // Insert tracking record
    const { error: trackingError } = await supabaseServer
      .from('fingerprint_ip_tracking')
      .insert({
        fingerprint_id: fingerprintId,
        ip_address: ipAddress,
        user_agent: userAgent
      })

    if (trackingError) {
      console.error('Error tracking IP-fingerprint association:', trackingError)
      return
    }

    // Update or create IP record
    const { error: ipError } = await supabaseServer
      .from('ip_blocking')
      .upsert({
        ip_address: ipAddress,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'ip_address'
      })

    if (ipError) {
      console.error('Error updating IP record:', ipError)
    }
  } catch (error) {
    console.error('Error in trackIPFingerprint:', error)
  }
}

/**
 * Update fingerprint count for an IP
 */
export async function updateIPFingerprintCount(ipAddress: string): Promise<void> {
  try {
    // Count unique fingerprints for this IP
    const { data: fingerprintData, error: fingerprintError } = await supabaseServer
      .from('fingerprint_ip_tracking')
      .select('fingerprint_id')
      .eq('ip_address', ipAddress)

    if (fingerprintError) {
      console.error('Error counting fingerprints for IP:', fingerprintError)
      return
    }

    const uniqueFingerprints = new Set(fingerprintData?.map(d => d.fingerprint_id) || [])
    const fingerprintCount = uniqueFingerprints.size

    // Update IP record with fingerprint count
    const { error: updateError } = await supabaseServer
      .from('ip_blocking')
      .update({
        fingerprint_count: fingerprintCount,
        updated_at: new Date().toISOString()
      })
      .eq('ip_address', ipAddress)

    if (updateError) {
      console.error('Error updating IP fingerprint count:', updateError)
    }
  } catch (error) {
    console.error('Error in updateIPFingerprintCount:', error)
  }
}

/**
 * Check if IP should be blocked before processing request (server-side)
 */
export async function checkIPBeforeRequestServer(request: Request): Promise<{
  allowed: boolean
  blockReason?: string
}> {
  try {
    const ipAddress = getClientIP(request)
    const securityCheck = await checkIPSecurity(ipAddress)

    if (securityCheck.isBlocked) {
      return {
        allowed: false,
        blockReason: securityCheck.blockReason
      }
    }

    if (securityCheck.shouldBlock) {
      const reason = `Suspicious activity: ${securityCheck.fingerprintCount} fingerprints`
      await blockIP(ipAddress, reason)
      
      return {
        allowed: false,
        blockReason: reason
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking IP before request:', error)
    // Allow request if check fails to prevent legitimate users from being blocked
    return { allowed: true }
  }
} 