// Main editor page component - manages UI layout and WebGL rendering
// Business logic for editor state is handled by useEditorState hook

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import ShaderEditor from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { CompilationError } from '../types';
import { useAuth } from '../AuthContext';
import { useWebGLRenderer } from '../hooks/useWebGLRenderer';
import { useEditorState } from '../hooks/useEditorState';
import { SignInDialog } from '../components/auth/SignInDialog';
import { SaveAsDialog } from '../components/editor/SaveAsDialog';
import { RenameDialog } from '../components/editor/RenameDialog';
import { DeleteShaderDialog } from '../components/editor/DeleteShaderDialog';
import { CloneDialog } from '../components/editor/CloneDialog';
import { calculatePanelMinSize } from '../utils/editorPageHelpers';
import { PageHeader } from '../components/editor/PageHeader';
import { LoadingScreen } from '../components/LoadingScreen';

function EditorPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();

  // UI state (not editor state)
  const [isPlaying, setIsPlaying] = useState(true);
  const [leftPanelMinSize, setLeftPanelMinSize] = useState(30);

  // Responsive state - track mobile breakpoint
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Resize state tracking for optimization
  const [isResizing, setIsResizing] = useState(false);
  const playStateBeforeResizeRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to store Logo rotation function
  const logoRotateRef = useRef<((targetOffset: number) => void) | null>(null);

  // Auto-play callback - called when compilation succeeds
  const handleAutoPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Ref to store the compilation result handler
  // This allows us to pass it to useWebGLRenderer before editorState is created
  const compilationResultHandlerRef = useRef<((success: boolean, errors: CompilationError[], compilationTime: number) => void) | null>(null);

  // Stable proxy callback to avoid recreating on every render
  const handleCompilationResultProxy = useCallback((success: boolean, errors: CompilationError[], time: number) => {
    // Call the handler from editorState via ref
    compilationResultHandlerRef.current?.(success, errors, time);
  }, []);

  // Initialize WebGL renderer with imperative controls
  const {
    canvasRef,
    compilationSuccess: rendererCompilationSuccess,
    error: rendererError,
    compile: rendererCompile,
    play: rendererPlay,
    pause: rendererPause,
    reset: rendererReset,
    updateViewport: rendererUpdateViewport,
    setResolutionLock: rendererSetResolutionLock,
    uTime,
    fps,
    resolution
  } = useWebGLRenderer({
    onCompilationResult: handleCompilationResultProxy
  });

  // Initialize editor state with custom hook
  const editorState = useEditorState({
    slug,
    onCompile: rendererCompile,
    onAutoPlay: handleAutoPlay,
  });

  // Update the ref with editorState's handler
  compilationResultHandlerRef.current = editorState.handleCompilationResult;

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
      rendererUpdateViewport();
      // Resume rendering if it was playing before
      if (playStateBeforeResizeRef.current && editorState.compilationSuccess) {
        rendererPlay();
        setIsPlaying(true);
      }
    }, 150);
  }, [isResizing, isPlaying, rendererPause, rendererUpdateViewport, rendererPlay, editorState.compilationSuccess]);

  const handleResolutionLockChange = useCallback((locked: boolean, resolution?: { width: number; height: number }, minWidth?: number) => {
    // Update renderer resolution lock
    rendererSetResolutionLock(locked, resolution);

    // Update panel minimum size
    setLeftPanelMinSize(calculatePanelMinSize(locked, minWidth));
  }, [rendererSetResolutionLock]);

  // Handle Logo rotation on mouse enter/leave
  const handleLogoMouseEnter = useCallback(() => {
    if (logoRotateRef.current) {
      logoRotateRef.current(180); // Set target to 180°
    }
  }, []);

  const handleLogoMouseLeave = useCallback(() => {
    if (logoRotateRef.current) {
      logoRotateRef.current(0); // Set target to 0°
    }
  }, []);

  // Handle play/pause with imperative controls
  useEffect(() => {
    if (isPlaying && editorState.compilationSuccess) {
      rendererPlay();
    } else {
      rendererPause();
    }
  }, [isPlaying, editorState.compilationSuccess, rendererPlay, rendererPause]);


  // Listen for responsive breakpoint changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaQueryChange);
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);

  // Cleanup resize timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Create single ShaderPlayer component (used in both layouts)
  const shaderPlayerComponent = (
    <ShaderPlayer
      canvasRef={canvasRef}
      isPlaying={isPlaying}
      onPlayPause={() => setIsPlaying(!isPlaying)}
      onReset={() => {
        rendererReset();
        setIsPlaying(false);
      }}
      compilationSuccess={rendererCompilationSuccess}
      error={rendererError}
      uTime={uTime}
      fps={fps}
      resolution={resolution}
      onResolutionLockChange={handleResolutionLockChange}
    />
  );

  // Create ShaderEditor component (used in both layouts)
  const shaderEditorComponent = (
    <ShaderEditor
      // Display data
      tabs={editorState.tabs}
      activeTabId={editorState.activeTabId}
      localShaderTitle={editorState.localShaderTitle}
      creatorUsername={editorState.shader?.creatorUsername}

      // Compilation state
      compilationSuccess={editorState.compilationSuccess}
      compilationTime={editorState.compilationTime}
      isCompiling={editorState.isCompiling}
      lastCompilationTime={editorState.lastCompilationTime}

      // User/ownership
      isSavedShader={!!editorState.shaderUrl}
      isOwner={editorState.isOwner}
      isSignedIn={!!user}
      username={user?.username}
      userPicture={user?.picture || undefined}

      // Tab callbacks
      onTabChange={editorState.onTabChange}
      onAddTab={editorState.onAddTab}
      onDeleteTab={editorState.onDeleteTab}
      onCodeChange={editorState.onCodeChange}

      // Shader operation callbacks
      onCompile={editorState.onCompile}
      onSave={editorState.onSave}
      onSaveAs={editorState.onSaveAs}
      onRename={editorState.dialogManager.openRename}
      onClone={editorState.onClone}
      onDelete={editorState.onDelete}
      onSignIn={editorState.dialogManager.openSignIn}
      onSignOut={signOut}
    />
  );

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Professional Loading Screen */}
      <LoadingScreen isLoading={editorState.loading} />

      {/* Unified Page Header */}
      <PageHeader
        onLogoRotate={(setTargetAngle) => { logoRotateRef.current = setTargetAngle; }}
        onHomeClick={() => navigate('/')}
        onLogoMouseEnter={handleLogoMouseEnter}
        onLogoMouseLeave={handleLogoMouseLeave}
        localShaderTitle={editorState.localShaderTitle}
        creatorUsername={editorState.shader?.creatorUsername}
        isSavedShader={!!editorState.shaderUrl}
        isOwner={editorState.isOwner}
        onSave={editorState.onSave}
        onSaveAs={editorState.onSaveAs}
        onRename={editorState.dialogManager.openRename}
        onClone={editorState.onClone}
        onDelete={editorState.onDelete}
        isSignedIn={!!user}
        username={user?.username}
        userPicture={user?.picture || undefined}
        onSignIn={editorState.dialogManager.openSignIn}
        onSignOut={signOut}
      />

      {/* Conditional Layout Rendering */}
      {isMobile ? (
        /* Mobile Layout - Vertical Stack */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Shader Player - Fixed aspect ratio */}
          <div className="w-full p-2 flex-shrink-0">
            {shaderPlayerComponent}
          </div>

          {/* Shader Editor - Fills remaining space */}
          <div className="flex-1 flex flex-col bg-background min-h-0 overflow-auto">
            {shaderEditorComponent}
          </div>
        </div>
      ) : (
        /* Desktop Layout - Horizontal Resizable Panels */
        <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={handlePanelResize}>
          {/* Shader Viewer - Left Panel */}
          <ResizablePanel defaultSize={40} minSize={leftPanelMinSize}>
            <div className="h-full w-full p-2">
              {shaderPlayerComponent}
            </div>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle className="w-0.5 bg-lines" />

          {/* Shader Editor - Right Panel */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full flex flex-col bg-background">
              {shaderEditorComponent}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Dialogs (moved from ShaderEditor) */}
      <SignInDialog
        open={editorState.dialogManager.isOpen('signin')}
        onOpenChange={(open) => !open && editorState.dialogManager.closeDialog()}
        onSignInSuccess={editorState.dialogManager.signInCallback}
      />

      <SaveAsDialog
        open={editorState.dialogManager.isOpen('saveAs')}
        onOpenChange={(open) => !open && editorState.dialogManager.closeDialog()}
        onSave={editorState.onSaveShader}
      />

      <RenameDialog
        currentName={editorState.localShaderTitle}
        open={editorState.dialogManager.isOpen('rename')}
        onOpenChange={(open) => !open && editorState.dialogManager.closeDialog()}
        onRename={editorState.onRename}
      />

      <DeleteShaderDialog
        shaderName={editorState.localShaderTitle}
        open={editorState.dialogManager.isOpen('delete')}
        onOpenChange={(open) => !open && editorState.dialogManager.closeDialog()}
        onDelete={editorState.onDeleteShader}
      />

      <CloneDialog
        shaderName={editorState.localShaderTitle}
        open={editorState.dialogManager.isOpen('clone')}
        onOpenChange={(open) => !open && editorState.dialogManager.closeDialog()}
        onClone={editorState.onCloneShader}
      />
    </div>
  );
}

export default EditorPage
