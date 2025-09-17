import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import type { CompilationError } from '../../utils/GLSLCompiler';
import type { DecorationSet } from '@codemirror/view';

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
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;

    wrap.textContent = this.error.message;
    return wrap;
  }

  get estimatedHeight() {
    return 20;
  }
}

export const setErrorsEffect = StateEffect.define<CompilationError[]>();

export const errorState = StateField.define<CompilationError[]>({
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
          const originalLineEnd = tr.startState.doc.line(error.line).to;
          
          // Map both start and end of the original line
          const newPosStart = tr.changes.mapPos(originalPos, -1);
          const newPosEnd = tr.changes.mapPos(originalLineEnd, 1);
          
          // If the entire line was deleted, the mapped positions will be the same
          // or the start position will be invalid
          if (newPosStart < 0 || newPosStart >= newPosEnd) {
            return null; // Line was deleted, remove error
          }
          
          const newLine = tr.state.doc.lineAt(newPosStart).number;
          
          // Verify the line still exists and has content
          const lineInfo = tr.state.doc.line(newLine);
          if (lineInfo.from >= lineInfo.to && newLine > 1) {
            // Empty line, but check if it's just whitespace that was cleared
            return null;
          }
          
          return {
            ...error,
            line: newLine
          };
        } catch (e) {
          // If line mapping fails (e.g., line was deleted), remove the error
          return null;
        }
      }).filter(error => error !== null); // Remove null entries
      
      return updatedErrors;
    }
    
    return errors;
  }
});

export const errorDecorations = StateField.define<DecorationSet>({
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

export const errorDecorationTheme = EditorView.theme({
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeft: '3px solid #ef4444'
  },
  '.cm-error-annotation': {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box'
  }
});

export function createErrorDecorationExtensions() {
  return [
    errorState,
    errorDecorations,
    errorDecorationTheme
  ];
}