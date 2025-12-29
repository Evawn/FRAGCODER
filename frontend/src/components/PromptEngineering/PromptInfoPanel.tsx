/**
 * PromptInfoPanel
 * Compact display of compilation status, tags, expected behavior, and notes
 * Prompt text is shown in the chat panel, not duplicated here
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { GoldenPrompt, CompilationError } from '../../../../prompt-engineering/types';

interface PromptInfoPanelProps {
  prompt: GoldenPrompt;
  compilationSuccess: boolean | undefined;
  compilationErrors?: CompilationError[];
}

export function PromptInfoPanel({
  prompt,
  compilationSuccess,
  compilationErrors,
}: PromptInfoPanelProps) {
  const errorCount = compilationErrors?.length ?? 0;
  const isCompiling = compilationSuccess === undefined;

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-background-header rounded-lg border border-lines overflow-auto">
      {/* Tags row with compilation status inline */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Compilation status badge */}
        {isCompiling ? (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground">
            <Loader2 size={10} className="mr-1 animate-spin" />
            Compiling
          </Badge>
        ) : compilationSuccess ? (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-success/20 text-success">
            <CheckCircle size={10} className="mr-1" />
            OK
          </Badge>
        ) : (
          <Badge className="text-[10px] px-1.5 py-0 h-5 bg-error/20 text-error">
            <XCircle size={10} className="mr-1" />
            {errorCount > 0 ? `${errorCount} err` : 'Fail'}
          </Badge>
        )}

        {/* Tags with colored backgrounds */}
        {prompt.tags.map(tag => (
          <Badge
            key={tag}
            className="text-[10px] px-1.5 py-0 h-5 bg-accent/20 text-accent"
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Expected behavior - more prominent */}
      {prompt.expectedBehavior && (
        <div className="text-xs pl-2 border-l-2 border-accent text-foreground">
          {prompt.expectedBehavior}
        </div>
      )}

      {/* Notes - dimmer, italic */}
      {prompt.notes && (
        <div className="text-[11px] text-muted-foreground/70 italic">
          {prompt.notes}
        </div>
      )}
    </div>
  );
}
