import { useState, useEffect, useRef } from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';
import type { CompilationError } from '../../utils/GLSLCompiler';

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
  onCompile: (code: string) => void;
  compilationErrors: CompilationError[];
  compilationSuccess?: boolean;
  onTabChange?: () => void;
}

interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
}

const defaultImageCode = `// https://www.shadertoy.com/view/wfXfDl

void mainImage(out vec4 O, vec2 I) {
    vec3  v = iResolution,
          d = vec3( I+I, v ) - v,
          p = iTime/v*9.-8., c = p, s;
    for(float i, l; l++<1e2; O = (s-c).zzzz/2e2)
      for(v = s = p += d/length(d)*s.y, i = 1e2; i>.01; i*=.4 )
        v.xz *= .1*mat2(4,-9,9,4),
        s = max( s, min( v = i*.8-abs(mod(v,i+i)-i), v.x) );
}`;

const defaultBufferACode = `// Buffer A - Red pulsing circle

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float d = length(uv);
    float c = smoothstep(0.5, 0.45, d + 0.1 * sin(iTime * 2.0));
    fragColor = vec4(c * vec3(1.0, 0.1, 0.1), 1.0);
}`;

const defaultBufferBCode = `// Buffer B - Green rotating square

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float a = iTime * 1.5;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    uv = rot * uv;
    float d = max(abs(uv.x), abs(uv.y));
    float c = smoothstep(0.35, 0.3, d);
    fragColor = vec4(c * vec3(0.1, 1.0, 0.1), 1.0);
}`;

const defaultBufferCCode = `// Buffer C - Blue animated triangle

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv.y += 0.2;
    float scale = 0.6 + 0.2 * sin(iTime);
    uv /= scale;

    float d = abs(uv.x) * 0.866 + uv.y * 0.5;
    float c = smoothstep(0.45, 0.4, max(d, -uv.y - 0.5));
    fragColor = vec4(c * vec3(0.1, 0.4, 1.0), 1.0);
}`;

const defaultBufferDCode = `// Buffer D - Yellow/orange gradient waves

void mainImage(out vec4 fragColor, vec2 fragCoord) {
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

function ShaderEditor({ shader, onCompile, compilationErrors, compilationSuccess, onTabChange }: ShaderEditorProps) {
  const [code, setCode] = useState(shader?.code || defaultImageCode);
  const [isUniformsExpanded, setIsUniformsExpanded] = useState(false);

  // Tab management state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'Image', code: shader?.code || defaultImageCode, isDeletable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shader?.code) {
      setCode(shader.code);
      // Update the Image tab's code when shader changes
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === '1' ? { ...tab, code: shader.code } : tab
      ));
    }
  }, [shader]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update code state when switching tabs
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab) {
      setCode(activeTab.code);
      // Notify parent that tab changed to clear errors
      onTabChange?.();
    }
  }, [activeTabId]); // Only trigger on activeTabId change, not tab content changes

  const handleCompile = () => {
    onCompile(code);
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
      isDeletable: true
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setShowAddDropdown(false);
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
uniform vec3 iResolution;    // viewport resolution (in pixels)
uniform float iTime;         // shader playback time (in seconds)
uniform float iTimeDelta;    // render time (in seconds)
uniform int iFrame;          // shader playback frame
uniform vec4 iMouse;         // mouse pixel coords. xy: current, zw: click
uniform vec4 iDate;          // year, month, day, time in seconds`;

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

      {/* Tabs Bar */}
      <div className="bg-gray-800 border-b border-gray-700 flex items-center px-2 py-1">
        {/* Add Tab Button */}
        <div className="relative mr-2" ref={dropdownRef}>
          <button
            onClick={() => setShowAddDropdown(!showAddDropdown)}
            className="p-1 rounded hover:bg-gray-700 transition-colors group"
            title="Add new tab"
          >
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showAddDropdown && (
            <div className="absolute left-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 py-1 min-w-[120px]">
              <button
                onClick={() => handleAddTab('Buffer A')}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Buffer A
              </button>
              <button
                onClick={() => handleAddTab('Buffer B')}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Buffer B
              </button>
              <button
                onClick={() => handleAddTab('Buffer C')}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Buffer C
              </button>
              <button
                onClick={() => handleAddTab('Buffer D')}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Buffer D
              </button>
              <div className="border-t border-gray-600 my-1"></div>
              <button
                onClick={() => handleAddTab('Common')}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-600 transition-colors"
              >
                Common
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 flex items-center space-x-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center px-3 py-1.5 rounded-t cursor-pointer transition-colors group ${activeTabId === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-gray-100'
                }`}
              onClick={() => {
                setActiveTabId(tab.id);
              }}
            >
              <span className="text-sm font-medium whitespace-nowrap">{tab.name}</span>
              {tab.isDeletable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTab(tab);
                  }}
                  className="ml-2 p-0.5 rounded hover:bg-gray-500 transition-colors"
                >
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <button
          onClick={() => setIsUniformsExpanded(!isUniformsExpanded)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700 transition-colors duration-150"
        >
          <span className="text-sm font-medium text-gray-300">Shader Uniforms</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUniformsExpanded ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isUniformsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
          <div className="px-3 pb-3">
            <pre className="text-xs text-gray-400 font-mono bg-gray-900 p-3 rounded border border-gray-600 overflow-x-auto leading-relaxed">
              {uniformHeader}
            </pre>
          </div>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 bg-gray-900 flex flex-col p-4">
        <CodeMirrorEditor
          value={code}
          onChange={handleCodeChange}
          placeholder="// Write your GLSL fragment shader here..."
          errors={compilationErrors}
          compilationSuccess={compilationSuccess}
          onCompile={handleCompile}
        />
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