// Pool of ThumbnailRenderer instances for parallel thumbnail generation
// Uses a fixed number of WebGL contexts to avoid exhausting browser limits
// Manages a global queue and cache shared across all consumers

import { ThumbnailRenderer } from './ThumbnailRenderer';
import type { TabShaderData } from './GLSLCompiler';
import { prepareShaderCode } from './GLSLCompiler';
import { logger } from './logger';

/** Result passed to thumbnail queue callbacks */
export type ThumbnailResult =
  | { url: string; compiled: true }
  | { url: null; compiled: false };

interface QueuedRequest {
  shaderId: string;
  tabs: TabShaderData[];
  callback: (result: ThumbnailResult) => void;
}

// Get pool size from environment variable or default to 3
const DEFAULT_POOL_SIZE = 3;
const getPoolSize = (): number => {
  const envValue = import.meta.env.VITE_THUMBNAIL_POOL_SIZE;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_POOL_SIZE;
};

export class ThumbnailRendererPool {
  private static instance: ThumbnailRendererPool | null = null;
  private static refCount = 0;

  private renderers: ThumbnailRenderer[] = [];
  private readonly poolSize: number;
  private globalQueue: QueuedRequest[] = [];
  private globalCache: Map<string, string> = new Map();
  private failedShaders: Set<string> = new Set();
  private processingShaders: Set<string> = new Set();
  private rendererBusy: Map<ThumbnailRenderer, boolean> = new Map();
  private disposed = false;

  private constructor() {
    this.poolSize = getPoolSize();
    this.initializePool();
  }

  /**
   * Get the singleton instance of the pool.
   * Increments reference count for cleanup tracking.
   */
  static getInstance(): ThumbnailRendererPool {
    if (!ThumbnailRendererPool.instance) {
      ThumbnailRendererPool.instance = new ThumbnailRendererPool();
    }
    ThumbnailRendererPool.refCount++;
    return ThumbnailRendererPool.instance;
  }

  /**
   * Release a reference to the pool.
   * When all references are released, the pool is disposed.
   */
  static release(): void {
    ThumbnailRendererPool.refCount--;
    if (ThumbnailRendererPool.refCount <= 0 && ThumbnailRendererPool.instance) {
      ThumbnailRendererPool.instance.dispose();
      ThumbnailRendererPool.instance = null;
      ThumbnailRendererPool.refCount = 0;
    }
  }

  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const renderer = new ThumbnailRenderer();
        this.renderers.push(renderer);
        this.rendererBusy.set(renderer, false);
      } catch (error) {
        logger.error(`ThumbnailRendererPool: Failed to initialize renderer ${i + 1}`, { error });
      }
    }
    logger.info(`ThumbnailRendererPool: Initialized with ${this.renderers.length} renderers`);
  }

  /**
   * Pre-validate shader code before attempting WebGL compilation.
   * Returns true if shader is likely to compile, false otherwise.
   */
  private validateShader(tabs: TabShaderData[]): boolean {
    try {
      const commonTab = tabs.find(t => t.name === 'Common');
      const commonCode = commonTab?.code || '';

      for (const tab of tabs) {
        if (tab.name === 'Common') continue;
        prepareShaderCode(commonCode, tab.code, tab.name);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Queue a shader for thumbnail generation.
   * Returns immediately; callback is invoked when thumbnail is ready.
   */
  queueThumbnail(
    shaderId: string,
    tabs: TabShaderData[],
    callback: (result: ThumbnailResult) => void
  ): void {
    if (this.disposed) {
      callback({ url: null, compiled: false });
      return;
    }

    // Check if already known to fail
    if (this.failedShaders.has(shaderId)) {
      setTimeout(() => callback({ url: null, compiled: false }), 0);
      return;
    }

    // Check global cache first
    const cached = this.globalCache.get(shaderId);
    if (cached) {
      // Use setTimeout to ensure callback is async
      setTimeout(() => callback({ url: cached, compiled: true }), 0);
      return;
    }

    // Check if already being processed by a worker
    if (this.processingShaders.has(shaderId)) {
      // Result will be cached when processing completes; skip duplicate request
      return;
    }

    // Check if already in queue (dedupe) - chain callbacks
    const existingIndex = this.globalQueue.findIndex(r => r.shaderId === shaderId);
    if (existingIndex !== -1) {
      const existing = this.globalQueue[existingIndex];
      const originalCallback = existing.callback;
      existing.callback = (result) => {
        originalCallback(result);
        callback(result);
      };
      return;
    }

    // Pre-validate shader before queueing
    if (!this.validateShader(tabs)) {
      this.failedShaders.add(shaderId);
      setTimeout(() => callback({ url: null, compiled: false }), 0);
      return;
    }

    // Add to queue
    this.globalQueue.push({ shaderId, tabs, callback });

    // Start processing
    this.processQueue();
  }

  /**
   * Get cached thumbnail data URL if available.
   */
  getCachedThumbnail(shaderId: string): string | null {
    return this.globalCache.get(shaderId) || null;
  }

  /**
   * Clear all cached thumbnails.
   */
  clearCache(): void {
    this.globalCache.clear();
  }

  /**
   * Process the queue by distributing work across available renderers.
   */
  private processQueue(): void {
    if (this.disposed || this.globalQueue.length === 0) return;

    // Find all available renderers and assign work
    for (const renderer of this.renderers) {
      if (this.globalQueue.length === 0) break;
      if (this.rendererBusy.get(renderer)) continue;

      const request = this.globalQueue.shift();
      if (!request) continue;

      // Mark renderer as busy and track shader as processing
      this.rendererBusy.set(renderer, true);
      this.processingShaders.add(request.shaderId);

      // Process the request
      this.processRequest(renderer, request);
    }
  }

  private async processRequest(renderer: ThumbnailRenderer, request: QueuedRequest): Promise<void> {
    const renderResult = await renderer.renderThumbnail(request.shaderId, request.tabs);

    // Convert render result to callback result
    let result: ThumbnailResult;
    if ('url' in renderResult) {
      // Success - cache and return
      this.globalCache.set(request.shaderId, renderResult.url);
      result = { url: renderResult.url, compiled: true };
    } else {
      // Failed - mark as failed
      this.failedShaders.add(request.shaderId);
      result = { url: null, compiled: false };
    }

    // Invoke original callback
    request.callback(result);

    // Mark renderer as available and shader as done processing
    this.rendererBusy.set(renderer, false);
    this.processingShaders.delete(request.shaderId);

    // Process more items if available
    this.processQueue();
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.disposed = true;
    this.globalQueue = [];
    this.globalCache.clear();
    this.failedShaders.clear();
    this.processingShaders.clear();

    for (const renderer of this.renderers) {
      renderer.dispose();
    }
    this.renderers = [];
    this.rendererBusy.clear();

    logger.info('ThumbnailRendererPool: Disposed');
  }

  /**
   * Get current pool status for debugging.
   */
  getPoolStatus(): { total: number; busy: number; queueLength: number; cacheSize: number } {
    const busy = this.renderers.filter(r => this.rendererBusy.get(r)).length;
    return {
      total: this.renderers.length,
      busy,
      queueLength: this.globalQueue.length,
      cacheSize: this.globalCache.size
    };
  }
}
