import { useState, useEffect, useRef } from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';
import type { CompilationError, TabShaderData } from '../../utils/GLSLCompiler';
import type { Transaction } from '@codemirror/state';
import { updateErrorLines } from '../../utils/ErrorLineTracking';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dropdown } from '../ui/Dropdown';

export interface ShaderData {
  id: string;
  title: string;
  code: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  forkedFrom?: string;
}

interface ShaderEditorProps {
  shader: ShaderData | null;
  onCompile: (tabs: TabShaderData[]) => void;
  compilationErrors: CompilationError[];
  compilationSuccess?: boolean;
  compilationTime: number;
  onTabChange?: () => void;
}

interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
  errors: CompilationError[]; // Per-tab error storage
}

export const defaultImageCode = `// Image - Display all buffers in quadrants

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Determine which quadrant we're in
    vec2 quadrant = step(0.5, uv);

    // Normalize UV to quadrant space (0-1 within each quadrant)
    vec2 quadUV = fract(uv * 2.0);

    // Select buffer based on quadrant
    vec4 color;
    if (quadrant.x < 0.5 && quadrant.y < 0.5) {
        // Bottom-left: Buffer A
        color = texture(BufferA, quadUV);
    } else if (quadrant.x >= 0.5 && quadrant.y < 0.5) {
        // Bottom-right: Buffer B
        color = texture(BufferB, quadUV);
    } else if (quadrant.x < 0.5 && quadrant.y >= 0.5) {
        // Top-left: Buffer C
        color = texture(BufferC, quadUV);
    } else {
        // Top-right: Buffer D
        color = texture(BufferD, quadUV);
    }

    fragColor = color;
}`;

const defaultBufferACode = `// Buffer A - Red pulsing circle

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float d = length(uv);
    float c = smoothstep(0.5, 0.45, d + 0.1 * sin(iTime * 2.0));
    fragColor = vec4(c * vec3(1.0, 0.1, 0.1), 1.0);
}`;

const defaultBufferBCode = `// Buffer B - Green rotating square

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float a = iTime * 1.5;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    uv = rot * uv;
    float d = max(abs(uv.x), abs(uv.y));
    float c = smoothstep(0.35, 0.3, d);
    fragColor = vec4(c * vec3(0.1, 1.0, 0.1), 1.0);
}`;

const defaultBufferCCode = `// Buffer C - Blue animated triangle

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv.y += 0.2;
    float scale = 0.6 + 0.2 * sin(iTime);
    uv /= scale;

    float d = abs(uv.x) * 0.866 + uv.y * 0.5;
    float c = smoothstep(0.45, 0.4, max(d, -uv.y - 0.5));
    fragColor = vec4(c * vec3(0.1, 0.4, 1.0), 1.0);
}`;

const defaultBufferDCode = `// Buffer D - Yellow/orange gradient waves

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float wave = sin(uv.x * 10.0 + iTime * 2.0) * 0.5 + 0.5;
    float wave2 = sin(uv.y * 8.0 - iTime * 1.5) * 0.5 + 0.5;
    vec3 col = mix(vec3(1.0, 0.8, 0.2), vec3(1.0, 0.4, 0.1), wave * wave2);
    fragColor = vec4(col, 1.0);
}`;

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

function ShaderEditor({ shader, onCompile, compilationErrors, compilationSuccess, compilationTime, onTabChange }: ShaderEditorProps) {
  const [code, setCode] = useState(shader?.code || defaultImageCode);
  const [isUniformsExpanded, setIsUniformsExpanded] = useState(false);
  const [showErrorDecorations, setShowErrorDecorations] = useState(true);

  // Tab management state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Image', code: shader?.code || defaultImageCode, isDeletable: false, errors: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);

  const isSwitchingTabsRef = useRef(false);

  // Title dropdown options
  const titleDropdownOptions = [
    {
      text: 'Save as...',
      callback: () => {
        // TODO: Implement save functionality
      }
    }
  ];

  // Add tab dropdown options
  const addTabDropdownOptions = [
    { text: 'Buffer A', callback: () => handleAddTab('Buffer A') },
    { text: 'Buffer B', callback: () => handleAddTab('Buffer B') },
    { text: 'Buffer C', callback: () => handleAddTab('Buffer C') },
    { text: 'Buffer D', callback: () => handleAddTab('Buffer D') },
    { text: 'Common', callback: () => handleAddTab('Common') }
  ];

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

  useEffect(() => {
    if (shader?.code) {
      setCode(shader.code);
      // Update the Image tab's code when shader changes
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === '1' ? { ...tab, code: shader.code } : tab
      ));
    }
  }, [shader]);

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Check if a tab has errors
  const tabHasErrors = (tab: Tab): boolean => {
    return tab.errors.length > 0;
  };

  // Handle document changes to update error line numbers
  const handleDocumentChange = (tr: Transaction) => {
    // Ignore document changes during tab switches
    if (isSwitchingTabsRef.current) {
      return;
    }

    setTabs(prevTabs => {
      const newTabs = prevTabs.map(tab => {
        if (tab.id === activeTabId) {
          // Update errors for the active tab
          const updatedErrors = updateErrorLines(tab.errors, tr);
          return { ...tab, errors: updatedErrors };
        }
        return tab;
      });
      return newTabs;
    });
  };

  // Update code state when switching tabs
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      // Set flag to ignore document changes during tab switch
      isSwitchingTabsRef.current = true;

      setCode(activeTab.code);

      // Clear the flag after a short delay to allow CodeMirror to settle
      setTimeout(() => {
        isSwitchingTabsRef.current = false;
      }, 100);

      // Notify parent that tab changed
      onTabChange?.();
    }
  }, [activeTabId]); // Only trigger on activeTabId change, not tab content changes

  const handleCompile = () => {
    // Convert tabs to TabShaderData format and pass all to parent
    const tabsData: TabShaderData[] = tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      code: tab.code
    }));
    onCompile(tabsData);
  };

  // Save current tab's code when it changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === activeTabId ? { ...tab, code: newCode } : tab
    ));
  };

  const handleAddTab = (name: string) => {
    let defaultCode = defaultImageCode;

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
        defaultCode = defaultImageCode;
    }

    const newTab: Tab = {
      id: Date.now().toString(),
      name,
      code: defaultCode,
      isDeletable: true,
      errors: []
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleDeleteTab = (tab: Tab) => {
    setTabToDelete(tab);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      setTabs(tabs.filter(tab => tab.id !== tabToDelete.id));
      // If deleting active tab, switch to first tab
      if (activeTabId === tabToDelete.id) {
        setActiveTabId(tabs[0].id);
      }
    }
    setShowDeleteConfirm(false);
    setTabToDelete(null);
  };

  // Standard GLSL uniform declarations for shader inputs
  const uniformHeader = `// Standard Shader Uniforms
uniform vec3 iResolution;          // viewport resolution (in pixels)
uniform float iTime;               // shader playback time (in seconds)
uniform float iTimeDelta;          // render time (in seconds)
uniform float iFrameRate;          // shader frame rate
uniform int iFrame;                // shader playback frame
uniform vec4 iDate;                // year, month, day, time in seconds
uniform vec4 iMouse;               // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D BufferA;         // Buffer A texture
uniform sampler2D BufferB;         // Buffer B texture
uniform sampler2D BufferC;         // Buffer C texture
uniform sampler2D BufferD;         // Buffer D texture`;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2" style={{ height: '30px' }}>
        {/* Title Button with Options Dropdown */}
        <Dropdown options={titleDropdownOptions}>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
            style={{ outline: 'none', border: 'none' }}
          >
            <span className="text-lg">Untitled...</span>
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </Dropdown>

        {/* Right-side buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
            style={{ outline: 'none', border: 'none' }}
            onClick={() => console.log('New+ clicked')}
          >
            <span className="text-lg">New+</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
            style={{ outline: 'none', border: 'none' }}
            onClick={() => console.log('Sign In clicked')}
          >
            <span className="text-lg">Sign In</span>
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-gray-800 border-b border-gray-700 flex items-center px-1" style={{ height: '30px' }}>
        {/* Add Tab Button with Dropdown */}
        <div className="mr-1">
          <Dropdown options={addTabDropdownOptions} align="start" sideOffset={4}>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-gray-700 focus:outline-none"
              style={{ width: '18px', height: '18px' }}
              title="Add new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </Dropdown>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto" style={{ gap: '2px' }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`h-auto px-2 rounded-t transition-colors group relative cursor-pointer inline-flex items-center ${activeTabId === tab.id
                ? 'bg-gray-900 text-white hover:bg-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-gray-100'
                }`}
              style={{ height: '30px', minWidth: 'fit-content' }}
              onClick={() => setActiveTabId(tab.id)}
            >
              {/* Error indicator dot */}
              {tabHasErrors(tab) && (
                <span
                  className="rounded-full bg-red-500 mr-1 flex-shrink-0"
                  style={{ width: '4px', height: '4px' }}
                  title={`${tab.name} has compilation errors`}
                />
              )}
              <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px' }}>{tab.name}</span>
              {tab.isDeletable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTab(tab);
                  }}
                  className="ml-1 rounded hover:bg-gray-500 transition-colors"
                  style={{ padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg className="text-gray-400 group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '10px', height: '10px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shader Uniforms Dropdown */}
      <div className="bg-gray-800 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsUniformsExpanded(!isUniformsExpanded)}
          className="w-full h-auto px-3 py-0 text-gray-300 bg-transparent hover:text-gray-100 hover:bg-gray-700 focus:outline-none justify-start"
          style={{ outline: 'none', border: 'none' }}
        >
          <svg
            className={`w-3 h-3 mr-2 transition-transform duration-200 ${isUniformsExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Uniform Inputs</span>
        </Button>
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isUniformsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
          <div className="p-0">
            <pre className="text-sm text-gray-400 font-mono bg-gray-900 px-14 overflow-x-auto leading-relaxed">
              {uniformHeader}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 h-full bg-gray-900 flex flex-col p-0">
        <CodeMirrorEditor
          value={code}
          onChange={handleCodeChange}
          placeholder="// Write your GLSL fragment shader here..."
          errors={activeTab?.errors || []}
          compilationSuccess={compilationSuccess}
          onCompile={handleCompile}
          onDocumentChange={handleDocumentChange}
        />
      </div>

      {/* Footer */}
      <div className="relative bg-gray-800 border-t border-gray-700 flex items-center px-2 gap-2" style={{ height: '30px' }}>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCompile}
          className="h-6 w-6 bg-transparent focus:outline-none border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-400"
          title="Compile Shader"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </Button>
        <Badge
          variant="outline"
          className={`bg-transparent border-transparent font-mono text-xs px-2 py-0 ${compilationSuccess === false
            ? 'text-red-500'
            : 'text-green-500'
            }`}
        >
          {compilationSuccess === false
            ? 'Compilation Failed'
            : `Compiled in ${compilationTime} ms`
          }
        </Badge>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowErrorDecorations(!showErrorDecorations)}
          className="h-6 w-6 bg-transparent hover:outline-none hover:bg-transparent focus:outline-none"
          style={{ outline: 'none', border: 'none' }}
          title={showErrorDecorations ? 'Hide error decorations' : 'Show error decorations'}
        >
          {showErrorDecorations ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </Button>

        {/* Centered character count badge */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Badge
            variant="outline"
            className="bg-transparent border-transparent font-mono text-xs px-2 py-0 text-gray-400"
          >
            {code.length} chars
          </Badge>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Tab</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete the "{tabToDelete?.name}" tab? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTabToDelete(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTab}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ShaderEditor;