/**
 * CodeMirror error decorations for displaying compilation errors inline.
 * Uses CodeMirror's built-in position mapping via DecorationSet.map() for automatic line tracking.
 */
import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import type { Text, Range } from '@codemirror/state';
import type { CompilationError } from '../../types';
import { ERROR_WIDGET_BACKGROUND, ERROR_TEXT } from '../../styles/editor_theme';

/**
 * Widget that renders an error message as a full-width red box
 */
class ErrorWidget extends WidgetType {
  private message: string;

  constructor(message: string) {
    super();
    this.message = message;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-error-widget';
    wrap.style.cssText = `
      background-color: ${ERROR_WIDGET_BACKGROUND};
      color: ${ERROR_TEXT};
      font-weight: bold;
      padding: 0px 8px;
      line-height: 1.5;
      font-family: inherit;
      user-select: none;
    `;
    wrap.textContent = this.message;
    return wrap;
  }

  eq(other: ErrorWidget): boolean {
    return this.message === other.message;
  }
}

/**
 * StateEffect to set errors - dispatching this clears existing decorations
 * and rebuilds from the new error list
 */
export const setErrorsEffect = StateEffect.define<CompilationError[]>();

/**
 * Build DecorationSet from compilation errors
 * - General errors (line <= 0) appear at the top of the document
 * - Line-specific errors appear below their associated line
 */
function buildDecorationsFromErrors(errors: CompilationError[], doc: Text): DecorationSet {
  const widgets: Range<Decoration>[] = [];

  // General errors (line <= 0) at the top of document
  const generalErrors = errors.filter(e => e.line <= 0);
  for (const error of generalErrors) {
    const widget = Decoration.widget({
      widget: new ErrorWidget(error.message),
      block: true,
      side: -1 // Before content at position 0
    });
    widgets.push(widget.range(0));
  }

  // Line-specific errors below their lines
  const lineErrors = errors.filter(e => e.line > 0);
  for (const error of lineErrors) {
    try {
      // Validate line exists
      if (error.line > doc.lines) {
        continue;
      }
      const line = doc.line(error.line);
      const widget = Decoration.widget({
        widget: new ErrorWidget(error.message),
        block: true,
        side: 1 // After content (appears below the line)
      });
      widgets.push(widget.range(line.to));
    } catch {
      // Line doesn't exist, skip this error
    }
  }

  // Sort by position (required by CodeMirror)
  widgets.sort((a, b) => a.from - b.from);

  return Decoration.set(widgets);
}

/**
 * StateField that manages error decorations.
 * - On setErrorsEffect: rebuild decorations from new errors
 * - On document change: map positions automatically via DecorationSet.map()
 */
export const errorDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },

  update(decorations, tr) {
    // Check for new errors effect first
    for (const effect of tr.effects) {
      if (effect.is(setErrorsEffect)) {
        return buildDecorationsFromErrors(effect.value, tr.state.doc);
      }
    }

    // Map positions through document changes
    // This handles all line tracking automatically:
    // - Line inserted before error → decoration shifts down
    // - Line deleted before error → decoration shifts up
    // - Error line deleted → decoration removed
    if (tr.docChanged) {
      decorations = decorations.map(tr.changes);
    }

    return decorations;
  },

  provide: f => EditorView.decorations.from(f)
});

/**
 * Theme styles for error widgets
 */
export const errorDecorationTheme = EditorView.theme({
  '.cm-widgetBuffer': {
    display: 'none'
  },
  '.cm-error-widget': {
    display: 'block',
    boxSizing: 'border-box',
    maxWidth: '700px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word'
  }
});

/**
 * Create the error decoration extension bundle
 */
export function createErrorDecorationExtension() {
  return [
    errorDecorations,
    errorDecorationTheme
  ];
}
