/**
 * ScoringFooter
 * Compact scoring controls footer with score sliders, notes, and save functionality
 * Uses -10 to +10 scale with 0.1 precision across 6 categories
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, FileText } from 'lucide-react';
import type { ScoreCategory } from '@/hooks/useResponseScorerState';

const SCORE_LABELS: Record<ScoreCategory, { short: string; full: string }> = {
  visualQuality: { short: 'Visual', full: 'Visual Quality' },
  promptCorrectness: { short: 'Prompt', full: 'Prompt Correctness' },
  codeQuality: { short: 'Code', full: 'Code Quality' },
  explanationQuality: { short: 'Explain', full: 'Explanation Quality' },
  creativity: { short: 'Creative', full: 'Creativity/Surprise' },
  overallSatisfaction: { short: 'Overall', full: 'Overall Satisfaction' },
};

// Order for display: 2 columns of 3 (read top-to-bottom, then next column)
const SCORE_ORDER_COL1: ScoreCategory[] = ['visualQuality', 'codeQuality', 'creativity'];
const SCORE_ORDER_COL2: ScoreCategory[] = ['promptCorrectness', 'explanationQuality', 'overallSatisfaction'];

function getScoreColor(value: number): string {
  if (value <= -4) return 'text-error';
  if (value <= 1) return 'text-muted-foreground';
  if (value <= 4) return 'text-accent';
  return 'text-success';
}

interface CompactScoreSliderProps {
  category: ScoreCategory;
  value: number;
  onChange: (value: number) => void;
}

function CompactScoreSlider({ category, value, onChange }: CompactScoreSliderProps) {
  const info = SCORE_LABELS[category];
  const displayValue = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center text-[11px]">
        <span className="font-medium text-foreground">{info.short}</span>
        <span className={`font-mono text-[10px] ${getScoreColor(value)}`}>
          {displayValue}
        </span>
      </div>
      <Slider
        value={[value]}
        min={-10}
        max={10}
        step={0.1}
        onValueChange={([v]) => onChange(Math.round(v * 10) / 10)}
        className="py-0.5 h-1 bg-accent-shadow/50"
      />
    </div>
  );
}

interface ScoringFooterProps {
  scores: Record<ScoreCategory, number>;
  onScoreChange: (category: ScoreCategory, value: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isSaving: boolean;
  hasChanges: boolean;
  saveSuccess: boolean;
  avgScore: number;
  hasTrace: boolean;
  onExpandTrace: () => void;
}

export function ScoringFooter({
  scores,
  onScoreChange,
  notes,
  onNotesChange,
  isSaving,
  hasChanges,
  saveSuccess,
  avgScore,
  hasTrace,
  onExpandTrace,
}: ScoringFooterProps) {
  const avgDisplay = avgScore >= 0 ? `+${avgScore.toFixed(1)}` : avgScore.toFixed(1);

  return (
    <div className="border-t border-lines bg-background-header px-3 py-2 flex flex-col gap-2">
      {/* Top row: Trace + Avg + Save status + Notes label */}
      <div className="flex items-center gap-3">
        {hasTrace && (
          <Button
            onClick={onExpandTrace}
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
          >
            <FileText size={12} className="mr-1" />
            Trace
          </Button>
        )}

        <Badge
          variant="outline"
          className={`text-[10px] font-mono h-6 ${
            avgScore >= 4
              ? 'text-success border-success'
              : avgScore >= 0
                ? 'text-accent border-accent'
                : 'text-error border-error'
          }`}
        >
          Avg: {avgDisplay}
        </Badge>

        {/* Save status */}
        <div className="flex items-center gap-1 text-[11px]">
          {isSaving ? (
            <>
              <Loader2 size={10} className="animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Saving...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle size={10} className="text-success" />
              <span className="text-success">Saved</span>
            </>
          ) : hasChanges ? (
            <span className="text-warning">Unsaved</span>
          ) : null}
        </div>

        <div className="flex-1" />
        <span className="text-xs font-medium text-muted-foreground">Notes</span>
      </div>

      {/* Bottom row: Sliders (2 cols) + Notes textarea */}
      <div className="flex gap-4">
        {/* Sliders: 2 columns of 3 */}
        <div className="flex gap-3 w-[40vw] flex-shrink-0">
          {/* Column 1 */}
          <div className="flex-1 flex flex-col gap-1.5">
            {SCORE_ORDER_COL1.map(category => (
              <CompactScoreSlider
                key={category}
                category={category}
                value={scores[category]}
                onChange={(v) => onScoreChange(category, v)}
              />
            ))}
          </div>
          {/* Column 2 */}
          <div className="flex-1 flex flex-col gap-1.5">
            {SCORE_ORDER_COL2.map(category => (
              <CompactScoreSlider
                key={category}
                category={category}
                value={scores[category]}
                onChange={(v) => onScoreChange(category, v)}
              />
            ))}
          </div>
        </div>

        {/* Notes textarea - takes remaining space */}
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Additional observations..."
          className="flex-1 resize-none text-xs min-h-[80px]"
        />
      </div>
    </div>
  );
}
