/**
 * Intent Classifier
 * Lightweight pre-classification of user prompts to determine context inclusion
 * Uses Gemini 2.0 Flash for fast, cheap classification
 */

import type { ChatHistoryEntry } from '@fragcoder/shared';
import { PipelineStep } from './pipeline';
import type { PipelineContext } from './pipeline';

/**
 * Possible user intents for shader requests
 */
export type Intent = 'new_shader' | 'modify' | 'debug' | 'explain';

const CLASSIFICATION_PROMPT = `Classify this GLSL shader request into exactly one category.

Categories:
- new_shader: User wants a completely new shader from scratch (e.g., "make a raymarched sphere", "create plasma effect")
- modify: User wants to change/add to existing code (e.g., "add color", "make it spin faster", "change the background")
- debug: User is asking to fix errors or issues (e.g., "fix this", "why isn't it working", "there's an error")
- explain: User wants explanation of code (e.g., "what does this do", "explain line 5", "how does this work")

User prompt: "{prompt}"

Respond with only the category name, nothing else.`;

const CLASSIFICATION_PROMPT_WITH_HISTORY = `You are classifying a GLSL shader request. Consider the conversation context to determine intent.

{history}Categories:
- new_shader: User wants a completely new shader from scratch (e.g., "make a raymarched sphere", "create plasma effect")
- modify: User wants to change/add to existing code (e.g., "add color", "make it spin faster", "change the background")
- debug: User is asking to fix errors or issues (e.g., "fix this", "why isn't it working", "there's an error")
- explain: User wants explanation of code (e.g., "what does this do", "explain line 5", "how does this work")

Current request: "{prompt}"

Respond with only the category name, nothing else.`;

const VALID_INTENTS: Intent[] = ['new_shader', 'modify', 'debug', 'explain'];
const DEFAULT_INTENT: Intent = 'modify';
const CLASSIFIER_MODEL = 'google/gemini-2.0-flash-001';

interface ClassifierResponse {
  choices?: { message?: { content?: string } }[];
}

interface ClassifyIntentInput {
  sanitizedPrompt: string;
  history?: ChatHistoryEntry[];
}

interface ClassifyIntentOutput {
  intent: Intent;
}

/**
 * Pipeline step that classifies user intent
 * Can be skipped if intent is overridden in input
 */
export class ClassifyIntentStep extends PipelineStep<ClassifyIntentInput, ClassifyIntentOutput> {
  readonly name = 'classifyIntent';

  getInput(ctx: PipelineContext): ClassifyIntentInput {
    return {
      sanitizedPrompt: ctx.sanitizedPrompt!,
      history: ctx.input.history,
    };
  }

  shouldSkip(ctx: PipelineContext): string | undefined {
    if (ctx.input.overrideIntent) {
      // Set the intent in context even when skipping
      ctx.intent = ctx.input.overrideIntent;
      return `Intent override provided: ${ctx.input.overrideIntent}`;
    }
    return undefined;
  }

  async execute(input: ClassifyIntentInput): Promise<ClassifyIntentOutput> {
    const intent = await this.classify(input.sanitizedPrompt, input.history);
    return { intent };
  }

  setOutput(ctx: PipelineContext, output: ClassifyIntentOutput): void {
    ctx.intent = output.intent;
  }

  /**
   * Format chat history for classification context
   * Includes only the last 2 exchanges to keep prompt minimal
   */
  private formatHistoryForClassification(history?: ChatHistoryEntry[]): string {
    if (!history || history.length === 0) return '';

    // Take last 2 exchanges for recency and brevity
    const recentHistory = history.slice(-2);

    const formatted = recentHistory
      .map((entry, index) => {
        // Truncate explanation to first sentence for token efficiency
        const shortExplanation = entry.aiExplanation.split('.')[0] + '...';
        return `[${index + 1}] User: "${entry.userPrompt}"\n    Response: "${shortExplanation}"`;
      })
      .join('\n');

    return `Recent conversation:\n${formatted}\n\n`;
  }

  /**
   * Classify user prompt intent using a lightweight LLM call
   */
  private async classify(prompt: string, history?: ChatHistoryEntry[]): Promise<Intent> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY not set, defaulting to modify intent');
      return DEFAULT_INTENT;
    }

    try {
      // Format history if available
      const historyContext = this.formatHistoryForClassification(history);

      // Choose prompt template based on whether we have history
      const template = historyContext
        ? CLASSIFICATION_PROMPT_WITH_HISTORY
        : CLASSIFICATION_PROMPT;

      // Build final prompt
      const classificationPrompt = template
        .replace('{history}', historyContext)
        .replace('{prompt}', prompt);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'FragCoder',
        },
        body: JSON.stringify({
          model: CLASSIFIER_MODEL,
          messages: [{ role: 'user', content: classificationPrompt }],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        console.warn(`Intent classification failed with status ${response.status}, defaulting to modify`);
        return DEFAULT_INTENT;
      }

      const data = (await response.json()) as ClassifierResponse;
      const content = data.choices?.[0]?.message?.content?.trim().toLowerCase() || '';

      // Parse and validate the response
      const intent = content as Intent;
      if (VALID_INTENTS.includes(intent)) {
        return intent;
      }

      // Try to find a valid intent in the response (in case model added extra text)
      for (const validIntent of VALID_INTENTS) {
        if (content.includes(validIntent)) {
          return validIntent;
        }
      }

      console.warn(`Unrecognized intent "${content}", defaulting to modify`);
      return DEFAULT_INTENT;
    } catch (error) {
      console.warn('Intent classification error:', error instanceof Error ? error.message : 'Unknown error');
      return DEFAULT_INTENT;
    }
  }
}

// Legacy export for backwards compatibility during migration
export async function classifyIntent(prompt: string, history?: ChatHistoryEntry[]): Promise<Intent> {
  const step = new ClassifyIntentStep();
  const result = await step.execute({ sanitizedPrompt: prompt, history });
  return result.intent;
}
