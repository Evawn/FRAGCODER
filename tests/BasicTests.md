# Basic GLSL Compilation Tests

Test basic GLSL compilation functionality without preprocessor or multipass features.

## Test Status Tracker

| Test # | Test Name | Expected | Actual | Pass/Fail |
|--------|-----------|----------|---------|-----------|
| 1 | Minimal Valid Shader | ✓ Compile     | ✓ Compile | |
| 2 | With User Precision | ✓ Compile      | ✓ Compile | |
| 3 | Multiple Functions | ✓ Compile       | ✓ Compile | |
| 4 | Vector Operations | ✓ Compile        | ✓ Compile | |
| 5 | Math Functions | ✓ Compile           | ✓ Compile | |
| 6 | Uniform Usage | ✓ Compile            | ✓ Compile | |
| 7 | Texture Sampling | ✓ Compile         | ✓ Compile | |
| 8 | Complex Types | ✓ Compile            | ✓ Compile | |
| 9 | Control Flow | ✓ Compile             | ✓ Compile | |
| 10 | Built-in Variables | ✓ Compile      | ✓ Compile | |
| 11 | Missing mainImage | ✗ Compile Error |  "No matching function signature found"| x |
| 12 | Wrong mainImage Signature | ✗ Compile Error | ✓ Compile | x |
| 13 | Undeclared Variable | ✗ Compile Error       | | |
| 14 | Type Mismatch | ✗ Compile Error             | | |
| 15 | Missing Semicolon | ✗ Compile Error         | | |
| 16 | Invalid Function Call | ✗ Compile Error     | | |
| 17 | Invalid Swizzle | ✗ Compile Error           | | |
| 18 | Read-only Assignment | ✗ Compile Error      | | |
| 19 | Array Out of Bounds | ✗ Compile Error       | | |
| 20 | Redefinition | ✗ Compile Error              | | |

---

## Tests That Should Compile (10)

### Test 1: Minimal Valid Shader
**Expected:** Compiles successfully
**Testing:** Basic shader structure with minimal code

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** Most basic valid shader - outputs solid red

---

### Test 2: With User Precision
**Expected:** Compiles successfully
**Testing:** User-defined precision qualifier

```glsl
precision highp float;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float value = 0.123456789;
    fragColor = vec4(value, value, value, 1.0);
}
```

**Notes:** Tests that custom precision is properly extracted and used

---

### Test 3: Multiple Functions
**Expected:** Compiles successfully
**Testing:** Helper functions calling each other

```glsl
float square(float x) {
    return x * x;
}

float distance2D(vec2 a, vec2 b) {
    vec2 diff = a - b;
    return sqrt(square(diff.x) + square(diff.y));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float dist = distance2D(fragCoord, iResolution.xy * 0.5);
    fragColor = vec4(vec3(dist / 500.0), 1.0);
}
```

**Notes:** Tests function declarations and calls

---

### Test 4: Vector Operations
**Expected:** Compiles successfully
**Testing:** Swizzling, dot products, cross products

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec3 a = vec3(uv, 0.5);
    vec3 b = vec3(uv.yx, 0.3);

    float dotProd = dot(a, b);
    vec3 crossProd = cross(a, b);

    fragColor = vec4(crossProd * dotProd, 1.0);
}
```

**Notes:** Tests vector math operations

---

### Test 5: Math Functions
**Expected:** Compiles successfully
**Testing:** Common GLSL math functions

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float r = sin(iTime + uv.x * 6.28);
    float g = cos(iTime + uv.y * 6.28);
    float b = mix(r, g, 0.5);
    float a = smoothstep(0.0, 1.0, uv.x);

    fragColor = vec4(r, g, b, a);
}
```

**Notes:** Tests sin, cos, mix, smoothstep

---

### Test 6: Uniform Usage
**Expected:** Compiles successfully
**Testing:** Using iTime, iResolution, iDate, iFrame

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float time = iTime * 0.5;
    float pulse = sin(float(iFrame) * 0.1);
    float dayTime = iDate.w / 86400.0;

    vec3 col = vec3(uv.x + time, uv.y + pulse, dayTime);
    fragColor = vec4(col, 1.0);
}
```

**Notes:** Tests all standard Shadertoy uniforms

---

### Test 7: Texture Sampling
**Expected:** Compiles successfully
**Testing:** Reading from BufferA-D textures

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    vec4 bufA = texture(BufferA, uv);
    vec4 bufB = texture(BufferB, uv);
    vec4 bufC = texture(BufferC, uv);
    vec4 bufD = texture(BufferD, uv);

    fragColor = (bufA + bufB + bufC + bufD) * 0.25;
}
```

**Notes:** Tests buffer texture sampling

---

### Test 8: Complex Types
**Expected:** Compiles successfully
**Testing:** Structs and arrays

```glsl
struct Ray {
    vec3 origin;
    vec3 direction;
};

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    Ray rays[3];
    rays[0] = Ray(vec3(0.0), vec3(1.0, 0.0, 0.0));
    rays[1] = Ray(vec3(0.0), vec3(0.0, 1.0, 0.0));
    rays[2] = Ray(vec3(0.0), vec3(0.0, 0.0, 1.0));

    vec3 color = rays[0].direction + rays[1].direction + rays[2].direction;
    fragColor = vec4(color, 1.0);
}
```

**Notes:** Tests struct definition, arrays, member access

---

### Test 9: Control Flow
**Expected:** Compiles successfully
**Testing:** if/else, for loops, while loops

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec3 color = vec3(0.0);

    if (uv.x < 0.5) {
        color.r = 1.0;
    } else {
        color.b = 1.0;
    }

    for (int i = 0; i < 5; i++) {
        color.g += 0.1;
    }

    int j = 0;
    while (j < 3) {
        color *= 0.9;
        j++;
    }

    fragColor = vec4(color, 1.0);
}
```

**Notes:** Tests various control flow constructs

---

### Test 10: Built-in Variables
**Expected:** Compiles successfully
**Testing:** gl_FragCoord usage

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // fragCoord is passed in, but gl_FragCoord is also available
    vec2 screenPos = gl_FragCoord.xy;
    vec2 uv = screenPos / iResolution.xy;

    fragColor = vec4(uv, 0.5, 1.0);
}
```

**Notes:** Tests that gl_FragCoord is accessible

---

## Tests That Should Fail (10)

### Test 11: Missing mainImage
**Expected:** Compilation error (no mainImage function)
**Testing:** Error when entry point is missing

```glsl
void someOtherFunction(out vec4 color, in vec2 coord) {
    color = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** Should fail with error about missing mainImage

---

### Test 12: Wrong mainImage Signature
**Expected:** Compilation error (signature mismatch)
**Testing:** Incorrect parameters for mainImage

```glsl
void mainImage(vec4 fragColor, vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** Missing 'out' and 'in' qualifiers - should fail

---

### Test 13: Undeclared Variable
**Expected:** Compilation error (undeclared identifier)
**Testing:** Reference to undefined variable

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(undefinedVariable, 0.0, 0.0, 1.0);
}
```

**Notes:** Should report error on line with undefinedVariable

---

### Test 14: Type Mismatch
**Expected:** Compilation error (type mismatch)
**Testing:** Assigning incompatible types

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 color = vec4(1.0, 0.0, 0.0, 1.0);
    fragColor = vec4(color, 1.0);
}
```

**Notes:** Cannot assign vec4 to vec3

---

### Test 15: Missing Semicolon
**Expected:** Compilation error (syntax error)
**Testing:** Missing statement terminator

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 color = vec3(1.0, 0.0, 0.0)
    fragColor = vec4(color, 1.0);
}
```

**Notes:** Missing semicolon after vec3 assignment

---

### Test 16: Invalid Function Call
**Expected:** Compilation error (no matching function)
**Testing:** Wrong number/type of arguments

```glsl
float add(float a, float b) {
    return a + b;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float result = add(1.0, 2.0, 3.0);
    fragColor = vec4(result);
}
```

**Notes:** add() expects 2 args, given 3

---

### Test 17: Invalid Swizzle
**Expected:** Compilation error (invalid component)
**Testing:** Using .w on vec3

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 color = vec3(1.0, 0.0, 0.0);
    float alpha = color.w;
    fragColor = vec4(color, alpha);
}
```

**Notes:** vec3 doesn't have .w component

---

### Test 18: Read-only Assignment
**Expected:** Compilation error (cannot assign to read-only)
**Testing:** Trying to modify gl_FragCoord

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    gl_FragCoord.x = 100.0;
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** gl_FragCoord is read-only

---

### Test 19: Array Out of Bounds (Constant)
**Expected:** Compilation error or warning (index out of bounds)
**Testing:** Accessing array with invalid constant index

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float values[3] = float[3](1.0, 2.0, 3.0);
    float val = values[5];
    fragColor = vec4(val);
}
```

**Notes:** Array index 5 out of bounds for size 3 (some compilers may only warn)

---

### Test 20: Redefinition
**Expected:** Compilation error (redefinition)
**Testing:** Declaring same variable twice

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float value = 1.0;
    float value = 2.0;
    fragColor = vec4(value);
}
```

**Notes:** Variable 'value' declared twice in same scope

---

## Testing Notes

- Copy each shader code block into the editor
- Check if compilation succeeds or fails as expected
- For failing tests, verify error message is clear and points to correct line
- Mark Pass/Fail in the status table above
- Note any unexpected behavior in the Actual column
