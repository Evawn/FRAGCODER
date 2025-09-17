import { useWebGLRenderer } from '../hooks/useWebGLRenderer';
import type { CompilationError } from '../utils/GLSLCompiler';

interface ShaderPlayerProps {
  userCode: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onCompilationResult: (success: boolean, errors: CompilationError[]) => void;
  panelResizeCounter: number;
}

export default function ShaderPlayer({
  userCode,
  isPlaying,
  onPlayPause,
  onReset,
  onCompilationResult,
  panelResizeCounter
}: ShaderPlayerProps) {
  const {
    canvasRef,
    compilationSuccess,
    error,
    reset,
    uTime,
    fps,
    resolution
  } = useWebGLRenderer({
    userCode,
    isPlaying,
    onCompilationResult,
    panelResizeCounter
  });

  // Handle reset
  const handleReset = () => {
    reset();
    onReset();
  };

  return (
    <div className="h-full flex flex-col">
      {/* WebGL Canvas */}
      <div className="flex-1 bg-black relative">
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

      {/* Footer Control Bar */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 19 2 12 11 5 11 19"></polygon>
                <polygon points="22 19 13 12 22 5 22 19"></polygon>
              </svg>
            </button>
            <button
              onClick={onPlayPause}
              className="text-gray-400 hover:text-white transition-colors p-1"
              disabled={!compilationSuccess}
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
            </button>
          </div>

          {/* Real-time Information */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{uTime.toFixed(2)}</span>
            <span>{fps.toFixed(1)} fps</span>
            <span>{resolution.width} x {resolution.height}</span>
          </div>
        </div>

        {/* Future controls placeholder */}
        <div className="flex items-center gap-2">
          {/* Volume and fullscreen controls will go here */}
        </div>
      </div>
    </div>
  );
}