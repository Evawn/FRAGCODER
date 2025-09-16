import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import CodeMirrorEditor from '../components/common/CodeMirrorEditor';
import ShaderPlayer from '../components/shader/ShaderPlayer';

interface ShaderData {
  id: string;
  title: string;
  code: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  forkedFrom?: string;
}

interface CompilationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

const defaultShaderCode = `void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(uv, 0.5 + 0.5 * sin(u_time));
    gl_FragColor = vec4(color, 1.0);
}`;

function ShaderEditor() {
  const [searchParams] = useSearchParams();
  const shaderId = searchParams.get('id');

  const [shader, setShader] = useState<ShaderData | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>(defaultShaderCode);

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
    
    // Auto-play when compilation succeeds
    if (success) {
      setIsPlaying(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <PanelGroup direction="horizontal" className="h-screen">
        {/* Shader Viewer - Left Panel */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="w-full" style={{ aspectRatio: '4/3' }}>
              <ShaderPlayer
                userCode={currentCode}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onReset={() => {
                  console.log('Reset shader');
                  setIsPlaying(true);
                }}
                onCompilationResult={handleCompilationResult}
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
            <ShaderCodeEditor
              shader={shader}
              onCompile={(code) => {
                console.log('Triggering shader compilation...');
                setCurrentCode(code);
              }}
              compilationErrors={compilationErrors}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}


interface ShaderCodeEditorProps {
  shader: ShaderData | null;
  onCompile: (code: string) => void;
  compilationErrors: CompilationError[];
}

function ShaderCodeEditor({ shader, onCompile, compilationErrors }: ShaderCodeEditorProps) {
  const [code, setCode] = useState(shader?.code || defaultShaderCode);

  useEffect(() => {
    if (shader?.code) {
      setCode(shader.code);
    }
  }, [shader]);

  const handleCompile = () => {
    onCompile(code);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with compile button */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">GLSL Editor</h2>
          <button
            onClick={handleCompile}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Compile
          </button>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 bg-gray-900 flex flex-col">
        <div className="flex-1">
          <CodeMirrorEditor
            value={code}
            onChange={setCode}
            placeholder="// Write your GLSL fragment shader here..."
          />
        </div>
        
        {/* Compilation Errors */}
        {compilationErrors.length > 0 && (
          <div className="bg-gray-800 border-t border-gray-700 p-4 max-h-32 overflow-y-auto">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Compilation Errors:</h3>
            <div className="space-y-1">
              {compilationErrors.map((error, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-400">
                    {error.line > 0 ? `Line ${error.line}: ` : ''}
                  </span>
                  <span className={error.type === 'error' ? 'text-red-300' : 'text-yellow-300'}>
                    {error.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default ShaderEditor