import { useState } from 'react';
import { useWebGLRenderer } from '../hooks/useWebGLRenderer';
import type { CompilationError, TabShaderData } from '../utils/GLSLCompiler';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ShaderPlayerProps {
  tabs: TabShaderData[];
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onCompilationResult: (success: boolean, errors: CompilationError[]) => void;
  panelResizeCounter: number;
  compileTrigger: number;
  onResolutionLockChange?: (locked: boolean, minWidth?: number) => void;
}

export default function ShaderPlayer({
  tabs,
  isPlaying,
  onPlayPause,
  onReset,
  onCompilationResult,
  panelResizeCounter,
  compileTrigger,
  onResolutionLockChange
}: ShaderPlayerProps) {
  // Resolution lock state
  const [isResolutionLocked, setIsResolutionLocked] = useState(false);
  const [lockedResolution, setLockedResolution] = useState<{ width: number; height: number } | null>(null);

  const {
    canvasRef,
    compilationSuccess,
    error,
    reset,
    uTime,
    fps,
    resolution
  } = useWebGLRenderer({
    tabs,
    isPlaying,
    onCompilationResult,
    panelResizeCounter,
    compileTrigger,
    isResolutionLocked,
    lockedResolution
  });

  // Handle reset
  const handleReset = () => {
    reset();
    onReset();
  };

  // Toggle resolution lock
  const toggleResolutionLock = () => {
    setIsResolutionLocked(prev => {
      const newLocked = !prev;

      if (newLocked) {
        // Locking: capture current resolution
        const locked = { width: resolution.width, height: resolution.height };
        setLockedResolution(locked);

        // Calculate minimum panel width needed (canvas width + padding + border)
        // Canvas width in CSS pixels = resolution.width / devicePixelRatio
        // Add padding (2 * 8px = 16px) and border (2 * 1px = 2px) and some extra margin
        const minWidth = (locked.width / window.devicePixelRatio) + 20;
        onResolutionLockChange?.(true, minWidth);
      } else {
        // Unlocking: clear locked resolution
        setLockedResolution(null);
        onResolutionLockChange?.(false);
      }

      return newLocked;
    });
  };

  return (
    <div className="h-full flex items-stretch justify-center p-0">
      <div
        className="flex flex-col"
        style={
          isResolutionLocked && lockedResolution
            ? {
              // Locked: fixed width to match canvas
              width: `${lockedResolution.width / window.devicePixelRatio}px`
            }
            : {
              // Unlocked: fill container width
              width: '100%'
            }
        }
      >
        <div className="h-min border border-gray-600 rounded-md overflow-hidden">
          {/* WebGL Canvas Container */}
          <div className="flex-1 bg-black relative flex items-center justify-center">
            <div
              className="relative w-full"
              style={
                isResolutionLocked && lockedResolution
                  ? {
                    // Locked: fixed height, width fills the fixed-width container
                    height: `${lockedResolution.height / window.devicePixelRatio}px`
                  }
                  : {
                    // Unlocked: fill container with aspect ratio
                    aspectRatio: '4/3',
                    maxHeight: '100%'
                  }
              }
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
              {!compilationSuccess && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400">No shader compiled yet</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="bg-red-900/80 text-red-200 p-4 rounded-lg max-w-md">
                    <p className="font-semibold mb-2">WebGL Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Control Bar */}
          <div className="bg-gray-900 border-t border-gray-700 px-1 gap-x-1 py-2 flex items-center justify-between" style={{ height: '30px' }}>
            <div className="flex items-center gap-4">
              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="bg-transparent h-6 w-6 text-gray-400 focus:outline-none hover:text-white hover:bg-transparent"
                  title="Reset"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 19 2 12 11 5 11 19"></polygon>
                    <polygon points="22 19 13 12 22 5 22 19"></polygon>
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPlayPause}
                  disabled={!compilationSuccess}
                  className="bg-transparent h-6 w-6 text-gray-400 focus:outline-none hover:text-white hover:bg-transparent disabled:opacity-50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  )}
                </Button>
              </div>

              {/* Real-time Information */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-transparent border-transparent text-gray-400 font-mono text-xs px-2 py-0">
                  {uTime.toFixed(2)}s
                </Badge>
                <Badge variant="outline" className="bg-transparent border-transparent text-gray-400 font-mono text-xs px-2 py-0">
                  {fps.toFixed(1)} fps
                </Badge>
                <Badge
                  variant="outline"
                  className={`bg-transparent font-mono text-xs px-2 py-0 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1.5 ${isResolutionLocked
                    ? 'border-gray-400 text-gray-400'
                    : 'border-transparent text-gray-400'
                    }`}
                  onClick={toggleResolutionLock}
                >
                  <span>{resolution.width} × {resolution.height}</span>
                  {isResolutionLocked ? (
                    // Locked icon
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  ) : (
                    // Unlocked icon
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                    </svg>
                  )}
                </Badge>
              </div>
            </div>

            {/* Future controls placeholder */}
            <div className="flex items-center gap-2">
              {/* Volume and fullscreen controls will go here */}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}