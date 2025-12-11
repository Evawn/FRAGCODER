/**
 * AI Prompt Engineer
 * Transforms user prompts into optimized prompts for the LLM
 * Conditionally includes context based on classified intent
 */

import type { ChatHistoryEntry, CompilationError } from '@fragcoder/shared';
import type { Intent } from './intentClassifier';

/**
 * Format chat history as a concise log
 */
function formatChatHistory(history?: ChatHistoryEntry[]): string {
  if (!history || history.length === 0) return '';

  const formatted = history
    .map(entry => `USER: ${entry.userPrompt}\nRESPONSE: ${entry.aiExplanation}`)
    .join('\n\n');

  return `CONVERSATION_HISTORY:
${formatted}

`;
}

/**
 * Format compilation errors as a concise diagnostic section
 */
function formatCompilationErrors(errors?: CompilationError[]): string {
  if (!errors || errors.length === 0) return '';

  const errorLines = errors.map(err => {
    const prefix = err.type === 'warning' ? 'WARN' : 'ERR';
    const lineInfo = err.line > 0 ? `L${err.line}` : 'L?';
    return `  ${prefix} ${lineInfo}: ${err.message}`;
  });

  return `COMPILATION_ERRORS:
${errorLines.join('\n')}

`;
}

/**
 * Format example shaders for new_shader intent
 * Provides inspiration and patterns for the LLM
 */
function formatExamples(): string {
  // Placeholder - can be expanded with curated examples
  return `EXAMPLE_PATTERNS:
- For raymarching: use signed distance functions (SDFs), ray origin at camera, march along ray direction
- For noise effects: implement hash functions, use fbm for organic patterns
- For color: use HSV/HSL conversion, gradient mapping, palette functions
- For animation: use sin/cos with iTime, create smooth loops with mod(iTime, period)

`;
}

/**
 * Get the JSON response format based on intent
 * For 'explain' intent, we only need explanation (no code)
 */
function getResponseFormat(intent: Intent): string {
  if (intent === 'explain') {
    return `Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "explanation": "Your detailed explanation of what the code does and how it works"
}`;
  }

  return `Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "code": "void mainImage(out vec4 fragColor, in vec2 fragCoord) { ... your complete function code ... }",
  "explanation": "Brief 1-2 sentence explanation of what the shader does and how it works"
}`;
}

/**
 * Get intent-specific instruction for the LLM
 */
function getIntentInstruction(intent: Intent): string {
  switch (intent) {
    case 'new_shader':
      return 'Create a new shader from scratch based on the user request. Be creative and produce visually interesting results.';
    case 'modify':
      return 'Modify the user\'s existing shader code based on their request. Preserve their existing structure and style where possible.';
    case 'debug':
      return 'Fix the compilation errors in the user\'s shader. Analyze the errors and correct the issues while maintaining the original intent.';
    case 'explain':
      return 'The user wants to understand the code. Provide a clear, detailed explanation of what the code does and how it works. Do NOT return any code - only provide a natural language explanation.';
    default:
      return 'Modify the user\'s existing shader code based on their request.';
  }
}

/**
 * Engineer/transform user prompt for optimal LLM response
 * @param userPrompt - Sanitized user input
 * @param userCode - Optional current editor code for context
 * @param history - Optional chat history for conversational context
 * @param errors - Optional compilation errors for debugging context
 * @param intent - Classified user intent for context management
 * @returns Engineered prompt ready for LLM
 */
export function engineerPrompt(
  userPrompt: string,
  userCode?: string,
  history?: ChatHistoryEntry[],
  errors?: CompilationError[],
  intent: Intent = 'modify'
): string {
  // Determine what context to include based on intent
  const includeCode = intent === 'modify' || intent === 'debug' || intent === 'explain';
  const includeErrors = intent === 'debug';
  const includeExamples = intent === 'new_shader';

  // Build context sections conditionally
  const historySection = formatChatHistory(history);
  const codeSection = includeCode && userCode ? userCode : '';
  const errorsSection = includeErrors ? formatCompilationErrors(errors) : '';
  const examplesSection = includeExamples ? formatExamples() : '';

  // Build intent-specific instruction and response format
  const intentInstruction = getIntentInstruction(intent);
  const responseFormat = getResponseFormat(intent);

  // For explain intent, we skip GLSL constraints since we're not asking for code
  const glslConstraints = intent === 'explain' ? '' : `
IMPORTANT - GLSL ES 3.00 / WebGL 2.0 CONSTRAINTS:
- Use texture() NOT texture2D() (texture2D doesn't exist in ES 3.00)
- Use clamp(x, 0.0, 1.0) NOT saturate(x) (saturate doesn't exist)
- hash(), noise(), random() are NOT built-in - you must implement them yourself if needed
- Output to the fragColor parameter, NOT gl_FragColor
- Don't use the 'f' suffix on floats (use 1.0 not 1.0f)
- Don't pass negative numbers to sqrt() or pow() - use abs() or max(0.0, x)
- Don't do mod(x, 0.0) - undefined behavior

Available GLSL ES 3.00 built-in functions:
- Trig: radians, degrees, sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, asinh, acosh, atanh
- Exponential: pow, exp, log, exp2, log2, sqrt, inversesqrt
- Common: abs, sign, floor, ceil, trunc, fract, mod, modf, min, max, clamp, mix, step, smoothstep
- Geometric: length, distance, dot, cross, normalize, faceforward, reflect, refract
- Matrix: determinant, outerProduct, matrixCompMult, inverse, transpose
- Texture: texture, textureLod, textureGrad, textureProj, texelFetch, textureSize (and offset variants)
- Fragment: dFdx, dFdy, fwidth
- Relational: lessThan, lessThanEqual, greaterThan, greaterThanEqual, equal, notEqual, any, all, not
- Bit/Pack: isnan, isinf, intBitsToFloat, uintBitsToFloat, floatBitsToInt, floatBitsToUint, packSnorm2x16, packUnorm2x16, unpackSnorm2x16, unpackUnorm2x16

Here are the provided uniforms and the main function header as the shader entrypoint:

uniform vec3 iResolution;          // viewport resolution (in pixels)
uniform float iTime;               // shader playback time (in seconds)
uniform float iTimeDelta;          // render time (in seconds)
uniform float iFrameRate;          // shader frame rate
uniform int iFrame;                // shader playback frame
uniform vec4 iDate;                // year, month, day, time in seconds
uniform vec4 iMouse;               // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D BufferA;         // Buffer A texture
uniform sampler2D BufferB;         // Buffer B texture
uniform sampler2D BufferC;         // Buffer C texture
uniform sampler2D BufferD;         // Buffer D texture

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Your code here
}

Do not include the uniform definitions in your response. Do not include any comments in your code.
`;

  const prompt = `You are an expert in coding beautiful GLSL fragment shaders.
${intentInstruction}
${historySection ? `Use the conversation history below to understand prior context and maintain continuity.\n` : ''}${errorsSection ? `The user's current shader has compilation errors. Fix these issues.\n` : ''}
${historySection}${errorsSection}${examplesSection}USER_PROMPT: "${userPrompt}"
${includeCode ? `USER_CODE: "${codeSection}"` : ''}
${glslConstraints}
${responseFormat}`;
  return prompt;
}
