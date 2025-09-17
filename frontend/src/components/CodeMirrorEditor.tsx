import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, Decoration, WidgetType } from '@codemirror/view';
import { indentOnInput, bracketMatching, foldGutter, codeFolding, indentUnit } from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { indentMore } from '@codemirror/commands';
import { StateField, StateEffect } from '@codemirror/state';
import { glsl } from '../utils/GLSLLanguage';
import type { CompilationError } from '../utils/GLSLCompiler';
import type { DecorationSet } from '@codemirror/view';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  errors?: CompilationError[];
  compilationSuccess?: boolean;
}

class ErrorWidget extends WidgetType {
  private error: CompilationError;
  
  constructor(error: CompilationError) {
    super();
    this.error = error;
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-error-annotation';
    wrap.style.cssText = `
      background-color: #dc2626;
      color: white;
      padding: 2px 8px;
      margin: 0;
      border-radius: 2px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 14px;
      line-height: 1.2;
      border-left: 3px solid #991b1b;
      height: 20px;
      display: flex;
      align-items: center;
    `;

    wrap.textContent = this.error.message;
    return wrap;
  }

  get estimatedHeight() {
    return 20;
  }
}

const setErrorsEffect = StateEffect.define<CompilationError[]>();

const errorState = StateField.define<CompilationError[]>({
  create() {
    return [];
  },
  update(errors, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setErrorsEffect)) {
        return effect.value;
      }
    }
    
    // Update error line numbers when document changes occur
    if (tr.docChanged && errors.length > 0) {
      const updatedErrors = errors.map(error => {
        if (error.line <= 0) return error; // General errors don't need line tracking
        
        // Map the error line number through document changes
        try {
          const originalPos = tr.startState.doc.line(error.line).from;
          const newPos = tr.changes.mapPos(originalPos, -1); // Use -1 to favor staying before insertions
          const newLine = tr.state.doc.lineAt(newPos).number;
          
          return {
            ...error,
            line: newLine
          };
        } catch (e) {
          // If line mapping fails (e.g., line was deleted), mark as general error
          return {
            ...error,
            line: 0
          };
        }
      });
      
      return updatedErrors;
    }
    
    return errors;
  }
});

const errorDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Don't map decorations - rebuild them from current error state
    // This prevents annotations from moving when lines are inserted/deleted

    for (let effect of tr.effects) {
      if (effect.is(setErrorsEffect)) {
        const errors = effect.value;
        const decorations: any[] = [];
        const generalErrors: CompilationError[] = [];

        errors.forEach(error => {
          if (error.line > 0) {
            try {
              const line = tr.state.doc.line(error.line);
              
              // Add line decoration first (it has no side, defaults to 0)
              const lineDeco = Decoration.line({
                class: 'cm-error-line'
              });
              decorations.push(lineDeco.range(line.from));

              // Add widget decoration after (with side: 1)
              const widget = Decoration.widget({
                widget: new ErrorWidget(error),
                side: 1, // Place after the line content
                block: true
              });
              decorations.push(widget.range(line.to));
            } catch (e) {
              generalErrors.push(error);
            }
          } else {
            generalErrors.push(error);
          }
        });

        if (generalErrors.length > 0) {
          const lastLine = tr.state.doc.length;
          generalErrors.forEach(error => {
            const widget = Decoration.widget({
              widget: new ErrorWidget(error),
              side: 1,
              block: true
            });
            decorations.push(widget.range(lastLine));
          });
        }

        // Sort decorations by position to satisfy CodeMirror's requirements
        // Line decorations (at line.from) will naturally come before widget decorations (at line.to)
        decorations.sort((a, b) => a.from - b.from);
        return Decoration.set(decorations);
      }
    }

    // Rebuild decorations from current error state on any document change
    if (tr.docChanged) {
      const errors = tr.state.field(errorState);
      const decorations: any[] = [];
      const generalErrors: CompilationError[] = [];

      errors.forEach(error => {
        if (error.line > 0) {
          try {
            const line = tr.state.doc.line(error.line);
            
            // Add line decoration first (it has no side, defaults to 0)
            const lineDeco = Decoration.line({
              class: 'cm-error-line'
            });
            decorations.push(lineDeco.range(line.from));

            // Add widget decoration after (with side: 1)
            const widget = Decoration.widget({
              widget: new ErrorWidget(error),
              side: 1,
              block: true
            });
            decorations.push(widget.range(line.to));
          } catch (e) {
            generalErrors.push(error);
          }
        } else {
          generalErrors.push(error);
        }
      });

      if (generalErrors.length > 0) {
        const lastLine = tr.state.doc.length;
        generalErrors.forEach(error => {
          const widget = Decoration.widget({
            widget: new ErrorWidget(error),
            side: 1,
            block: true
          });
          decorations.push(widget.range(lastLine));
        });
      }

      decorations.sort((a, b) => a.from - b.from);
      return Decoration.set(decorations);
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  placeholder = "// Write your GLSL fragment shader here...",
  readOnly = false,
  errors = [],
  compilationSuccess
}) => {
  const extensions = useMemo(() => [
    glsl(),
    lineNumbers(),
    highlightActiveLineGutter(),
    indentOnInput(),
    bracketMatching(),
    codeFolding(),
    foldGutter(),
    indentUnit.of("    "), // 4 spaces
    errorState,
    errorDecorations,
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
      },
      '.cm-error-line': {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderLeft: '3px solid #ef4444'
      },
      '.cm-error-annotation': {
        display: 'block',
        width: '100%',
        boxSizing: 'border-box'
      }
    }),
    EditorView.lineWrapping
  ], []);

  const editorRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.view) {
      editorRef.current.view.dispatch({
        effects: setErrorsEffect.of(errors)
      });
    }
  }, [errors]);

  const getBorderColor = () => {
    if (compilationSuccess === undefined) return 'border-gray-600';
    return compilationSuccess ? 'border-green-500' : 'border-red-500';
  };

  return (
    <div className={`h-full border-2 rounded transition-colors duration-200 ${getBorderColor()}`}>
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