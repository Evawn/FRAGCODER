/**
 * Intent Classifier
 * Lightweight pre-classification of user prompts to determine context inclusion
 * Uses Gemini 2.0 Flash for fast, cheap classification
 */

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

const VALID_INTENTS: Intent[] = ['new_shader', 'modify', 'debug', 'explain'];
const DEFAULT_INTENT: Intent = 'modify';
const CLASSIFIER_MODEL = 'google/gemini-2.0-flash-001';

interface ClassifierResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Classify user prompt intent using a lightweight LLM call
 * @param prompt - User's raw prompt
 * @returns Classified intent
 */
export async function classifyIntent(prompt: string): Promise<Intent> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not set, defaulting to modify intent');
    return DEFAULT_INTENT;
  }

  try {
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
        messages: [{ role: 'user', content: CLASSIFICATION_PROMPT.replace('{prompt}', prompt) }],
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
