import { LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "lezer-glsl"
import { completeFromList } from "@codemirror/autocomplete"
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete"


export const glslLanguage = LRLanguage.define({
  name: "glsl",
  parser: parser.configure({
    props: [
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

  // Sampler types
  { label: "sampler2D", type: "type", detail: "2D texture sampler" },
  { label: "sampler3D", type: "type", detail: "3D texture sampler" },
  { label: "samplerCube", type: "type", detail: "Cube texture sampler" },
  { label: "sampler2DShadow", type: "type", detail: "2D depth texture sampler" },

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
  { label: "varying", type: "keyword", detail: "varying variable qualifier" },
  { label: "attribute", type: "keyword", detail: "attribute variable qualifier" },
  { label: "in", type: "keyword", detail: "input variable qualifier" },
  { label: "out", type: "keyword", detail: "output variable qualifier" },
  { label: "inout", type: "keyword", detail: "input/output parameter qualifier" },
  { label: "precision", type: "keyword", detail: "precision qualifier" },
  { label: "highp", type: "keyword", detail: "high precision" },
  { label: "mediump", type: "keyword", detail: "medium precision" },
  { label: "lowp", type: "keyword", detail: "low precision" },

  // Built-in variables
  { label: "gl_FragCoord", type: "variable", detail: "vec4 - fragment position" },
  { label: "gl_FragColor", type: "variable", detail: "vec4 - fragment color output (deprecated)" },
  { label: "gl_FragData", type: "variable", detail: "vec4[] - fragment color outputs (deprecated)" },
  { label: "gl_FragDepth", type: "variable", detail: "float - fragment depth value" },
  { label: "gl_Position", type: "variable", detail: "vec4 - vertex position output" },
  { label: "gl_PointSize", type: "variable", detail: "float - point size" },
  { label: "gl_VertexID", type: "variable", detail: "int - vertex ID" },
  { label: "gl_InstanceID", type: "variable", detail: "int - instance ID" },

  // Mathematical functions
  { label: "abs", type: "function", detail: "absolute value", info: "abs(x)" },
  { label: "sin", type: "function", detail: "sine function", info: "sin(angle)" },
  { label: "cos", type: "function", detail: "cosine function", info: "cos(angle)" },
  { label: "tan", type: "function", detail: "tangent function", info: "tan(angle)" },
  { label: "asin", type: "function", detail: "arc sine", info: "asin(x)" },
  { label: "acos", type: "function", detail: "arc cosine", info: "acos(x)" },
  { label: "atan", type: "function", detail: "arc tangent", info: "atan(y, x) or atan(y_over_x)" },
  { label: "pow", type: "function", detail: "power function", info: "pow(x, y)" },
  { label: "exp", type: "function", detail: "exponential function", info: "exp(x)" },
  { label: "log", type: "function", detail: "natural logarithm", info: "log(x)" },
  { label: "exp2", type: "function", detail: "2^x", info: "exp2(x)" },
  { label: "log2", type: "function", detail: "base 2 logarithm", info: "log2(x)" },
  { label: "sqrt", type: "function", detail: "square root", info: "sqrt(x)" },
  { label: "inversesqrt", type: "function", detail: "inverse square root", info: "inversesqrt(x)" },
  { label: "sign", type: "function", detail: "extract sign", info: "sign(x)" },
  { label: "floor", type: "function", detail: "round down", info: "floor(x)" },
  { label: "ceil", type: "function", detail: "round up", info: "ceil(x)" },
  { label: "fract", type: "function", detail: "fractional part", info: "fract(x)" },
  { label: "mod", type: "function", detail: "modulus", info: "mod(x, y)" },
  { label: "min", type: "function", detail: "minimum value", info: "min(x, y)" },
  { label: "max", type: "function", detail: "maximum value", info: "max(x, y)" },
  { label: "clamp", type: "function", detail: "constrain value", info: "clamp(x, minVal, maxVal)" },
  { label: "mix", type: "function", detail: "linear interpolation", info: "mix(x, y, a)" },
  { label: "step", type: "function", detail: "step function", info: "step(edge, x)" },
  { label: "smoothstep", type: "function", detail: "smooth interpolation", info: "smoothstep(edge0, edge1, x)" },

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
  { label: "matrixCompMult", type: "function", detail: "component-wise multiplication", info: "matrixCompMult(x, y)" },
  { label: "transpose", type: "function", detail: "transpose matrix", info: "transpose(m)" },
  { label: "inverse", type: "function", detail: "inverse matrix", info: "inverse(m)" },

  // Texture functions
  { label: "texture", type: "function", detail: "texture lookup", info: "texture(sampler, coord)" },
  { label: "texture2D", type: "function", detail: "2D texture lookup (deprecated)", info: "texture2D(sampler, coord)" },
  { label: "textureLod", type: "function", detail: "texture lookup with LOD", info: "textureLod(sampler, coord, lod)" },
  { label: "textureSize", type: "function", detail: "texture dimensions", info: "textureSize(sampler, lod)" },

  // Derivative functions
  { label: "dFdx", type: "function", detail: "derivative in x", info: "dFdx(p)" },
  { label: "dFdy", type: "function", detail: "derivative in y", info: "dFdy(p)" },
  { label: "fwidth", type: "function", detail: "sum of derivatives", info: "fwidth(p)" },

  // Constants
  { label: "true", type: "constant", detail: "boolean true" },
  { label: "false", type: "constant", detail: "boolean false" }
]

// Function to extract user-defined variables and functions from GLSL code
function extractUserDefinedSymbols(code: string): Completion[] {
  const variables = new Set<string>()
  const functions = new Map<string, string>() // Map function name to signature

  // Regex patterns to match different types of variable declarations
  const variablePatterns = [
    // Basic variable declarations: type name; or type name = value;
    /(?:^|\s)((?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+)(\w+)(?:\s*=|;)/gm,

    // Uniform/varying/attribute declarations
    /(?:^|\s)((?:uniform|varying|attribute|in|out)\s+(?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+)(\w+)/gm,

    // Function parameters: extract from function signatures
    /(?:^|\s)\w+\s+\w+\s*\([^)]*?(?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+(\w+)/gm,

    // For loop variables: for(int i = 0; ...)
    /for\s*\(\s*(?:int|uint|float)\s+(\w+)/gm
  ]

  // Extract variables
  variablePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const varName = match[match.length - 1] // Last capture group is always the variable name
      if (varName && !glslCompletions.some(comp => comp.label === varName)) {
        variables.add(varName)
      }
    }
  })

  // Extract user-defined functions
  // Pattern to match function declarations: returnType functionName(parameters) {
  const functionPattern = /(?:^|\s)((?:void|bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+)(\w+)\s*\(([^)]*)\)\s*\{/gm

  let functionMatch
  while ((functionMatch = functionPattern.exec(code)) !== null) {
    const returnType = functionMatch[1].trim()
    const funcName = functionMatch[2]
    const params = functionMatch[3].trim()

    // Skip if it's a built-in function or already exists in static completions
    if (funcName && !glslCompletions.some(comp => comp.label === funcName)) {
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

  return [...variableCompletions, ...functionCompletions]
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