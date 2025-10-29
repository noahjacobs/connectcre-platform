import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  ArrowRight,
  Loader2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Check,
  FileText,
  HelpCircle,
  Building2,
  ChevronDown,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Portal } from "@radix-ui/react-portal";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/providers/supabase-context";
import { useAuth } from "@/lib/providers/auth-context";
import { parsePhoneNumber, getCountryCallingCode, AsYouType, CountryCode } from 'libphonenumber-js/max';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { invalidateCache } from '@/lib/utils/cache';
import { COMPANY_ROLES } from "@/lib/constants";

interface ClaimCompanyFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data?: any) => void;
  company: any;
  isNew: boolean;
  isEditing?: boolean;
}

export function ClaimCompanyFlow({
  isOpen,
  onClose,
  onSubmit,
  company,
  isNew,
  isEditing = false
}: ClaimCompanyFlowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    location: "",
    category: [] as string[]
  });
  const { supabase } = useSupabase();
  const [phoneError, setPhoneError] = useState<string>("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("US");
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState<string>("");
  const [documentError, setDocumentError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [submittedDirectly, setSubmittedDirectly] = useState(false);

  // Get example phone number format for the selected country
  const getPlaceholderForCountry = (countryCode: CountryCode) => {
    try {
      // Use a simpler approach with common formats
      const formats: Record<string, string> = {
        'US': '(555) 555-5555',
        'CA': '(555) 555-5555',
        'GB': '07700 900000',
        'AU': '0412 345 678',
        'IN': '99999 99999',
        'DE': '0171 1234567',
        'FR': '06 12 34 56 78',
        'JP': '090-1234-5678',
        'BR': '(11) 98765-4321',
        'MX': '044 55 1234 5678'
      };
      
      return formats[countryCode] || `+${getCountryCallingCode(countryCode)} phone number`;
    } catch (error) {
      return "(555) 555-5555";
    }
  };

  // Function to format a phone number for display
  const formatPhoneForDisplay = (phoneInput: string, country: CountryCode) => {
    if (!phoneInput) return "";
    
    try {
      const asYouType = new AsYouType(country);
      return asYouType.input(phoneInput);
    } catch (error) {
      // If formatting fails, at least return what the user typed
      return phoneInput;
    }
  };

  // List of common country codes for dropdown
  const popularCountries: CountryCode[] = ["US", "CA", "GB", "AU", "IN", "DE", "FR", "JP", "BR", "MX"];

  // Initialize form data when company changes
  useEffect(() => {
    // Reset logo and document states first
    setLogoFile(null);
    setLogoPreview(null);
    setDocumentFile(null);
    setDocumentName('');

    if (company) {
      // Try to detect country from existing phone number
      let detectedCountry: CountryCode = "US";
      let formattedPhone = company.contact_phone || "";
      
      if (company.contact_phone) {
        try {
          const phoneNumber = parsePhoneNumber(company.contact_phone);
          if (phoneNumber.country) {
            detectedCountry = phoneNumber.country as CountryCode;
            formattedPhone = formatPhoneForDisplay(company.contact_phone, detectedCountry);
          }
        } catch (error) {
          // If parsing fails, keep the original phone number
        }
      }
      
      setSelectedCountry(detectedCountry);
      
      setFormData({
        name: company?.name || "",
        email: company.contact_email || "",
        phone: formattedPhone,
        website: company.website_url || "",
        location: company.address || "",
        category: company.category || []
      });
      
      // Set logo preview from company data if available
      if (company.uploaded_logo_url) {
        setLogoPreview(company.uploaded_logo_url);
      } else if (company.logo?.asset?.url) {
        setLogoPreview(company.logo.asset.url);
      }
      
      // Check for existing verification document
      const checkExistingDocument = async () => {
        if (!supabase) return;
        try {
          const { data: approvalData } = await supabase
            .from('company_approvals')
            .select('verification_document_url')
            .eq('company_id', company.id)
            .eq('user_id', user?.id)
            .single();

          if (approvalData?.verification_document_url) {
            setDocumentName(new URL(approvalData.verification_document_url).pathname.split('/').pop() || '');
            // Store the document URL in state for viewing
            company.verification_document_url = approvalData.verification_document_url;
          }
        } catch (error) {
          console.error('Error checking existing document:', error);
        }
      };

      if (user?.id && company.id) {
        checkExistingDocument();
      }
    }
    // Reset success state and submission type when modal opens
    setIsSuccess(false);
    setSubmittedDirectly(false);
  }, [company, isOpen, isNew, isEditing, user?.id]);

  // Handle clicking outside of country dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryMenuOpen(false);
      }
    };

    if (countryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [countryMenuOpen]);

  const formatWebsiteUrl = (url: string) => {
    if (!url) return url;
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const handleLogoClick = () => {
    if (isNew) {
      fileInputRef.current?.click();
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Please upload an image smaller than 10MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setLogoFile(file);

    // Clean up the preview URL when component unmounts
    return () => URL.revokeObjectURL(previewUrl);
  };

  const handleDocumentClick = () => {
    documentInputRef.current?.click();
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, DOC, DOCX, JPG, PNG)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setDocumentError('Please upload a PDF, DOC, DOCX, JPG, or PNG file');
      toast.error('Please upload a PDF, DOC, DOCX, JPG, or PNG file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setDocumentError('Please upload a document smaller than 10MB');
      toast.error('Please upload a document smaller than 10MB');
      return;
    }

    setDocumentFile(file);
    setDocumentName(file.name);
    setDocumentError('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Let the library format the number as the user types
    const asYouType = new AsYouType(selectedCountry);
    const formattedNumber = asYouType.input(input);
    
    // Update form data with the formatted number
    setFormData(prev => ({ ...prev, phone: formattedNumber }));
    
    // Get the parsed number for validation
    const phoneNumber = asYouType.getNumber();
    
    // Validate the number
    if (input.length > 0) {
      if (!phoneNumber) {
        setPhoneError("Please enter a valid phone number");
        setPhoneValid(false);
      } else {
        try {
          const isValid = phoneNumber.isValid();
          if (!isValid) {
            // Check if it might be valid but incomplete
            if (input.length < 8) {
              setPhoneError("Continue entering your phone number");
              setPhoneValid(false);
            } else {
              setPhoneError("Please enter a valid phone number");
              setPhoneValid(false);
            }
          } else {
            setPhoneError("");
            setPhoneValid(true);
          }
        } catch (err) {
          setPhoneError("Please enter a valid phone number");
          setPhoneValid(false);
        }
      }
    } else {
      setPhoneError("");
      setPhoneValid(false);
    }
  };

  // Handle country change
  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setCountryMenuOpen(false);
    
    // Try to reformat the existing phone number for the new country
    if (formData.phone) {
      try {
        // Reset the phone input when changing country to avoid confusion
        setFormData(prev => ({ ...prev, phone: "" }));
        setPhoneError("");
        setPhoneValid(false);
      } catch (error) {
        // If reformatting fails, just keep the number as is
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error("Please enter a company name");
      return;
    }
    
    // Validate phone number before submission
    let formattedPhone = "";
    try {
      // Try to parse the phone number with the selected country
      const asYouType = new AsYouType(selectedCountry);
      asYouType.input(formData.phone);
      const phoneNumber = asYouType.getNumber();
      
      if (!phoneNumber || !phoneNumber.isValid()) {
        setPhoneError("Please enter a valid phone number");
        return;
      }
      
      // Format to E.164 for storage
      formattedPhone = phoneNumber.format('E.164');
      setPhoneValid(true);
    } catch (error) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    
    if (!user) {
      toast.error('Please sign in to claim a company');
      return;
    }

    // If this is a resubmission (approval_id exists), skip the pending claims check
    if (!company?.approval_id) {
      // Check for maximum pending claims
      try {
        if (!supabase) return;
        const { data: pendingClaims, error: countError } = await supabase
          .from('company_approvals')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (countError) throw countError;

        if ((pendingClaims?.length || 0) >= 5) {
          toast.error('You can only have up to 5 pending company claims at a time. Please wait for your existing claims to be reviewed.');
          return;
        }
      } catch (error) {
        console.error('Error checking pending claims:', error);
        toast.error('Failed to check pending claims. Please try again.');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      let logoUrl = null;
      let documentUrl = null;
      let company_id = company?.company_id || company?.id;
      const wasApproved = company?.status === 'approved';
      let shouldSendEmail = true; // Initialize local variable

      // Validate company_id - reject invalid formats like user IDs or temp strings
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (company_id && !uuidRegex.test(company_id)) {
        console.warn(`ClaimCompanyFlow: Invalid company_id format detected: ${company_id}. Treating as new company.`);
        company_id = null; // Reset to null to treat as new company
      }

      // Upload logo if present first, so we have the URL for both flows
      if (logoFile) {
        if (!supabase) return;
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);
          
        logoUrl = publicUrl;
      } else if (!isNew && company) {
        // If no new logo was uploaded and this is an existing company, use the existing logo URL
        logoUrl = company.uploaded_logo_url || company.logo?.asset?.url || null;
      }

      // Upload verification document if present
      if (documentFile) {
        if (!supabase) return;
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-verification.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification_documents')
          .upload(fileName, documentFile);

        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('verification_documents')
          .getPublicUrl(fileName);
          
        documentUrl = publicUrl;
      }

      // Determine company ID if it wasn't passed directly
      if (!company_id && !isNew) {
        if (!supabase) return;
        const { data: existingCompany, error: lookupError } = await supabase
          .from('companies')
          .select('id')
          .eq('id', company?.id)
          .single();
        if (lookupError || !existingCompany) {
          console.error('Error finding company for update:', lookupError);
          toast.error('This company could not be found. Please try again or contact support.');
          setIsLoading(false);
          return;
        }
        company_id = existingCompany.id;
      }

      // Prepare data for updates
      const companyUpdateData: Record<string, any> = {
        name: formData.name.trim(),
        uploaded_logo_url: logoUrl,
        category: formData.category,
      };
      
      const claimRequestData = {
        name: formData.name.trim(),
        email: formData.email,
        phone: formattedPhone,
        website: formatWebsiteUrl(formData.website),
        location: formData.location,
        logo_url: logoUrl,
        category: formData.category
      };
      
      // Check if editing an already approved company
      if (isEditing && wasApproved && company?.approval_id) {
        // 1. Update the Company directly
        if (!supabase) return;
        const { error: companyUpdateError } = await supabase
          .from('companies')
          .update(companyUpdateData)
          .eq('id', company_id);

        if (companyUpdateError) throw companyUpdateError;

        // 2. Update the Approval metadata for history, but keep status 'approved'
        const { error: approvalUpdateError } = await supabase
          .from('company_approvals')
          .update({
            metadata: { claim_request: claimRequestData },
            verification_document_url: documentUrl || company?.verification_document_url || undefined,
          })
          .eq('id', company.approval_id)
          .eq('user_id', user.id);

        if (approvalUpdateError) throw approvalUpdateError;
        
        setSubmittedDirectly(true);
        shouldSendEmail = false; // Don't send email in this case

      } else if (company?.approval_id) {
        // Resubmission of rejected/pending claim
        // 1. Update Company name/logo
        if (!supabase) return;
         const { error: companyUpdateError } = await supabase
          .from('companies')
          .update(companyUpdateData)
          .eq('id', company_id);

        if (companyUpdateError) throw companyUpdateError;
        
        // 2. Update the Approval request to 'pending' for re-review
        const { error: updateError } = await supabase
          .from('company_approvals')
          .update({
            status: 'pending',
            reviewed_at: null,
            reviewed_by: null,
            feedback: null,
            submitted_at: new Date().toISOString(),
            verification_document_url: documentUrl || company?.verification_document_url || undefined,
            metadata: { claim_request: claimRequestData }
          })
          .eq('id', company.approval_id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        setSubmittedDirectly(false);
        shouldSendEmail = true; // Send email for resubmission

      } else {
        // New Claim submission
        const isCompanyNew = isNew || company?.isNew;

        if (isCompanyNew) {
          // Create a new company record
          const baseSlug = formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const uniqueSlug = `${baseSlug}-${Date.now()}`;
          if (!supabase) return;
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: formData.name.trim(),
              slug: uniqueSlug,
              status: 'pending',
              is_verified: false,
              logo_url: company?.logo?.asset?.url || null,
              uploaded_logo_url: logoUrl,
            })
            .select()
            .single();

          if (companyError) throw companyError;
          company_id = newCompany.id;
        } else {
          // Existing company, but new claim request for this user
           // Update the company's logo/name if changed by this claim
          if (logoUrl || formData.name !== company?.name) {
            if (!supabase) return;
             const { error: updateError } = await supabase
              .from('companies')
              .update(companyUpdateData)
              .eq('id', company_id);

            if (updateError) throw updateError;
          }
        }

        // Create new approval request (status defaults to 'pending')
        if (!supabase) return;
        const { error: approvalError } = await supabase
          .from('company_approvals')
          .insert({
            company_id,
            user_id: user.id,
            status: 'pending',
            verification_document_url: documentUrl,
            metadata: { claim_request: claimRequestData }
          });

        if (approvalError) {
          if (approvalError.code === '23505') { // Unique violation
            toast.info('You have already submitted a claim request for this company.');
            router.push('/company?refresh=true');
            setIsLoading(false);
            return;
          }
          throw approvalError;
        }
        setSubmittedDirectly(false);
        shouldSendEmail = true; // Send email for new claim
      }

      // Invalidate relevant caches
      if (user?.id) {
        await invalidateCache(`user:${user.id}:claims`);
        if (company_id) {
          await invalidateCache(`company:${company_id}:details`);
        }
      }

      // Show success state
      setIsSuccess(true);
      setIsLoading(false);

      // Send email notification only for submissions needing review
      if (shouldSendEmail) {
        try {
          await fetch('/api/send-feedback-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'company_claim',
              record: {
                company_name: formData.name.trim(),
                metadata: { claim_request: claimRequestData }
              }
            })
          });
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          // Don't throw here - we still want to show success even if email fails
        }
      }

    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim request. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if we're not in loading state
        if (!isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent 
        className="w-[calc(100%-2rem)] sm:w-[480px] p-0 m-0 border-none rounded-xl overflow-hidden bg-transparent overflow-y-auto max-h-[90vh]"
        // Prevent closing by clicking outside or escape key when loading
        onEscapeKeyDown={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>
            {(isEditing || company?.isEditing) ? 'Edit Company Profile' : 
             (isNew || company?.isNew) ? 'Create Company Profile' : 
             'Complete Your Company Profile'}
          </DialogTitle>
          <DialogDescription>
            {(isEditing || company?.isEditing)
              ? 'Update your company information and manage your business profile.'
              : (isNew || company?.isNew)
              ? 'Create a new company profile and get discovered by potential clients.'
              : 'Complete your company profile to help others understand your business better.'}
          </DialogDescription>
        </VisuallyHidden>
        
        <div className="relative flex flex-col rounded-2xl bg-background dark:bg-zinc-900">
          {/* Close button */}
          <button
            onClick={() => {
              onClose();
              onSubmit();
            }}
            className="absolute right-4 top-4 z-30 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
            aria-label="Upload company logo"
          />

          {isSuccess ? (
            // Success State
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {(isEditing || company?.isEditing) 
                  ? (submittedDirectly ? 'Changes Saved!' : 'Update Submitted!')
                  : 'Verification Request Submitted!'
                }
              </h3>
              <p className="text-muted-foreground mb-6">
                {(isEditing || company?.isEditing)
                  ? (submittedDirectly 
                      ? 'Your company profile has been updated successfully.' 
                      : "Your changes have been submitted for review. We'll get back to you within 24 hours.")
                  : "We'll review your request and get back to you within 24 hours. You can track the status in your dashboard."
                }
              </p>
              <Button
                onClick={() => {
                  onClose();
                  onSubmit();
                  router.push('/company?refresh=true');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                View Status
              </Button>
            </div>
          ) : (
            // Form State
            <>
              <div className="relative h-32 bg-linear-to-r from-blue-600 to-indigo-600">
                {/* Logo upload area */}
                <div className="absolute -bottom-16 left-6 w-32 h-32">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full h-full rounded-xl cursor-pointer",
                      "bg-white dark:bg-zinc-800",
                      "border-2 border-dashed border-gray-200 dark:border-zinc-700",
                      "flex items-center justify-center",
                      "transition-all duration-200",
                      "hover:border-blue-500 dark:hover:border-blue-400",
                      "group"
                    )}
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company logo preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : company?.logo?.asset?.url ? (
                      <img
                        src={company.logo.asset.url}
                        alt={company.name}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-blue-500" />
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          Upload Logo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Document upload area */}
                <div className="absolute -bottom-16 right-6 w-48 h-32">
                  <div
                    onClick={handleDocumentClick}
                    className={cn(
                      "w-full h-full rounded-xl cursor-pointer",
                      "bg-white dark:bg-zinc-800",
                      "border-2 border-dashed border-gray-200 dark:border-zinc-700",
                      "flex flex-col items-center justify-center p-3",
                      "transition-all duration-200",
                      "hover:border-blue-500 dark:hover:border-blue-400",
                      "group"
                    )}
                  >
                    {documentFile || documentName ? (
                      <div className="flex flex-col items-center justify-center h-full w-full">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-2 mb-2">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs text-center line-clamp-2 text-gray-800 dark:text-gray-200 font-medium">
                          {documentName}
                        </span>
                        {documentFile ? (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            Click to change
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <a
                              href={company?.verification_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Document
                            </a>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              Click to change
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <HelpCircle className="w-4 h-4 ml-1 text-gray-400" />
                                </div>
                              </TooltipTrigger>
                              <Portal>
                                <TooltipContent 
                                  side="top" 
                                  sideOffset={5}
                                  className="max-w-xs z-9999"
                                >
                                  <p>
                                    Upload a document that verifies your affiliation with this company 
                                    (e.g., business registration, company ID, letterhead, etc.)
                                  </p>
                                </TooltipContent>
                              </Portal>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-zinc-400 block mb-1">
                          Verification Document
                        </span>
                        <span className="text-[10px] text-gray-400">
                          PDF, DOC, JPG, PNG
                        </span>
                      </div>
                    )}
                  </div>
                  {documentError && (
                    <div className="mt-1 text-xs text-red-500">
                      {documentError}
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden document input */}
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                className="hidden"
                onChange={handleDocumentChange}
                aria-label="Upload verification document"
              />

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 pt-20 flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {(isEditing || company?.isEditing) ? 'Edit Company Profile' : 
                   (isNew || company?.isNew) ? 'Create Company Profile' : 
                   'Complete Your Company Profile'}
                </h3>
                {/* <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {isEditing 
                    ? 'Update your company information below.'
                    : 'Fill in your company details to help others understand your business better.'
                  }
                </p> */}

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">
                    Company Name
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your Company Inc."
                      className="pl-10"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">
                    Business Phone
                  </label>
                  <div className="relative flex items-center">
                    {/* Country code selector dropdown */}
                    <div className="relative" ref={countryDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                        className={cn(
                          "flex items-center justify-center h-9 px-3 border rounded-l-md",
                          "bg-muted/50 hover:bg-muted transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        )}
                        aria-label="Select country code"
                        aria-expanded={countryMenuOpen}
                        aria-haspopup="listbox"
                      >
                        <span className="text-sm font-medium">+{getCountryCallingCode(selectedCountry)}</span>
                        <span className="sr-only">Selected country: {selectedCountry}</span>
                      </button>
                      
                      {/* Country dropdown menu */}
                      {countryMenuOpen && (
                        <div 
                          className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto z-50 bg-background rounded-md border shadow-lg"
                          role="listbox"
                          aria-label="Select a country"
                        >
                          <div className="p-2 space-y-1">
                            <p className="text-xs text-muted-foreground px-2 mb-1">Popular</p>
                            {popularCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => handleCountryChange(country)}
                                className={cn(
                                  "flex items-center w-full px-2 py-1.5 text-sm rounded-md",
                                  selectedCountry === country 
                                    ? "bg-primary/10 text-primary" 
                                    : "hover:bg-muted/60"
                                )}
                                role="option"
                                aria-selected={selectedCountry === country}
                              >
                                <span className="mr-2">+{getCountryCallingCode(country)}</span>
                                <span>{country}</span>
                                {selectedCountry === country && (
                                  <Check className="ml-auto h-4 w-4 text-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Phone number input */}
                    <div className="flex-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={getPlaceholderForCountry(selectedCountry)}
                        className={cn(
                          "pl-10 rounded-l-none",
                          phoneValid ? "pr-10 border-green-500 focus-visible:ring-green-500" : "",
                          phoneError && !phoneValid ? "border-red-500 focus-visible:ring-red-500" : ""
                        )}
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        required
                      />
                      {phoneValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {phoneError && !phoneValid && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{phoneError}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="website">
                    Business Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="text"
                      placeholder="website.com"
                      className="pl-10"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="location">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      type="text"
                      placeholder="City, State"
                      className="pl-10"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="primaryRole">
                    Categories
                  </label>
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between pl-10 h-auto min-h-10",
                            formData.category.length === 0 && "text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-wrap gap-1 pr-2">
                            {formData.category.length === 0 ? (
                              "Select categories..."
                            ) : formData.category.length <= 3 ? (
                              formData.category.map((role, index) => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium"
                                >
                                  {role}
                                </span>
                              ))
                            ) : (
                              <>
                                {formData.category.slice(0, 2).map((role) => (
                                  <span
                                    key={role}
                                    className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium"
                                  >
                                    {role}
                                  </span>
                                ))}
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium">
                                  +{formData.category.length - 2} more
                                </span>
                              </>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full min-w-[430px] max-h-64 overflow-y-auto">
                        {COMPANY_ROLES.map((role) => (
                          <DropdownMenuItem
                            key={role}
                            onSelect={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({
                                ...prev,
                                category: prev.category.includes(role)
                                  ? prev.category.filter(r => r !== role)
                                  : [...prev.category, role]
                              }));
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <div className="flex items-center justify-center w-4 h-4">
                              {formData.category.includes(role) && (
                                <Check className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {role}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
                    disabled={isLoading || !formData.name || !formData.email || !formData.phone || !formData.website || !formData.location || formData.category.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                        {(isEditing || company?.isEditing) ? 'Saving...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        {(isEditing || company?.isEditing) ? 'Save Changes' : 
                         (isNew || company?.isNew) ? "Create Company" : 
                         "Get Verified"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    {(isEditing || company?.isEditing) 
                      ? (company?.status === 'approved' ? 'Changes will be saved immediately' : 'Changes require re-review') 
                      : 'Free to claim • Verified within 24 hours'}
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 