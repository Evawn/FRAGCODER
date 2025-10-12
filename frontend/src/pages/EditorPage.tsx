import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import ShaderEditor, { defaultImageCode } from '../components/editor/ShaderEditor';
import type { ShaderData } from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { TabShaderData, CompilationError } from '../utils/GLSLCompiler';
import { useAuth } from '../context/AuthContext';
import { useWebGLRenderer } from '../hooks/useWebGLRenderer';
import { SignInDialog } from '../components/auth/SignInDialog';
import { SaveAsDialog } from '../components/editor/SaveAsDialog';
import { RenameDialog } from '../components/editor/RenameDialog';
import { DeleteShaderDialog } from '../components/editor/DeleteShaderDialog';
import { CloneDialog } from '../components/editor/CloneDialog';

// Tab interface (matching ShaderEditor's Tab interface)
interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
  errors: CompilationError[];
}

// Default tab codes
const defaultMainImageCode = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y;
    fragColor = vec4(uv, 1.0, 1.0);
}`;

const defaultImageCodeFull = `// Image - Display all buffers in quadrants

${defaultMainImageCode}`;

const defaultBufferACode = `// Buffer A - Red pulsing circle

${defaultMainImageCode}`;

const defaultBufferBCode = `// Buffer B - Green rotating square

${defaultMainImageCode}`;

const defaultBufferCCode = `// Buffer C - Blue animated triangle

${defaultMainImageCode}`;

const defaultBufferDCode = `// Buffer D - Yellow/orange gradient waves

${defaultMainImageCode}`;

const defaultCommonCode = `// Common - Shared functions and definitions
// Add your shared utilities here

// Example: Distance to circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Example: Rotation matrix
mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}`;

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
  const [allTabs, setAllTabs] = useState<TabShaderData[]>([
    { id: '1', name: 'Image', code: defaultImageCode }
  ]);
  const [panelResizeCounter, setPanelResizeCounter] = useState(0);
  const [compileTrigger, setCompileTrigger] = useState(0);
  const [leftPanelMinSize, setLeftPanelMinSize] = useState(30);

  // Tab management state (moved from ShaderEditor)
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Image', code: defaultImageCode, isDeletable: false, errors: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  // Dialog state (moved from ShaderEditor)
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [signInCallback, setSignInCallback] = useState<(() => void) | undefined>();

  // Local shader title (moved from ShaderEditor)
  const [localShaderTitle, setLocalShaderTitle] = useState(shader?.title || 'Untitled...');

  // Resolution lock state (lifted from ShaderPlayer)
  const [isResolutionLocked, setIsResolutionLocked] = useState(false);
  const [lockedResolution, setLockedResolution] = useState<{ width: number; height: number } | null>(null);

  // Calculate whether current user owns the shader
  const isOwner = useMemo(() => {
    return !!(user && shader && user.id === shader.userId);
  }, [user, shader]);

  useEffect(() => {
    if (slug) {
      loadShader(slug);
    } else {
      // No slug means new shader - reset to defaults
      setShaderUrl(null);
      setShader(null);
      setAllTabs([{ id: '1', name: 'Image', code: defaultImageCode }]);
    }
  }, [slug]);

  const loadShader = async (slug: string) => {
    setLoading(true);
    try {
      // Import API function
      const { getShaderBySlug } = await import('../api/shaders');

      // Fetch shader data from backend
      const shaderData = await getShaderBySlug(slug);

      // Convert API Shader format to ShaderData format for ShaderEditor
      setShader({
        id: shaderData.id,
        title: shaderData.title,
        code: shaderData.tabs[0]?.code || defaultImageCode, // Image tab
        description: shaderData.description || undefined,
        isPublic: shaderData.isPublic,
        userId: shaderData.userId,
        forkedFrom: shaderData.forkedFrom || undefined,
      });

      // Set all tabs for compilation
      setAllTabs(shaderData.tabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        code: tab.code
      })));

      // Trigger compilation after loading
      setCompileTrigger(prev => prev + 1);

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

  const handlePanelResize = useCallback(() => {
    // Increment counter to trigger canvas resize when panels are resized
    setPanelResizeCounter(prev => prev + 1);
  }, []);

  const handleResolutionLockChange = useCallback((locked: boolean, resolution?: { width: number; height: number }, minWidth?: number) => {
    // Update resolution lock state
    setIsResolutionLocked(locked);
    setLockedResolution(locked && resolution ? resolution : null);

    // Update panel minimum size
    if (locked && minWidth) {
      // Calculate minimum size as a percentage of the viewport
      // We need to account for the width of the entire viewport
      const viewportWidth = window.innerWidth;
      const minPercentage = Math.max(30, Math.min(70, (minWidth / viewportWidth) * 100));
      setLeftPanelMinSize(minPercentage);
    } else {
      // Reset to default minimum size
      setLeftPanelMinSize(30);
    }
  }, []);

  // Sync local shader title with shader prop
  useEffect(() => {
    if (shader?.title) {
      setLocalShaderTitle(shader.title);
    }
  }, [shader?.title]);

  // Load tabs from shader when tabs change
  useEffect(() => {
    if (allTabs && allTabs.length > 0) {
      // Convert loaded tabs to Tab format
      const convertedTabs: Tab[] = allTabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        code: tab.code,
        isDeletable: tab.name !== 'Image', // Image tab is never deletable
        errors: []
      }));

      setTabs(convertedTabs);
      setActiveTabId(convertedTabs[0].id);
    }
  }, [allTabs]);

  // Update tabs with incoming compilation errors
  useEffect(() => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.map(tab => {
        // Get errors for this tab
        const tabErrors = compilationErrors.filter(error =>
          !error.passName || error.passName === tab.name
        );
        return { ...tab, errors: tabErrors };
      });
      return newTabs;
    });
  }, [compilationErrors]);

  // Tab management handlers (moved from ShaderEditor)
  const handleAddTab = useCallback((name: string) => {
    let defaultCode = defaultImageCodeFull;

    switch (name) {
      case 'Buffer A':
        defaultCode = defaultBufferACode;
        break;
      case 'Buffer B':
        defaultCode = defaultBufferBCode;
        break;
      case 'Buffer C':
        defaultCode = defaultBufferCCode;
        break;
      case 'Buffer D':
        defaultCode = defaultBufferDCode;
        break;
      case 'Common':
        defaultCode = defaultCommonCode;
        break;
      default:
        defaultCode = defaultImageCodeFull;
    }

    const newTab: Tab = {
      id: Date.now().toString(),
      name,
      code: defaultCode,
      isDeletable: true,
      errors: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

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
    // Convert tabs to TabShaderData format and pass all to compilation
    const tabsData: TabShaderData[] = tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      code: tab.code
    }));
    setAllTabs(tabsData);
    setCompileTrigger(prev => prev + 1);
  }, [tabs]);

  // Business logic handlers (moved from ShaderEditor)
  const handleSaveAsClick = useCallback(() => {
    if (!user) {
      // Not signed in - show sign in dialog first, then save as dialog after sign-in
      setSignInCallback(() => () => setShowSaveAsDialog(true));
      setShowSignInDialog(true);
    } else {
      // Already signed in - show save as dialog directly
      setShowSaveAsDialog(true);
    }
  }, [user]);

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
      let status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING' = 'PENDING';
      if (compilationSuccess === true) {
        status = compilationErrors.length > 0 ? 'WARNING' : 'SUCCESS';
      } else if (compilationSuccess === false) {
        status = 'ERROR';
      }

      // Prepare update data - use titleOverride if provided, otherwise use localShaderTitle
      const updateData = {
        name: titleOverride ?? localShaderTitle,
        tabs: tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          code: tab.code
        })),
        compilationStatus: status,
      };

      console.log('Updating shader with data:', updateData);

      // Import updateShader dynamically
      const { updateShader } = await import('../api/shaders');

      // Update shader via API
      const response = await updateShader(slug, updateData, token);

      console.log('Shader updated successfully!', response);

    } catch (error) {
      console.error('Failed to save shader:', error);

      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Failed to save shader: ${error.message}`);
      } else {
        alert('Failed to save shader. Please try again.');
      }
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
      setSignInCallback(() => () => setShowCloneDialog(true));
      setShowSignInDialog(true);
    } else {
      // Already signed in - show clone dialog directly
      setShowCloneDialog(true);
    }
  }, [user]);

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

      // Import cloneShader dynamically
      const { cloneShader } = await import('../api/shaders');

      // Clone shader via API
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

      // Import deleteShader dynamically
      const { deleteShader } = await import('../api/shaders');

      // Delete shader via API
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
      console.log('Saving shader:', shaderName);

      // Trigger compilation if not already compiled or if code has changed
      // This ensures we have accurate compilation status before saving
      if (compilationSuccess === undefined) {
        handleCompile();
        // Wait a moment for compilation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Determine compilation status
      let status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING' = 'PENDING';
      if (compilationSuccess === true) {
        status = compilationErrors.length > 0 ? 'WARNING' : 'SUCCESS';
      } else if (compilationSuccess === false) {
        status = 'ERROR';
      }

      // Prepare shader data structure
      const shaderData = {
        name: shaderName,
        tabs: tabs.map(tab => ({
          id: tab.id,
          name: tab.name,
          code: tab.code
        })),
        isPublic: true, // Default to public
        compilationStatus: status,
        compilationErrors: compilationErrors.length > 0 ? compilationErrors : undefined
      };

      console.log('Shader data to save:', shaderData);

      // Import saveShader dynamically to avoid circular dependencies
      const { saveShader } = await import('../api/shaders');

      // Check if user is authenticated
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Save shader to backend
      const response = await saveShader(shaderData, token);

      console.log('Shader saved successfully!', response);

      // Navigate to the saved shader's URL
      const newSlug = response.shader.slug;
      navigate(`/shader/${newSlug}`);

    } catch (error) {
      console.error('Failed to save shader:', error);

      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Failed to save shader: ${error.message}`);
      } else {
        alert('Failed to save shader. Please try again.');
      }
    }
  }, [compilationSuccess, handleCompile, compilationErrors, tabs, token, navigate]);

  // WebGL renderer hook (moved from ShaderPlayer to EditorPage)
  const {
    canvasRef,
    compilationSuccess: webglCompilationSuccess,
    error: webglError,
    reset: webglReset,
    uTime,
    fps,
    resolution
  } = useWebGLRenderer({
    tabs: allTabs,
    isPlaying,
    onCompilationResult: handleCompilationResult,
    panelResizeCounter,
    compileTrigger,
    isResolutionLocked,
    lockedResolution
  });

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 px-6 py-4 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white">Loading shader...</span>
            </div>
          </div>
        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1" onLayout={handlePanelResize}>
        {/* Shader Viewer - Left Panel */}
        <ResizablePanel defaultSize={50} minSize={leftPanelMinSize}>
          <div className="h-full flex flex-col gap-0 p-0">
            {/* Header */}
            <div className="w-full flex items-center px-1 bg-gray-800 border-b border-gray-700" style={{ height: '30px' }}>
              <button
                onClick={() => navigate('/')}
                className="text-lg font-bold bg-transparent"
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
                  webglReset();
                  setIsPlaying(false);
                }}
                compilationSuccess={webglCompilationSuccess}
                error={webglError}
                uTime={uTime}
                fps={fps}
                resolution={resolution}
                onResolutionLockChange={handleResolutionLockChange}
              />
            </div>
          </div>

        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle className="w-px bg-gray-600" />

        {/* Shader Editor - Right Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
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
              onRename={() => setShowRenameDialog(true)}
              onClone={handleCloneClick}
              onDelete={() => setShowDeleteDialog(true)}
              onSignIn={() => {
                setSignInCallback(undefined);
                setShowSignInDialog(true);
              }}
              onSignOut={signOut}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Dialogs (moved from ShaderEditor) */}
      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
        onSignInSuccess={signInCallback}
      />

      <SaveAsDialog
        open={showSaveAsDialog}
        onOpenChange={setShowSaveAsDialog}
        onSave={handleSaveShader}
      />

      <RenameDialog
        currentName={localShaderTitle}
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        onRename={handleRenameShader}
      />

      <DeleteShaderDialog
        shaderName={localShaderTitle}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDelete={handleDeleteShader}
      />

      <CloneDialog
        shaderName={localShaderTitle}
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        onClone={handleCloneShader}
      />
    </div>
  );
}

export default EditorPage
