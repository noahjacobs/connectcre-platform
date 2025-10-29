import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

interface ComingSoonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  description?: string;
}

export function ComingSoonDialog({ 
  isOpen, 
  onOpenChange, 
  featureName,
  description = "We're working hard to bring this feature to you. Stay tuned!" 
}: ComingSoonDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center space-y-4">
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
             <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
           </div>
          <DialogTitle className="text-center text-xl font-semibold">
            {featureName} - Coming Soon
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full"
            variant="outline"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 