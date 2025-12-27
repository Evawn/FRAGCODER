/**
 * Progress indicator shown while a test suite is running
 */

import { Loader2 } from 'lucide-react';

interface SuiteRunProgressProps {
  description: string;
}

export function SuiteRunProgress({ description }: SuiteRunProgressProps) {
  return (
    <div className="border border-accent rounded-lg p-4 bg-background-header mb-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <div>
          <p className="font-medium text-foreground">
            Running suite: "{description}"
          </p>
          <p className="text-sm text-muted-foreground">
            Processing prompts through the AI pipeline...
          </p>
        </div>
      </div>
    </div>
  );
}
