/**
 * CodeMirror-based GLSL editor with syntax highlighting, error decorations, and custom keybindings
 * Features minimap, code folding, autocomplete, and Shift+Enter to compile
 */
import React, { useMemo, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { indentOnInput, bracketMatching, foldGutter, codeFolding, indentUnit } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { acceptCompletion, completionStatus, closeCompletion } from '@codemirror/autocomplete';
import { indentMore, insertNewlineAndIndent, selectAll, cursorDocStart, cursorDocEnd, cursorLineStart, cursorLineEnd, deleteCharBackward, deleteCharForward } from '@codemirror/commands';
import type { Transaction, Extension } from '@codemirror/state';
import { showMinimap } from '@replit/codemirror-minimap';
import { glsl } from '../../utils/GLSLLanguage';
import type { CompilationError } from '../../types';
import { createErrorDecorationExtensions, setErrorsEffect } from './ErrorDecorations';
import {
  BACKGROUND_EDITOR,
  BACKGROUND_GUTTER,
  AUTOCOMPLETE_BACKGROUND,
  AUTOCOMPLETE_SELECTED_BACKGROUND,
  AUTOCOMPLETE_BORDER,
  AUTOCOMPLETE_LABEL_TEXT,
  AUTOCOMPLETE_LABEL_SELECTED_TEXT,
  AUTOCOMPLETE_DETAIL_TEXT,
  AUTOCOMPLETE_DETAIL_SELECTED_TEXT,
  AUTOCOMPLETE_INFO_TEXT,
  AUTOCOMPLETE_MATCH_TEXT
} from '../../styles/editor_theme';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  errors?: CompilationError[];
  compilationSuccess?: boolean;
  onCompile?: () => void;
  onDocumentChange?: (tr: Transaction) => void;
}


const CodeMirrorEditorComponent: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  placeholder = "// Write your GLSL fragment shader here...",
  readOnly = false,
  errors = [],
  compilationSuccess,
  onCompile,
  onDocumentChange
}) => {
  // Use a ref to always capture the latest onCompile callback
  // This prevents stale closures in the keymap which is memoized
  const onCompileRef = React.useRef(onCompile);

  // Update ref whenever onCompile changes
  React.useEffect(() => {
    onCompileRef.current = onCompile;
  }, [onCompile]);

  const extensions = useMemo(() => {
    // Custom fold marker using Lucide chevron icons
    const createFoldMarker = (open: boolean): HTMLElement => {
      const marker = document.createElement('span');
      marker.style.cursor = 'pointer';
      marker.style.display = 'inline-flex';
      marker.style.alignItems = 'center';
      marker.style.justifyContent = 'center';
      marker.style.width = '16px';
      marker.style.height = '16px';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.style.opacity = '0.6';
      svg.style.transition = 'opacity 0.2s';

      // Chevron paths: ChevronDown when open (foldable), ChevronRight when closed (folded)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      if (open) {
        // ChevronDown path
        path.setAttribute('d', 'M6 9l6 6 6-6');
      } else {
        // ChevronRight path
        path.setAttribute('d', 'M9 18l6-6-6-6');
      }

      svg.appendChild(path);
      marker.appendChild(svg);

      // Hover effect
      marker.addEventListener('mouseenter', () => {
        svg.style.opacity = '1';
      });
      marker.addEventListener('mouseleave', () => {
        svg.style.opacity = '0.6';
      });

      return marker;
    };

    const baseExtensions: Extension[] = [
      keymap.of([
        {
          key: 'Shift-Enter',
          preventDefault: true,
          run: (view) => {
            // Close completion tooltip if active
            if (completionStatus(view.state) === "active") {
              closeCompletion(view);
            }
            onCompileRef.current?.();
            return true;
          }
        },
        {
          key: 'Ctrl-s',
          preventDefault: true,
          run: () => {
            onCompileRef.current?.();
            return true;
          }
        },
        {
          key: 'Tab',
          preventDefault: true,
          run: (view) => {
            if (completionStatus(view.state) === "active") {
              return acceptCompletion(view);
            } else {
              return indentMore(view);
            }
          }
        },
        // Essential editor commands since we disabled defaultKeymap
        { key: 'Enter', run: insertNewlineAndIndent },
        { key: 'Ctrl-a', run: selectAll },
        { key: 'Ctrl-Home', run: cursorDocStart },
        { key: 'Ctrl-End', run: cursorDocEnd },
        { key: 'Home', run: cursorLineStart },
        { key: 'End', run: cursorLineEnd },
        { key: 'Backspace', run: deleteCharBackward },
        { key: 'Delete', run: deleteCharForward }
      ]),
      glsl(),
      lineNumbers(),
      //highlightActiveLineGutter(),
      indentOnInput(),
      bracketMatching(),
      codeFolding(),
      foldGutter({
        markerDOM: createFoldMarker
      }),
      indentUnit.of("    "), // 4 spaces
      ...createErrorDecorationExtensions(),
      showMinimap.compute(['doc'], (state) => {
        return {
          create: (view: EditorView) => {
            const dom = document.createElement('div');
            return { dom };
          },
          displayText: 'blocks',
          showOverlay: 'always'
        };
      }),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          height: '100%',
          maxHeight: '100%',
          paddingY: '0px',
          backgroundColor: 'transparent'

        },
        '.cm-content': {
          paddingX: '16px',
          paddingY: '0px',
          minHeight: 'auto',
          backgroundColor: 'transparent'

        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-editor': {
          height: '100%',
          maxHeight: '100%',
          backgroundColor: 'transparent'
        },
        '.cm-scroller': {
          height: '100%',
          maxHeight: '100%',
          overflow: 'auto',
          backgroundColor: BACKGROUND_EDITOR,
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome, Safari, Edge
          }
        },
        '.cm-gutter': {
          backgroundColor: BACKGROUND_GUTTER,
        },
        '.cm-gutterElement': {

        },
        '.cm-foldGutter': {
          minWidth: '20px',
          paddingLeft: '2px',
        },
        '.cm-foldPlaceholder': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '3px',
          color: 'rgba(255, 255, 255, 0.6)',
          padding: '0 4px',
          margin: '0 2px',
          fontSize: '0.85em',
        },
        '.cm-activeLine': {
          backgroundColor: '#FFFFFF06',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#FFFFFF06',
          color: 'white'
        },
        '.cm-selectionBackground': {

        },
        '.cm-line': {
          fontWeight: '100',
        },
        // Minimap styling
        '.cm-minimap-gutter': {
          backgroundColor: BACKGROUND_GUTTER,
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.cm-minimap-inner': {
          backgroundColor: 'transparent',
          '& canvas': {
            filter: 'brightness(0.8)',
          }
        },
        '.cm-minimap-overlay': {
          background: 'rgba(200, 200, 200, 0.3)',
          '&:hover': {
            background: 'rgba(220, 220, 220, 0.4)',
          }
        },
        '.cm-minimap-box-shadow': {
          boxShadow: '-8px 0px 12px 3px rgba(0, 0, 0, 0.4)',
        },
        // Autocomplete tooltip styling
        '.cm-tooltip-autocomplete': {
          backgroundColor: AUTOCOMPLETE_BACKGROUND,
          border: `1px solid ${AUTOCOMPLETE_BORDER}`,
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          padding: '4px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        },
        '.cm-tooltip-autocomplete ul': {
          listStyle: 'none',
          margin: '0',
          padding: '0',
          colorScheme: 'dark',
        },
        '.cm-tooltip-autocomplete ul li': {
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected]': {
          backgroundColor: AUTOCOMPLETE_SELECTED_BACKGROUND,
        },
        '.cm-completionLabel': {
          color: AUTOCOMPLETE_LABEL_TEXT,
          fontWeight: '400',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionLabel': {
          color: AUTOCOMPLETE_LABEL_SELECTED_TEXT,
          fontWeight: '500',
        },
        '.cm-completionDetail': {
          color: AUTOCOMPLETE_DETAIL_TEXT,
          fontSize: '0.9em',
          fontStyle: 'italic',
          marginLeft: 'auto',
        },
        '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionDetail': {
          color: AUTOCOMPLETE_DETAIL_SELECTED_TEXT,
        },
        '.cm-completionInfo': {
          backgroundColor: AUTOCOMPLETE_BACKGROUND,
          border: `1px solid ${AUTOCOMPLETE_BORDER}`,
          borderRadius: '6px',
          padding: '8px',
          color: AUTOCOMPLETE_INFO_TEXT,
          maxWidth: '400px',
        },
        '.cm-completionMatchedText': {
          color: AUTOCOMPLETE_MATCH_TEXT,
          fontWeight: '600',
          textDecoration: 'none',
        },
      }, { dark: true }),
      oneDark,
      EditorView.lineWrapping
    ];

    // Add document change listener if callback is provided
    if (onDocumentChange) {
      baseExtensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged && update.transactions.length > 0) {
            onDocumentChange(update.transactions[0]);
          }
        })
      );
    }

    return baseExtensions;
  }, [onDocumentChange]); // onCompile removed - it's used in keymap but doesn't need to trigger recreation

  const editorRef = React.useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Track when editor is ready
  React.useEffect(() => {
    const checkEditorReady = () => {
      if (editorRef.current?.view) {
        setIsEditorReady(true);
      }
    };

    // Check immediately and after a short delay
    checkEditorReady();
    const timer = setTimeout(checkEditorReady, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update error decorations when errors change or when switching tabs
  useEffect(() => {
    if (isEditorReady && editorRef.current?.view) {
      editorRef.current.view.dispatch({
        effects: setErrorsEffect.of(errors)
      });
    }
  }, [errors, isEditorReady]); // Removed value dependency to prevent rebuilding on every keystroke

  const getBorderColor = () => {
    if (compilationSuccess === undefined) return 'border-gray-600';
    return compilationSuccess ? 'border-green-500' : 'border-red-500';
  };

  return (
    <div className={`border-1 h-full rounded transition-colors duration-200 ${getBorderColor()}`}>
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        extensions={extensions}
        indentWithTab={false}
        basicSetup={{
          lineNumbers: false, // We're adding this manually above
          foldGutter: false,  // We're adding this manually above
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false, // We're adding this manually above
          bracketMatching: false, // We're adding this manually above
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
          searchKeymap: false, // Disable default search keymap to avoid conflicts
          defaultKeymap: false // Disable default keymap to avoid Enter conflicts
        }}
        style={{
          height: '100%',
          maxHeight: '100%',
          padding: '0px'
        }}
      />
    </div>
  );
};

// Memoize component to prevent re-renders when only callback references change
// This is critical for performance during shader playback (uTime/fps updates)
const CodeMirrorEditor = React.memo(CodeMirrorEditorComponent, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  return (
    prevProps.value === nextProps.value &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.errors === nextProps.errors &&
    prevProps.compilationSuccess === nextProps.compilationSuccess &&
    prevProps.onDocumentChange === nextProps.onDocumentChange
    // Note: onChange and onCompile are deliberately excluded
    // They may change reference but don't need to trigger re-render
    // The extensions capture them via closure
  );
});

export default CodeMirrorEditor;