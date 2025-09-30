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

        try {
          // Get the position at the start of the error line
          const originalLine = tr.startState.doc.line(error.line);
          const lineLength = originalLine.to - originalLine.from;

          // Check if the entire line was deleted
          let lineWasDeleted = false;
          tr.changes.iterChanges((fromA, toA) => {
            // If the change spans the entire line (or more), the line was deleted
            if (fromA <= originalLine.from && toA >= originalLine.to) {
              lineWasDeleted = true;
            }
          });

          if (lineWasDeleted) {
            return null; // Hide the error
          }

          const mappedPos = tr.changes.mapPos(originalLine.from);

          // Check if the line was deleted
          if (mappedPos < 0 || mappedPos > tr.state.doc.length) {
            return null;
          }

          // Get the new line number
          const newLine = tr.state.doc.lineAt(mappedPos).number;

          return {
            ...error,
            line: newLine
          };
        } catch (e) {
          // Line doesn't exist anymore
          return null;
        }
      }).filter(error => error !== null);

      return updatedErrors;
    }
    
    return errors;
  }
});

// Helper function to build decorations from errors with error boundary
function buildDecorationsFromErrors(errors: CompilationError[], doc: any): any[] {
  try {
    const decorations: any[] = [];
    const generalErrors: CompilationError[] = [];

    errors.forEach(error => {
      if (error.line > 0) {
        try {
          const line = doc.line(error.line);
          
          // Validate line exists and has valid range
          if (line && line.from < line.to) {
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
          } else {
            generalErrors.push(error);
          }
        } catch (e) {
          // Line doesn't exist, treat as general error
          generalErrors.push(error);
        }
      } else {
        generalErrors.push(error);
      }
    });

    if (generalErrors.length > 0) {
      try {
        const lastLine = doc.length;
        generalErrors.forEach(error => {
          const widget = Decoration.widget({
            widget: new ErrorWidget(error),
            side: 1,
            block: true
          });
          decorations.push(widget.range(lastLine));
        });
      } catch (e) {
        // Silently fail if we can't add general errors
        console.warn('Failed to add general error decorations:', e);
      }
    }

    // Sort decorations by position to satisfy CodeMirror's requirements
    decorations.sort((a, b) => a.from - b.from);
    return decorations;
  } catch (e) {
    console.error('Error building decorations:', e);
    return []; // Return empty array on failure
  }
}

export const errorDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    try {
      // Check if errors were explicitly updated
      for (let effect of tr.effects) {
        if (effect.is(setErrorsEffect)) {
          const errors = effect.value;
          const newDecorations = buildDecorationsFromErrors(errors, tr.state.doc);
          return Decoration.set(newDecorations);
        }
      }

      // Only rebuild on document changes if we have existing errors
      if (tr.docChanged) {
        const errors = tr.state.field(errorState);
        
        // Skip rebuild if no errors
        if (errors.length === 0) {
          return Decoration.none;
        }
        
        // Only rebuild if the document change might affect error positions
        let hasRelevantChange = false;
        try {
          tr.changes.desc.iterChanges((fromA, toA, fromB, toB) => {
            // Check if any error line is affected by this change
            hasRelevantChange = errors.some(error => {
              if (error.line <= 0) return false;
              try {
                const lineStart = tr.startState.doc.line(error.line).from;
                const lineEnd = tr.startState.doc.line(error.line).to;
                // Check if change overlaps with error line
                return fromA <= lineEnd && toA >= lineStart;
              } catch (e) {
                return true; // Line doesn't exist, need rebuild
              }
            });
            return !hasRelevantChange; // Continue iteration if no relevant change yet
          });
        } catch (e) {
          hasRelevantChange = true; // On error, rebuild to be safe
        }
        
        if (hasRelevantChange) {
          const newDecorations = buildDecorationsFromErrors(errors, tr.state.doc);
          return Decoration.set(newDecorations);
        }
      }

      // Map existing decorations through the change
      return decorations.map(tr.changes);
    } catch (e) {
      console.error('Error updating decorations:', e);
      return Decoration.none; // Clear decorations on error
    }
  },
  provide: f => EditorView.decorations.from(f)
});

export const errorDecorationTheme = EditorView.theme({
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
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