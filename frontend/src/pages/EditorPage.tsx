import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import ShaderEditor, { defaultImageCode } from '../components/editor/ShaderEditor';
import type { ShaderData } from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { TabShaderData, CompilationError } from '../utils/GLSLCompiler';
import { useAuth } from '../context/AuthContext';
import { useWebGLRenderer } from '../hooks/useWebGLRenderer';

function EditorPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
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
              shader={shader}
              shaderSlug={slug}
              loadedTabs={shaderUrl ? allTabs : undefined}
              isSavedShader={!!shaderUrl}
              isOwner={isOwner}
              onCompile={(tabs) => {
                console.log('Triggering shader compilation with tabs:', tabs);

                // Store all tabs and trigger compilation
                setAllTabs(tabs);
                setCompileTrigger(prev => prev + 1);
              }}
              compilationErrors={compilationErrors}
              compilationSuccess={compilationSuccess}
              compilationTime={compilationTime}
              onTabChange={() => {
                // No longer clear errors on tab change - errors are now filtered by tab in ShaderEditor
                // This allows error decorations to persist when switching between tabs
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default EditorPage
