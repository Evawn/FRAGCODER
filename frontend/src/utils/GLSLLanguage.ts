/**
 * CodeMirror GLSL language support with syntax highlighting, folding, and autocomplete.
 * Provides built-in GLSL completions and extracts user-defined symbols (variables, functions, structs, macros).
 */
import { LRLanguage, LanguageSupport, foldNodeProp, foldInside } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "lezer-glsl"
import { completeFromList } from "@codemirror/autocomplete"
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete"


export const glslLanguage = LRLanguage.define({
  name: "glsl",
  parser: parser.configure({
    props: [
      foldNodeProp.add({
        CompoundStatement: foldInside,
        FunctionDefinition: foldInside,
        IfStatement: foldInside,
        ForStatement: foldInside,
        WhileStatement: foldInside,
        DoStatement: foldInside,
        SwitchStatement: foldInside,
        StructSpecifier: foldInside
      }),
      // styleTags({
      //   // Keywords (using actual grammar tokens)
      //   "void bool int uint float": t.keyword,
      //   "const uniform varying attribute in out inout centroid": t.modifier,
      //   "if else for while do break continue return discard": t.controlKeyword,
      //   "precision highp mediump lowp": t.modifier,
      //   "smooth flat invariant": t.modifier,
      //   "layout": t.modifier,
      //   "struct": t.definitionKeyword,
      //   "switch case default": t.controlKeyword,

      //   // Primitive types (from grammar)
      //   PrimitiveType: t.typeName,

      //   // User-defined types
      //   TypeIdentifier: t.typeName,

      //   // Literals
      //   "true false": t.bool,
      //   Number: t.number,
      //   String: t.string,

      //   // Identifiers and definitions
      //   IdentifierDefinition: t.definition(t.variableName),
      //   Identifier: t.variableName,
      //   FieldIdentifier: t.propertyName,

      //   // Function definitions
      //   "FunctionDefinition/IdentifierDefinition": t.function(t.definition(t.variableName)),

      //   // Operators (from grammar)
      //   ArithOp: t.arithmeticOperator,
      //   BitOp: t.bitwiseOperator,
      //   CompareOp: t.compareOperator,
      //   LogicOp: t.logicOperator,
      //   UpdateOp: t.updateOperator,
      //   "= ,": t.operator,
      //   "( ) { } [ ]": t.bracket,
      //   "; .": t.separator,

      //   // Comments
      //   LineComment: t.lineComment,
      //   BlockComment: t.blockComment
      // })
    ]
  })
})

// GLSL completion definitions
const glslCompletions = [
  // Types
  { label: "bool", type: "type", detail: "boolean type" },
  { label: "int", type: "type", detail: "signed integer type" },
  { label: "uint", type: "type", detail: "unsigned integer type" },
  { label: "float", type: "type", detail: "single precision floating-point type" },
  { label: "double", type: "type", detail: "double precision floating-point type" },

  // Vector types
  { label: "vec2", type: "type", detail: "2-component floating-point vector" },
  { label: "vec3", type: "type", detail: "3-component floating-point vector" },
  { label: "vec4", type: "type", detail: "4-component floating-point vector" },
  { label: "bvec2", type: "type", detail: "2-component boolean vector" },
  { label: "bvec3", type: "type", detail: "3-component boolean vector" },
  { label: "bvec4", type: "type", detail: "4-component boolean vector" },
  { label: "ivec2", type: "type", detail: "2-component signed integer vector" },
  { label: "ivec3", type: "type", detail: "3-component signed integer vector" },
  { label: "ivec4", type: "type", detail: "4-component signed integer vector" },
  { label: "uvec2", type: "type", detail: "2-component unsigned integer vector" },
  { label: "uvec3", type: "type", detail: "3-component unsigned integer vector" },
  { label: "uvec4", type: "type", detail: "4-component unsigned integer vector" },

  // Matrix types
  { label: "mat2", type: "type", detail: "2x2 floating-point matrix" },
  { label: "mat3", type: "type", detail: "3x3 floating-point matrix" },
  { label: "mat4", type: "type", detail: "4x4 floating-point matrix" },
  { label: "mat2x2", type: "type", detail: "2x2 floating-point matrix" },
  { label: "mat2x3", type: "type", detail: "2 columns, 3 rows matrix" },
  { label: "mat2x4", type: "type", detail: "2 columns, 4 rows matrix" },
  { label: "mat3x2", type: "type", detail: "3 columns, 2 rows matrix" },
  { label: "mat3x3", type: "type", detail: "3x3 floating-point matrix" },
  { label: "mat3x4", type: "type", detail: "3 columns, 4 rows matrix" },
  { label: "mat4x2", type: "type", detail: "4 columns, 2 rows matrix" },
  { label: "mat4x3", type: "type", detail: "4 columns, 3 rows matrix" },
  { label: "mat4x4", type: "type", detail: "4x4 floating-point matrix" },

  // Sampler types (GLSL ES 3.00)
  { label: "sampler2D", type: "type", detail: "2D texture sampler" },
  { label: "sampler3D", type: "type", detail: "3D texture sampler" },
  { label: "samplerCube", type: "type", detail: "Cube texture sampler" },
  { label: "sampler2DShadow", type: "type", detail: "2D depth texture sampler" },
  { label: "samplerCubeShadow", type: "type", detail: "Cube depth texture sampler" },
  { label: "sampler2DArray", type: "type", detail: "2D array texture sampler" },
  { label: "sampler2DArrayShadow", type: "type", detail: "2D array depth texture sampler" },
  { label: "isampler2D", type: "type", detail: "2D integer texture sampler" },
  { label: "isampler3D", type: "type", detail: "3D integer texture sampler" },
  { label: "isamplerCube", type: "type", detail: "Cube integer texture sampler" },
  { label: "isampler2DArray", type: "type", detail: "2D array integer texture sampler" },
  { label: "usampler2D", type: "type", detail: "2D unsigned integer texture sampler" },
  { label: "usampler3D", type: "type", detail: "3D unsigned integer texture sampler" },
  { label: "usamplerCube", type: "type", detail: "Cube unsigned integer texture sampler" },
  { label: "usampler2DArray", type: "type", detail: "2D array unsigned integer texture sampler" },

  // Keywords
  { label: "if", type: "keyword", detail: "conditional statement" },
  { label: "else", type: "keyword", detail: "else clause" },
  { label: "for", type: "keyword", detail: "for loop" },
  { label: "while", type: "keyword", detail: "while loop" },
  { label: "do", type: "keyword", detail: "do-while loop" },
  { label: "break", type: "keyword", detail: "break statement" },
  { label: "continue", type: "keyword", detail: "continue statement" },
  { label: "return", type: "keyword", detail: "return statement" },
  { label: "discard", type: "keyword", detail: "discard fragment" },
  { label: "const", type: "keyword", detail: "constant qualifier" },
  { label: "uniform", type: "keyword", detail: "uniform variable qualifier" },
  { label: "in", type: "keyword", detail: "input variable qualifier" },
  { label: "out", type: "keyword", detail: "output variable qualifier" },
  { label: "inout", type: "keyword", detail: "input/output parameter qualifier" },
  { label: "centroid", type: "keyword", detail: "centroid qualifier" },
  { label: "flat", type: "keyword", detail: "flat interpolation qualifier" },
  { label: "smooth", type: "keyword", detail: "smooth interpolation qualifier" },
  { label: "precision", type: "keyword", detail: "precision qualifier" },
  { label: "highp", type: "keyword", detail: "high precision" },
  { label: "mediump", type: "keyword", detail: "medium precision" },
  { label: "lowp", type: "keyword", detail: "low precision" },

  // Preprocessor directives
  { label: "define", type: "keyword", detail: "define macro" },
  { label: "undef", type: "keyword", detail: "undefine macro" },
  { label: "ifdef", type: "keyword", detail: "conditional compilation if defined" },
  { label: "ifndef", type: "keyword", detail: "conditional compilation if not defined" },
  { label: "else", type: "keyword", detail: "else branch for conditional" },
  { label: "endif", type: "keyword", detail: "end conditional block" },

  // Built-in variables (Fragment Shader - GLSL ES 3.00)
  { label: "gl_FragCoord", type: "variable", detail: "vec4 - fragment position in window coordinates" },
  { label: "gl_FrontFacing", type: "variable", detail: "bool - true if fragment is front-facing" },
  { label: "gl_PointCoord", type: "variable", detail: "vec2 - point sprite coordinate" },
  { label: "gl_FragDepth", type: "variable", detail: "float - fragment depth value (output)" },

  // Shader Playground uniforms
  { label: "iResolution", type: "variable", detail: "vec3 - viewport resolution (in pixels)" },
  { label: "iTime", type: "variable", detail: "float - shader playback time (in seconds)" },
  { label: "iTimeDelta", type: "variable", detail: "float - render time (in seconds)" },
  { label: "iFrameRate", type: "variable", detail: "float - shader frame rate" },
  { label: "iFrame", type: "variable", detail: "int - shader playback frame" },
  { label: "iDate", type: "variable", detail: "vec4 - (year, month, day, time in seconds)" },
  { label: "BufferA", type: "variable", detail: "sampler2D - Buffer A texture" },
  { label: "BufferB", type: "variable", detail: "sampler2D - Buffer B texture" },
  { label: "BufferC", type: "variable", detail: "sampler2D - Buffer C texture" },
  { label: "BufferD", type: "variable", detail: "sampler2D - Buffer D texture" },

  // Angle and Trigonometric functions
  { label: "radians", type: "function", detail: "degrees to radians", info: "radians(degrees)" },
  { label: "degrees", type: "function", detail: "radians to degrees", info: "degrees(radians)" },
  { label: "sin", type: "function", detail: "sine", info: "sin(angle)" },
  { label: "cos", type: "function", detail: "cosine", info: "cos(angle)" },
  { label: "tan", type: "function", detail: "tangent", info: "tan(angle)" },
  { label: "asin", type: "function", detail: "arc sine", info: "asin(x)" },
  { label: "acos", type: "function", detail: "arc cosine", info: "acos(x)" },
  { label: "atan", type: "function", detail: "arc tangent", info: "atan(y, x) or atan(y_over_x)" },
  { label: "sinh", type: "function", detail: "hyperbolic sine", info: "sinh(x)" },
  { label: "cosh", type: "function", detail: "hyperbolic cosine", info: "cosh(x)" },
  { label: "tanh", type: "function", detail: "hyperbolic tangent", info: "tanh(x)" },
  { label: "asinh", type: "function", detail: "inverse hyperbolic sine", info: "asinh(x)" },
  { label: "acosh", type: "function", detail: "inverse hyperbolic cosine", info: "acosh(x)" },
  { label: "atanh", type: "function", detail: "inverse hyperbolic tangent", info: "atanh(x)" },

  // Exponential functions
  { label: "pow", type: "function", detail: "power", info: "pow(x, y)" },
  { label: "exp", type: "function", detail: "natural exponentiation", info: "exp(x)" },
  { label: "log", type: "function", detail: "natural logarithm", info: "log(x)" },
  { label: "exp2", type: "function", detail: "base 2 exponentiation", info: "exp2(x)" },
  { label: "log2", type: "function", detail: "base 2 logarithm", info: "log2(x)" },
  { label: "sqrt", type: "function", detail: "square root", info: "sqrt(x)" },
  { label: "inversesqrt", type: "function", detail: "inverse square root", info: "inversesqrt(x)" },

  // Common functions
  { label: "abs", type: "function", detail: "absolute value", info: "abs(x)" },
  { label: "sign", type: "function", detail: "sign of value", info: "sign(x)" },
  { label: "floor", type: "function", detail: "round down to nearest integer", info: "floor(x)" },
  { label: "trunc", type: "function", detail: "truncate to integer", info: "trunc(x)" },
  { label: "round", type: "function", detail: "round to nearest integer", info: "round(x)" },
  { label: "roundEven", type: "function", detail: "round to nearest even integer", info: "roundEven(x)" },
  { label: "ceil", type: "function", detail: "round up to nearest integer", info: "ceil(x)" },
  { label: "fract", type: "function", detail: "fractional part", info: "fract(x)" },
  { label: "mod", type: "function", detail: "modulo", info: "mod(x, y)" },
  { label: "modf", type: "function", detail: "separate integer and fractional parts", info: "modf(x, out i)" },
  { label: "min", type: "function", detail: "minimum value", info: "min(x, y)" },
  { label: "max", type: "function", detail: "maximum value", info: "max(x, y)" },
  { label: "clamp", type: "function", detail: "constrain value to range", info: "clamp(x, minVal, maxVal)" },
  { label: "mix", type: "function", detail: "linear blend", info: "mix(x, y, a)" },
  { label: "step", type: "function", detail: "step function", info: "step(edge, x)" },
  { label: "smoothstep", type: "function", detail: "smooth Hermite interpolation", info: "smoothstep(edge0, edge1, x)" },
  { label: "isnan", type: "function", detail: "check for NaN", info: "isnan(x)" },
  { label: "isinf", type: "function", detail: "check for infinity", info: "isinf(x)" },
  { label: "floatBitsToInt", type: "function", detail: "float to int bit representation", info: "floatBitsToInt(x)" },
  { label: "floatBitsToUint", type: "function", detail: "float to uint bit representation", info: "floatBitsToUint(x)" },
  { label: "intBitsToFloat", type: "function", detail: "int bits to float", info: "intBitsToFloat(x)" },
  { label: "uintBitsToFloat", type: "function", detail: "uint bits to float", info: "uintBitsToFloat(x)" },
  { label: "fma", type: "function", detail: "fused multiply-add", info: "fma(a, b, c)" },
  { label: "frexp", type: "function", detail: "split into mantissa and exponent", info: "frexp(x, out exp)" },
  { label: "ldexp", type: "function", detail: "build from mantissa and exponent", info: "ldexp(x, exp)" },

  // Geometric functions
  { label: "length", type: "function", detail: "vector length", info: "length(v)" },
  { label: "distance", type: "function", detail: "distance between points", info: "distance(p0, p1)" },
  { label: "dot", type: "function", detail: "dot product", info: "dot(x, y)" },
  { label: "cross", type: "function", detail: "cross product", info: "cross(x, y)" },
  { label: "normalize", type: "function", detail: "normalize vector", info: "normalize(v)" },
  { label: "faceforward", type: "function", detail: "flip normal", info: "faceforward(N, I, Nref)" },
  { label: "reflect", type: "function", detail: "reflection vector", info: "reflect(I, N)" },
  { label: "refract", type: "function", detail: "refraction vector", info: "refract(I, N, eta)" },

  // Matrix functions
  { label: "matrixCompMult", type: "function", detail: "component-wise matrix multiplication", info: "matrixCompMult(x, y)" },
  { label: "outerProduct", type: "function", detail: "outer product of vectors", info: "outerProduct(c, r)" },
  { label: "transpose", type: "function", detail: "transpose matrix", info: "transpose(m)" },
  { label: "determinant", type: "function", detail: "matrix determinant", info: "determinant(m)" },
  { label: "inverse", type: "function", detail: "inverse matrix", info: "inverse(m)" },

  // Vector relational functions
  { label: "lessThan", type: "function", detail: "component-wise less than", info: "lessThan(x, y)" },
  { label: "lessThanEqual", type: "function", detail: "component-wise less than or equal", info: "lessThanEqual(x, y)" },
  { label: "greaterThan", type: "function", detail: "component-wise greater than", info: "greaterThan(x, y)" },
  { label: "greaterThanEqual", type: "function", detail: "component-wise greater than or equal", info: "greaterThanEqual(x, y)" },
  { label: "equal", type: "function", detail: "component-wise equality", info: "equal(x, y)" },
  { label: "notEqual", type: "function", detail: "component-wise inequality", info: "notEqual(x, y)" },
  { label: "any", type: "function", detail: "true if any component is true", info: "any(bvec)" },
  { label: "all", type: "function", detail: "true if all components are true", info: "all(bvec)" },
  { label: "not", type: "function", detail: "component-wise logical NOT", info: "not(bvec)" },

  // Texture functions (GLSL ES 3.00)
  { label: "texture", type: "function", detail: "texture lookup", info: "texture(sampler, coord [, bias])" },
  { label: "textureSize", type: "function", detail: "texture dimensions", info: "textureSize(sampler, lod)" },
  { label: "textureLod", type: "function", detail: "texture lookup with LOD", info: "textureLod(sampler, coord, lod)" },
  { label: "textureProj", type: "function", detail: "projective texture lookup", info: "textureProj(sampler, coord [, bias])" },
  { label: "textureProjLod", type: "function", detail: "projective texture lookup with LOD", info: "textureProjLod(sampler, coord, lod)" },
  { label: "textureGrad", type: "function", detail: "texture lookup with gradient", info: "textureGrad(sampler, coord, dPdx, dPdy)" },
  { label: "textureOffset", type: "function", detail: "texture lookup with offset", info: "textureOffset(sampler, coord, offset [, bias])" },
  { label: "textureLodOffset", type: "function", detail: "texture lookup with LOD and offset", info: "textureLodOffset(sampler, coord, lod, offset)" },
  { label: "textureProjOffset", type: "function", detail: "projective texture lookup with offset", info: "textureProjOffset(sampler, coord, offset [, bias])" },
  { label: "textureGradOffset", type: "function", detail: "texture lookup with gradient and offset", info: "textureGradOffset(sampler, coord, dPdx, dPdy, offset)" },
  { label: "textureProjGrad", type: "function", detail: "projective texture lookup with gradient", info: "textureProjGrad(sampler, coord, dPdx, dPdy)" },
  { label: "textureProjGradOffset", type: "function", detail: "projective texture lookup with gradient and offset", info: "textureProjGradOffset(sampler, coord, dPdx, dPdy, offset)" },
  { label: "textureProjLodOffset", type: "function", detail: "projective texture lookup with LOD and offset", info: "textureProjLodOffset(sampler, coord, lod, offset)" },
  { label: "texelFetch", type: "function", detail: "texel fetch", info: "texelFetch(sampler, coord, lod)" },
  { label: "texelFetchOffset", type: "function", detail: "texel fetch with offset", info: "texelFetchOffset(sampler, coord, lod, offset)" },

  // Fragment processing functions
  { label: "dFdx", type: "function", detail: "derivative in x", info: "dFdx(p)" },
  { label: "dFdy", type: "function", detail: "derivative in y", info: "dFdy(p)" },
  { label: "fwidth", type: "function", detail: "sum of absolute derivatives", info: "fwidth(p)" },

  // Packing and unpacking functions
  { label: "packSnorm2x16", type: "function", detail: "pack 2 floats to snorm", info: "packSnorm2x16(v)" },
  { label: "unpackSnorm2x16", type: "function", detail: "unpack snorm to 2 floats", info: "unpackSnorm2x16(p)" },
  { label: "packUnorm2x16", type: "function", detail: "pack 2 floats to unorm", info: "packUnorm2x16(v)" },
  { label: "unpackUnorm2x16", type: "function", detail: "unpack unorm to 2 floats", info: "unpackUnorm2x16(p)" },
  { label: "packHalf2x16", type: "function", detail: "pack 2 floats to half precision", info: "packHalf2x16(v)" },
  { label: "unpackHalf2x16", type: "function", detail: "unpack half precision to 2 floats", info: "unpackHalf2x16(v)" },

  // Constants
  { label: "true", type: "constant", detail: "boolean true" },
  { label: "false", type: "constant", detail: "boolean false" }
]

// Function to extract user-defined variables, functions, and macros from GLSL code
function extractUserDefinedSymbols(code: string): Completion[] {
  const variables = new Set<string>()
  const functions = new Map<string, string>() // Map function name to signature
  const structs = new Map<string, string>() // Map struct name to definition
  const macros = new Map<string, string>() // Map macro name to definition

  // Common GLSL type pattern (used in multiple regexes)
  const typePattern = '(?:void|bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|dvec[234]|mat[234](?:x[234])?|sampler\\w+|isampler\\w+|usampler\\w+|image\\w+)'

  // Extract macro definitions from #define directives
  const macroPattern = /^\s*#define\s+(\w+)(?:\s*\(([^)]*)\))?\s+(.*)$/gm
  let macroMatch
  while ((macroMatch = macroPattern.exec(code)) !== null) {
    const macroName = macroMatch[1]
    const params = macroMatch[2]
    const value = macroMatch[3]

    if (macroName && !glslCompletions.some(comp => comp.label === macroName)) {
      const signature = params ? `${macroName}(${params})` : macroName
      macros.set(macroName, signature)
    }
  }

  // Extract struct definitions first
  const structPattern = /struct\s+(\w+)\s*\{([^}]+)\}/gm
  let structMatch
  while ((structMatch = structPattern.exec(code)) !== null) {
    const structName = structMatch[1]
    if (structName && !glslCompletions.some(comp => comp.label === structName)) {
      structs.set(structName, `struct ${structName}`)
    }
  }

  // Build complete type pattern including user-defined struct types
  const allTypes = structs.size > 0
    ? `(?:${typePattern}|${Array.from(structs.keys()).join('|')})`
    : typePattern

  // Regex patterns to match different types of variable declarations
  const variablePatterns = [
    // Basic variable declarations with optional const qualifier and array notation
    // Matches: type name; or type name = value; or type name[size];
    new RegExp(`(?:^|\\s)(?:const\\s+)?(${allTypes})\\s+(\\w+)(?:\\s*\\[[^\\]]*\\])?(?:\\s*=|;)`, 'gm'),

    // Uniform/in/out declarations with optional qualifiers and arrays
    // Matches: [qualifier] type name; or [qualifier] type name[size];
    new RegExp(`(?:^|\\s)(?:uniform|in|out|const)\\s+(?:${allTypes})\\s+(\\w+)(?:\\s*\\[[^\\]]*\\])?`, 'gm'),

    // Function parameters with optional qualifiers
    new RegExp(`(?:in|out|inout|const)?\\s*(?:${allTypes})\\s+(\\w+)(?=\\s*[,)])`, 'gm'),

    // For loop variables: for(type i = 0; ...)
    /for\s*\(\s*(?:int|uint|float)\s+(\w+)/gm
  ]

  // Extract variables
  variablePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      // Variable name is in the last capture group or second-to-last
      const varName = match[match.length - 1] || match[2]
      if (varName && /^\w+$/.test(varName) && !glslCompletions.some(comp => comp.label === varName)) {
        variables.add(varName)
      }
    }
  })

  // Extract user-defined functions
  // Pattern to match function declarations: returnType functionName(parameters) {
  const functionPattern = new RegExp(
    `(?:^|\\s)(${allTypes})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`,
    'gm'
  )

  let functionMatch
  while ((functionMatch = functionPattern.exec(code)) !== null) {
    const returnType = functionMatch[1].trim()
    const funcName = functionMatch[2]
    const params = functionMatch[3].trim()

    // Skip if it's a built-in function or already exists in static completions
    // Also skip 'main' function
    if (funcName && funcName !== 'main' && funcName !== 'mainImage' && !glslCompletions.some(comp => comp.label === funcName)) {
      // Create a clean parameter list for display
      const paramList = params ? params.replace(/\s+/g, ' ') : ''
      const signature = `${funcName}(${paramList})`
      functions.set(funcName, signature)
    }
  }

  // Convert variables to completion objects
  const variableCompletions = Array.from(variables).map(varName => ({
    label: varName,
    type: "variable",
    detail: "user-defined variable"
  }))

  // Convert functions to completion objects
  const functionCompletions = Array.from(functions.entries()).map(([funcName, signature]) => ({
    label: funcName,
    type: "function",
    detail: "user-defined function",
    info: signature
  }))

  // Convert structs to completion objects
  const structCompletions = Array.from(structs.entries()).map(([structName, definition]) => ({
    label: structName,
    type: "type",
    detail: "user-defined struct"
  }))

  // Convert macros to completion objects
  const macroCompletions = Array.from(macros.entries()).map(([macroName, signature]) => ({
    label: macroName,
    type: "constant",
    detail: "macro",
    info: signature
  }))

  return [...variableCompletions, ...functionCompletions, ...structCompletions, ...macroCompletions]
}

// Dynamic completion function that combines static and user-defined completions
function glslCompletion(context: CompletionContext): CompletionResult | Promise<CompletionResult | null> | null {
  const code = context.state.doc.toString()
  const userDefinedSymbols = extractUserDefinedSymbols(code)

  // Combine static completions with user-defined variables and functions
  const allCompletions = [...glslCompletions, ...userDefinedSymbols]

  // Use the built-in completeFromList with our combined completions
  const staticCompletion = completeFromList(allCompletions)
  return staticCompletion(context)
}

export function glsl() {
  return new LanguageSupport(glslLanguage, [
    glslLanguage.data.of({
      autocomplete: glslCompletion
    })
  ])
}