/**
 * Intent Classifier Integration Tests
 *
 * Run-once sanity check that makes real API calls to validate prompt quality.
 * Skipped by default - run manually with:
 *   RUN_INTEGRATION=true npx vitest run intentClassifier.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { classifyIntent, Intent } from './intentClassifier';

interface TestCase {
  prompt: string;
  expected: Intent;
  note: string;
}

const testCases: Record<Intent, TestCase[]> = {
  new_shader: [
    { prompt: 'make a raymarched sphere', expected: 'new_shader', note: 'clear new shader request' },
    { prompt: 'I want a plasma effect', expected: 'new_shader', note: '"I want" phrasing' },
    { prompt: 'generate some noise', expected: 'new_shader', note: 'vague, could be adding noise' },
    { prompt: 'show me a mandelbrot fractal', expected: 'new_shader', note: '"show me" phrasing' },
    { prompt: 'start fresh with a gradient background', expected: 'new_shader', note: '"start fresh" explicit' },
  ],
  modify: [
    { prompt: 'make it spin faster', expected: 'modify', note: 'clear modification' },
    { prompt: 'add some glow to the edges', expected: 'modify', note: '"add" could be new feature' },
    { prompt: 'change the color to blue', expected: 'modify', note: 'clear change' },
    { prompt: 'can you make this more vibrant', expected: 'modify', note: 'question phrasing' },
    { prompt: 'tweak the animation speed', expected: 'modify', note: '"tweak" implies existing code' },
  ],
  debug: [
    { prompt: 'fix this error', expected: 'debug', note: 'clear debug' },
    { prompt: "why isn't it working", expected: 'debug', note: 'question about failure' },
    { prompt: "there's something wrong with line 12", expected: 'debug', note: 'specific line issue' },
    { prompt: "it's showing a black screen", expected: 'debug', note: 'symptom description (ambiguous)' },
    { prompt: 'help me fix the compilation error', expected: 'debug', note: 'explicit fix request' },
  ],
  explain: [
    { prompt: 'what does this do', expected: 'explain', note: 'clear explanation request' },
    { prompt: 'explain the smoothstep function', expected: 'explain', note: 'explicit explain' },
    { prompt: 'how does this shader work', expected: 'explain', note: '"how" question' },
    { prompt: "I don't understand line 5", expected: 'explain', note: 'implicit explanation need' },
    { prompt: "what's happening in the main function", expected: 'explain', note: '"what\'s happening"' },
  ],
};

// Collect results for summary
const results: { prompt: string; expected: Intent; actual: Intent; passed: boolean }[] = [];

const runIntegration = process.env.RUN_INTEGRATION === 'true';

const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Intent Classifier - Integration Tests', () => {
  beforeAll(() => {
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('\n⚠️  OPENROUTER_API_KEY not set - tests will use default intent\n');
    }
    console.log('\n' + '='.repeat(60));
    console.log('Intent Classifier Integration Tests');
    console.log('='.repeat(60) + '\n');
  });

  afterAll(() => {
    // Print summary
    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const accuracy = ((passed / total) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed}/${total} passed (${accuracy}% accuracy)`);

    const failed = results.filter((r) => !r.passed);
    if (failed.length > 0) {
      console.log('\nFailed cases:');
      failed.forEach((f) => {
        console.log(`  - "${f.prompt}": expected ${f.expected}, got ${f.actual}`);
      });
    }
    console.log('='.repeat(60) + '\n');
  });

  // Generate tests for each intent category
  for (const [intent, cases] of Object.entries(testCases)) {
    describe(intent, () => {
      for (const testCase of cases) {
        it(`should classify "${testCase.prompt}" as ${testCase.expected}`, async () => {
          const actual = await classifyIntent(testCase.prompt);
          const passed = actual === testCase.expected;

          // Log result
          const icon = passed ? '✓' : '✗';
          console.log(
            `[${testCase.expected}] "${testCase.prompt}" -> Got: ${actual} ${icon}` +
              (passed ? '' : ` (${testCase.note})`)
          );

          // Store for summary
          results.push({
            prompt: testCase.prompt,
            expected: testCase.expected,
            actual,
            passed,
          });

          expect(actual).toBe(testCase.expected);
        });
      }
    });
  }
});
