export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ClaimRequest {
  id: string;
  status: ClaimStatus;
  submitted_at: string;
  reviewed_at: string | null;
  feedback: string | null;
  verification_document_url: string | null;
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    uploaded_logo_url: string | null;
    is_verified: boolean;
  };
}

export interface CompanyApprovalData {
  id: string;
  status: string;
  metadata: {
    claim_request?: {
      email?: string;
      phone?: string;
      website?: string;
      location?: string;
      logo_url?: string;
      primaryRole?: string;
    };
  };
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    is_verified: boolean;
  };
} 