import type { Transaction } from '@codemirror/state';
import type { CompilationError } from './GLSLCompiler';

/**
 * Updates error line numbers when document changes occur
 * Returns null for errors whose lines have been deleted
 */
export function updateErrorLines(
  errors: CompilationError[],
  tr: Transaction
): CompilationError[] {
  if (!tr.docChanged || errors.length === 0) {
    return errors;
  }

  const updatedErrors = errors.map(error => {
    if (error.line <= 0) return error; // General errors don't need line tracking

    try {
      // Get the position at the start of the error line in the old document
      const originalLine = tr.startState.doc.line(error.line);

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

      // Map the line start position to the new document
      const mappedPos = tr.changes.mapPos(originalLine.from);

      // Check if the position is valid
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
  }).filter((error): error is CompilationError => error !== null);

  return updatedErrors;
}
