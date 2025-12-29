/**
 * useShaderController - Shared controller for WebGL shader rendering and playback
 *
 * Encapsulates the orchestration of:
 * - WebGL renderer initialization and control
 * - Compilation state management
 * - Playback state (isPlaying) and coordination
 * - Play/pause synchronization with compilation status
 *
 * Used by:
 * - useEditorState (for EditorPage)
 * - ResponseScorer (directly, for read-only viewing)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebGLRenderer } from './useWebGLRenderer';
import type { CompilationError, Tab } from '../types';
import type { TabShaderData } from '../utils/GLSLCompiler';
import { distributeErrorsToTabs, calculatePanelMinSize } from '../utils/editorPageHelpers';

export interface UseShaderControllerProps {
  /** Auto-play shader on successful compilation (default: true) */
  autoPlay?: boolean;
  /** Optional callback when compilation completes */
  onCompilationResult?: (success: boolean, errors: CompilationError[], time: number) => void;
  /** Optional setTabs function to sync compilation errors to tabs */
  setTabs?: React.Dispatch<React.SetStateAction<Tab[]>>;
  /** Default minimum panel size percentage (default: 30) */
  defaultMinPanelSize?: number;
}

export interface UseShaderControllerReturn {
  // Canvas ref for ShaderPlayer
  canvasRef: React.RefObject<HTMLCanvasElement | null>;

  // Playback state and controls
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlayPause: () => void;
  reset: () => void;

  // Compilation state (source of truth)
  compilationSuccess: boolean | undefined;
  compilationErrors: CompilationError[];
  compilationTime: number;
  lastCompilationTime: number;
  isCompiling: boolean;

  // Compilation control
  compile: (tabs: TabShaderData[]) => void;

  // Display stats (from useWebGLRenderer)
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
  error: string | null;

  // Resolution lock (for ShaderPlayer)
  setResolutionLock: (locked: boolean, resolution?: { width: number; height: number }) => void;
  updateViewport: () => void;

  // Raw renderer access
  rendererPlay: () => void;
  rendererPause: () => void;

  // Panel resize handling
  isResizing: boolean;
  handlePanelResize: () => void;
  leftPanelMinSize: number;
  handleResolutionLockChange: (locked: boolean, resolution?: { width: number; height: number }, minWidth?: number) => void;
}

export function useShaderController({
  autoPlay = true,
  onCompilationResult,
  setTabs,
  defaultMinPanelSize = 30,
}: UseShaderControllerProps = {}): UseShaderControllerReturn {
  // Compilation state (managed here as source of truth)
  const [compilationSuccess, setCompilationSuccess] = useState<boolean | undefined>(undefined);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [compilationTime, setCompilationTime] = useState(0);
  const [lastCompilationTime, setLastCompilationTime] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);

  // Panel resize state
  const [isResizing, setIsResizing] = useState(false);
  const [leftPanelMinSize, setLeftPanelMinSize] = useState(defaultMinPanelSize);
  const playStateBeforeResizeRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle compilation results from WebGL renderer
  const handleCompilationResult = useCallback((success: boolean, errors: CompilationError[], time: number) => {
    setCompilationSuccess(success);
    setCompilationErrors(errors);
    setCompilationTime(time);
    setLastCompilationTime(Date.now());
    setIsCompiling(false);

    // Auto-play on success
    if (success && autoPlay) {
      setIsPlaying(true);
    }

    // Forward to external callback if provided
    onCompilationResult?.(success, errors, time);
  }, [autoPlay, onCompilationResult]);

  // Initialize WebGL renderer
  const {
    canvasRef,
    compile: rendererCompile,
    play: rendererPlay,
    pause: rendererPause,
    reset: rendererReset,
    updateViewport,
    setResolutionLock,
    error,
    uTime,
    fps,
    resolution,
  } = useWebGLRenderer({
    onCompilationResult: handleCompilationResult,
  });

  // Coordinate play/pause with compilation status
  useEffect(() => {
    if (isPlaying && compilationSuccess) {
      rendererPlay();
    } else {
      rendererPause();
    }
  }, [isPlaying, compilationSuccess, rendererPlay, rendererPause]);

  // Sync compilation errors to tabs when they change
  useEffect(() => {
    if (setTabs) {
      setTabs(prevTabs => distributeErrorsToTabs(prevTabs, compilationErrors));
    }
  }, [compilationErrors, setTabs]);

  // Cleanup resize timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Compile wrapper that sets isCompiling state
  const compile = useCallback((tabs: TabShaderData[]) => {
    setIsCompiling(true);
    setLastCompilationTime(Date.now());
    rendererCompile(tabs);
  }, [rendererCompile]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Reset playback
  const reset = useCallback(() => {
    rendererReset();
    setIsPlaying(false);
  }, [rendererReset]);

  // Handle panel resize with debounce and pause/resume logic
  const handlePanelResize = useCallback(() => {
    // Clear any existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // If this is the first resize event, pause the shader
    if (!isResizing) {
      setIsResizing(true);
      // Save current play state
      playStateBeforeResizeRef.current = isPlaying;
      // Pause rendering during resize
      rendererPause();
    }

    // Set a timeout to detect when resize has finished
    // If no more resize events occur within 150ms, we consider resize complete
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false);
      // Recreate WebGL pipeline with new resolution
      updateViewport();
      // Resume rendering if it was playing before
      if (playStateBeforeResizeRef.current && compilationSuccess) {
        rendererPlay();
        setIsPlaying(true);
      }
    }, 150);
  }, [isResizing, isPlaying, compilationSuccess, rendererPause, rendererPlay, updateViewport]);

  // Handle resolution lock changes from ShaderPlayer
  const handleResolutionLockChange = useCallback((
    locked: boolean,
    resolution?: { width: number; height: number },
    minWidth?: number
  ) => {
    // Update renderer resolution lock
    setResolutionLock(locked, resolution);
    // Update panel minimum size
    setLeftPanelMinSize(calculatePanelMinSize(locked, minWidth));
  }, [setResolutionLock]);

  return {
    // Canvas ref
    canvasRef,

    // Playback state and controls
    isPlaying,
    setIsPlaying,
    togglePlayPause,
    reset,

    // Compilation state
    compilationSuccess,
    compilationErrors,
    compilationTime,
    lastCompilationTime,
    isCompiling,

    // Compilation control
    compile,

    // Display stats
    uTime,
    fps,
    resolution,
    error,

    // Resolution lock
    setResolutionLock,
    updateViewport,

    // Raw renderer access
    rendererPlay,
    rendererPause,

    // Panel resize handling
    isResizing,
    handlePanelResize,
    leftPanelMinSize,
    handleResolutionLockChange,
  };
}
