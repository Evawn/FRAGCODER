/**
 * AI Pipeline Framework
 * Provides base class for pipeline steps and executor with automatic tracing
 */

import { randomUUID } from 'crypto';
import type { AIIntent, ChatHistoryEntry, CompilationError } from '@fragcoder/shared';
import type { LLMResponse } from './llmClient';
import type { ParsedAIResponse } from './responseParser';

/**
 * Trace of a single pipeline step execution
 */
export interface StepTrace {
  stepName: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  input: unknown;
  output: unknown;
  skipped?: boolean;
  skipReason?: string;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Complete trace of a pipeline execution
 */
export interface PipelineTrace {
  pipelineId: string;
  startedAt: string;
  completedAt: string;
  totalLatencyMs: number;
  success: boolean;
  steps: StepTrace[];
  error?: {
    message: string;
    stack?: string;
    failedStep: string;
  };
}

/**
 * Context that flows through the pipeline
 * Contains initial inputs and accumulates outputs from each step
 */
export interface PipelineContext {
  input: {
    prompt: string;
    userId: string;
    model?: string;
    code?: string;
    history?: ChatHistoryEntry[];
    errors?: CompilationError[];
    overrideIntent?: AIIntent;
  };
  sanitizedPrompt?: string;
  intent?: AIIntent;
  engineeredPrompt?: string;
  llmResponse?: LLMResponse;
  parsedResponse?: ParsedAIResponse;
}

/**
 * Abstract base class for pipeline steps
 * Each step extracts its input from context, executes, and writes output back
 */
export abstract class PipelineStep<TInput = unknown, TOutput = unknown> {
  abstract readonly name: string;

  /**
   * Extract input for this step from the pipeline context
   */
  abstract getInput(ctx: PipelineContext): TInput;

  /**
   * Execute the step logic
   */
  abstract execute(input: TInput, ctx: PipelineContext): TOutput | Promise<TOutput>;

  /**
   * Write the step's output back to the pipeline context
   */
  abstract setOutput(ctx: PipelineContext, output: TOutput): void;

  /**
   * Optional: Check if this step should be skipped
   * Return a reason string to skip, or undefined to execute
   */
  shouldSkip?(ctx: PipelineContext): string | undefined;
}

/**
 * Pipeline executor that runs steps sequentially with automatic tracing
 */
export class Pipeline {
  private steps: PipelineStep[];

  constructor(steps: PipelineStep[]) {
    this.steps = steps;
  }

  /**
   * Execute all pipeline steps sequentially
   * Captures full trace with input/output for each step
   */
  async execute(ctx: PipelineContext): Promise<{ result: PipelineContext; trace: PipelineTrace }> {
    const pipelineId = randomUUID();
    const pipelineStartedAt = new Date().toISOString();
    const pipelineStartTime = Date.now();

    const stepTraces: StepTrace[] = [];
    let failedStep: string | undefined;
    let pipelineError: Error | undefined;

    for (const step of this.steps) {
      const stepStartedAt = new Date().toISOString();
      const stepStartTime = Date.now();

      // Check if step should be skipped
      const skipReason = step.shouldSkip?.(ctx);
      if (skipReason) {
        stepTraces.push({
          stepName: step.name,
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          latencyMs: Date.now() - stepStartTime,
          input: step.getInput(ctx),
          output: undefined,
          skipped: true,
          skipReason,
        });
        continue;
      }

      // Get input for tracing
      const input = step.getInput(ctx);

      try {
        // Execute step
        const output = await step.execute(input, ctx);

        // Write output to context
        step.setOutput(ctx, output);

        stepTraces.push({
          stepName: step.name,
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          latencyMs: Date.now() - stepStartTime,
          input,
          output,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        stepTraces.push({
          stepName: step.name,
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          latencyMs: Date.now() - stepStartTime,
          input,
          output: undefined,
          error: {
            message: err.message,
            stack: err.stack,
          },
        });

        failedStep = step.name;
        pipelineError = err;
        break;
      }
    }

    const pipelineCompletedAt = new Date().toISOString();
    const totalLatencyMs = Date.now() - pipelineStartTime;

    const trace: PipelineTrace = {
      pipelineId,
      startedAt: pipelineStartedAt,
      completedAt: pipelineCompletedAt,
      totalLatencyMs,
      success: !pipelineError,
      steps: stepTraces,
      ...(pipelineError && failedStep
        ? {
            error: {
              message: pipelineError.message,
              stack: pipelineError.stack,
              failedStep,
            },
          }
        : {}),
    };

    if (pipelineError) {
      // Attach trace to error for upstream handling
      (pipelineError as Error & { trace?: PipelineTrace }).trace = trace;
      throw pipelineError;
    }

    return { result: ctx, trace };
  }
}
