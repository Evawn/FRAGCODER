# Multi-Pass Rendering Tests

Test multi-pass functionality including Common code sharing, buffer communication, and error line mapping across passes.

## Test Status Tracker

| Test # | Test Name | Expected | Actual | Pass/Fail |
|--------|-----------|----------|---------|-----------|
| 1 | Simple Common Function | ✓ Compile | | |
| 2 | Common Constants | ✓ Compile | | |
| 3 | Common Struct | ✓ Compile | | |
| 4 | Complex Common Library | ✓ Compile | | |
| 5 | Common with Preprocessor | ✓ Compile | | |
| 6 | Buffer A to Image | ✓ Compile | | |
| 7 | Multiple Buffer Reads | ✓ Compile | | |
| 8 | Buffer Feedback Loop | ✓ Compile | | |
| 9 | Cross-Buffer Dependencies | ✓ Compile | | |
| 10 | All Buffers Active | ✓ Compile | | |
| 11 | Error in Common Code | ✗ Error in Common | | |
| 12 | Error in Image After Common | ✗ Error with correct line | | |
| 13 | Error in Buffer A with Common | ✗ Error with correct line | | |
| 14 | Preprocessor Error in Common | ✗ Preprocessor Error | | |
| 15 | Preprocessor Error in Pass | ✗ Preprocessor Error | | |

---

## Common Code Sharing Tests (5)

### Test 1: Simple Common Function
**Expected:** Compiles successfully in Image tab
**Testing:** Function defined in Common, used in Image

**Common Tab:**
```glsl
float circle(vec2 uv, vec2 center, float radius) {
    float dist = length(uv - center);
    return smoothstep(radius, radius - 0.01, dist);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float c = circle(uv, vec2(0.5, 0.5), 0.3);
    fragColor = vec4(vec3(c), 1.0);
}
```

**Notes:** Common code should be prepended to Image

---

### Test 2: Common Constants
**Expected:** Compiles successfully in Buffer A
**Testing:** #define in Common, use in Buffer A

**Common Tab:**
```glsl
#define PI 3.14159
#define TWO_PI 6.28318
```

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float angle = uv.x * TWO_PI;
    float wave = sin(angle);
    fragColor = vec4(vec3(wave), 1.0);
}
```

**Notes:** Tests preprocessor macros from Common

---

### Test 3: Common Struct
**Expected:** Compiles successfully across multiple passes
**Testing:** Struct defined in Common, used in multiple buffers

**Common Tab:**
```glsl
struct Material {
    vec3 color;
    float roughness;
    float metallic;
};

Material createMaterial(vec3 col, float rough, float metal) {
    Material mat;
    mat.color = col;
    mat.roughness = rough;
    mat.metallic = metal;
    return mat;
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    Material mat = createMaterial(vec3(1.0, 0.5, 0.2), 0.8, 0.1);
    fragColor = vec4(mat.color, 1.0);
}
```

**Notes:** Test in both Buffer A and Image tabs

---

### Test 4: Complex Common Library
**Expected:** Compiles successfully
**Testing:** Multiple functions and constants

**Common Tab:**
```glsl
#define PI 3.14159

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(2.0 * PI * (c * t + d));
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy * 10.0;
    float n = noise(uv + iTime);
    vec3 col = palette(n);
    fragColor = vec4(col, 1.0);
}
```

**Notes:** Tests multiple helper functions

---

### Test 5: Common with Preprocessor
**Expected:** Compiles successfully
**Testing:** Preprocessor conditionals in Common affecting all passes

**Common Tab:**
```glsl
#define USE_SMOOTH_NOISE

float baseNoise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

#ifdef USE_SMOOTH_NOISE
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = baseNoise(i);
    float b = baseNoise(i + vec2(1.0, 0.0));
    float c = baseNoise(i + vec2(0.0, 1.0));
    float d = baseNoise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
#else
float noise(vec2 p) {
    return baseNoise(p);
}
#endif
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy * 5.0;
    float n = noise(uv);
    fragColor = vec4(vec3(n), 1.0);
}
```

**Notes:** Tests conditional compilation in Common

---

## Buffer Communication Tests (5)

### Test 6: Buffer A to Image
**Expected:** Compiles successfully, Image reads from Buffer A
**Testing:** Basic buffer output and reading

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float pattern = sin(uv.x * 10.0) * cos(uv.y * 10.0);
    fragColor = vec4(vec3(pattern), 1.0);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 bufferData = texture(BufferA, uv);
    fragColor = bufferData * 0.5 + vec4(0.5, 0.2, 0.1, 0.0);
}
```

**Notes:** Buffer A generates pattern, Image modifies it

---

### Test 7: Multiple Buffer Reads
**Expected:** Compiles successfully
**Testing:** Image reading from multiple buffers

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv.x, 0.0, 0.0, 1.0);
}
```

**Buffer B Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(0.0, uv.y, 0.0, 1.0);
}
```

**Buffer C Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(0.0, 0.0, uv.x * uv.y, 1.0);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 a = texture(BufferA, uv);
    vec4 b = texture(BufferB, uv);
    vec4 c = texture(BufferC, uv);
    fragColor = a + b + c;
}
```

**Notes:** Tests reading from A, B, and C simultaneously

---

### Test 8: Buffer Feedback Loop
**Expected:** Compiles successfully
**Testing:** Buffer reading from itself (persistence)

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Read previous frame
    vec4 prev = texture(BufferA, uv);

    // Add a moving dot
    vec2 dotPos = vec2(sin(iTime) * 0.5 + 0.5, cos(iTime) * 0.5 + 0.5);
    float dot = length(uv - dotPos) < 0.02 ? 1.0 : 0.0;

    // Fade and accumulate
    fragColor = prev * 0.95 + vec4(dot);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = texture(BufferA, uv);
}
```

**Notes:** Creates trail effect through feedback

---

### Test 9: Cross-Buffer Dependencies
**Expected:** Compiles successfully
**Testing:** Buffer chain (A → B → Image)

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float value = sin(iTime + uv.x * 10.0);
    fragColor = vec4(vec3(value), 1.0);
}
```

**Buffer B Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 fromA = texture(BufferA, uv);
    float processed = fromA.r * 0.5 + 0.5;
    fragColor = vec4(processed, processed * 0.5, 0.0, 1.0);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 fromB = texture(BufferB, uv);
    fragColor = fromB * vec4(1.0, 2.0, 0.5, 1.0);
}
```

**Notes:** Tests processing pipeline across buffers

---

### Test 10: All Buffers Active
**Expected:** Compiles successfully with all 5 passes
**Testing:** Maximum complexity - all buffers used

**Common Tab:**
```glsl
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}
```

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float h = hash(iTime + fragCoord.x);
    fragColor = vec4(h, 0.0, 0.0, 1.0);
}
```

**Buffer B Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float h = hash(iTime + fragCoord.y);
    fragColor = vec4(0.0, h, 0.0, 1.0);
}
```

**Buffer C Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 a = texture(BufferA, uv);
    vec4 b = texture(BufferB, uv);
    fragColor = mix(a, b, 0.5);
}
```

**Buffer D Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 c = texture(BufferC, uv);
    fragColor = c * 2.0;
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 a = texture(BufferA, uv);
    vec4 b = texture(BufferB, uv);
    vec4 c = texture(BufferC, uv);
    vec4 d = texture(BufferD, uv);
    fragColor = (a + b + c + d) * 0.25;
}
```

**Notes:** Tests all 6 tabs compiling together

---

## Error Mapping Tests (5)

### Test 11: Error in Common Code
**Expected:** Error reported in Common tab
**Testing:** Line number mapping for Common errors

**Common Tab:**
```glsl
float badFunction() {
    return undefinedVariable;  // Error on this line
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = badFunction();
    fragColor = vec4(val);
}
```

**Notes:** Error should point to line 2 in Common tab

---

### Test 12: Error in Image After Common
**Expected:** Error reported at correct line in Image tab
**Testing:** Line number adjustment for Common prepending

**Common Tab:**
```glsl
float goodFunction() {
    return 1.0;
}

float anotherFunction() {
    return 2.0;
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float a = goodFunction();
    float b = anotherFunction();
    float c = undefined;  // Error should point to line 4 in Image
    fragColor = vec4(a, b, c, 1.0);
}
```

**Notes:** Verify line number doesn't include Common lines

---

### Test 13: Error in Buffer A with Common
**Expected:** Error in Buffer A at correct line
**Testing:** Multipass line mapping with Common code

**Common Tab:**
```glsl
#define PI 3.14159

float circle(vec2 uv, vec2 center, float radius) {
    return length(uv - center) < radius ? 1.0 : 0.0;
}
```

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float c = circle(uv, vec2(0.5, 0.5), 0.3);
    float bad = missingVar;  // Error on line 4 in Buffer A
    fragColor = vec4(vec3(c), 1.0);
}
```

**Notes:** Error should be line 4 in Buffer A, not counting Common

---

### Test 14: Preprocessor Error in Common
**Expected:** Preprocessor error in Common tab
**Testing:** Preprocessor error reporting for Common

**Common Tab:**
```glsl
#define PI 3.14159

#ifdef SOMETHING
    float test() { return 1.0; }
// Missing #endif - preprocessor error
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** Preprocessor error should prevent compilation, point to Common

---

### Test 15: Preprocessor Error in Pass
**Expected:** Preprocessor error in Buffer A tab
**Testing:** Preprocessor error in specific pass

**Common Tab:**
```glsl
#define PI 3.14159
```

**Buffer A Tab:**
```glsl
#ifdef TEST
    float test() { return 1.0; }
// Missing #endif

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```

**Notes:** Error should be reported in Buffer A, not Common

---

## Testing Notes

- Test each case by entering code in appropriate tabs
- For Common tests, verify the code works in multiple passes (try Image and Buffer A)
- For buffer communication, visually verify output makes sense
- For error mapping tests, carefully check:
  - Error appears in correct tab
  - Line number points to correct line in that tab
  - Line numbers don't include Common code offset
- Mark Pass/Fail in status table above
- Document any incorrect line number mappings in Actual column
