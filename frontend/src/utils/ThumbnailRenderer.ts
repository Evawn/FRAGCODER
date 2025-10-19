// Imperative-style thumbnail renderer for generating shader previews client-side
// Manages a single WebGL context and sequentially processes a queue of shader compilation/rendering tasks
// Uses existing WebGLRenderer to compile shaders and capture first frame as PNG data URLs

import { WebGLRenderer } from './WebGLRenderer';
import type { TabShaderData } from './GLSLCompiler';

interface ThumbnailRequest {
  shaderId: string;
  tabs: TabShaderData[];
  callback: (dataURL: string | null) => void;
}

export class ThumbnailRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private queue: ThumbnailRequest[] = [];
  private processing: boolean = false;
  private thumbnailCache: Map<string, string> = new Map();
  private readonly THUMBNAIL_WIDTH = 400;
  private readonly THUMBNAIL_HEIGHT = 300; // 4:3 aspect ratio

  constructor() {
    // Create off-screen canvas for thumbnail rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.THUMBNAIL_WIDTH;
    this.canvas.height = this.THUMBNAIL_HEIGHT;

    // Initialize WebGL renderer
    this.renderer = new WebGLRenderer();
    const initialized = this.renderer.initialize(this.canvas);

    if (!initialized) {
      console.error('ThumbnailRenderer: Failed to initialize WebGL');
    }
  }

  /**
   * Queue a shader for thumbnail generation
   * Returns immediately; callback is invoked when thumbnail is ready
   */
  queueThumbnail(shaderId: string, tabs: TabShaderData[], callback: (dataURL: string | null) => void): void {
    // Check if thumbnail already exists in cache
    const cached = this.thumbnailCache.get(shaderId);
    if (cached) {
      callback(cached);
      return;
    }

    // Add to queue
    this.queue.push({ shaderId, tabs, callback });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Get cached thumbnail data URL if available
   */
  getCachedThumbnail(shaderId: string): string | null {
    return this.thumbnailCache.get(shaderId) || null;
  }

  /**
   * Clear all cached thumbnails
   */
  clearCache(): void {
    this.thumbnailCache.clear();
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;

      const dataURL = await this.renderThumbnail(request.tabs);

      // Cache the result (even if null/failed)
      if (dataURL) {
        this.thumbnailCache.set(request.shaderId, dataURL);
      }

      // Invoke callback
      request.callback(dataURL);

      // Small delay between renders to prevent blocking
      await this.delay(10);
    }

    this.processing = false;
  }

  /**
   * Render a single thumbnail
   */
  private async renderThumbnail(tabs: TabShaderData[]): Promise<string | null> {
    try {
      // Compile shader
      this.renderer.compileShader(tabs);

      // Render single frame at time=0
      this.renderer.resetTime();
      this.renderer.renderSingleFrame();

      // Extract canvas as data URL
      const dataURL = this.canvas.toDataURL('image/png');

      return dataURL;
    } catch (error) {
      // Compilation or rendering failed - return null
      console.warn('[ThumbnailRenderer] Failed to render thumbnail', error);
      return null;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.renderer.dispose();
    this.queue = [];
    this.thumbnailCache.clear();
    this.processing = false;
  }
}
