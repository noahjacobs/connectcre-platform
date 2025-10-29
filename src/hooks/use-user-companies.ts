import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/providers/supabase-context';
import { useAuth } from '@/lib/providers/auth-context';

export interface UserCompany {
  id: string;
  company_id: string;
  name: string;
  logo_url?: string;
  uploaded_logo_url?: string;
  primary_role?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  metadata?: any;
}

interface CompanyManagerResponse {
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    website_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    status: string;
    role?: string;
    metadata?: {
      primaryRole?: string;
    };
  };
}

export function useUserCompanies() {
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { supabase } = useSupabase();

  useEffect(() => {
    async function loadCompanies() {
      if (!user?.id) {
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      if (!supabase) {
        console.error('Supabase client not available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('company_managers')
          .select(`
            companies (
              id,
              name,
              logo_url,
              uploaded_logo_url,
              website_url,
              contact_email,
              contact_phone,
              status,
              role,
              metadata
            )
          `)
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin', 'editor'])
          .returns<CompanyManagerResponse[]>();

        if (error) {
            console.error('Supabase error loading user companies:', error);
            throw error;
        }

        const transformedCompanies = (data || [])
          .map(item => {
            const company = item.companies;
            if (!company) return null;
            
            // Get primary role from either metadata.primaryRole or the role field
            const primaryRole = company.metadata?.primaryRole || company.role;
            
            return {
              id: company.id,
              company_id: company.id,
              name: company.name,
              status: company.status,
              ...(company.uploaded_logo_url || company.logo_url
                ? { logo_url: company.logo_url, uploaded_logo_url: company.uploaded_logo_url }
                : {}),
              ...(primaryRole ? { primary_role: primaryRole } : {}),
              ...(company.website_url ? { website_url: company.website_url } : {}),
              ...(company.contact_email ? { contact_email: company.contact_email } : {}),
              ...(company.contact_phone ? { contact_phone: company.contact_phone } : {}),
              ...(company.metadata ? { metadata: company.metadata } : {})
            };
          })
          .filter((company): company is UserCompany => company !== null);

        setCompanies(transformedCompanies);

      } catch (error) {
        console.error('Error loading user companies:', error);
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanies();
  }, [user?.id, supabase]);

  return { companies, isLoading };
}
