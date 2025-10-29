import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabase } from "@/lib/providers/supabase-context";

interface EditDescriptionProps {
  companyId: string;
  currentDescription: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDescription: string) => void; // Callback with the new description
}

export function EditDescription({
  companyId,
  currentDescription,
  isOpen,
  onClose,
  onSuccess,
}: EditDescriptionProps) {
  const [description, setDescription] = useState(currentDescription || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();

  // Update internal state if the prop changes (e.g., dialog reopens)
  useEffect(() => {
    setDescription(currentDescription || '');
  }, [currentDescription, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // --- Database Update ---
      if (!supabase) return;
      const { error: updateError } = await supabase
        .from('companies')
        .update({ description: description.trim() || null }) // Use null if empty/whitespace only
        .eq('id', companyId);

      if (updateError) {
        throw updateError;
      }
      // --- End Database Update ---

      toast.success('Company description updated successfully!');
      onSuccess(description.trim() || ''); // Pass the updated description back
      onClose(); // Close the dialog on success
    } catch (err: any) {
      console.error('Error updating company description:', err);
      setError(
        `Failed to update description: ${err.message || 'Unknown error'}`
      );
      toast.error('Failed to update description.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Company Description</DialogTitle>
          <DialogDescription>
            Provide a detailed description of your company to help others understand your business.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter your company description here..."
            rows={8}
            className="resize-none"
            maxLength={2000} // Example max length
          />
          <p className="text-xs text-right text-gray-500 mt-1">
            {description.length} / 2000
          </p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || description === (currentDescription || '')}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-0.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}