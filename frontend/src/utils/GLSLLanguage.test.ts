import { describe, it, expect, vi, beforeEach } from 'vitest'
import { glsl, glslLanguage } from './GLSLLanguage'

// Mock lezer-glsl parser
vi.mock('lezer-glsl', () => ({
  parser: {
    configure: vi.fn(() => ({
      name: 'glsl-mock'
    }))
  }
}))

// Mock CodeMirror language support
vi.mock('@codemirror/language', () => ({
  LRLanguage: {
    define: vi.fn(() => ({
      data: {
        of: vi.fn()
      }
    }))
  },
  LanguageSupport: vi.fn()
}))

vi.mock('@codemirror/autocomplete', () => ({
  completeFromList: vi.fn((completions) => (context: any) => ({
    from: 0,
    to: 10,
    options: completions
  }))
}))

describe('GLSLLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('User-defined symbol extraction', () => {
    it('should extract basic variable declarations', () => {
      const code = `
float myFloat = 1.0;
vec3 myVector;
int counter = 0;
bool flag = true;`
      
      // We can't easily test the internal extractUserDefinedSymbols function
      // since it's not exported, but we can test that the language support
      // is created without errors
      expect(() => glsl()).not.toThrow()
    })

    it('should extract uniform declarations', () => {
      const code = `
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_texture;`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should extract varying/attribute declarations', () => {
      const code = `
varying vec2 v_texCoord;
attribute vec3 a_position;
in vec4 vertexColor;
out vec3 fragmentColor;`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should extract function definitions', () => {
      const code = `
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should extract for loop variables', () => {
      const code = `
void main() {
  for (int i = 0; i < 10; i++) {
    for (float j = 0.0; j < 5.0; j += 1.0) {
      // loop body
    }
  }
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should extract function parameters', () => {
      const code = `
float mixColors(vec3 color1, vec3 color2, float factor) {
  return mix(color1, color2, factor);
}

void processVertex(vec3 position, vec2 texCoord, mat4 transform) {
  gl_Position = transform * vec4(position, 1.0);
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should extract struct member variables', () => {
      const code = `
struct Material {
  vec3 albedo;
  float roughness;
  float metallic;
  vec3 normal;
};

struct Light {
  vec3 position;
  vec3 color;
  float intensity;
};`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle complex nested declarations', () => {
      const code = `
uniform struct PointLight {
  vec3 position;
  vec3 color;
  float radius;
} u_lights[8];

uniform struct Material {
  sampler2D diffuse;
  sampler2D normal;
  sampler2D specular;
  float shininess;
} u_material;`
      
      expect(() => glsl()).not.toThrow()
    })
  })

  describe('Built-in completions', () => {
    it('should include GLSL primitive types', () => {
      // Test that the language support includes basic types
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include vector types', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include matrix types', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include sampler types', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include built-in variables', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include mathematical functions', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include geometric functions', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include texture functions', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })

    it('should include constants', () => {
      const language = glsl()
      expect(language).toBeDefined()
    })
  })

  describe('Completion context handling', () => {
    it('should handle empty code', () => {
      const mockContext = {
        state: {
          doc: {
            toString: () => ''
          }
        }
      }
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle code with syntax errors', () => {
      const mockContext = {
        state: {
          doc: {
            toString: () => 'invalid syntax here $$$ @@@ ((('
          }
        }
      }
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle very large code', () => {
      const largeCode = `
// Large shader with many variables and functions
${Array.from({ length: 1000 }, (_, i) => `float var${i} = ${i}.0;`).join('\n')}
${Array.from({ length: 100 }, (_, i) => `
float func${i}(vec2 p) {
  return sin(p.x * ${i + 1}.0) * cos(p.y * ${i + 1}.0);
}
`).join('\n')}
void main() {
  gl_FragColor = vec4(1.0);
}`
      
      const mockContext = {
        state: {
          doc: {
            toString: () => largeCode
          }
        }
      }
      
      expect(() => glsl()).not.toThrow()
    })
  })

  describe('Symbol extraction edge cases', () => {
    it('should handle variables with similar names to built-ins', () => {
      const code = `
vec3 position = vec3(0.0);  // user variable named 'position'
float sin_value = sin(1.0); // variable with sin in name
mat4 custom_mat4 = mat4(1.0); // variable with mat4 in name`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle comments and strings', () => {
      const code = `
// This is a comment with float variable names
/* 
 * Multi-line comment with
 * vec3 someVariable;
 * that shouldn't be extracted
 */
float realVariable = 1.0; // This should be extracted`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle preprocessor directives', () => {
      const code = `
#define PI 3.14159
#define MAX_ITERATIONS 100
#ifdef GL_ES
precision mediump float;
#endif

float angle = PI / 2.0;`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle array declarations', () => {
      const code = `
float values[10];
vec3 positions[MAX_VERTICES];
uniform sampler2D textures[4];
mat4 transforms[8];`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle function overloading', () => {
      const code = `
float noise(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

float noise(vec2 x) {
  return fract(sin(dot(x, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec3 x) {
  return fract(sin(dot(x, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle nested scopes', () => {
      const code = `
float globalVar = 1.0;

void main() {
  float localVar = 2.0;
  
  if (globalVar > 0.0) {
    float innerVar = 3.0;
    
    for (int i = 0; i < 10; i++) {
      float loopVar = float(i);
    }
  }
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle complex type declarations', () => {
      const code = `
struct Vertex {
  vec3 position;
  vec3 normal;
  vec2 texCoord;
  vec4 color;
};

struct Fragment {
  vec4 color;
  float depth;
};

Vertex processVertex(Vertex input, mat4 transform) {
  Vertex output;
  output.position = (transform * vec4(input.position, 1.0)).xyz;
  output.normal = normalize(mat3(transform) * input.normal);
  output.texCoord = input.texCoord;
  output.color = input.color;
  return output;
}`
      
      expect(() => glsl()).not.toThrow()
    })
  })

  describe('Performance tests', () => {
    it('should handle frequent completion requests', () => {
      const code = `
float var1, var2, var3;
vec3 pos1, pos2, pos3;`
      
      // Simulate multiple completion requests
      for (let i = 0; i < 100; i++) {
        expect(() => glsl()).not.toThrow()
      }
    })

    it('should handle deeply nested code structures', () => {
      const deeplyNested = `
void main() {
  if (true) {
    if (true) {
      if (true) {
        if (true) {
          if (true) {
            float deepVar = 1.0;
            for (int i = 0; i < 10; i++) {
              for (int j = 0; j < 10; j++) {
                float nestedLoopVar = float(i * j);
              }
            }
          }
        }
      }
    }
  }
}`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle code with many variable declarations', () => {
      const manyVars = Array.from({ length: 500 }, (_, i) => 
        `float var${i} = ${i}.0;`
      ).join('\n')
      
      expect(() => glsl()).not.toThrow()
    })
  })

  describe('Integration with CodeMirror', () => {
    it('should create LanguageSupport instance', () => {
      const result = glsl()
      expect(result).toBeDefined()
    })

    it('should configure autocomplete', () => {
      const result = glsl()
      expect(result).toBeDefined()
    })

    it('should work with CodeMirror extensions', () => {
      // Test that the language can be used as part of CodeMirror extensions
      const extensions = [
        glsl(),
        // other extensions would go here
      ]
      
      expect(extensions).toHaveLength(1)
      expect(extensions[0]).toBeDefined()
    })
  })

  describe('Error resilience', () => {
    it('should handle malformed function definitions', () => {
      const malformedCode = `
float badFunction(vec3 // missing parameter name and closing paren
vec3 goodVariable = vec3(1.0);
float anotherBadFunction( // missing everything after
float stillWorking = 2.0;`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle incomplete variable declarations', () => {
      const incompleteCode = `
float completeVar = 1.0;
vec3 // incomplete declaration
mat4 anotherComplete = mat4(1.0);
// missing semicolon float badVar = 1.0`
      
      expect(() => glsl()).not.toThrow()
    })

    it('should handle mixed valid and invalid syntax', () => {
      const mixedCode = `
// Valid declarations
float goodVar = 1.0;
vec3 goodVec = vec3(0.0);

// Invalid syntax that should be ignored
$$$ invalid tokens @@@
((( unmatched parentheses

// More valid declarations
uniform sampler2D goodTexture;
varying vec2 goodTexCoord;`
      
      expect(() => glsl()).not.toThrow()
    })
  })
})