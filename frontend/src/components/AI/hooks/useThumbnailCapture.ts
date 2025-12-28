'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ThumbnailRenderer } from '../../../utils/ThumbnailRenderer';
import type { TabShaderData } from '../../../utils/GLSLCompiler';

// Singleton instance shared across all hook usages
let sharedRenderer: ThumbnailRenderer | null = null;
let refCount = 0;

function getSharedRenderer(): ThumbnailRenderer {
  if (!sharedRenderer) {
    sharedRenderer = new ThumbnailRenderer();
  }
  refCount++;
  return sharedRenderer;
}

function releaseSharedRenderer(): void {
  refCount--;
  if (refCount <= 0 && sharedRenderer) {
    sharedRenderer.dispose();
    sharedRenderer = null;
    refCount = 0;
  }
}

/**
 * Hook for capturing shader thumbnails using an off-screen WebGL canvas.
 * Uses a shared ThumbnailRenderer singleton to avoid creating multiple WebGL contexts.
 */
export function useThumbnailCapture() {
  const rendererRef = useRef<ThumbnailRenderer | null>(null);

  useEffect(() => {
    rendererRef.current = getSharedRenderer();
    return () => {
      releaseSharedRenderer();
      rendererRef.current = null;
    };
  }, []);

  /**
   * Capture a thumbnail from shader code.
   * Creates tabs array with just an Image pass containing the provided code.
   */
  const captureThumbnail = useCallback(async (code: string): Promise<string | null> => {
    if (!rendererRef.current) {
      return null;
    }

    const tabs: TabShaderData[] = [
      { id: '1', name: 'Image', code }
    ];

    const result = await rendererRef.current.renderThumbnail(`temp-${Date.now()}`, tabs);
    return 'url' in result ? result.url : null;
  }, []);

  return { captureThumbnail };
}
