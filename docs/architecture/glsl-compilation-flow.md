# GLSL Compilation Flow

<!--
PURPOSE: Document how GLSL shader code is compiled and rendered.

SHOULD CONTAIN:
- Overview of the compilation pipeline
- How user code is wrapped with boilerplate
- WebGL context setup and shader program creation
- Error parsing and line number mapping
- Multi-pass rendering support
- Uniform variables and their purposes (iTime, iResolution, etc.)
- Performance considerations

REFERENCE: See frontend/src/utils/GLSLCompiler.ts and WebGL rendering code
-->
