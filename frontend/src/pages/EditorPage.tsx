import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import ShaderEditor from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { CompilationError, Tab, ShaderData } from '../types';
import { useAuth } from '../AuthContext';
import { useWebGLRenderer } from '../hooks/useWebGLRenderer';
import { useDialogManager } from '../hooks/useDialogManager';
import { SignInDialog } from '../components/auth/SignInDialog';
import { SaveAsDialog } from '../components/editor/SaveAsDialog';
import { RenameDialog } from '../components/editor/RenameDialog';
import { DeleteShaderDialog } from '../components/editor/DeleteShaderDialog';
import { CloneDialog } from '../components/editor/CloneDialog';
import { DEFAULT_SHADER_CODES, getDefaultCode } from '../utils/defaultShaderCode';
import {
  getShaderBySlug,
  updateShader,
  saveShader,
  cloneShader,
  deleteShader,
} from '../api/shaders';
import {
  determineCompilationStatus,
  apiShaderToShaderData,
  tabsToTabData,
  apiTabsToLocalTabs,
  distributeErrorsToTabs,
  calculatePanelMinSize,
  showErrorAlert,
} from '../utils/editorPageHelpers';

function EditorPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user, token, signOut } = useAuth();
  const [shaderUrl, setShaderUrl] = useState<string | null>(slug || null);

  const [shader, setShader] = useState<ShaderData | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [compilationSuccess, setCompilationSuccess] = useState<boolean | undefined>(undefined);
  const [compilationTime, setCompilationTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [leftPanelMinSize, setLeftPanelMinSize] = useState(30);

  // Tab management state (moved from ShaderEditor)
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Image', code: DEFAULT_SHADER_CODES.Image, isDeletable: false, errors: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Dialog management (simplified with custom hook)
  const dialogManager = useDialogManager();

  // Local shader title (moved from ShaderEditor)
  const [localShaderTitle, setLocalShaderTitle] = useState(shader?.title || 'Untitled...');

  // Calculate whether current user owns the shader
  const isOwner = useMemo(() => {
    return !!(user && shader && user.id === shader.userId);
  }, [user, shader]);

  // Handle compilation results
  const handleCompilationResult = useCallback((success: boolean, errors: CompilationError[], compilationTime: number) => {
    console.log('Compilation result:', success ? 'success' : 'failed', errors, `${compilationTime}ms`);
    setCompilationErrors(errors);
    setCompilationSuccess(success);
    setCompilationTime(compilationTime);

    // Auto-play when compilation succeeds
    if (success) {
      setIsPlaying(true);
    }
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
    onCompilationResult: handleCompilationResult
  });

  useEffect(() => {
    if (slug) {
      loadShader(slug);
    } else {
      // No slug means new shader - reset to defaults
      setShaderUrl(null);
      setShader(null);
      setTabs([{ id: '1', name: 'Image', code: DEFAULT_SHADER_CODES.Image, isDeletable: false, errors: [] }]);
    }
  }, [slug]);

  const loadShader = async (slug: string) => {
    setLoading(true);
    try {
      // Fetch shader data from backend
      const apiShader = await getShaderBySlug(slug);

      // Convert API Shader format to ShaderData format for ShaderEditor
      setShader(apiShaderToShaderData(apiShader));

      // Load tabs from shader data
      const loadedTabs = apiTabsToLocalTabs(apiShader.tabs);
      setTabs(loadedTabs);

      // Trigger compilation after loading (using imperative method)
      const tabsData = tabsToTabData(loadedTabs);
      rendererCompile(tabsData);

      // Set URL to indicate this is a saved shader
      setShaderUrl(slug);

    } catch (error) {
      console.error('Error loading shader:', error);
      alert('Failed to load shader. It may not exist or may be private.');
      // Navigate back to new shader page on error
      navigate('/new');
    } finally {
      setLoading(false);
    }
  };

  const handlePanelResize = useCallback(() => {
    // Directly update viewport when panels are resized
    rendererUpdateViewport();
  }, [rendererUpdateViewport]);

  const handleResolutionLockChange = useCallback((locked: boolean, resolution?: { width: number; height: number }, minWidth?: number) => {
    // Update renderer resolution lock
    rendererSetResolutionLock(locked, resolution);

    // Update panel minimum size
    setLeftPanelMinSize(calculatePanelMinSize(locked, minWidth));
  }, [rendererSetResolutionLock]);

  // Sync local shader title with shader prop
  useEffect(() => {
    if (shader?.title) {
      setLocalShaderTitle(shader.title);
    }
  }, [shader?.title]);

  // Update tabs with incoming compilation errors
  useEffect(() => {
    setTabs(prevTabs => distributeErrorsToTabs(prevTabs, compilationErrors));
  }, [compilationErrors]);

  // Tab management handlers (moved from ShaderEditor)
  const handleAddTab = useCallback((name: string) => {
    // Prevent duplicate tabs - check if tab with this name already exists
    const tabExists = tabs.some(tab => tab.name === name);
    if (tabExists) {
      console.warn(`Tab "${name}" already exists. Skipping creation.`);
      return;
    }

    const newTab: Tab = {
      id: Date.now().toString(),
      name,
      code: getDefaultCode(name),
      isDeletable: true,
      errors: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  const handleDeleteTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      // If deleting active tab, switch to first tab
      if (activeTabId === tabId) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const handleCodeChange = useCallback((newCode: string, tabId: string) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, code: newCode } : tab
    ));
  }, []);

  const handleCompile = useCallback(() => {
    // Convert tabs to TabShaderData format and compile imperatively
    const tabsData = tabsToTabData(tabs);
    rendererCompile(tabsData);
  }, [tabs, rendererCompile]);

  // Business logic handlers (moved from ShaderEditor)
  const handleSaveAsClick = useCallback(() => {
    if (!user) {
      // Not signed in - show sign in dialog first, then save as dialog after sign-in
      dialogManager.openSignIn(() => dialogManager.openSaveAs());
    } else {
      // Already signed in - show save as dialog directly
      dialogManager.openSaveAs();
    }
  }, [user, dialogManager]);

  const handleSave = useCallback(async (titleOverride?: string) => {
    try {
      console.log('Saving shader...');

      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to save');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Always trigger compilation before saving
      handleCompile();

      // Wait for compilation to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Determine compilation status
      const status = determineCompilationStatus(compilationSuccess, compilationErrors);

      // Prepare tabs data and update data
      const tabsData = tabsToTabData(tabs);
      const updateData = {
        name: titleOverride ?? localShaderTitle,
        tabs: tabsData,
        compilationStatus: status,
      };

      // Save via API
      await updateShader(slug, updateData, token);
      console.log('Shader saved successfully!');

    } catch (error) {
      console.error('Failed to save shader:', error);
      showErrorAlert(error, 'save shader');
    }
  }, [shader, slug, token, handleCompile, compilationSuccess, compilationErrors, localShaderTitle, tabs]);

  const handleRenameShader = useCallback(async (newName: string) => {
    // Update local title immediately (for UI)
    setLocalShaderTitle(newName);

    // Trigger save with the new name directly (to avoid async state issues)
    await handleSave(newName);
  }, [handleSave]);

  const handleCloneClick = useCallback(() => {
    if (!user) {
      // Not signed in - show sign in dialog first, then clone dialog after sign-in
      dialogManager.openSignIn(() => dialogManager.openClone());
    } else {
      // Already signed in - show clone dialog directly
      dialogManager.openClone();
    }
  }, [user, dialogManager]);

  const handleCloneShader = useCallback(async () => {
    try {
      console.log('Cloning shader...');

      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to clone');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Clone via API
      const response = await cloneShader(slug, token);
      console.log('Shader cloned successfully!', response);

      // Navigate to the cloned shader's URL
      const clonedSlug = response.shader.slug;
      navigate(`/shader/${clonedSlug}`);

    } catch (error) {
      console.error('Failed to clone shader:', error);

      // Re-throw error to be caught by dialog
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to clone shader. Please try again.');
      }
    }
  }, [shader, slug, token, navigate]);

  const handleDeleteShader = useCallback(async () => {
    try {
      console.log('Deleting shader...');

      // Check if we have a shader and slug
      if (!shader || !slug) {
        throw new Error('No shader to delete');
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Delete via API
      await deleteShader(slug, token);
      console.log('Shader deleted successfully!');

      // Navigate to home page
      navigate('/');

    } catch (error) {
      console.error('Failed to delete shader:', error);

      // Re-throw error to be caught by dialog
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to delete shader. Please try again.');
      }
    }
  }, [shader, slug, token, navigate]);

  const handleSaveShader = useCallback(async (shaderName: string) => {
    try {
      console.log('Saving new shader:', shaderName);

      // Trigger compilation if not already compiled or if code has changed
      // This ensures we have accurate compilation status before saving
      if (compilationSuccess === undefined) {
        handleCompile();
        // Wait a moment for compilation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine compilation status
      const status = determineCompilationStatus(compilationSuccess, compilationErrors);

      // Prepare shader data
      const tabsData = tabsToTabData(tabs);
      const shaderData = {
        name: shaderName,
        tabs: tabsData,
        isPublic: true,
        compilationStatus: status,
        compilationErrors: compilationErrors.length > 0 ? compilationErrors : undefined
      };

      // Save new shader via API
      const response = await saveShader(shaderData, token);
      console.log('New shader created successfully!', response);

      // Navigate to the saved shader's URL
      const newSlug = response.shader.slug;
      navigate(`/shader/${newSlug}`);

    } catch (error) {
      console.error('Failed to save shader:', error);
      showErrorAlert(error, 'save shader');
    }
  }, [compilationSuccess, handleCompile, compilationErrors, tabs, token, navigate]);

  // Handle play/pause with imperative controls
  useEffect(() => {
    if (isPlaying && compilationSuccess) {
      rendererPlay();
    } else {
      rendererPause();
    }
  }, [isPlaying, compilationSuccess, rendererPlay, rendererPause]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background-editor/50 flex items-center justify-center z-50">
          <div className="bg-background px-6 py-4 rounded-lg border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              <span className="text-foreground">Loading shader...</span>
            </div>
          </div>
        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={handlePanelResize}>
        {/* Shader Viewer - Left Panel */}
        <ResizablePanel defaultSize={30} minSize={leftPanelMinSize}>
          <div className="h-full flex flex-col gap-0 p-0">
            {/* Header */}
            <div className="w-full flex items-center justify-between px-2 py-0.5 bg-background-header border-b-2 border-accent-shadow">
              <button
                onClick={() => navigate('/')}
                className="text-title font-regular bg-transparent text-foreground hover:text-accent px-1"
                style={{ outline: 'none', border: 'none' }}
              >
                FRAGCODER
              </button>
            </div>
            <div className="flex-1 w-full p-2">
              <ShaderPlayer
                canvasRef={canvasRef}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onReset={() => {
                  console.log('Reset shader');
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
            </div>
          </div>

        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle className="w-px bg-lines" />

        {/* Shader Editor - Right Panel */}
        <ResizablePanel defaultSize={70} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            <ShaderEditor
              // Display data
              tabs={tabs}
              activeTabId={activeTabId}
              localShaderTitle={localShaderTitle}

              // Compilation state
              compilationSuccess={compilationSuccess}
              compilationTime={compilationTime}

              // User/ownership
              isSavedShader={!!shaderUrl}
              isOwner={isOwner}
              isSignedIn={!!user}
              username={user?.username}
              userPicture={user?.picture || undefined}

              // Tab callbacks
              onTabChange={setActiveTabId}
              onAddTab={handleAddTab}
              onDeleteTab={handleDeleteTab}
              onCodeChange={handleCodeChange}

              // Shader operation callbacks
              onCompile={handleCompile}
              onSave={handleSave}
              onSaveAs={handleSaveAsClick}
              onRename={() => dialogManager.openRename()}
              onClone={handleCloneClick}
              onDelete={() => dialogManager.openDelete()}
              onSignIn={() => dialogManager.openSignIn()}
              onSignOut={signOut}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Dialogs (moved from ShaderEditor) */}
      <SignInDialog
        open={dialogManager.isOpen('signin')}
        onOpenChange={(open) => !open && dialogManager.closeDialog()}
        onSignInSuccess={dialogManager.signInCallback}
      />

      <SaveAsDialog
        open={dialogManager.isOpen('saveAs')}
        onOpenChange={(open) => !open && dialogManager.closeDialog()}
        onSave={handleSaveShader}
      />

      <RenameDialog
        currentName={localShaderTitle}
        open={dialogManager.isOpen('rename')}
        onOpenChange={(open) => !open && dialogManager.closeDialog()}
        onRename={handleRenameShader}
      />

      <DeleteShaderDialog
        shaderName={localShaderTitle}
        open={dialogManager.isOpen('delete')}
        onOpenChange={(open) => !open && dialogManager.closeDialog()}
        onDelete={handleDeleteShader}
      />

      <CloneDialog
        shaderName={localShaderTitle}
        open={dialogManager.isOpen('clone')}
        onOpenChange={(open) => !open && dialogManager.closeDialog()}
        onClone={handleCloneShader}
      />
    </div>
  );
}

export default EditorPage
