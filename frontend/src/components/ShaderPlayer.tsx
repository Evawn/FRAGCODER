import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Play, Pause, Lock, Unlock, Maximize2, Minimize2 } from 'lucide-react';

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
        <div className="border border-lines overflow-hidden flex flex-col h-full shadow-xl">
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
                  <p className="text-muted-foreground">No shader compiled yet</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="bg-error/80 text-error-foreground p-4 rounded-lg max-w-md">
                    <p className="font-semibold mb-2">WebGL Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Control Bar */}
          <div className="bg-background-header border-t border-lines px-1 gap-x-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Control Buttons */}
              <div className="flex items-center gap-1 font-normal">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  className="bg-transparent h-6 w-6 text-foreground focus:outline-none hover:text-foreground-highlighted hover:bg-background-highlighted"
                  title="Reset"
                >
                  <RotateCcw size={16} strokeWidth={1.5} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPlayPause}
                  disabled={!compilationSuccess}
                  className="bg-transparent h-6 w-6 text-accent focus:outline-none hover:text-foreground-highlighted hover:bg-accent disabled:opacity-50"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={16} strokeWidth={2} />
                  ) : (
                    <Play size={16} strokeWidth={2} />
                  )}
                </Button>
              </div>

              {/* Real-time Information */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-transparent justify-end font-light border-transparent text-foreground font-mono text-xs px-0 py-0 text-right min-w-[48px]">
                  {uTime.toFixed(1)}s
                </Badge>
                <Badge variant="outline" className="bg-transparent font-light border-transparent text-foreground font-mono text-xs px-0 py-0 flex items-center">
                  <span className="inline-block text-right w-[40px]">{fps.toFixed(1)}</span>
                  <span className="ml-2">fps</span>
                </Badge>
                <Badge
                  variant="outline"
                  className={`bg-transparent font-mono hover:bg-background-highlighted rounded-lg font-light text-xs px-2 py-0.5 flex items-center gap-1.5 ${isFullscreen
                    ? 'border-muted-foreground text-foreground'
                    : isResolutionLocked
                      ? 'border-muted-foreground text-foreground cursor-pointer hover:text-foreground-highlighted transition-colors'
                      : 'border-transparent text-foreground cursor-pointer hover:text-foreground-highlighted transition-colors'
                    }`}
                  onClick={isFullscreen ? undefined : toggleResolutionLock}
                >
                  <span className="flex-1 text-right">{resolution.width} × {resolution.height}</span>
                  {(isResolutionLocked || isFullscreen) ? (
                    <Lock size={12} strokeWidth={2} />
                  ) : (
                    <Unlock size={12} strokeWidth={2} />
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
                className="bg-transparent h-6 w-6 text-player-controls-fg focus:outline-none hover:text-foreground-highlighted hover:bg-background-highlighted"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 size={16} strokeWidth={2} />
                ) : (
                  <Maximize2 size={16} strokeWidth={1.5} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}