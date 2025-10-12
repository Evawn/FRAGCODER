import { useState, useEffect, useRef, useMemo } from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';
import type { CompilationError } from '../../utils/GLSLCompiler';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dropdown } from '../ui/Dropdown';

// Tab interface
export interface Tab {
  id: string;
  name: string;
  code: string;
  isDeletable: boolean;
  errors: CompilationError[];
}

// Props interface - display-only component
interface ShaderEditorProps {
  // Display data
  tabs: Tab[];
  activeTabId: string;
  localShaderTitle: string;

  // Compilation state
  compilationSuccess?: boolean;
  compilationTime: number;

  // User/ownership
  isSavedShader: boolean;
  isOwner: boolean;
  isSignedIn: boolean;
  username?: string;
  userPicture?: string;

  // Tab callbacks
  onTabChange: (tabId: string) => void;
  onAddTab: (tabName: string) => void;
  onDeleteTab: (tabId: string) => void;
  onCodeChange: (newCode: string, tabId: string) => void;

  // Shader operation callbacks
  onCompile: () => void;
  onSave: (titleOverride?: string) => void;
  onSaveAs: () => void;
  onRename: () => void;
  onClone: () => void;
  onDelete: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

// Re-export for backward compatibility
export const defaultImageCode = `// Image - Display all buffers in quadrants

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y;
    fragColor = vec4(uv, 1.0, 1.0);
}`;

// This interface is kept for backward compatibility (used by EditorPage)
export interface ShaderData {
  id: string;
  title: string;
  code: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  forkedFrom?: string;
}

function ShaderEditor({
  tabs,
  activeTabId,
  localShaderTitle,
  compilationSuccess,
  compilationTime,
  isSavedShader,
  isOwner,
  isSignedIn,
  username,
  userPicture,
  onTabChange,
  onAddTab,
  onDeleteTab,
  onCodeChange,
  onCompile,
  onSave,
  onSaveAs,
  onRename,
  onClone,
  onDelete,
  onSignIn,
  onSignOut,
}: ShaderEditorProps) {
  const [isUniformsExpanded, setIsUniformsExpanded] = useState(false);
  const [showErrorDecorations, setShowErrorDecorations] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null);

  const isSwitchingTabsRef = useRef(false);

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Check if a tab has errors
  const tabHasErrors = (tab: Tab): boolean => {
    return tab.errors.length > 0;
  };

  // Handle document changes - placeholder for error line tracking
  const handleDocumentChange = () => {
    // Ignore document changes during tab switches
    if (isSwitchingTabsRef.current) {
      return;
    }

    // Note: Error line tracking is now handled in the parent (EditorPage)
    // This is just a placeholder to maintain the interface with CodeMirrorEditor
  };

  // Handle tab switch - prevent error line tracking during switch
  useEffect(() => {
    // Set flag to ignore document changes during tab switch
    isSwitchingTabsRef.current = true;

    // Clear the flag after a short delay to allow CodeMirror to settle
    const timeout = setTimeout(() => {
      isSwitchingTabsRef.current = false;
    }, 100);

    return () => clearTimeout(timeout);
  }, [activeTabId]);

  // Handle code changes
  const handleCodeChangeInternal = (newCode: string) => {
    onCodeChange(newCode, activeTabId);
  };

  // Handle tab deletion
  const handleDeleteTabClick = (tab: Tab) => {
    setTabToDelete(tab);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      onDeleteTab(tabToDelete.id);
    }
    setShowDeleteConfirm(false);
    setTabToDelete(null);
  };

  // Compile or save based on shader ownership
  const handleCompileOrSave = () => {
    // If this is a saved shader that the user owns, save it (which also compiles)
    if (isSavedShader && isOwner) {
      onSave();
    } else {
      // Otherwise, just compile
      onCompile();
    }
  };

  // Dynamic title dropdown options based on shader state and ownership
  const titleDropdownOptions = useMemo(() => {
    // New shader - show "Save as..."
    if (!isSavedShader) {
      return [
        {
          text: 'Save as...',
          callback: onSaveAs
        }
      ];
    }

    // Saved shader owned by user - show all options
    if (isOwner) {
      return [
        {
          text: 'Save',
          callback: () => onSave()
        },
        {
          text: 'Rename',
          callback: onRename
        },
        {
          text: 'Clone',
          callback: onClone
        },
        {
          text: 'Delete',
          callback: onDelete
        }
      ];
    }

    // Saved shader NOT owned by user - show clone only
    return [
      {
        text: 'Clone',
        callback: onClone
      }
    ];
  }, [isSavedShader, isOwner, onSave, onSaveAs, onRename, onClone, onDelete]);

  // Add tab dropdown options
  const addTabDropdownOptions = [
    { text: 'Buffer A', callback: () => onAddTab('Buffer A') },
    { text: 'Buffer B', callback: () => onAddTab('Buffer B') },
    { text: 'Buffer C', callback: () => onAddTab('Buffer C') },
    { text: 'Buffer D', callback: () => onAddTab('Buffer D') },
    { text: 'Common', callback: () => onAddTab('Common') }
  ];

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
            <span className="text-lg">{localShaderTitle}</span>
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
            onClick={() => window.location.href = '/new'}
          >
            <span className="text-lg">New+</span>
          </Button>

          {isSignedIn && username ? (
            // Show user menu when signed in
            <Dropdown
              options={[
                {
                  text: `@${username}`,
                  callback: () => { },
                },
                {
                  text: 'My Shaders',
                  callback: () => console.log('Navigate to my shaders'),
                },
                {
                  text: 'Sign Out',
                  callback: () => {
                    onSignOut();
                    console.log('User signed out');
                  },
                },
              ]}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
                style={{ outline: 'none', border: 'none' }}
              >
                <div className="flex items-center gap-2">
                  {userPicture && (
                    <img
                      src={userPicture}
                      alt={username}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-lg">{username}</span>
                </div>
              </Button>
            </Dropdown>
          ) : (
            // Show Sign In button when not signed in
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-gray-400 bg-transparent hover:text-gray-200 hover:bg-transparent focus:outline-none"
              style={{ outline: 'none', border: 'none' }}
              onClick={onSignIn}
            >
              <span className="text-lg">Sign In</span>
            </Button>
          )}
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
              onClick={() => onTabChange(tab.id)}
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
                    handleDeleteTabClick(tab);
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
      <div className="flex-1 bg-gray-900 flex flex-col p-0 overflow-hidden min-h-0">
        <CodeMirrorEditor
          value={activeTab?.code || ''}
          onChange={handleCodeChangeInternal}
          placeholder="// Write your GLSL fragment shader here..."
          errors={activeTab?.errors || []}
          compilationSuccess={compilationSuccess}
          onCompile={handleCompileOrSave}
          onDocumentChange={handleDocumentChange}
        />
      </div>

      {/* Footer */}
      <div className="relative bg-gray-800 border-t border-gray-700 flex items-center px-2 gap-2" style={{ height: '30px' }}>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCompileOrSave}
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
            {activeTab?.code.length || 0} chars
          </Badge>
        </div>
      </div>

      {/* Delete Tab Confirmation Modal */}
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
