import { useEffect, useRef, useState, useCallback } from 'react';
import { WebGLRenderer } from '../utils/WebGLRenderer';
import { parseShaderError, parseMultipassShaderError, PreprocessorCompilationError } from '../utils/GLSLCompiler';
import type { CompilationError, TabShaderData, MultipassCompilationError } from '../utils/GLSLCompiler';

interface UseWebGLRendererProps {
  tabs: TabShaderData[];
  isPlaying: boolean;
  onCompilationResult: (success: boolean, errors: CompilationError[]) => void;
  panelResizeCounter: number;
  compileTrigger: number;
}

interface UseWebGLRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  compilationSuccess: boolean;
  error: string | null;
  reset: () => void;
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
}

export function useWebGLRenderer({
  tabs,
  isPlaying,
  onCompilationResult,
  panelResizeCounter,
  compileTrigger
}: UseWebGLRendererProps): UseWebGLRendererReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [uTime, setUTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WebGLRenderer();
    const initialized = renderer.initialize(canvasRef.current);

    if (!initialized) {
      setError('WebGL 2.0 is not supported in your browser');
      onCompilationResult(false, [{
        line: 0,
        message: 'WebGL 2.0 is not supported in your browser',
        type: 'error'
      }]);
      return;
    }

    rendererRef.current = renderer;
    setIsRendererReady(true);

    // Handle resize
    const handleResize = () => {
      renderer.updateViewport();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      rendererRef.current = null;
      setIsRendererReady(false);
    };
  }, [onCompilationResult]);

  // Compile shader when tabs change, compile trigger changes, or renderer becomes ready
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !isRendererReady) return;

    // Don't compile if no tabs
    if (!tabs || tabs.length === 0) {
      setCompilationSuccess(false);
      setError(null);
      onCompilationResult(false, [{
        line: 0,
        message: 'No shader tabs provided',
        type: 'error'
      }]);
      return;
    }

    try {
      // Compile all tabs using multipass renderer
      renderer.compileShader(tabs);

      // Success!
      setCompilationSuccess(true);
      setError(null);
      onCompilationResult(true, []);

      // Note: Playback control is handled by the separate playback useEffect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Shader compilation failed';
      let allErrors: CompilationError[] = [];

      // Check if this is a PreprocessorCompilationError
      if (err instanceof PreprocessorCompilationError) {
        // Convert preprocessor errors to CompilationError format with proper passName
        allErrors = err.preprocessorErrors.map(preprocessorError => ({
          line: preprocessorError.line,
          message: preprocessorError.message,
          type: 'error' as const,
          passName: err.passName
        }));
      }
      // Check if this is a MultipassCompilationError with multiple pass errors
      else if ((err as MultipassCompilationError).passErrors) {
        const multipassError = err as MultipassCompilationError;

        // Parse errors from each failed pass
        for (const passError of multipassError.passErrors) {
          const parsedErrors = parseMultipassShaderError(
            passError.errorMessage,
            passError.passName,
            passError.userCodeStartLine,
            passError.commonLineCount,
            passError.lineMapping
          );
          allErrors.push(...parsedErrors);
        }
      } else {
        // Check if error has single-pass metadata (legacy support)
        const passName = (err as any).passName;
        const userCodeStartLine = (err as any).userCodeStartLine;
        const commonLineCount = (err as any).commonLineCount;
        const lineMapping = (err as any).lineMapping;

        if (passName && userCodeStartLine !== undefined && commonLineCount !== undefined) {
          // Use multipass error parser with pass-specific information
          allErrors = parseMultipassShaderError(errorMessage, passName, userCodeStartLine, commonLineCount, lineMapping);
        } else {
          // Fallback to generic error parsing
          allErrors = parseShaderError(errorMessage, 0, lineMapping);
        }
      }

      setCompilationSuccess(false);
      setError('Shader compilation failed');
      onCompilationResult(false, allErrors.length > 0 ? allErrors : [{
        line: 0,
        message: errorMessage,
        type: 'error'
      }]);

      // Stop rendering on error
      renderer.stop();
    }
  }, [tabs, compileTrigger, onCompilationResult, isRendererReady]);

  // Control playback
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !compilationSuccess) return;

    if (isPlaying) {
      renderer.start();
    } else {
      renderer.stop();
    }
  }, [isPlaying, compilationSuccess]);

  // Reset function
  const reset = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.resetTime();
      setFps(0);
    }
  }, []);

  // Update real-time data
  useEffect(() => {
    // Only update when playing and compilation is successful
    if (!isPlaying || !compilationSuccess) {
      return;
    }

    const updateData = () => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;

      if (renderer && canvas) {
        // Update uTime only when playing
        const currentTime = renderer.getCurrentTime();
        setUTime(currentTime);

        // Update resolution
        setResolution({ width: canvas.width, height: canvas.height });

        // Update FPS from renderer's actual frame rate calculation
        const frameRate = renderer.getFrameRate();
        setFps(frameRate);
      }
    };

    // Start updating immediately and continue at 60fps
    const intervalId = setInterval(updateData, 16); // ~60fps update rate
    updateData(); // Initial update
    
    return () => clearInterval(intervalId);
  }, [isPlaying, compilationSuccess, isRendererReady]);


  // Update resolution whenever canvas dimensions change
  useEffect(() => {
    const updateResolution = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        setResolution({ width: canvas.width, height: canvas.height });
      }
    };

    // Initial update
    updateResolution();

    // Listen for resize events
    const resizeObserver = new ResizeObserver(updateResolution);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isRendererReady]);

  // Handle panel resize to trigger WebGL viewport updates
  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      // Trigger viewport update when panels are resized
      renderer.updateViewport();
    }
  }, [panelResizeCounter]);

  return {
    canvasRef,
    compilationSuccess,
    error,
    reset,
    uTime,
    fps,
    resolution
  };
}