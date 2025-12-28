/**
 * LLM API Client
 * Handles communication with OpenRouter API
 */

import { AVAILABLE_AI_MODELS, DEFAULT_MODEL_ID } from '@fragcoder/shared/aiModels';
import { PipelineStep } from './pipeline';
import type { PipelineContext } from './pipeline';

// Extract allowed model IDs from shared configuration
const ALLOWED_MODELS = AVAILABLE_AI_MODELS.map(model => model.id);

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Response from LLM API call
 */
export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface CallLLMInput {
  engineeredPrompt: string;
  model?: string;
}

interface CallLLMOutput {
  llmResponse: LLMResponse;
}

/**
 * Pipeline step that calls the LLM API
 */
export class CallLLMStep extends PipelineStep<CallLLMInput, CallLLMOutput> {
  readonly name = 'callLLM';

  getInput(ctx: PipelineContext): CallLLMInput {
    return {
      engineeredPrompt: ctx.engineeredPrompt!,
      model: ctx.input.model,
    };
  }

  async execute(input: CallLLMInput): Promise<CallLLMOutput> {
    const llmResponse = await this.call(input.engineeredPrompt, input.model);
    return { llmResponse };
  }

  setOutput(ctx: PipelineContext, output: CallLLMOutput): void {
    ctx.llmResponse = output.llmResponse;
  }

  /**
   * Call the LLM API with an engineered prompt
   */
  private async call(prompt: string, requestedModel?: string): Promise<LLMResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const defaultModel = process.env.OPENROUTER_MODEL || DEFAULT_MODEL_ID;

    // Validate and select model - use requested if allowed, otherwise fall back to default
    const model = requestedModel && ALLOWED_MODELS.includes(requestedModel)
      ? requestedModel
      : defaultModel;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'FragCoder',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }
}

// Legacy export for backwards compatibility during migration
export async function callLLM(prompt: string, requestedModel?: string): Promise<LLMResponse> {
  const step = new CallLLMStep();
  const result = await step.execute({ engineeredPrompt: prompt, model: requestedModel });
  return result.llmResponse;
}
