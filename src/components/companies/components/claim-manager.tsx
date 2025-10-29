'use client';

import { useState } from 'react';
import { useAuth } from "@/lib/providers/auth-context";
import dynamic from 'next/dynamic';

// Dynamic imports to reduce initial bundle size
const ClaimUpsell = dynamic(() => 
  import("./claim-upsell").then(mod => ({ default: mod.ClaimUpsell })), {
  ssr: false,
  loading: () => null
});

const ClaimCompanyFlow = dynamic(() => 
  import("./claim-company-flow").then(mod => ({ default: mod.ClaimCompanyFlow })), {
  ssr: false,
  loading: () => null
});

interface ClaimManagerProps {
  isUpsellOpen: boolean;
  onUpsellClose: () => void;
}

export function ClaimManager({ isUpsellOpen, onUpsellClose }: ClaimManagerProps) {
  const { user } = useAuth();
  const [selectedUnclaimedCompany, setSelectedUnclaimedCompany] = useState<any>(null);
  const [showCompanyFlow, setShowCompanyFlow] = useState(false);

  const handleClaimExisting = (company: any) => {
    onUpsellClose();
    if (!user) {
      return;
    }
    // Open the claim dialog for the selected company
    setSelectedUnclaimedCompany({
      ...company,
      isNew: false,
      isEditing: false
    });
    setShowCompanyFlow(true);
  };

  const handleAddNew = (name: string) => {
    onUpsellClose();
    if (!user) {
      return;
    }
    // Use null for company_id instead of invalid temp string
    // The ClaimCompanyFlow will handle new companies properly
    setSelectedUnclaimedCompany({
      _id: '',
      name,
      projectCount: 0,
      rating: null,
      reviewCount: 0,
      is_verified: false,
      location: null,
      contact: {
        email: null,
        phone: null,
        website: null
      },
      status: 'pending',
      slug: { current: name.toLowerCase().replace(/\s+/g, '-') },
      company_id: null, // Use null instead of invalid temp ID
      isNew: true,
      isEditing: false
    });
    setShowCompanyFlow(true);
  };

  const handleClaimSubmit = async () => {
    setShowCompanyFlow(false);
    setSelectedUnclaimedCompany(null);
  };

  const handleCompanyFlowClose = () => {
    setShowCompanyFlow(false);
    setSelectedUnclaimedCompany(null);
  };

  return (
    <>
      <ClaimUpsell
        isOpen={isUpsellOpen}
        onClose={onUpsellClose}
        onClaimExisting={handleClaimExisting}
        onAddNew={handleAddNew}
      />
      <ClaimCompanyFlow
        isOpen={showCompanyFlow}
        onClose={handleCompanyFlowClose}
        onSubmit={handleClaimSubmit}
        company={selectedUnclaimedCompany}
        isNew={selectedUnclaimedCompany?.isNew || false}
        isEditing={selectedUnclaimedCompany?.isEditing || false}
      />
    </>
  );
} 