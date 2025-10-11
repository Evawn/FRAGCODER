import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ShaderPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  compilationSuccess: boolean;
  error: string | null;
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
  onResolutionLockChange?: (locked: boolean, resolution?: { width: number; height: number }, minWidth?: number) => void;
}

export default function ShaderPlayer({
  canvasRef,
  isPlaying,
  onPlayPause,
  onReset,
  compilationSuccess,
  error,
  uTime,
  fps,
  resolution,
  onResolutionLockChange
}: ShaderPlayerProps) {
  // Resolution lock state (local to ShaderPlayer for UI purposes)
  const [isResolutionLocked, setIsResolutionLocked] = useState(false);
  const [lockedResolution, setLockedResolution] = useState<{ width: number; height: number } | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preFullscreenLockedState, setPreFullscreenLockedState] = useState<{
    isLocked: boolean;
    resolution: { width: number; height: number } | null;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        onResolutionLockChange?.(true, locked, minWidth);
      } else {
        // Unlocking: clear locked resolution
        setLockedResolution(null);
        onResolutionLockChange?.(false);
      }

      return newLocked;
    });
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Entering fullscreen
      try {
        // Save current lock state
        setPreFullscreenLockedState({
          isLocked: isResolutionLocked,
          resolution: lockedResolution
        });

        // Unlock resolution so canvas fills screen
        setIsResolutionLocked(false);
        setLockedResolution(null);
        onResolutionLockChange?.(false, undefined, undefined);

        // Request fullscreen
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    } else {
      // Exiting fullscreen
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  };

  // Listen for fullscreen changes (including ESC key, F11, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // If exiting fullscreen, restore previous lock state
      if (!isNowFullscreen && preFullscreenLockedState) {
        setIsResolutionLocked(preFullscreenLockedState.isLocked);
        setLockedResolution(preFullscreenLockedState.resolution);

        if (preFullscreenLockedState.isLocked && preFullscreenLockedState.resolution) {
          const minWidth = (preFullscreenLockedState.resolution.width / window.devicePixelRatio) + 20;
          onResolutionLockChange?.(true, preFullscreenLockedState.resolution, minWidth);
        } else {
          onResolutionLockChange?.(false, undefined, undefined);
        }

        // Clear saved state
        setPreFullscreenLockedState(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [preFullscreenLockedState, onResolutionLockChange]);

  return (
    <div className="h-full w-full flex items-start justify-center p-0">
      <div
        ref={containerRef}
        className="flex flex-col"
        style={
          isResolutionLocked && lockedResolution
            ? {
              // Locked: fixed size to match canvas
              width: `${lockedResolution.width / window.devicePixelRatio}px`,
              maxHeight: '100%'
            }
            : {
              // Unlocked: expand to fill, constrained by aspect ratio
              width: '100%',
              maxHeight: '100%',
              aspectRatio: '4/3',
              maxWidth: 'min(100%, calc(100vh * 4 / 3))'
            }
        }
      >
        <div className="border border-gray-600 rounded-md overflow-hidden flex flex-col h-full">
          {/* WebGL Canvas Container */}
          <div className="flex-1 bg-black relative flex items-center justify-center min-h-0">
            <div
              className="relative w-full h-full"
              style={
                isResolutionLocked && lockedResolution
                  ? {
                    width: `${lockedResolution.width / window.devicePixelRatio}px`,
                    height: `${lockedResolution.height / window.devicePixelRatio}px`
                  }
                  : undefined
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
                  onClick={onReset}
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
                  className={`bg-transparent font-mono text-xs px-2 py-0 flex items-center gap-1.5 ${isFullscreen
                    ? 'border-gray-400 text-gray-400'
                    : isResolutionLocked
                      ? 'border-gray-400 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors'
                      : 'border-transparent text-gray-400 cursor-pointer hover:text-gray-300 transition-colors'
                    }`}
                  onClick={isFullscreen ? undefined : toggleResolutionLock}
                >
                  <span>{resolution.width} × {resolution.height}</span>
                  {(isResolutionLocked || isFullscreen) ? (
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

            {/* Fullscreen control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreenToggle}
                className="bg-transparent h-6 w-6 text-gray-400 focus:outline-none hover:text-white hover:bg-transparent"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  // Exit fullscreen icon (compress arrows)
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                  </svg>
                ) : (
                  // Enter fullscreen icon (expand arrows)
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}