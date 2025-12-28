// Hook for accessing the shared ThumbnailRendererPool
// Automatically manages reference counting for pool lifecycle

import { useRef, useEffect, useCallback } from 'react';
import { ThumbnailRendererPool, type ThumbnailResult } from '../utils/ThumbnailRendererPool';
import type { TabShaderData } from '../utils/GLSLCompiler';

export type { ThumbnailResult } from '../utils/ThumbnailRendererPool';

/**
 * Hook for rendering shader thumbnails using a shared WebGL context pool.
 * Prevents WebGL context exhaustion by limiting the number of active contexts.
 */
export function useThumbnailPool() {
  const poolRef = useRef<ThumbnailRendererPool | null>(null);

  useEffect(() => {
    poolRef.current = ThumbnailRendererPool.getInstance();

    return () => {
      ThumbnailRendererPool.release();
      poolRef.current = null;
    };
  }, []);

  const queueThumbnail = useCallback((
    shaderId: string,
    tabs: TabShaderData[],
    callback: (result: ThumbnailResult) => void
  ) => {
    if (poolRef.current) {
      poolRef.current.queueThumbnail(shaderId, tabs, callback);
    } else {
      // Pool not ready yet, defer the request
      setTimeout(() => {
        if (poolRef.current) {
          poolRef.current.queueThumbnail(shaderId, tabs, callback);
        } else {
          callback({ url: null, compiled: false });
        }
      }, 50);
    }
  }, []);

  const getCachedThumbnail = useCallback((shaderId: string): string | null => {
    return poolRef.current?.getCachedThumbnail(shaderId) ?? null;
  }, []);

  return { queueThumbnail, getCachedThumbnail };
}
