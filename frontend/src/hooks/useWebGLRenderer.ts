import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { WebGLRenderer } from '../utils/WebGLRenderer';
import { parseShaderError, parseMultipassShaderError, PreprocessorCompilationError } from '../utils/GLSLCompiler';
import type { CompilationError } from '../types';
import type { TabShaderData, MultipassCompilationError } from '../utils/GLSLCompiler';

interface UseWebGLRendererProps {
  onCompilationResult?: (success: boolean, errors: CompilationError[], compilationTime: number) => void;
}

interface UseWebGLRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  compilationSuccess: boolean;
  error: string | null;

  // Imperative control methods
  compile: (tabs: TabShaderData[]) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  updateViewport: () => void;
  setResolutionLock: (locked: boolean, resolution?: { width: number; height: number }) => void;

  // Display state
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
}

export function useWebGLRenderer({
  onCompilationResult
}: UseWebGLRendererProps = {}): UseWebGLRendererReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uTime, setUTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });

  // Initialize renderer once on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WebGLRenderer();
    const initialized = renderer.initialize(canvasRef.current);

    if (!initialized) {
      setError('WebGL 2.0 is not supported in your browser');
      onCompilationResult?.(false, [{
        line: 0,
        message: 'WebGL 2.0 is not supported in your browser',
        type: 'error'
      }], 0);
      return;
    }

    rendererRef.current = renderer;

    // Set up window resize listener
    const handleWindowResize = () => {
      renderer.updateViewport();
    };
    window.addEventListener('resize', handleWindowResize);

    // Set up canvas resize observer for resolution tracking
    const updateResolution = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        setResolution({ width: canvas.width, height: canvas.height });
      }
    };

    const resizeObserver = new ResizeObserver(updateResolution);
    resizeObserver.observe(canvasRef.current);
    resizeObserverRef.current = resizeObserver;
    updateResolution(); // Initial update

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [onCompilationResult]);

  // Update display stats when playing
  const startStatsUpdate = useCallback(() => {
    // Clear any existing interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    const updateStats = () => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;

      if (renderer && canvas) {
        setUTime(renderer.getCurrentTime());
        setFps(renderer.getFrameRate());

        // Only update resolution if it actually changed
        setResolution(prev => {
          if (prev.width !== canvas.width || prev.height !== canvas.height) {
            return { width: canvas.width, height: canvas.height };
          }
          return prev;
        });
      }
    };

    // Update stats at 60fps
    updateIntervalRef.current = setInterval(updateStats, 16);
    updateStats(); // Immediate update
  }, []);

  const stopStatsUpdate = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // Imperative compile method
  const compile = useCallback((tabs: TabShaderData[]) => {
    const renderer = rendererRef.current;
    if (!renderer) {
      console.warn('Renderer not initialized');
      return;
    }

    // Validate tabs
    if (!tabs || tabs.length === 0) {
      setCompilationSuccess(false);
      setError(null);
      onCompilationResult?.(false, [{
        line: 0,
        message: 'No shader tabs provided',
        type: 'error'
      }], 0);
      return;
    }

    // Measure compilation time
    const startTime = performance.now();

    try {
      // Compile shader
      renderer.compileShader(tabs);

      const endTime = performance.now();
      const compilationTime = Math.round(endTime - startTime);

      // Success!
      setCompilationSuccess(true);
      setError(null);
      onCompilationResult?.(true, [], compilationTime);

    } catch (err) {
      const endTime = performance.now();
      const compilationTime = Math.round(endTime - startTime);

      const errorMessage = err instanceof Error ? err.message : 'Shader compilation failed';
      let allErrors: CompilationError[] = [];

      // Check if this is a PreprocessorCompilationError
      if (err instanceof PreprocessorCompilationError) {
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
          allErrors = parseMultipassShaderError(errorMessage, passName, userCodeStartLine, commonLineCount, lineMapping);
        } else {
          allErrors = parseShaderError(errorMessage, 0, lineMapping);
        }
      }

      setCompilationSuccess(false);
      setError('Shader compilation failed');
      onCompilationResult?.(false, allErrors.length > 0 ? allErrors : [{
        line: 0,
        message: errorMessage,
        type: 'error'
      }], compilationTime);

      // Stop rendering on error
      renderer.stop();
      stopStatsUpdate();
    }
  }, [onCompilationResult, stopStatsUpdate]);

  // Imperative play method
  const play = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer && compilationSuccess) {
      renderer.start();
      startStatsUpdate();
    }
  }, [compilationSuccess, startStatsUpdate]);

  // Imperative pause method
  const pause = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.stop();
      stopStatsUpdate();
    }
  }, [stopStatsUpdate]);

  // Imperative reset method
  const reset = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.resetTime();
      setUTime(0);
      setFps(0);
    }
  }, []);

  // Imperative viewport update method
  const updateViewport = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (renderer && canvas) {
      renderer.updateViewport();
      // Immediately update resolution state to reflect new canvas dimensions
      setResolution({ width: canvas.width, height: canvas.height });
    }
  }, []);

  // Imperative resolution lock method
  const setResolutionLock = useCallback((locked: boolean, resolution?: { width: number; height: number }) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas) return;

    if (locked && resolution) {
      renderer.setLockedResolution(resolution.width, resolution.height);
      // Immediately update resolution state to reflect locked dimensions
      setResolution({ width: resolution.width, height: resolution.height });
    } else {
      // When unlocking, defer the viewport update to allow DOM to update first
      // This ensures the canvas container has expanded before we measure its size
      requestAnimationFrame(() => {
        if (rendererRef.current && canvasRef.current) {
          rendererRef.current.updateViewport();
          // Update resolution state after DOM has updated
          setResolution({ width: canvasRef.current.width, height: canvasRef.current.height });
        }
      });
    }
  }, []);

  // Create a stable return object reference
  // Methods are memoized with useCallback, so we create the object once
  // and only update it when methods change (which should be never or rarely)
  const methodsRef = useRef<any>(null);

  if (!methodsRef.current) {
    methodsRef.current = {
      canvasRef,
      compile,
      play,
      pause,
      reset,
      updateViewport,
      setResolutionLock
    };
  }

  // Update method references if they change (rare, only on certain re-mounts)
  methodsRef.current.compile = compile;
  methodsRef.current.play = play;
  methodsRef.current.pause = pause;
  methodsRef.current.reset = reset;
  methodsRef.current.updateViewport = updateViewport;
  methodsRef.current.setResolutionLock = setResolutionLock;

  // Update reactive state values
  methodsRef.current.compilationSuccess = compilationSuccess;
  methodsRef.current.error = error;
  methodsRef.current.uTime = uTime;
  methodsRef.current.fps = fps;
  methodsRef.current.resolution = resolution;

  // Return the same object reference every time
  // This prevents downstream components from re-rendering unnecessarily
  return methodsRef.current;
}