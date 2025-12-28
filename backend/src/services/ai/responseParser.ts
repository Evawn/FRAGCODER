/**
 * AI Response Parser
 * Parses and transforms LLM responses for the client
 *
 * Parses JSON responses containing code and explanation fields
 */

import { PipelineStep } from './pipeline';
import type { PipelineContext } from './pipeline';

export interface ParsedAIResponse {
  code?: string;  // Optional - not returned for 'explain' intent
  explanation: string;
}

interface ParseResponseInput {
  llmContent: string;
}

interface ParseResponseOutput {
  parsedResponse: ParsedAIResponse;
}

/**
 * Pipeline step that parses LLM response into structured format
 */
export class ParseResponseStep extends PipelineStep<ParseResponseInput, ParseResponseOutput> {
  readonly name = 'parseResponse';

  getInput(ctx: PipelineContext): ParseResponseInput {
    return { llmContent: ctx.llmResponse!.content };
  }

  execute(input: ParseResponseInput): ParseResponseOutput {
    const parsedResponse = this.parse(input.llmContent);
    return { parsedResponse };
  }

  setOutput(ctx: PipelineContext, output: ParseResponseOutput): void {
    ctx.parsedResponse = output.parsedResponse;
  }

  /**
   * Parse LLM response into structured format with code and explanation
   * @param llmResponse - Raw response content from LLM (expected to be JSON)
   * @returns Parsed response with code and explanation fields
   * @throws Error if response is not valid JSON or missing required fields
   */
  private parse(llmResponse: string): ParsedAIResponse {
    let parsed: unknown;

    // First try direct JSON parse
    try {
      parsed = JSON.parse(llmResponse);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/i;
      const match = llmResponse.match(jsonBlockRegex);

      if (match && match[1]) {
        try {
          parsed = JSON.parse(match[1].trim());
        } catch {
          throw new Error(
            'Failed to parse AI response as JSON. Please try again.'
          );
        }
      } else {
        throw new Error(
          'Failed to parse AI response as JSON. Please try again.'
        );
      }
    }

    // Validate required fields (only explanation is required)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('explanation' in parsed)
    ) {
      throw new Error(
        'AI response missing required field (explanation). Please try again.'
      );
    }

    const response = parsed as { code?: unknown; explanation: unknown };

    if (typeof response.explanation !== 'string') {
      throw new Error(
        'AI response explanation must be a string. Please try again.'
      );
    }

    // Code is optional, but if present must be a string
    if (response.code !== undefined && typeof response.code !== 'string') {
      throw new Error(
        'AI response code must be a string. Please try again.'
      );
    }

    return {
      code: response.code as string | undefined,
      explanation: response.explanation,
    };
  }
}

// Legacy export for backwards compatibility during migration
export function parseResponse(llmResponse: string): ParsedAIResponse {
  const step = new ParseResponseStep();
  return step.execute({ llmContent: llmResponse }).parsedResponse;
}
