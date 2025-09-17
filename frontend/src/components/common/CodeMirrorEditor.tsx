import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { indentOnInput, bracketMatching, foldGutter, codeFolding } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { indentMore } from '@codemirror/commands';
import { glsl } from './GLSLLanguage';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  placeholder = "// Write your GLSL fragment shader here...",
  readOnly = false
}) => {
  const extensions = [
    glsl(),
    lineNumbers(),
    highlightActiveLineGutter(),
    indentOnInput(),
    bracketMatching(),
    codeFolding(),
    foldGutter(),
    keymap.of([
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
      }
    ]),
    EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
      },
      '.cm-content': {
        padding: '16px',
        minHeight: '100%'
      },
      '.cm-focused': {
        outline: 'none'
      },
      '.cm-editor': {
        height: '100%'
      },
      '.cm-scroller': {
        height: '100%'
      }
    }),
    EditorView.lineWrapping
  ];

  return (
    <div className="h-full">
      <CodeMirror
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
          searchKeymap: true
        }}
        style={{
          height: '100%'
        }}
      />
    </div>
  );
};

export default CodeMirrorEditor;