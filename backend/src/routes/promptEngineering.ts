/**
 * Prompt Engineering API Routes
 * Dev-only endpoints for running and managing test suites
 */

import { Router, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { processPromptWithTrace } from '../services/aiService';
import { logger } from '../utils/logger';
import type { GoldenDataset, PromptResponse, ResponseSuite, ResponseScore } from '../../../prompt-engineering/types';

const router = Router();

/**
 * Active run tracking for SSE reconnection support
 */
interface ActiveRun {
  id: string;
  description: string;
  model: string;
  current: number;
  total: number;
  startedAt: string;
  subscribers: Set<Response>;
  cancelled: boolean;
}

const activeRuns = new Map<string, ActiveRun>();

/**
 * Send SSE event to a single response
 */
function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Broadcast SSE event to all subscribers of an active run
 */
function broadcastEvent(run: ActiveRun, event: string, data: unknown) {
  for (const subscriber of run.subscribers) {
    sendEvent(subscriber, event, data);
  }
}

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
 * PUT /api/prompt-engineering/golden-dataset
 * Save the entire golden dataset
 */
router.put('/golden-dataset', asyncHandler(async (req, res) => {
  const { prompts } = req.body;

  if (!prompts || !Array.isArray(prompts)) {
    return res.status(400).json({ error: 'prompts array is required' });
  }

  const dataset: GoldenDataset = { prompts };
  fs.writeFileSync(GOLDEN_DATASET_PATH, JSON.stringify(dataset, null, 2));

  return res.json({ success: true });
}));

/**
 * POST /api/prompt-engineering/golden-dataset/entry
 * Add a new entry to the golden dataset
 */
router.post('/golden-dataset/entry', asyncHandler(async (req, res) => {
  const entry = req.body;

  if (!entry.id || !entry.input?.prompt) {
    return res.status(400).json({ error: 'id and input.prompt are required' });
  }

  // Load existing dataset
  let dataset: GoldenDataset = { prompts: [] };
  if (fs.existsSync(GOLDEN_DATASET_PATH)) {
    dataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));
  }

  // Check for duplicate ID
  if (dataset.prompts.some(p => p.id === entry.id)) {
    return res.status(400).json({ error: 'Entry with this ID already exists' });
  }

  // Add the new entry
  dataset.prompts.push(entry);
  fs.writeFileSync(GOLDEN_DATASET_PATH, JSON.stringify(dataset, null, 2));

  return res.json(entry);
}));

/**
 * PUT /api/prompt-engineering/golden-dataset/entry/:id
 * Update an existing entry in the golden dataset
 */
router.put('/golden-dataset/entry/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const entry = req.body;

  if (!entry.input?.prompt) {
    return res.status(400).json({ error: 'input.prompt is required' });
  }

  // Load existing dataset
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    return res.status(404).json({ error: 'Golden dataset not found' });
  }

  const dataset: GoldenDataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));

  // Find the entry to update
  const index = dataset.prompts.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // If ID is changing, check for duplicate
  if (entry.id !== id && dataset.prompts.some(p => p.id === entry.id)) {
    return res.status(400).json({ error: 'Entry with the new ID already exists' });
  }

  // Update the entry
  dataset.prompts[index] = entry;
  fs.writeFileSync(GOLDEN_DATASET_PATH, JSON.stringify(dataset, null, 2));

  return res.json(entry);
}));

/**
 * DELETE /api/prompt-engineering/golden-dataset/entry/:id
 * Delete an entry from the golden dataset
 */
router.delete('/golden-dataset/entry/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Load existing dataset
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    return res.status(404).json({ error: 'Golden dataset not found' });
  }

  const dataset: GoldenDataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));

  // Find the entry to delete
  const index = dataset.prompts.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  // Remove the entry
  dataset.prompts.splice(index, 1);
  fs.writeFileSync(GOLDEN_DATASET_PATH, JSON.stringify(dataset, null, 2));

  return res.json({ success: true });
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
 * GET /api/prompt-engineering/suites/status
 * Get list of currently running suites
 * NOTE: This must be defined BEFORE /suites/:id to avoid matching "status" as an ID
 */
router.get('/suites/status', (_req, res) => {
  const runs = Array.from(activeRuns.values()).map(run => ({
    id: run.id,
    description: run.description,
    model: run.model,
    current: run.current,
    total: run.total,
    startedAt: run.startedAt,
  }));
  return res.json({ runs });
});

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
 * Uses Server-Sent Events (SSE) to stream progress updates
 * Supports reconnection via GET /suites/:id/subscribe
 */
router.post('/suites/run', async (req, res) => {
  const { description, model, concurrency: concurrencyParam } = req.body;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!description || typeof description !== 'string') {
    sendEvent(res, 'error', { error: 'Description is required' });
    res.end();
    return;
  }

  // Validate concurrency parameter (default: 5, range: 1-10)
  const concurrency = Math.min(10, Math.max(1, Number(concurrencyParam) || 5));

  // Load golden dataset
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    sendEvent(res, 'error', { error: 'Golden dataset not found' });
    res.end();
    return;
  }

  const dataset: GoldenDataset = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8'));
  const total = dataset.prompts.length;

  // Generate suite ID upfront so subscribers can reconnect
  const suiteId = generateSuiteId(description);
  logger.info(`Starting suite run: ${description}`, { suiteId, model: model || 'default', totalPrompts: total });

  // Register active run
  const activeRun: ActiveRun = {
    id: suiteId,
    description,
    model: model || 'default',
    current: 0,
    total,
    startedAt: new Date().toISOString(),
    subscribers: new Set([res]),
    cancelled: false,
  };
  activeRuns.set(suiteId, activeRun);

  // Send initial events to all subscribers
  broadcastEvent(activeRun, 'start', { id: suiteId, description, model: activeRun.model });
  broadcastEvent(activeRun, 'total', { total });

  // Clean up subscriber when connection closes
  res.on('close', () => {
    activeRun.subscribers.delete(res);
  });

  // Run prompts in parallel with configurable concurrency
  const responses: (PromptResponse | null)[] = new Array(total).fill(null);
  let successfulCompilations = 0;
  let totalLatency = 0;
  let completedCount = 0;
  let nextIndex = 0;

  // Worker function that processes prompts from the queue
  async function processWorker(): Promise<void> {
    while (!activeRun.cancelled) {
      // Atomically grab the next index
      const currentIndex = nextIndex++;
      if (currentIndex >= total) break;

      const goldenPrompt = dataset.prompts[currentIndex];
      const startTime = Date.now();

      let result: PromptResponse;

      try {
        const responseWithTrace = await processPromptWithTrace(
          goldenPrompt.input.prompt,
          'prompt-engineering-test',  // Fake user ID for testing
          model,
          goldenPrompt.input.code,
          goldenPrompt.input.history,
          goldenPrompt.input.errors,
          goldenPrompt.input.intent
        );

        const latencyMs = responseWithTrace.trace.totalLatencyMs;

        // Assume compilation success if code is returned (or no code expected for explain)
        const compilationSuccess = goldenPrompt.input.intent === 'explain' || !!responseWithTrace.code;

        // Extract response without trace for storage
        const { trace, ...response } = responseWithTrace;

        result = {
          promptId: goldenPrompt.id,
          prompt: goldenPrompt,
          response,
          latencyMs,
          compilationSuccess,
          compilationErrors: [],
          trace,
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        result = {
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
        };
      }

      // Store result at original index to maintain order
      responses[currentIndex] = result;
      totalLatency += result.latencyMs;
      if (result.compilationSuccess) successfulCompilations++;

      // Update progress (atomic increment)
      completedCount++;
      activeRun.current = completedCount;
      broadcastEvent(activeRun, 'progress', { current: completedCount, total, promptId: goldenPrompt.id });
      logger.info(`[${completedCount}/${total}] Processed: ${goldenPrompt.id}`, { latencyMs: result.latencyMs, success: result.compilationSuccess });
    }
  }

  // Start N workers in parallel
  logger.info(`Running with concurrency: ${concurrency}`);
  const workers = Array(Math.min(concurrency, total)).fill(null).map(() => processWorker());
  await Promise.all(workers);

  // If cancelled, clean up and exit without saving
  if (activeRun.cancelled) {
    logger.info(`Suite cancelled: ${suiteId}`, { completedPrompts: activeRun.current, totalPrompts: total });
    broadcastEvent(activeRun, 'cancelled', { message: 'Suite run was cancelled' });
    for (const subscriber of activeRun.subscribers) {
      subscriber.end();
    }
    activeRuns.delete(suiteId);
    return;
  }

  // Filter out any null responses (shouldn't happen, but for type safety)
  const completedResponses = responses.filter((r): r is PromptResponse => r !== null);

  // Build response suite
  const suite: ResponseSuite = {
    id: suiteId,
    description,
    model: model || 'default',
    createdAt: activeRun.startedAt,
    responses: completedResponses,
    metadata: {
      totalPrompts: completedResponses.length,
      successfulCompilations,
      averageLatencyMs: Math.round(totalLatency / completedResponses.length),
      scoredCount: 0,
    },
  };

  // Save to file
  const suitePath = path.join(RESPONSE_SUITES_DIR, `${suiteId}.json`);
  fs.writeFileSync(suitePath, JSON.stringify(suite, null, 2));
  logger.info(`Suite saved: ${suiteId}`, { path: suitePath, totalPrompts: completedResponses.length, successfulCompilations });

  // Broadcast complete event and close all connections
  broadcastEvent(activeRun, 'complete', suite);
  for (const subscriber of activeRun.subscribers) {
    subscriber.end();
  }

  // Remove from active runs
  activeRuns.delete(suiteId);
});

/**
 * GET /api/prompt-engineering/suites/:id/subscribe
 * Subscribe to progress updates for an active run
 * Returns SSE stream with current state and subsequent updates
 */
router.get('/suites/:id/subscribe', (req, res) => {
  const { id } = req.params;
  const activeRun = activeRuns.get(id);

  if (!activeRun) {
    return res.status(404).json({ error: 'No active run found with this ID' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add this response to subscribers
  activeRun.subscribers.add(res);

  // Send current state to the new subscriber
  sendEvent(res, 'start', { id: activeRun.id, description: activeRun.description, model: activeRun.model });
  sendEvent(res, 'total', { total: activeRun.total });
  sendEvent(res, 'progress', { current: activeRun.current, total: activeRun.total });

  // Clean up when connection closes
  res.on('close', () => {
    activeRun.subscribers.delete(res);
  });

  // SSE connection stays open - no explicit return needed but TypeScript wants one
  return;
});

/**
 * POST /api/prompt-engineering/suites/:id/cancel
 * Cancel an in-progress suite run
 */
router.post('/suites/:id/cancel', (req, res) => {
  const { id } = req.params;
  const activeRun = activeRuns.get(id);

  if (!activeRun) {
    return res.status(404).json({ error: 'No active run found with this ID' });
  }

  // Set the cancelled flag - the run loop will check this and exit gracefully
  activeRun.cancelled = true;

  return res.json({ success: true, message: 'Cancellation requested' });
});

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
