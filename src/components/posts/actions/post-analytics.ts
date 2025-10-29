"use server";

import { supabaseServer } from '@/lib/supabase/server';
import { trackIPFingerprint, getClientIP, getUserAgent, updateIPFingerprintCount } from '@/lib/utils/ip-security-server';
import { headers } from 'next/headers';

// Track article view with IP security
export async function trackArticleView(
  articleId: string, 
  fingerprint: string, 
  sawUpsell: boolean = false
): Promise<void> {
  try {
    // Get IP address and user agent from headers
    const headersList = await headers();
    const request = {
      headers: {
        get: (name: string) => headersList.get(name)
      }
    } as Request;
    
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Insert view tracking record - using existing table structure
    const { data: fingerprintRecord, error } = await supabaseServer
      .from('fingerprints')
      .insert({
        article_id: articleId,
        fingerprint: fingerprint,
        saw_upsell: sawUpsell,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      // duplicate key error is expected if the same fingerprint has already viewed the article
      if (error.code === '23505') { // Unique constraint violation
        console.log(`[trackArticleView] Fingerprint ${fingerprint} already viewed article ${articleId}`);
        return;
      }
      console.error('[trackArticleView] Error tracking article view:', error);
      return;
    }

    // Track IP-fingerprint association for security monitoring
    if (fingerprintRecord?.id) {
      await trackIPFingerprint(fingerprintRecord.id, ipAddress, userAgent);
      
      // Update fingerprint count for this IP
      await updateIPFingerprintCount(ipAddress);
    }

    console.log(`[trackArticleView] Successfully tracked view for article ${articleId} from IP ${ipAddress}`);
  } catch (error) {
    console.error('[trackArticleView] Unexpected error:', error);
  }
}

// Get article view count for a specific fingerprint
export async function getArticleViewCount(
  fingerprint: string, 
  days: number = 30
): Promise<{ count: number; articles: string[] }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseServer
      .from('fingerprints')
      .select('article_id')
      .eq('fingerprint', fingerprint)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('[getArticleViewCount] Error fetching view count:', error);
      return { count: 0, articles: [] };
    }

    const articleIds = (data || []).map(view => view.article_id);
    const count = data?.length || 0;

    return {
      count,
      articles: articleIds
    };
  } catch (error) {
    console.error('[getArticleViewCount] Unexpected error:', error);
    return { count: 0, articles: [] };
  }
} 