import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../components/ui/resizable';
import ShaderEditor, { defaultImageCode } from '../components/editor/ShaderEditor';
import type { ShaderData } from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { TabShaderData, CompilationError } from '../utils/GLSLCompiler';

function NewShaderEditorPage() {
  const [searchParams] = useSearchParams();
  const shaderId = searchParams.get('id');

  const [shader, setShader] = useState<ShaderData | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [compilationSuccess, setCompilationSuccess] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [allTabs, setAllTabs] = useState<TabShaderData[]>([
    { id: '1', name: 'Image', code: defaultImageCode }
  ]);
  const [panelResizeCounter, setPanelResizeCounter] = useState(0);
  const [compileTrigger, setCompileTrigger] = useState(0);

  useEffect(() => {
    if (shaderId) {
      loadShader(shaderId);
    }
  }, [shaderId]);

  const loadShader = async (id: string) => {
    setLoading(true);
    try {
      // TODO: Implement shader loading from API
      console.log('Loading shader with ID:', id);
    } catch (error) {
      console.error('Error loading shader:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompilationResult = useCallback((success: boolean, errors: CompilationError[]) => {
    console.log('Compilation result:', success ? 'success' : 'failed', errors);
    setCompilationErrors(errors);
    setCompilationSuccess(success);

    // Auto-play when compilation succeeds
    if (success) {
      setIsPlaying(true);
    }
  }, []);

  const handlePanelResize = useCallback(() => {
    // Increment counter to trigger canvas resize when panels are resized
    setPanelResizeCounter(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ResizablePanelGroup direction="horizontal" className="h-screen" onLayout={handlePanelResize}>
        {/* Shader Viewer - Left Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col gap-0 p-0">
            <div className="w-full" style={{ aspectRatio: '4/3' }}>
              <ShaderPlayer
                tabs={allTabs}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onReset={() => {
                  console.log('Reset shader');
                  setIsPlaying(true);
                }}
                onCompilationResult={handleCompilationResult}
                panelResizeCounter={panelResizeCounter}
                compileTrigger={compileTrigger}
              />
            </div>
            <div className="flex-1"></div>
          </div>
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle className="w-px bg-gray-600" />

        {/* Shader Editor - Right Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <ShaderEditor
              shader={shader}
              onCompile={(tabs) => {
                console.log('Triggering shader compilation with tabs:', tabs);

                // Store all tabs and trigger compilation
                setAllTabs(tabs);
                setCompileTrigger(prev => prev + 1);
              }}
              compilationErrors={compilationErrors}
              compilationSuccess={compilationSuccess}
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

export default NewShaderEditorPage
