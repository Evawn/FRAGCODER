import { cpp, cppLanguage } from "@codemirror/lang-cpp"
import { LRLanguage, LanguageSupport } from "@codemirror/language"

const glslKeywords = [
  // GLSL-specific keywords
  "precision", "highp", "mediump", "lowp",
  "uniform", "varying", "attribute", "in", "out", "inout",
  "layout", "location", "binding",
  "invariant", "centroid", "flat", "smooth", "noperspective",
  "patch", "sample", "subroutine",
  
  // Standard keywords (from C++)
  "const", "void", "bool", "int", "uint", "float", "double",
  "struct", "if", "else", "for", "while", "do", "break", "continue",
  "return", "discard", "switch", "case", "default",
  "true", "false"
]

const glslTypes = [
  // Scalar types
  "bool", "int", "uint", "float", "double",
  
  // Vector types
  "bvec2", "bvec3", "bvec4",
  "ivec2", "ivec3", "ivec4", 
  "uvec2", "uvec3", "uvec4",
  "vec2", "vec3", "vec4",
  "dvec2", "dvec3", "dvec4",
  
  // Matrix types
  "mat2", "mat3", "mat4",
  "mat2x2", "mat2x3", "mat2x4",
  "mat3x2", "mat3x3", "mat3x4", 
  "mat4x2", "mat4x3", "mat4x4",
  "dmat2", "dmat3", "dmat4",
  "dmat2x2", "dmat2x3", "dmat2x4",
  "dmat3x2", "dmat3x3", "dmat3x4",
  "dmat4x2", "dmat4x3", "dmat4x4",
  
  // Sampler types
  "sampler1D", "sampler2D", "sampler3D", "samplerCube",
  "sampler1DArray", "sampler2DArray", "samplerCubeArray",
  "sampler2DRect", "samplerBuffer", "sampler2DMS", "sampler2DMSArray",
  "sampler1DShadow", "sampler2DShadow", "samplerCubeShadow",
  "sampler1DArrayShadow", "sampler2DArrayShadow", "samplerCubeArrayShadow",
  "sampler2DRectShadow",
  "isampler1D", "isampler2D", "isampler3D", "isamplerCube",
  "isampler1DArray", "isampler2DArray", "isamplerCubeArray",
  "isampler2DRect", "isamplerBuffer", "isampler2DMS", "isampler2DMSArray",
  "usampler1D", "usampler2D", "usampler3D", "usamplerCube",
  "usampler1DArray", "usampler2DArray", "usamplerCubeArray",
  "usampler2DRect", "usamplerBuffer", "usampler2DMS", "usampler2DMSArray",
  
  // Image types
  "image1D", "image2D", "image3D", "imageCube",
  "image1DArray", "image2DArray", "imageCubeArray",
  "image2DRect", "imageBuffer", "image2DMS", "image2DMSArray",
  "iimage1D", "iimage2D", "iimage3D", "iimageCube",
  "iimage1DArray", "iimage2DArray", "iimageCubeArray",
  "iimage2DRect", "iimageBuffer", "iimage2DMS", "iimage2DMSArray",
  "uimage1D", "uimage2D", "uimage3D", "uimageCube",
  "uimage1DArray", "uimage2DArray", "uimageCubeArray",
  "uimage2DRect", "uimageBuffer", "uimage2DMS", "uimage2DMSArray",
  
  // Atomic counter types
  "atomic_uint"
]

const glslBuiltins = [
  // Angle and Trigonometry Functions
  "radians", "degrees", "sin", "cos", "tan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  
  // Exponential Functions
  "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt",
  
  // Common Functions
  "abs", "sign", "floor", "trunc", "round", "roundEven", "ceil",
  "fract", "mod", "modf", "min", "max", "clamp", "mix", "step", "smoothstep",
  "isnan", "isinf", "floatBitsToInt", "floatBitsToUint", "intBitsToFloat", "uintBitsToFloat",
  "fma", "frexp", "ldexp",
  
  // Floating-Point Pack and Unpack Functions
  "packUnorm2x16", "packSnorm2x16", "packUnorm4x8", "packSnorm4x8",
  "unpackUnorm2x16", "unpackSnorm2x16", "unpackUnorm4x8", "unpackSnorm4x8",
  "packHalf2x16", "unpackHalf2x16", "packDouble2x32", "unpackDouble2x32",
  
  // Geometric Functions
  "length", "distance", "dot", "cross", "normalize", "faceforward", "reflect", "refract",
  
  // Matrix Functions
  "matrixCompMult", "outerProduct", "transpose", "determinant", "inverse",
  
  // Vector Relational Functions
  "lessThan", "lessThanEqual", "greaterThan", "greaterThanEqual", "equal", "notEqual",
  "any", "all", "not",
  
  // Integer Functions
  "uaddCarry", "usubBorrow", "umulExtended", "imulExtended",
  "bitfieldExtract", "bitfieldInsert", "bitfieldReverse", "bitCount", "findLSB", "findMSB",
  
  // Texture Functions
  "texture", "textureSize", "textureQueryLod", "textureQueryLevels",
  "textureLod", "textureOffset", "texelFetch", "texelFetchOffset",
  "textureProjOffset", "textureLodOffset", "textureProjLod", "textureProjLodOffset",
  "textureGrad", "textureGradOffset", "textureProjGrad", "textureProjGradOffset",
  "textureGather", "textureGatherOffset", "textureGatherOffsets",
  
  // Legacy texture functions
  "texture1D", "texture2D", "texture3D", "textureCube",
  "texture1DProj", "texture2DProj", "texture3DProj", "textureCubeProj",
  "texture1DLod", "texture2DLod", "texture3DLod", "textureCubeLod",
  "texture1DProjLod", "texture2DProjLod", "texture3DProjLod", "textureCubeProjLod",
  "shadow1D", "shadow2D", "shadow1DProj", "shadow2DProj",
  "shadow1DLod", "shadow2DLod", "shadow1DProjLod", "shadow2DProjLod",
  
  // Fragment Processing Functions
  "dFdx", "dFdy", "dFdxFine", "dFdyFine", "dFdxCoarse", "dFdyCoarse", "fwidth", "fwidthFine", "fwidthCoarse",
  
  // Interpolation Functions
  "interpolateAtCentroid", "interpolateAtSample", "interpolateAtOffset",
  
  // Noise Functions
  "noise1", "noise2", "noise3", "noise4",
  
  // Geometry Shader Functions
  "EmitStreamVertex", "EndStreamPrimitive", "EmitVertex", "EndPrimitive",
  
  // Shader Invocation Control Functions
  "barrier",
  
  // Shader Memory Control Functions
  "memoryBarrier", "memoryBarrierAtomicCounter", "memoryBarrierBuffer",
  "memoryBarrierShared", "memoryBarrierImage", "groupMemoryBarrier",
  
  // Atomic Memory Functions
  "atomicAdd", "atomicMin", "atomicMax", "atomicAnd", "atomicOr", "atomicXor",
  "atomicExchange", "atomicCompSwap",
  
  // Image Functions
  "imageSize", "imageLoad", "imageStore", "imageAtomicAdd", "imageAtomicMin",
  "imageAtomicMax", "imageAtomicAnd", "imageAtomicOr", "imageAtomicXor",
  "imageAtomicExchange", "imageAtomicCompSwap"
]

const glslBuiltinVariables = [
  // Vertex shader built-ins
  "gl_VertexID", "gl_InstanceID", "gl_DrawID", "gl_BaseVertex", "gl_BaseInstance",
  "gl_Position", "gl_PointSize", "gl_ClipDistance",
  
  // Tessellation control shader built-ins
  "gl_PatchVerticesIn", "gl_PrimitiveID", "gl_InvocationID",
  "gl_TessLevelOuter", "gl_TessLevelInner",
  
  // Tessellation evaluation shader built-ins
  "gl_TessCoord",
  
  // Geometry shader built-ins
  "gl_in", "gl_PrimitiveIDIn", "gl_Layer", "gl_ViewportIndex",
  
  // Fragment shader built-ins
  "gl_FragCoord", "gl_FrontFacing", "gl_ClipDistance", "gl_PointCoord",
  "gl_PrimitiveID", "gl_SampleID", "gl_SamplePosition", "gl_SampleMaskIn",
  "gl_Layer", "gl_ViewportIndex",
  "gl_FragColor", "gl_FragData", "gl_FragDepth", "gl_SampleMask",
  
  // Compute shader built-ins
  "gl_NumWorkGroups", "gl_WorkGroupSize", "gl_WorkGroupID", "gl_LocalInvocationID",
  "gl_GlobalInvocationID", "gl_LocalInvocationIndex",
  
  // Uniform state
  "gl_DepthRange"
]

// Create a custom language configuration based on C++
const glslLanguageData = cppLanguage.data.of({
  autocomplete: [
    ...glslKeywords,
    ...glslTypes, 
    ...glslBuiltins,
    ...glslBuiltinVariables
  ].map(name => ({ label: name, type: "keyword" }))
})

export const glslLanguage = LRLanguage.define({
  name: "glsl",
  parser: cppLanguage.parser,
  languageData: glslLanguageData
})

export function glsl() {
  return new LanguageSupport(glslLanguage)
}