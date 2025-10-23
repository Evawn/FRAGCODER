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

// ============ PHASE 1: LINE SPLICING ============

/**
 * Phase 1: Line splicing (backslash-newline continuation)
 * Joins lines ending with \ before any other preprocessing
 * This is done at the character level to preserve line structure for mapping
 * Example: "vec3 color = \" -> "vec3 color = vec3(1.0, 0.0, 0.0);"
 *          "  vec3(1.0, 0.0, 0.0);"
 */
function performLineSplicing(source: string): { code: string; lineMapping: Map<number, number> } {
  const lines = source.split('\n');
  const resultLines: string[] = [];
  const lineMapping = new Map<number, number>(); // output line -> original line

  let i = 0;
  while (i < lines.length) {
    let currentLine = lines[i];
    const originalLineNum = i + 1;

    // Check if line ends with backslash (line continuation)
    while (currentLine.trimEnd().endsWith('\\') && i + 1 < lines.length) {
      // Remove trailing backslash and whitespace
      currentLine = currentLine.trimEnd().slice(0, -1);
      i++;
      // Append next line (preserving leading whitespace for proper tokenization)
      currentLine = currentLine + lines[i];
    }

    resultLines.push(currentLine);
    lineMapping.set(resultLines.length, originalLineNum);
    i++;
  }

  return {
    code: resultLines.join('\n'),
    lineMapping
  };
}

// ============ MAIN PREPROCESSOR ============

/**
 * Main preprocessor function
 * Processes GLSL code in three phases:
 * 1. Line splicing (backslash continuation)
 * 2. Directive processing (#define, #ifdef, etc.)
 * 3. Macro expansion (replace macro invocations with their definitions)
 */
export function preprocessGLSL(source: string): PreprocessorResult {
  // Phase 1: Line splicing (handle backslash-newline continuation)
  const splicingResult = performLineSplicing(source);
  const splicedCode = splicingResult.code;
  const splicedLineMapping = splicingResult.lineMapping;

  const lines = splicedCode.split('\n');
  const output: string[] = [];
  const lineMapping = new Map<number, number>();
  const errors: PreprocessorError[] = [];
  const macros = new Map<string, Macro>();

  // Stack for nested conditionals (#ifdef, #ifndef, #if, #elif, #else, #endif)
  // Supports nesting: #ifdef FOO ... #ifdef BAR ... #endif ... #endif
  const conditionalStack: ConditionalState[] = [];

  // Helper to check if we should include the current line
  // Returns true only if ALL nested conditionals are active
  const shouldInclude = (): boolean => {
    if (conditionalStack.length === 0) return true;
    return conditionalStack.every(state => state.isActive);
  };

  // ============ PHASE 2: DIRECTIVE PROCESSING ============

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const splicedLineNum = i + 1;
    // Map spliced line number to original source line number
    const originalLineNum = splicedLineMapping.get(splicedLineNum) || splicedLineNum;
    const trimmed = line.trim();

    // Track output line number for error mapping
    const outputLineNum = output.length + 1;

    // Handle preprocessor directives (#define, #ifdef, #if, etc.)
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

      // #if directive
      if (directive.startsWith('if ')) {
        const condition = directive.substring(3).trim();
        const conditionResult = evaluateExpression(condition, macros, originalLineNum, errors);
        conditionalStack.push({
          isActive: shouldInclude() && conditionResult,
          hasMatched: conditionResult,
          line: originalLineNum
        });
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #elif directive (else-if: alternative conditional branch)
      if (directive.startsWith('elif ')) {
        if (conditionalStack.length === 0) {
          errors.push({
            line: originalLineNum,
            message: '#elif without matching #if, #ifdef, or #ifndef'
          });
        } else {
          const current = conditionalStack[conditionalStack.length - 1];
          // Only evaluate if no previous branch has matched (short-circuit evaluation)
          if (!current.hasMatched) {
            const condition = directive.substring(5).trim();
            const conditionResult = evaluateExpression(condition, macros, originalLineNum, errors);
            const parentActive = conditionalStack.slice(0, -1).every(state => state.isActive);
            current.isActive = parentActive && conditionResult;
            current.hasMatched = conditionResult;
          } else {
            // Previous branch matched, skip this branch
            current.isActive = false;
          }
        }
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // #else directive
      if (directive === 'else') {
        if (conditionalStack.length === 0) {
          errors.push({
            line: originalLineNum,
            message: '#else without matching #if, #ifdef, or #ifndef'
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
            message: '#endif without matching #if, #ifdef, or #ifndef'
          });
        } else {
          conditionalStack.pop();
        }
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
        continue;
      }

      // Unknown directive - pass through (could be GLSL-specific like #version or #extension)
      if (shouldInclude()) {
        output.push(line);
        lineMapping.set(outputLineNum, originalLineNum);
      } else {
        output.push('');
        lineMapping.set(outputLineNum, originalLineNum);
      }
      continue;
    }

    // Regular line (not a preprocessor directive) - store as-is if in active conditional
    if (shouldInclude()) {
      output.push(line);
      lineMapping.set(outputLineNum, originalLineNum);
    } else {
      // Not in active conditional - replace with blank line
      output.push('');
      lineMapping.set(outputLineNum, originalLineNum);
    }
  }

  // Check for unclosed conditionals (missing #endif)
  if (conditionalStack.length > 0) {
    conditionalStack.forEach(state => {
      errors.push({
        line: state.line,
        message: 'Unclosed conditional directive (missing #endif)'
      });
    });
  }

  // ============ PHASE 3: MACRO EXPANSION ============

  // Phase 3: Macro expansion on the entire output (after directive processing)
  // This allows macro invocations to span multiple lines
  // Example: MAX(\n  a,\n  b\n) -> ((a) > (b) ? (a) : (b))
  const codeBeforeExpansion = output.join('\n');
  const expandedCode = expandMacrosInText(codeBeforeExpansion, macros, lineMapping, errors);

  return {
    code: expandedCode,
    lineMapping,
    errors
  };
}

// ============ MACRO EXPANSION ============

/**
 * Expand macros in entire text (handles multi-line macro invocations)
 * Iteratively expands macros until no more expansions are possible
 * This supports nested macros: #define A B, #define B 5 -> A expands to 5
 */
function expandMacrosInText(
  text: string,
  macros: Map<string, Macro>,
  lineMapping: Map<number, number>,
  errors: PreprocessorError[]
): string {
  let result = text;
  const maxIterations = 100; // Prevent infinite loops from circular macro definitions
  let iteration = 0;
  let changed = true;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Sort macros by name length (longest first) to avoid partial replacements
    // Example: If we have "FOOBAR" and "FOO" macros, expand "FOOBAR" first
    const sortedMacros = Array.from(macros.values()).sort((a, b) => b.name.length - a.name.length);

    for (const macro of sortedMacros) {
      if (macro.params === undefined) {
        // Constant macro - simple text replacement with word boundaries
        // Example: #define PI 3.14159 -> replace all "PI" with "3.14159"
        const regex = new RegExp(`\\b${escapeRegex(macro.name)}\\b`, 'g');
        const newResult = result.replace(regex, macro.value);
        if (newResult !== result) {
          result = newResult;
          changed = true;
        }
      } else {
        // Function-like macro - find invocations and replace with expanded value
        // Example: #define MAX(a,b) ((a)>(b)?(a):(b)) -> MAX(x,y) becomes ((x)>(y)?(x):(y))
        const regex = new RegExp(`\\b${escapeRegex(macro.name)}\\s*\\(`, 'g');
        let match;

        while ((match = regex.exec(result)) !== null) {
          const startIdx = match.index;
          const argsStartIdx = match.index + match[0].length;

          // Find matching closing parenthesis (can span multiple lines in text)
          const args = extractFunctionArgs(result, argsStartIdx);
          if (args === null) {
            // Calculate which line this error is on
            const errorLine = result.substring(0, startIdx).split('\n').length;
            const originalLine = lineMapping.get(errorLine) || errorLine;
            errors.push({
              line: originalLine,
              message: `Unmatched parentheses in macro invocation: ${macro.name}`
            });
            break;
          }

          // Check argument count
          if (args.length !== macro.params.length) {
            const errorLine = result.substring(0, startIdx).split('\n').length;
            const originalLine = lineMapping.get(errorLine) || errorLine;
            errors.push({
              line: originalLine,
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
      line: 0,
      message: 'Macro expansion exceeded maximum recursion depth (possible circular definition)'
    });
  }

  return result;
}

// ============ DIRECTIVE PARSING ============

/**
 * Parse a #define directive
 * Supports both constant and function-like macros:
 * - #define PI 3.14159                         (constant macro)
 * - #define MAX(a, b) ((a) > (b) ? (a) : (b)) (function-like macro)
 * - #define DEBUG                              (flag macro, value = "1")
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
  const maxIterations = 100; // Prevent infinite recursion
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
 * Handles nested parentheses: MAX(MIN(a, b), c) correctly extracts ["MIN(a, b)", "c"]
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

// ============ CONDITIONAL EXPRESSION EVALUATION ============

/**
 * Evaluate a preprocessor conditional expression (#if, #elif)
 * Supports:
 * - defined(MACRO) and !defined(MACRO)
 * - Numeric literals and macro values
 * - Comparison operators: ==, !=, <, >, <=, >=
 * - Logical operators: &&, ||, !
 * - Parentheses for grouping
 * Example: #if defined(DEBUG) && (LEVEL >= 2)
 */
function evaluateExpression(
  expr: string,
  macros: Map<string, Macro>,
  lineNum: number,
  errors: PreprocessorError[]
): boolean {
  // First, expand macros in the expression (except inside defined())
  let expandedExpr = expr;

  // Protect defined() calls from macro expansion
  const definedCalls: string[] = [];
  expandedExpr = expandedExpr.replace(/defined\s*\(\s*(\w+)\s*\)/g, (match) => {
    const placeholder = `__DEFINED_${definedCalls.length}__`;
    definedCalls.push(match);
    return placeholder;
  });

  // Expand macros (simple constant macros only for conditional expressions)
  expandedExpr = expandMacros(expandedExpr, macros, lineNum, errors);

  // Restore defined() calls
  definedCalls.forEach((call, index) => {
    expandedExpr = expandedExpr.replace(`__DEFINED_${index}__`, call);
  });

  // Now evaluate the expression
  try {
    return evaluateBooleanExpression(expandedExpr.trim(), macros);
  } catch (error) {
    errors.push({
      line: lineNum,
      message: `Invalid expression in #if: ${expr} (${error instanceof Error ? error.message : 'unknown error'})`
    });
    return false;
  }
}

/**
 * Evaluate a boolean expression with operators
 * Uses recursive descent parser with proper operator precedence:
 * 1. Logical OR (||)      - lowest precedence
 * 2. Logical AND (&&)
 * 3. Equality (==, !=)
 * 4. Comparison (<, >, <=, >=)
 * 5. Unary (!, -)
 * 6. Primary (numbers, parentheses) - highest precedence
 */
function evaluateBooleanExpression(expr: string, macros: Map<string, Macro>): boolean {
  // Handle defined() function - replace with 1 or 0
  expr = expr.replace(/defined\s*\(\s*(\w+)\s*\)/g, (_, macroName) => {
    return macros.has(macroName) ? '1' : '0';
  });

  // Tokenize and parse with recursive descent parser
  const tokens = tokenizeExpression(expr);
  const result = parseLogicalOr(tokens, 0);

  return result.value !== 0;
}

interface ParseResult {
  value: number;
  nextIndex: number;
}

/**
 * Tokenize expression into meaningful parts
 * Splits "a >= 5 && b < 10" into ["a", ">=", "5", "&&", "b", "<", "10"]
 */
function tokenizeExpression(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    const nextChar = expr[i + 1];

    // Skip whitespace
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    // Two-character operators
    if (
      (char === '=' && nextChar === '=') ||
      (char === '!' && nextChar === '=') ||
      (char === '<' && nextChar === '=') ||
      (char === '>' && nextChar === '=') ||
      (char === '&' && nextChar === '&') ||
      (char === '|' && nextChar === '|')
    ) {
      if (current) tokens.push(current);
      tokens.push(char + nextChar);
      current = '';
      i++; // Skip next char
      continue;
    }

    // Single-character operators and parentheses
    if ('()!<>=&|'.includes(char)) {
      if (current) tokens.push(current);
      tokens.push(char);
      current = '';
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
}

/**
 * Parse logical OR (lowest precedence)
 */
function parseLogicalOr(tokens: string[], index: number): ParseResult {
  let left = parseLogicalAnd(tokens, index);

  while (left.nextIndex < tokens.length && tokens[left.nextIndex] === '||') {
    const right = parseLogicalAnd(tokens, left.nextIndex + 1);
    left = { value: (left.value || right.value) ? 1 : 0, nextIndex: right.nextIndex };
  }

  return left;
}

/**
 * Parse logical AND
 */
function parseLogicalAnd(tokens: string[], index: number): ParseResult {
  let left = parseEquality(tokens, index);

  while (left.nextIndex < tokens.length && tokens[left.nextIndex] === '&&') {
    const right = parseEquality(tokens, left.nextIndex + 1);
    left = { value: (left.value && right.value) ? 1 : 0, nextIndex: right.nextIndex };
  }

  return left;
}

/**
 * Parse equality operators (==, !=)
 */
function parseEquality(tokens: string[], index: number): ParseResult {
  let left = parseComparison(tokens, index);

  while (left.nextIndex < tokens.length) {
    const op = tokens[left.nextIndex];
    if (op === '==' || op === '!=') {
      const right = parseComparison(tokens, left.nextIndex + 1);
      if (op === '==') {
        left = { value: left.value === right.value ? 1 : 0, nextIndex: right.nextIndex };
      } else {
        left = { value: left.value !== right.value ? 1 : 0, nextIndex: right.nextIndex };
      }
    } else {
      break;
    }
  }

  return left;
}

/**
 * Parse comparison operators (<, >, <=, >=)
 */
function parseComparison(tokens: string[], index: number): ParseResult {
  let left = parseUnary(tokens, index);

  while (left.nextIndex < tokens.length) {
    const op = tokens[left.nextIndex];
    if (op === '<' || op === '>' || op === '<=' || op === '>=') {
      const right = parseUnary(tokens, left.nextIndex + 1);
      let result = 0;
      if (op === '<') result = left.value < right.value ? 1 : 0;
      else if (op === '>') result = left.value > right.value ? 1 : 0;
      else if (op === '<=') result = left.value <= right.value ? 1 : 0;
      else if (op === '>=') result = left.value >= right.value ? 1 : 0;
      left = { value: result, nextIndex: right.nextIndex };
    } else {
      break;
    }
  }

  return left;
}

/**
 * Parse unary operators (!, -)
 */
function parseUnary(tokens: string[], index: number): ParseResult {
  if (index >= tokens.length) {
    throw new Error('Unexpected end of expression');
  }

  const token = tokens[index];

  if (token === '!') {
    const operand = parseUnary(tokens, index + 1);
    return { value: operand.value ? 0 : 1, nextIndex: operand.nextIndex };
  }

  if (token === '-') {
    const operand = parseUnary(tokens, index + 1);
    return { value: -operand.value, nextIndex: operand.nextIndex };
  }

  return parsePrimary(tokens, index);
}

/**
 * Parse primary expressions (numbers, parentheses)
 */
function parsePrimary(tokens: string[], index: number): ParseResult {
  if (index >= tokens.length) {
    throw new Error('Unexpected end of expression');
  }

  const token = tokens[index];

  // Parenthesized expression
  if (token === '(') {
    const inner = parseLogicalOr(tokens, index + 1);
    if (inner.nextIndex >= tokens.length || tokens[inner.nextIndex] !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    return { value: inner.value, nextIndex: inner.nextIndex + 1 };
  }

  // Number literal
  const num = parseFloat(token);
  if (!isNaN(num)) {
    return { value: num, nextIndex: index + 1 };
  }

  // Undefined identifier evaluates to 0
  return { value: 0, nextIndex: index + 1 };
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
