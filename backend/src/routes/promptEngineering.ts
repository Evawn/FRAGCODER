/**
 * Prompt Engineering API Routes
 * Dev-only endpoints for running and managing test suites
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { processPrompt } from '../services/aiService';
import type { GoldenDataset, PromptResponse, ResponseSuite, ResponseScore } from '../../../prompt-engineering/types';

const router = Router();

// Paths to prompt engineering data
const PROMPT_ENGINEERING_DIR = path.join(__dirname, '../../../prompt-engineering');
const GOLDEN_DATASET_PATH = path.join(PROMPT_ENGINEERING_DIR, 'golden-dataset.json');
const RESPONSE_SUITES_DIR = path.join(PROMPT_ENGINEERING_DIR, 'response-suites');

// Ensure response-suites directory exists
if (!fs.existsSync(RESPONSE_SUITES_DIR)) {
  fs.mkdirSync(RESPONSE_SUITES_DIR, { recursive: true });
}

/**
 * Generate a slug from description and timestamp
 */
function generateSuiteId(description: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `${timestamp}-${slug}`;
}

/**
 * GET /api/prompt-engineering/golden-dataset
 * Return the golden dataset JSON
 */
router.get('/golden-dataset', asyncHandler(async (_req, res) => {
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    return res.status(404).json({ error: 'Golden dataset not found' });
  }

  const dataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));
  return res.json(dataset);
}));

/**
 * GET /api/prompt-engineering/suites
 * List all response suites with summary info
 */
router.get('/suites', asyncHandler(async (_req, res) => {
  if (!fs.existsSync(RESPONSE_SUITES_DIR)) {
    return res.json([]);
  }

  const files = fs.readdirSync(RESPONSE_SUITES_DIR).filter(f => f.endsWith('.json'));

  const summaries = files.map(file => {
    const filePath = path.join(RESPONSE_SUITES_DIR, file);
    const suite: ResponseSuite = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Calculate average score from scored responses
    const scoredResponses = suite.responses.filter(r => r.score);
    let averageScore: number | undefined;

    if (scoredResponses.length > 0) {
      const totalScore = scoredResponses.reduce((sum, r) => {
        const s = r.score!;
        return sum + (s.visualQuality + s.accuracy + s.explanationQuality + s.codeQuality) / 4;
      }, 0);
      averageScore = totalScore / scoredResponses.length;
    }

    return {
      id: suite.id,
      description: suite.description,
      model: suite.model,
      createdAt: suite.createdAt,
      metadata: suite.metadata,
      averageScore,
    };
  });

  // Sort by creation date, newest first
  summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(summaries);
}));

/**
 * GET /api/prompt-engineering/suites/:id
 * Get a single response suite by ID
 */
router.get('/suites/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(RESPONSE_SUITES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  const suite = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return res.json(suite);
}));

/**
 * POST /api/prompt-engineering/suites/run
 * Run the golden dataset with specified description and model
 */
router.post('/suites/run', asyncHandler(async (req, res) => {
  const { description, model } = req.body;

  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Description is required' });
  }

  // Load golden dataset
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    return res.status(404).json({ error: 'Golden dataset not found' });
  }

  const dataset: GoldenDataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));

  // Run each prompt
  const responses: PromptResponse[] = [];
  let successfulCompilations = 0;
  let totalLatency = 0;

  for (const goldenPrompt of dataset.prompts) {
    const startTime = Date.now();

    try {
      const response = await processPrompt(
        goldenPrompt.input.prompt,
        'prompt-engineering-test',  // Fake user ID for testing
        model,
        goldenPrompt.input.code,
        goldenPrompt.input.history,
        goldenPrompt.input.errors,
        goldenPrompt.input.intent
      );

      const latencyMs = Date.now() - startTime;
      totalLatency += latencyMs;

      // Assume compilation success if code is returned (or no code expected for explain)
      const compilationSuccess = goldenPrompt.input.intent === 'explain' || !!response.code;
      if (compilationSuccess) successfulCompilations++;

      responses.push({
        promptId: goldenPrompt.id,
        prompt: goldenPrompt,
        response,
        latencyMs,
        compilationSuccess,
        compilationErrors: [],
      });
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      totalLatency += latencyMs;

      responses.push({
        promptId: goldenPrompt.id,
        prompt: goldenPrompt,
        response: {
          explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          intent: goldenPrompt.input.intent || 'modify',
        },
        latencyMs,
        compilationSuccess: false,
        compilationErrors: [{
          line: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'error',
        }],
      });
    }
  }

  // Build response suite
  const suiteId = generateSuiteId(description);
  const suite: ResponseSuite = {
    id: suiteId,
    description,
    model: model || 'default',
    createdAt: new Date().toISOString(),
    responses,
    metadata: {
      totalPrompts: responses.length,
      successfulCompilations,
      averageLatencyMs: Math.round(totalLatency / responses.length),
      scoredCount: 0,
    },
  };

  // Save to file
  const suitePath = path.join(RESPONSE_SUITES_DIR, `${suiteId}.json`);
  fs.writeFileSync(suitePath, JSON.stringify(suite, null, 2));

  return res.json(suite);
}));

/**
 * PUT /api/prompt-engineering/suites/:id/scores
 * Update scores for responses in a suite
 */
router.put('/suites/:id/scores', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { promptId, score } = req.body as { promptId: string; score: ResponseScore };

  const filePath = path.join(RESPONSE_SUITES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Suite not found' });
  }

  if (!promptId || !score) {
    return res.status(400).json({ error: 'promptId and score are required' });
  }

  // Load suite
  const suite: ResponseSuite = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Find and update the response
  const responseIndex = suite.responses.findIndex(r => r.promptId === promptId);
  if (responseIndex === -1) {
    return res.status(404).json({ error: 'Response not found in suite' });
  }

  suite.responses[responseIndex].score = score;

  // Update metadata
  suite.metadata.scoredCount = suite.responses.filter(r => r.score).length;

  // Save updated suite
  fs.writeFileSync(filePath, JSON.stringify(suite, null, 2));

  return res.json({ success: true });
}));

export default router;
