import React, { useMemo, useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { indentOnInput, bracketMatching, foldGutter, codeFolding, indentUnit } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { acceptCompletion, completionStatus, closeCompletion } from '@codemirror/autocomplete';
import { indentMore, insertNewlineAndIndent, selectAll, cursorDocStart, cursorDocEnd, cursorLineStart, cursorLineEnd, deleteCharBackward, deleteCharForward } from '@codemirror/commands';
import type { Transaction, Extension } from '@codemirror/state';
import { glsl } from '../../utils/GLSLLanguage';
import type { CompilationError } from '../../utils/GLSLCompiler';
import { createErrorDecorationExtensions, setErrorsEffect } from './ErrorDecorations';

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


const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  placeholder = "// Write your GLSL fragment shader here...",
  readOnly = false,
  errors = [],
  compilationSuccess,
  onCompile,
  onDocumentChange
}) => {
  const extensions = useMemo(() => {
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
            onCompile?.();
            return true;
          }
        },
        {
          key: 'Ctrl-s',
          preventDefault: true,
          run: () => {
            onCompile?.();
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
      highlightActiveLineGutter(),
      indentOnInput(),
      bracketMatching(),
      codeFolding(),
      foldGutter(),
      indentUnit.of("    "), // 4 spaces
      ...createErrorDecorationExtensions(),
      EditorView.theme({
        '&': {
          fontSize: '14px',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          height: '60vh',
          maxHeight: '60vh'
        },
        '.cm-content': {
          padding: '16px',
          minHeight: 'auto'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-editor': {
          height: '100%',
          maxHeight: '100%'
        },
        '.cm-scroller': {
          height: '100%',
          maxHeight: '100%',
          overflow: 'auto'
        },
      }),
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
  }, [onCompile, onDocumentChange]);

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
  }, [errors, isEditorReady, value]); // Include value to ensure rebuild on tab switch

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
        theme={oneDark}
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

export default CodeMirrorEditor;