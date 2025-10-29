import { Info } from "lucide-react";
import { ClaimStatus } from "./types";

interface NextStepsProps {
  status: ClaimStatus;
  feedback?: string | null;
}

export function NextSteps({ status, feedback }: NextStepsProps) {
  if (status === 'rejected' && feedback) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-600 dark:text-gray-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Feedback from Review</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{feedback}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
} 