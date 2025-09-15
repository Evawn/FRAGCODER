import { compile, Compile } from './GLSLCompiler';

// Test cases for the GLSL compiler
const testCases = [
  {
    name: 'Valid simple shader',
    code: `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`,
    shouldSucceed: true
  },
  {
    name: 'Valid shader using uniforms',
    code: `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(u_time));
  gl_FragColor = vec4(color, 1.0);
}`,
    shouldSucceed: true
  },
  {
    name: 'Valid Shadertoy-style shader',
    code: `
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 color = vec3(uv, 0.5 + 0.5 * sin(iTime));
  gl_FragColor = vec4(color, 1.0);
}`,
    shouldSucceed: true
  },
  {
    name: 'Shader with undeclared variable',
    code: `
void main() {
  gl_FragColor = vec4(undeclaredVar, 0.0, 0.0, 1.0);
}`,
    shouldSucceed: false,
    expectedError: 'Variable not declared'
  },
  {
    name: 'Shader with syntax error',
    code: `
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)
}`,
    shouldSucceed: false,
    expectedError: 'Syntax error'
  },
  {
    name: 'Shader with type mismatch',
    code: `
void main() {
  float color = vec3(1.0, 0.0, 0.0);
  gl_FragColor = vec4(color, 1.0);
}`,
    shouldSucceed: false,
    expectedError: 'Type mismatch'
  },
  {
    name: 'Empty shader',
    code: '',
    shouldSucceed: false,
    expectedError: 'Shader code is empty'
  },
  {
    name: 'Shader with custom precision',
    code: `
precision highp float;

void main() {
  gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
}`,
    shouldSucceed: true
  }
];

// Run tests
export function runTests() {
  console.log('Running GLSL Compiler tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    
    const result = compile(testCase.code);
    
    if (testCase.shouldSucceed) {
      if (result.success) {
        console.log('✓ PASSED: Compilation succeeded as expected');
        passed++;
      } else {
        console.log('✗ FAILED: Expected success but got errors:');
        result.errors.forEach(err => {
          console.log(`  Line ${err.line}: ${err.message}`);
        });
        failed++;
      }
    } else {
      if (!result.success) {
        const hasExpectedError = testCase.expectedError ? 
          result.errors.some(err => err.message.includes(testCase.expectedError)) : 
          true;
          
        if (hasExpectedError) {
          console.log('✓ PASSED: Compilation failed as expected');
          if (result.errors.length > 0) {
            console.log(`  Error: ${result.errors[0].message}`);
          }
          passed++;
        } else {
          console.log(`✗ FAILED: Expected error containing "${testCase.expectedError}" but got:`);
          result.errors.forEach(err => {
            console.log(`  Line ${err.line}: ${err.message}`);
          });
          failed++;
        }
      } else {
        console.log('✗ FAILED: Expected failure but compilation succeeded');
        failed++;
      }
    }
    
    console.log('');
  });
  
  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  
  // Test that Compile function is the same as compile
  console.log('\nTesting backward compatibility...');
  if (Compile === compile) {
    console.log('✓ Compile function is correctly exported');
  } else {
    console.log('✗ Compile function export is broken');
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testGLSLCompiler = runTests;
}