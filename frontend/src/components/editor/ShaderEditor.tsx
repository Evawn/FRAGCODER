import { useState, useEffect, useRef } from 'react';
import CodeMirrorEditor from './CodeMirrorEditor';
import { EditorHeader } from './EditorHeader';
import { TabBar } from './TabBar';
import type { Tab } from './TabBar';
import { UniformsPanel } from './UniformsPanel';
import { EditorFooter } from './EditorFooter';

// Re-export Tab for backward compatibility
export type { Tab };

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
  const [showErrorDecorations, setShowErrorDecorations] = useState(true);
  const isSwitchingTabsRef = useRef(false);

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);

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
      {/* Header */}
      <EditorHeader
        localShaderTitle={localShaderTitle}
        isSavedShader={isSavedShader}
        isOwner={isOwner}
        onSave={() => onSave()}
        onSaveAs={onSaveAs}
        onRename={onRename}
        onClone={onClone}
        onDelete={onDelete}
        isSignedIn={isSignedIn}
        username={username}
        userPicture={userPicture}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

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
      <EditorFooter
        compilationSuccess={compilationSuccess}
        compilationTime={compilationTime}
        showErrorDecorations={showErrorDecorations}
        onToggleErrorDecorations={setShowErrorDecorations}
        onCompile={handleCompileOrSave}
        charCount={activeTab?.code.length || 0}
      />
    </div>
  );
}

export default ShaderEditor;
