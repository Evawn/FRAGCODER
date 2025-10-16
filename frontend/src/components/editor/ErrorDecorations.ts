import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import type { CompilationError } from '../../types';
import type { DecorationSet } from '@codemirror/view';
import { ERROR_WIDGET_BACKGROUND, ERROR_LINE_BACKGROUND, ERROR_TEXT } from '../../styles/editor_theme';

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
      background-color: ${ERROR_WIDGET_BACKGROUND};
      color: ${ERROR_TEXT};
      padding: 0 8px;
      margin: 0;
      border-radius: 2px;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 14px;
      line-height: 1.5;
      white-space: normal;
      word-wrap: break-word;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;

    wrap.textContent = this.error.message;
    return wrap;
  }

  get estimatedHeight() {
    return -1;
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
      // Rebuild decorations whenever errors are updated
      for (let effect of tr.effects) {
        if (effect.is(setErrorsEffect)) {
          console.log('[ErrorDecorations] Rebuilding decorations (DOM manipulation)');
          const errors = effect.value;
          const newDecorations = buildDecorationsFromErrors(errors, tr.state.doc);
          return Decoration.set(newDecorations);
        }
      }

      // No need to track document changes - decorations are rebuilt from parent state
      return decorations;
    } catch (e) {
      console.error('Error updating decorations:', e);
      return Decoration.none;
    }
  },
  provide: f => EditorView.decorations.from(f)
});

export const errorDecorationTheme = EditorView.theme({
  '.cm-error-line': {
    backgroundColor: ERROR_LINE_BACKGROUND
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