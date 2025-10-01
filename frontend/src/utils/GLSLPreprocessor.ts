/**
 * GLSL Preprocessor
 * Handles macro expansion, #define directives, and conditional compilation
 */

export interface PreprocessorResult {
  code: string;
  lineMapping: Map<number, number>; // preprocessed line -> original line
  errors: PreprocessorError[];
}

export interface PreprocessorError {
  line: number;
  message: string;
}

interface Macro {
  name: string;
  params?: string[]; // undefined for constant macros, array for function-like macros
  value: string;
  line: number; // line where macro was defined
}

interface ConditionalState {
  isActive: boolean; // whether we're currently including code
  hasMatched: boolean; // whether any branch has been taken
  line: number; // line where conditional started
}

/**
 * Main preprocessor function
 */
export function preprocessGLSL(source: string): PreprocessorResult {
  const lines = source.split('\n');
  const output: string[] = [];
  const lineMapping = new Map<number, number>();
  const errors: PreprocessorError[] = [];
  const macros = new Map<string, Macro>();

  // Stack for nested conditionals
  const conditionalStack: ConditionalState[] = [];

  // Helper to check if we should include the current line
  const shouldInclude = (): boolean => {
    if (conditionalStack.length === 0) return true;
    return conditionalStack.every(state => state.isActive);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalLineNum = i + 1;
    const trimmed = line.trim();

    // Track output line number for error mapping
    const outputLineNum = output.length + 1;

    // Handle preprocessor directives
    if (trimmed.startsWith('#')) {
      const directive = trimmed.substring(1).trim();

      // #define directive
      if (directive.startsWith('define ')) {
        if (shouldInclude()) {
          const defineContent = directive.substring(7).trim();
          const parsedMacro = parseDefine(defineContent, originalLineNum);

          if (parsedMacro) {
            macros.set(parsedMacro.name, parsedMacro);
          } else {
            errors.push({
              line: originalLineNum,
              message: `Invalid #define syntax: ${defineContent}`
            });
          }
        }
        // Replace directive with blank line to preserve line numbers
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #undef directive
      if (directive.startsWith('undef ')) {
        if (shouldInclude()) {
          const macroName = directive.substring(6).trim();
          macros.delete(macroName);
        }
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #ifdef directive
      if (directive.startsWith('ifdef ')) {
        const macroName = directive.substring(6).trim();
        const isDefined = macros.has(macroName);
        conditionalStack.push({
          isActive: shouldInclude() && isDefined,
          hasMatched: isDefined,
          line: originalLineNum
        });
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #ifndef directive
      if (directive.startsWith('ifndef ')) {
        const macroName = directive.substring(7).trim();
        const isNotDefined = !macros.has(macroName);
        conditionalStack.push({
          isActive: shouldInclude() && isNotDefined,
          hasMatched: isNotDefined,
          line: originalLineNum
        });
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #else directive
      if (directive === 'else') {
        if (conditionalStack.length === 0) {
          errors.push({
            line: originalLineNum,
            message: '#else without matching #ifdef or #ifndef'
          });
        } else {
          const current = conditionalStack[conditionalStack.length - 1];
          // Parent conditionals must be active, and this branch hasn't matched yet
          const parentActive = conditionalStack.slice(0, -1).every(state => state.isActive);
          current.isActive = parentActive && !current.hasMatched;
          current.hasMatched = true;
        }
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #endif directive
      if (directive === 'endif') {
        if (conditionalStack.length === 0) {
          errors.push({
            line: originalLineNum,
            message: '#endif without matching #ifdef or #ifndef'
          });
        } else {
          conditionalStack.pop();
        }
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // Unknown directive - pass through (could be GLSL #version or #extension)
      if (shouldInclude()) {
        output.push(line);
        lineMapping.set(outputLineNum, originalLineNum);
      } else {
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
      }
      continue;
    }

    // Regular line - process macro expansion if in active conditional
    if (shouldInclude()) {
      const expandedLine = expandMacros(line, macros, originalLineNum, errors);
      output.push(expandedLine);
      lineMapping.set(outputLineNum, originalLineNum);
    } else {
      // Not in active conditional - replace with blank line
      output.push('');
      lineMapping.set(outputLineNum, originalLineNum);
    }
  }

  // Check for unclosed conditionals
  if (conditionalStack.length > 0) {
    conditionalStack.forEach(state => {
      errors.push({
        line: state.line,
        message: 'Unclosed conditional directive (missing #endif)'
      });
    });
  }

  return {
    code: output.join('\n'),
    lineMapping,
    errors
  };
}

/**
 * Parse a #define directive
 * Supports both constant and function-like macros:
 * - #define PI 3.14159
 * - #define MAX(a, b) ((a) > (b) ? (a) : (b))
 */
function parseDefine(defineContent: string, line: number): Macro | null {
  // Match function-like macro: NAME(params) value
  const funcMacroMatch = defineContent.match(/^(\w+)\s*\(([^)]*)\)\s+(.*)$/);
  if (funcMacroMatch) {
    const name = funcMacroMatch[1];
    const paramsStr = funcMacroMatch[2].trim();
    const value = funcMacroMatch[3].trim();
    const params = paramsStr
      ? paramsStr.split(',').map(p => p.trim()).filter(p => p)
      : [];

    return { name, params, value, line };
  }

  // Match constant macro: NAME value
  const constMacroMatch = defineContent.match(/^(\w+)\s+(.*)$/);
  if (constMacroMatch) {
    const name = constMacroMatch[1];
    const value = constMacroMatch[2].trim();
    return { name, params: undefined, value, line };
  }

  // Match flag macro: NAME (no value)
  const flagMacroMatch = defineContent.match(/^(\w+)$/);
  if (flagMacroMatch) {
    const name = flagMacroMatch[1];
    return { name, params: undefined, value: '1', line };
  }

  return null;
}

/**
 * Expand macros in a line of code
 */
function expandMacros(
  line: string,
  macros: Map<string, Macro>,
  lineNum: number,
  errors: PreprocessorError[]
): string {
  let result = line;
  let maxIterations = 100; // Prevent infinite recursion
  let iteration = 0;
  let changed = true;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Sort macros by name length (longest first) to avoid partial replacements
    const sortedMacros = Array.from(macros.values()).sort((a, b) => b.name.length - a.name.length);

    for (const macro of sortedMacros) {
      if (macro.params === undefined) {
        // Constant macro - simple text replacement with word boundaries
        const regex = new RegExp(`\\b${escapeRegex(macro.name)}\\b`, 'g');
        const newResult = result.replace(regex, macro.value);
        if (newResult !== result) {
          result = newResult;
          changed = true;
        }
      } else {
        // Function-like macro - find invocations and replace with expanded value
        const regex = new RegExp(`\\b${escapeRegex(macro.name)}\\s*\\(`, 'g');
        let match;

        while ((match = regex.exec(result)) !== null) {
          const startIdx = match.index;
          const argsStartIdx = match.index + match[0].length;

          // Find matching closing parenthesis
          const args = extractFunctionArgs(result, argsStartIdx);
          if (args === null) {
            errors.push({
              line: lineNum,
              message: `Unmatched parentheses in macro invocation: ${macro.name}`
            });
            break;
          }

          // Check argument count
          if (args.length !== macro.params.length) {
            errors.push({
              line: lineNum,
              message: `Macro ${macro.name} expects ${macro.params.length} arguments, got ${args.length}`
            });
            break;
          }

          // Replace parameters with arguments in macro value
          let expanded = macro.value;
          for (let i = 0; i < macro.params.length; i++) {
            const paramRegex = new RegExp(`\\b${escapeRegex(macro.params[i])}\\b`, 'g');
            expanded = expanded.replace(paramRegex, args[i]);
          }

          // Replace macro invocation with expanded value
          const invocationEnd = argsStartIdx + args.totalLength;
          result = result.substring(0, startIdx) + expanded + result.substring(invocationEnd);
          changed = true;

          // Reset regex since string changed
          break;
        }
      }
    }
  }

  if (iteration >= maxIterations) {
    errors.push({
      line: lineNum,
      message: 'Macro expansion exceeded maximum recursion depth (possible circular definition)'
    });
  }

  return result;
}

/**
 * Extract function arguments from a string starting after the opening parenthesis
 * Returns array of argument strings and total length consumed, or null if invalid
 */
function extractFunctionArgs(
  str: string,
  startIdx: number
): { length: number; totalLength: number } & string[] | null {
  const args: string[] = [];
  let currentArg = '';
  let depth = 1; // Start at 1 because we're already inside the opening paren
  let i = startIdx;

  while (i < str.length && depth > 0) {
    const char = str[i];

    if (char === '(') {
      depth++;
      currentArg += char;
    } else if (char === ')') {
      depth--;
      if (depth === 0) {
        // End of arguments
        if (currentArg.trim() || args.length > 0) {
          args.push(currentArg.trim());
        }
        break;
      }
      currentArg += char;
    } else if (char === ',' && depth === 1) {
      // Argument separator at top level
      args.push(currentArg.trim());
      currentArg = '';
    } else {
      currentArg += char;
    }

    i++;
  }

  if (depth !== 0) {
    return null; // Unmatched parentheses
  }

  // Filter out empty arguments (unless it's a single empty arg for zero-param function)
  const filteredArgs = args.filter(arg => arg.length > 0);

  return Object.assign(filteredArgs, {
    length: filteredArgs.length,
    totalLength: i - startIdx + 1 // +1 to include closing paren
  });
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract macro definitions from code for autocomplete
 */
export function extractMacroNames(code: string): string[] {
  const macros: string[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#define ')) {
      const defineContent = trimmed.substring(8).trim();
      const match = defineContent.match(/^(\w+)/);
      if (match) {
        macros.push(match[1]);
      }
    }
  }

  return macros;
}
