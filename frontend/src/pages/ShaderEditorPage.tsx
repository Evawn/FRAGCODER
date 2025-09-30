import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import ShaderEditor from '../components/editor/ShaderEditor';
import type { ShaderData } from '../components/editor/ShaderEditor';
import ShaderPlayer from '../components/ShaderPlayer';
import type { TabShaderData } from '../utils/GLSLCompiler';

interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

const defaultShaderCode = `// https://www.shadertoy.com/view/wfXfDl

void mainImage(out vec4 O, vec2 I) {
    vec3  v = iResolution,
          d = vec3( I+I, v ) - v,
          p = iTime/v*9.-8., c = p, s;    
    for(float i, l; l++<1e2; O = (s-c).zzzz/2e2)    
      for(v = s = p += d/length(d)*s.y, i = 1e2; i>.01; i*=.4 )
        v.xz *= .1*mat2(4,-9,9,4),
        s = max( s, min( v = i*.8-abs(mod(v,i+i)-i), v.x) );
}`;

function ShaderEditorPage() {
  const [searchParams] = useSearchParams();
  const shaderId = searchParams.get('id');

  const [shader, setShader] = useState<ShaderData | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [compilationSuccess, setCompilationSuccess] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [allTabs, setAllTabs] = useState<TabShaderData[]>([
    { id: '1', name: 'Image', code: defaultShaderCode }
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
      <PanelGroup direction="horizontal" className="h-screen" onLayout={handlePanelResize}>
        {/* Shader Viewer - Left Panel */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
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
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-gray-600 active:bg-blue-600 transition-colors relative group">
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-6 cursor-col-resize" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-500 group-hover:bg-gray-400 group-active:bg-blue-400 rounded-full transition-colors" />
        </PanelResizeHandle>

        {/* Shader Editor - Right Panel */}
        <Panel defaultSize={50} minSize={30}>
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
                // Clear errors when switching tabs
                setCompilationErrors([]);
                setCompilationSuccess(undefined);
              }}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default ShaderEditorPage