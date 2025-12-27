/**
 * Minimal shader player for prompt engineering evaluation
 * Simplified version of ShaderPlayer without resolution lock or fullscreen
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Play, Pause } from 'lucide-react';
import { useWebGLRenderer } from '@/hooks/useWebGLRenderer';
import type { TabShaderData } from '@/utils/GLSLCompiler';

interface MiniShaderPlayerProps {
  code: string;
  autoPlay?: boolean;
  onCompilationResult?: (success: boolean) => void;
}

export function MiniShaderPlayer({
  code,
  autoPlay = true,
  onCompilationResult,
}: MiniShaderPlayerProps) {
  const handleCompilationResult = useCallback(
    (success: boolean) => {
      onCompilationResult?.(success);
    },
    [onCompilationResult]
  );

  const {
    canvasRef,
    compilationSuccess,
    error,
    compile,
    play,
    pause,
    reset,
    uTime,
    fps,
  } = useWebGLRenderer({
    onCompilationResult: handleCompilationResult,
  });

  // Track playing state locally
  const [isPlaying, setIsPlaying] = useState(false);

  // Compile when code changes
  useEffect(() => {
    if (code) {
      const tabs: TabShaderData[] = [
        { id: 'image', name: 'Image', code },
      ];
      compile(tabs);
    }
  }, [code, compile]);

  // Auto-play when compilation succeeds
  useEffect(() => {
    if (compilationSuccess && autoPlay) {
      play();
      setIsPlaying(true);
    }
  }, [compilationSuccess, autoPlay, play]);

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
      setIsPlaying(false);
    } else {
      play();
      setIsPlaying(true);
    }
  };

  // Handle reset
  const handleReset = () => {
    reset();
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Container */}
      <div className="flex-1 bg-black relative flex items-center justify-center min-h-0 rounded-t-sm overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {!compilationSuccess && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No shader</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <div className="bg-error/80 text-error-foreground p-2 rounded text-xs max-w-full overflow-auto">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-background-header px-2 py-1 flex items-center justify-between rounded-b-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-6 w-6 text-foreground hover:text-foreground-highlighted hover:bg-background-highlighted"
            title="Reset"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            disabled={!compilationSuccess}
            className="h-6 w-6 text-accent hover:text-foreground-highlighted hover:bg-accent disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={14} strokeWidth={2} />
            ) : (
              <Play size={14} strokeWidth={2} />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-transparent font-light border-transparent text-foreground font-mono text-xs px-0"
          >
            {uTime.toFixed(1)}s
          </Badge>
          <Badge
            variant="outline"
            className="bg-transparent font-light border-transparent text-foreground font-mono text-xs px-0"
          >
            {fps.toFixed(0)} fps
          </Badge>
        </div>
      </div>
    </div>
  );
}
