/**
 * PipelineTraceOverlay
 * Modal overlay for viewing AI pipeline trace with step details
 * Uses shadcn Accordion for expandable step items
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { X, CheckCircle, XCircle, SkipForward, Clock } from 'lucide-react';
import type { PipelineTrace, StepTrace } from '../../../../prompt-engineering/types';

interface PipelineTraceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  trace: PipelineTrace;
}

/**
 * Check if a value looks like shader code (GLSL)
 */
function isShaderCode(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Common GLSL patterns
  return (
    value.includes('void main') ||
    value.includes('gl_FragColor') ||
    value.includes('fragColor') ||
    value.includes('uniform ') ||
    value.includes('varying ') ||
    value.includes('precision ')
  );
}

/**
 * Render a value - either as a code block or formatted JSON
 */
function renderValue(data: unknown, label: string): React.ReactNode {
  // Handle objects with code field
  if (data && typeof data === 'object' && 'code' in data) {
    const obj = data as Record<string, unknown>;
    const code = obj.code;
    const otherFields = Object.fromEntries(
      Object.entries(obj).filter(([k]) => k !== 'code')
    );

    return (
      <>
        {Object.keys(otherFields).length > 0 && (
          <div className="mb-2">
            <pre className="text-xs text-foreground bg-background p-2 rounded overflow-auto max-h-32 border border-lines font-mono">
              {JSON.stringify(otherFields, null, 2)}
            </pre>
          </div>
        )}
        {typeof code === 'string' && (
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Code</h5>
            <pre className="text-xs text-foreground bg-background-editor p-3 rounded overflow-auto max-h-64 border border-lines font-mono whitespace-pre">
              {code}
            </pre>
          </div>
        )}
      </>
    );
  }

  // Direct string that looks like shader code
  if (isShaderCode(data)) {
    return (
      <pre className="text-xs text-foreground bg-background-editor p-3 rounded overflow-auto max-h-64 border border-lines font-mono whitespace-pre">
        {data}
      </pre>
    );
  }

  // Default: formatted JSON
  try {
    const formatted = JSON.stringify(data, null, 2);
    return (
      <pre className="text-xs text-foreground bg-background p-2 rounded overflow-auto max-h-48 border border-lines font-mono">
        {formatted}
      </pre>
    );
  } catch {
    return (
      <pre className="text-xs text-foreground bg-background p-2 rounded overflow-auto max-h-48 border border-lines font-mono">
        {String(data)}
      </pre>
    );
  }
}

function StepContent({ step }: { step: StepTrace }) {
  return (
    <div className="space-y-3 pt-2">
      {/* Skip Reason */}
      {step.skipReason && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1">Skip Reason</h4>
          <p className="text-sm text-foreground">{step.skipReason}</p>
        </div>
      )}

      {/* Error */}
      {step.error && (
        <div>
          <h4 className="text-xs font-medium text-error mb-1">Error</h4>
          <pre className="text-xs text-error bg-error/10 p-2 rounded overflow-auto max-h-32 font-mono">
            {step.error.message}
          </pre>
        </div>
      )}

      {/* Input */}
      {step.input !== undefined && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1">Input</h4>
          {renderValue(step.input, 'Input')}
        </div>
      )}

      {/* Output */}
      {step.output !== undefined && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-1">Output</h4>
          {renderValue(step.output, 'Output')}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-lines">
        <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>
        <span>Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export function PipelineTraceOverlay({ isOpen, onClose, trace }: PipelineTraceOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal - responsive height */}
      <div className="relative bg-background-header rounded-lg shadow-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden border border-lines">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-lines flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-foreground-highlighted">Pipeline Trace</h2>
            <Badge
              variant="outline"
              className={`text-xs ${trace.success ? 'text-success border-success' : 'text-error border-error'}`}
            >
              {trace.success ? 'Success' : 'Failed'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Total: {trace.totalLatencyMs}ms
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Steps List - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <Accordion type="multiple" className="w-full space-y-2">
            {trace.steps.map((step, index) => {
              const hasError = !!step.error;
              const isSkipped = !!step.skipped;

              return (
                <AccordionItem
                  key={`${step.stepName}-${index}`}
                  value={`step-${index}`}
                  className="border border-lines rounded-lg bg-background overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-background-header">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Step Number */}
                      <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>

                      {/* Step Name */}
                      <span className="font-medium text-foreground flex-1 text-left">{step.stepName}</span>

                      {/* Status Badge */}
                      {isSkipped ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground">
                          <SkipForward size={12} className="mr-1" />
                          Skipped
                        </Badge>
                      ) : hasError ? (
                        <Badge variant="outline" className="text-xs text-error border-error">
                          <XCircle size={12} className="mr-1" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-success border-success">
                          <CheckCircle size={12} className="mr-1" />
                          Success
                        </Badge>
                      )}

                      {/* Latency */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>{step.latencyMs}ms</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 bg-background-editor">
                    <StepContent step={step} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Pipeline Error */}
        {trace.error && (
          <div className="border-t border-lines p-4 bg-error/5 flex-shrink-0">
            <h3 className="text-sm font-medium text-error mb-2">Pipeline Error</h3>
            <p className="text-xs text-error">
              Failed at step: <strong>{trace.error.failedStep}</strong>
            </p>
            <pre className="text-xs text-error mt-2 bg-error/10 p-2 rounded overflow-auto max-h-24 font-mono">
              {trace.error.message}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-lines text-xs text-muted-foreground flex-shrink-0">
          <span>Pipeline ID: {trace.pipelineId}</span>
          <span>
            {new Date(trace.startedAt).toLocaleString()} - {new Date(trace.completedAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
