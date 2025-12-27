/**
 * Progress indicator shown while a test suite is running
 */

import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuiteRunProgressProps {
  description: string;
  current: number;
  total: number;
  isCancelling?: boolean;
  onCancel?: () => void;
}

export function SuiteRunProgress({ description, current, total, isCancelling, onCancel }: SuiteRunProgressProps) {
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="border border-accent rounded-lg p-4 bg-background-header mb-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <div className="flex-1">
          <p className="font-medium text-foreground">
            {isCancelling ? 'Cancelling...' : `Running suite: "${description}"`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isCancelling ? 'Waiting for current prompt to finish...' : `Processing prompt ${current}/${total}...`}
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="text-muted-foreground hover:text-error disabled:opacity-50"
          >
            <X size={16} className="mr-1" />
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  );
}
