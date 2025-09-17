import { LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "lezer-glsl"
import { completeFromList } from "@codemirror/autocomplete"
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete"

// Create highlighting rules for GLSL tokens
const glslHighlighting = styleTags({
  // GLSL Keywords
  "precision highp mediump lowp uniform varying attribute in out inout layout location binding invariant centroid flat smooth noperspective patch sample subroutine": t.keyword,

  // Standard keywords
  "const void if else for while do break continue return discard switch case default": t.keyword,

  // Types - these should get type highlighting (same as float)
  "bool int uint float double bvec2 bvec3 bvec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 vec2 vec3 vec4 dvec2 dvec3 dvec4": t.typeName,
  "mat2 mat3 mat4 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4": t.typeName,
  "dmat2 dmat3 dmat4 dmat2x2 dmat2x3 dmat2x4 dmat3x2 dmat3x3 dmat3x4 dmat4x2 dmat4x3 dmat4x4": t.typeName,
  "sampler1D sampler2D sampler3D samplerCube sampler1DArray sampler2DArray samplerCubeArray sampler2DRect samplerBuffer sampler2DMS sampler2DMSArray": t.typeName,
  "sampler1DShadow sampler2DShadow samplerCubeShadow sampler1DArrayShadow sampler2DArrayShadow samplerCubeArrayShadow sampler2DRectShadow": t.typeName,
  "isampler1D isampler2D isampler3D isamplerCube isampler1DArray isampler2DArray isamplerCubeArray isampler2DRect isamplerBuffer isampler2DMS isampler2DMSArray": t.typeName,
  "usampler1D usampler2D usampler3D usamplerCube usampler1DArray usampler2DArray usamplerCubeArray usampler2DRect usamplerBuffer usampler2DMS usampler2DMSArray": t.typeName,
  "image1D image2D image3D imageCube image1DArray image2DArray imageCubeArray image2DRect imageBuffer image2DMS image2DMSArray": t.typeName,
  "iimage1D iimage2D iimage3D iimageCube iimage1DArray iimage2DArray iimageCubeArray iimage2DRect iimageBuffer iimage2DMS iimage2DMSArray": t.typeName,
  "uimage1D uimage2D uimage3D uimageCube uimage1DArray uimage2DArray uimageCubeArray uimage2DRect uimageBuffer uimage2DMS uimage2DMSArray": t.typeName,
  "atomic_uint": t.typeName,

  // Built-in functions
  "radians degrees sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh": t.function(t.variableName),
  "pow exp log exp2 log2 sqrt inversesqrt abs sign floor trunc round roundEven ceil fract mod modf min max clamp mix step smoothstep": t.function(t.variableName),
  "isnan isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat fma frexp ldexp": t.function(t.variableName),
  "packUnorm2x16 packSnorm2x16 packUnorm4x8 packSnorm4x8 unpackUnorm2x16 unpackSnorm2x16 unpackUnorm4x8 unpackSnorm4x8": t.function(t.variableName),
  "packHalf2x16 unpackHalf2x16 packDouble2x32 unpackDouble2x32": t.function(t.variableName),
  "length distance dot cross normalize faceforward reflect refract": t.function(t.variableName),
  "matrixCompMult outerProduct transpose determinant inverse": t.function(t.variableName),
  "lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not": t.function(t.variableName),
  "uaddCarry usubBorrow umulExtended imulExtended bitfieldExtract bitfieldInsert bitfieldReverse bitCount findLSB findMSB": t.function(t.variableName),
  "texture textureSize textureQueryLod textureQueryLevels textureLod textureOffset texelFetch texelFetchOffset": t.function(t.variableName),
  "textureProjOffset textureLodOffset textureProjLod textureProjLodOffset textureGrad textureGradOffset textureProjGrad textureProjGradOffset": t.function(t.variableName),
  "textureGather textureGatherOffset textureGatherOffsets": t.function(t.variableName),
  "texture1D texture2D texture3D textureCube texture1DProj texture2DProj texture3DProj textureCubeProj": t.function(t.variableName),
  "texture1DLod texture2DLod texture3DLod textureCubeLod texture1DProjLod texture2DProjLod texture3DProjLod textureCubeProjLod": t.function(t.variableName),
  "shadow1D shadow2D shadow1DProj shadow2DProj shadow1DLod shadow2DLod shadow1DProjLod shadow2DProjLod": t.function(t.variableName),
  "dFdx dFdy dFdxFine dFdyFine dFdxCoarse dFdyCoarse fwidth fwidthFine fwidthCoarse": t.function(t.variableName),
  "interpolateAtCentroid interpolateAtSample interpolateAtOffset": t.function(t.variableName),
  "noise1 noise2 noise3 noise4": t.function(t.variableName),
  "EmitStreamVertex EndStreamPrimitive EmitVertex EndPrimitive barrier": t.function(t.variableName),
  "memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer memoryBarrierShared memoryBarrierImage groupMemoryBarrier": t.function(t.variableName),
  "atomicAdd atomicMin atomicMax atomicAnd atomicOr atomicXor atomicExchange atomicCompSwap": t.function(t.variableName),
  "imageSize imageLoad imageStore imageAtomicAdd imageAtomicMin imageAtomicMax imageAtomicAnd imageAtomicOr imageAtomicXor imageAtomicExchange imageAtomicCompSwap": t.function(t.variableName),

  // Built-in variables
  "gl_VertexID gl_InstanceID gl_DrawID gl_BaseVertex gl_BaseInstance gl_Position gl_PointSize gl_ClipDistance": t.variableName,
  "gl_PatchVerticesIn gl_PrimitiveID gl_InvocationID gl_TessLevelOuter gl_TessLevelInner gl_TessCoord": t.variableName,
  "gl_in gl_PrimitiveIDIn gl_Layer gl_ViewportIndex": t.variableName,
  "gl_FragCoord gl_FrontFacing gl_PointCoord gl_SampleID gl_SamplePosition gl_SampleMaskIn": t.variableName,
  "gl_FragColor gl_FragData gl_FragDepth gl_SampleMask gl_NumWorkGroups gl_WorkGroupSize gl_WorkGroupID": t.variableName,
  "gl_LocalInvocationID gl_GlobalInvocationID gl_LocalInvocationIndex gl_DepthRange": t.variableName,

  // Literals
  "true false": t.bool
})

export const glslLanguage = LRLanguage.define({
  name: "glsl",
  parser: parser.configure({
    props: [glslHighlighting]
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

// Function to extract user-defined variables from GLSL code
function extractVariables(code: string): Completion[] {
  const variables = new Set<string>()
  
  // Regex patterns to match different types of variable declarations
  const patterns = [
    // Basic variable declarations: type name; or type name = value;
    /(?:^|\s)((?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+)(\w+)(?:\s*=|;)/gm,
    
    // Uniform/varying/attribute declarations
    /(?:^|\s)((?:uniform|varying|attribute|in|out)\s+(?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+)(\w+)/gm,
    
    // Function parameters: extract from function signatures
    /(?:^|\s)\w+\s+\w+\s*\([^)]*?(?:bool|int|uint|float|double|vec[234]|bvec[234]|ivec[234]|uvec[234]|mat[234]|mat[234]x[234]|sampler\w+|image\w+)\s+(\w+)/gm,
    
    // For loop variables: for(int i = 0; ...)
    /for\s*\(\s*(?:int|uint|float)\s+(\w+)/gm
  ]
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      const varName = match[match.length - 1] // Last capture group is always the variable name
      if (varName && !glslCompletions.some(comp => comp.label === varName)) {
        variables.add(varName)
      }
    }
  })
  
  // Convert to completion objects
  return Array.from(variables).map(varName => ({
    label: varName,
    type: "variable",
    detail: "user-defined variable"
  }))
}

// Dynamic completion function that combines static and user-defined completions
function glslCompletion(context: CompletionContext): CompletionResult | null {
  const code = context.state.doc.toString()
  const userVariables = extractVariables(code)
  
  // Combine static completions with user-defined variables
  const allCompletions = [...glslCompletions, ...userVariables]
  
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