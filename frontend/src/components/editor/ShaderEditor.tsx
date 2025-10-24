/** Main shader editor component with code editor, tab management, and compilation controls. */
import { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';
import { TabBar } from './TabBar';
import type { Tab } from '../../types';
import { UniformsPanel } from './UniformsPanel';
import { EditorFooter } from './EditorFooter';

// Props interface - display-only component
interface ShaderEditorProps {
  // Display data
  tabs: Tab[];
  activeTabId: string;
  localShaderTitle: string;
  creatorUsername?: string;

  // Compilation state
  compilationSuccess?: boolean;
  compilationTime: number;
  isCompiling: boolean;
  lastCompilationTime: number;

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

// Note: Props are kept for backward compatibility even though some are no longer used in this component
// They are now used in PageHeader instead

function ShaderEditor({
  tabs,
  activeTabId,
  localShaderTitle,
  creatorUsername,
  compilationSuccess,
  compilationTime,
  isCompiling,
  lastCompilationTime,
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
  const [showErrorDecorations, setShowErrorDecorations] = useState(true);
  const isSwitchingTabsRef = useRef(false);
  const [tabSwitchTime, setTabSwitchTime] = useState(Date.now());

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Handle document changes - placeholder for error line tracking
  // Memoized to prevent CodeMirrorEditor extensions from recreating on every render
  const handleDocumentChange = useCallback(() => {
    // Ignore document changes during tab switches
    if (isSwitchingTabsRef.current) {
      return;
    }

    // Note: Error line tracking is now handled in the parent (EditorPage)
    // This is just a placeholder to maintain the interface with CodeMirrorEditor
  }, []); // No dependencies - this function doesn't need to change

  // Handle tab switch - prevent error line tracking during switch and trigger flash
  useEffect(() => {
    // Set flag to ignore document changes during tab switch
    isSwitchingTabsRef.current = true;

    // Update timestamp to trigger flash animation
    setTabSwitchTime(Date.now());

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

  return (
    <div className="h-full flex flex-col">
      {/* Tabs Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onAddTab={onAddTab}
        onDeleteTab={onDeleteTab}
      />

      {/* Shader Uniforms Dropdown */}
      <UniformsPanel />

      {/* Code Editor Area */}
      <div className="flex-1 flex flex-col p-0 overflow-hidden min-h-0 relative">
        {/* Tab switch flash - subtle feedback when switching tabs */}
        <div
          key={`tab-switch-${tabSwitchTime}`}
          className="absolute inset-0 pointer-events-none rounded"
          style={{
            animation: 'tabSwitchFlash 450ms ease-out forwards',
            zIndex: 30
          }}
        />

        {/* Compilation feedback border flash */}
        {compilationSuccess === true && (
          <div
            key={`success-${lastCompilationTime}`}
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'borderFlashSuccess 1000ms ease-out forwards',
              zIndex: 40
            }}
          />
        )}
        {compilationSuccess === false && (
          <div
            key={`fail-${lastCompilationTime}`}
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'borderFlashFail 1000ms ease-out forwards',
              zIndex: 40
            }}
          />
        )}

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
      <EditorFooter
        compilationSuccess={compilationSuccess}
        compilationTime={compilationTime}
        isCompiling={isCompiling}
        lastCompilationTime={lastCompilationTime}
        showErrorDecorations={showErrorDecorations}
        onToggleErrorDecorations={setShowErrorDecorations}
        onCompile={handleCompileOrSave}
        charCount={activeTab?.code.length || 0}
      />
    </div>
  );
}

export default ShaderEditor;
