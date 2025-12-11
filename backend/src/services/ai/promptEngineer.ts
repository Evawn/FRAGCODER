/**
 * AI Prompt Engineer
 * Transforms user prompts into optimized prompts for the LLM
 *
 * Current: Skeleton implementation (pass-through)
 * Future: System prompts, context injection, shader-specific instructions
 */

import type { ChatHistoryEntry, CompilationError } from '@fragcoder/shared';

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
 * Engineer/transform user prompt for optimal LLM response
 * @param userPrompt - Sanitized user input
 * @param userCode - Optional current editor code for context
 * @param history - Optional chat history for conversational context
 * @param errors - Optional compilation errors for debugging context
 * @returns Engineered prompt ready for LLM
 */
export function engineerPrompt(
  userPrompt: string,
  userCode?: string,
  history?: ChatHistoryEntry[],
  errors?: CompilationError[]
): string {
  // Include user code if provided, otherwise empty string
  const codeSection = userCode || '';
  // Format chat history if provided
  const historySection = formatChatHistory(history);
  // Format compilation errors if provided
  const errorsSection = formatCompilationErrors(errors);

  const prompt = `You are an expert in coding beautiful GLSL fragment shaders.
The user may ask you to create a new shader or to augment their current shader. Infer based off the USER_PROMPT if they want a completely new shader or are requesting a modification.
If the user is asking to modify their existing shader, make sure to refer to the USER_CODE below.
If the user is asking for a completely new shader, ignore the USER_CODE section.
${historySection ? `\nUse the conversation history below to understand prior context and maintain continuity.\n` : ''}${errorsSection ? `The user's current shader has compilation errors. If relevant to their request, help fix these issues.\n` : ''}
${historySection}${errorsSection}USER_PROMPT: "${userPrompt}"
USER_CODE: "${codeSection}"

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

Respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "code": "void mainImage(out vec4 fragColor, in vec2 fragCoord) { ... your complete function code ... }",
  "explanation": "Brief 1-2 sentence explanation of what the shader does and how it works"
}`;
  return prompt;
}
