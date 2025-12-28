// Thumbnail renderer for generating shader previews client-side
// Manages a single WebGL context for compiling and rendering shaders
// Used by ThumbnailRendererPool which handles queuing and caching

import { WebGLRenderer } from './WebGLRenderer';
import type { TabShaderData, MultipassCompilationError } from './GLSLCompiler';
import { PreprocessorCompilationError } from './GLSLCompiler';
import { logger } from './logger';

/** Result of a thumbnail render attempt */
export type ThumbnailRenderResult =
  | { url: string }
  | { error: 'compilation' | 'render' };

export class ThumbnailRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
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
      logger.error('ThumbnailRenderer failed to initialize WebGL');
    }
  }

  /**
   * Render a shader and return its thumbnail as a data URL.
   * Returns { url } on success, or { error } indicating compilation or render failure.
   */
  async renderThumbnail(shaderId: string, tabs: TabShaderData[]): Promise<ThumbnailRenderResult> {
    try {
      // Compile shader - this can throw compilation errors
      this.renderer.compileShader(tabs);

      // Render single frame at time=0
      this.renderer.resetTime();
      this.renderer.renderSingleFrame();

      // Extract canvas as data URL
      return { url: this.canvas.toDataURL('image/png') };
    } catch (error) {
      // Determine if this is a compilation error or a render error
      if (error instanceof PreprocessorCompilationError || this.isMultipassCompilationError(error)) {
        return { error: 'compilation' };
      }
      // Other errors (WebGL context issues, etc.) are render errors
      return { error: 'render' };
    }
  }

  /**
   * Type guard for MultipassCompilationError
   */
  private isMultipassCompilationError(error: unknown): error is MultipassCompilationError {
    return error instanceof Error && 'passErrors' in error && Array.isArray((error as MultipassCompilationError).passErrors);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.renderer.dispose();
  }
}
