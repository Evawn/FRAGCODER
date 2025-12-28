/**
 * AI Input Sanitizer
 * Sanitizes and validates user prompts before processing
 *
 * Current: Skeleton implementation (pass-through)
 * Future: Prompt length limits, content filtering, injection prevention
 */

import { PipelineStep } from './pipeline';
import type { PipelineContext } from './pipeline';

interface SanitizeInput {
  prompt: string;
}

interface SanitizeOutput {
  sanitizedPrompt: string;
}

/**
 * Pipeline step that sanitizes user input
 */
export class SanitizeStep extends PipelineStep<SanitizeInput, SanitizeOutput> {
  readonly name = 'sanitize';

  getInput(ctx: PipelineContext): SanitizeInput {
    return { prompt: ctx.input.prompt };
  }

  execute(input: SanitizeInput): SanitizeOutput {
    return { sanitizedPrompt: this.sanitize(input.prompt) };
  }

  setOutput(ctx: PipelineContext, output: SanitizeOutput): void {
    ctx.sanitizedPrompt = output.sanitizedPrompt;
  }

  /**
   * Sanitize user prompt before sending to LLM
   * @param prompt - Raw user input
   * @returns Sanitized prompt string
   */
  private sanitize(prompt: string): string {
    // Skeleton: return input unchanged
    // TODO: Implement sanitization logic
    // - Trim whitespace
    // - Enforce max length
    // - Filter prohibited content
    // - Prevent prompt injection attacks
    return prompt;
  }
}

// Legacy export for backwards compatibility during migration
export function sanitizePrompt(prompt: string): string {
  return new SanitizeStep().execute({ prompt }).sanitizedPrompt;
}
