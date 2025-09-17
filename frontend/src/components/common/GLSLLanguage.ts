import { LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "lezer-glsl"

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

export function glsl() {
  return new LanguageSupport(glslLanguage)
}