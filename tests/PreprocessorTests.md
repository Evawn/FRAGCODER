# Preprocessor Tests

Test GLSL preprocessor functionality including macros, conditionals, and preprocessor error handling.

## Test Status Tracker

| Test # | Test Name | Expected | Actual | Pass/Fail |
|--------|-----------|----------|---------|-----------|
| 1 | Simple Define | ✓ Compile | | |
| 2 | Function-like Macro | ✓ Compile | | |
| 3 | Macro with Expressions | ✓ Compile | | |
| 4 | Nested Macro Expansion | ✓ Compile | | |
| 5 | Macro Redefinition | ✓ Compile | | |
| 6 | Flag Macro | ✓ Compile | | |
| 7 | Complex Function Macro | ✓ Compile | | |
| 8 | Multiple Macros | ✓ Compile | | |
| 9 | ifdef True | ✓ Compile | | |
| 10 | ifdef False | ✓ Compile | | |
| 11 | ifndef True | ✓ Compile | | |
| 12 | if Expression | ✓ Compile | | |
| 13 | if with Comparison | ✓ Compile | | |
| 14 | elif Chain | ✓ Compile | | |
| 15 | else Branch | ✓ Compile | | |
| 16 | Nested Conditionals | ✓ Compile | | |
| 17 | defined() in Expression | ✓ Compile | | |
| 18 | Complex Boolean Logic | ✓ Compile | | |
| 19 | Unclosed Conditional | ✗ Preprocessor Error | | |
| 20 | Unmatched endif | ✗ Preprocessor Error | | |

---

## Macro Tests (8)

### Test 1: Simple Define
**Expected:** Compiles successfully, PI expands to 3.14159
**Testing:** Basic constant macro

```glsl
#define PI 3.14159

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float angle = PI * 2.0;
    vec2 uv = fragCoord / iResolution.xy;
    float wave = sin(uv.x * angle);
    fragColor = vec4(vec3(wave), 1.0);
}
```

**Notes:** PI should be replaced with 3.14159 everywhere

---

### Test 2: Function-like Macro
**Expected:** Compiles successfully
**Testing:** Macro with parameters

```glsl
#define MAX(a, b) ((a) > (b) ? (a) : (b))

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float val = MAX(uv.x, uv.y);
    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** Tests function-like macro expansion with proper parenthesization

---

### Test 3: Macro with Expressions
**Expected:** Compiles successfully
**Testing:** Macro containing complex expression

```glsl
#define SCALE(x) ((x) * 2.0 + 1.0)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float scaled = SCALE(uv.x);
    fragColor = vec4(vec3(scaled), 1.0);
}
```

**Notes:** Ensures proper parenthesization in expansion

---

### Test 4: Nested Macro Expansion
**Expected:** Compiles successfully
**Testing:** Macro that uses another macro

```glsl
#define PI 3.14159
#define TWO_PI (PI * 2.0)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float angle = uv.x * TWO_PI;
    float wave = sin(angle);
    fragColor = vec4(vec3(wave), 1.0);
}
```

**Notes:** TWO_PI should expand to (3.14159 * 2.0)

---

### Test 5: Macro Redefinition
**Expected:** Compiles successfully
**Testing:** Define, undef, and redefine macro

```glsl
#define VALUE 1.0
#undef VALUE
#define VALUE 2.0

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = VALUE;
    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** VALUE should be 2.0 in final code

---

### Test 6: Flag Macro
**Expected:** Compiles successfully
**Testing:** Macro with no value (flag)

```glsl
#define DEBUG

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef DEBUG
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #else
        fragColor = vec4(0.0, 1.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Should output red (DEBUG is defined)

---

### Test 7: Complex Function Macro
**Expected:** Compiles successfully
**Testing:** Multi-parameter macro with nested operations

```glsl
#define CIRCLE(p, center, radius) (length((p) - (center)) < (radius))

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5, 0.5);

    if (CIRCLE(uv, center, 0.3)) {
        fragColor = vec4(1.0, 1.0, 0.0, 1.0);
    } else {
        fragColor = vec4(0.2, 0.2, 0.2, 1.0);
    }
}
```

**Notes:** Tests macro with 3 parameters

---

### Test 8: Multiple Macros
**Expected:** Compiles successfully
**Testing:** Using many macros together

```glsl
#define PI 3.14159
#define SQRT2 1.41421
#define E 2.71828
#define PHI 1.61803
#define SCALE(x) ((x) * 2.0)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float val = SCALE(sin(uv.x * PI) + cos(uv.y * PHI));
    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** Tests multiple macro definitions and expansions

---

## Conditional Compilation Tests (10)

### Test 9: ifdef True
**Expected:** Compiles successfully, outputs red
**Testing:** ifdef when macro is defined

```glsl
#define FEATURE_ENABLED

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef FEATURE_ENABLED
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Should include code inside ifdef block

---

### Test 10: ifdef False
**Expected:** Compiles successfully, outputs black
**Testing:** ifdef when macro is not defined

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    #ifdef FEATURE_NOT_DEFINED
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Should exclude code inside ifdef block

---

### Test 11: ifndef True
**Expected:** Compiles successfully, outputs green
**Testing:** ifndef (inverse of ifdef)

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifndef FEATURE_NOT_DEFINED
        fragColor = vec4(0.0, 1.0, 0.0, 1.0);
    #else
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Should take first branch (macro not defined)

---

### Test 12: if Expression
**Expected:** Compiles successfully, outputs blue
**Testing:** #if with literal values

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if 1
        fragColor = vec4(0.0, 0.0, 1.0, 1.0);
    #else
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** #if 1 should be true, #if 0 would be false

---

### Test 13: if with Comparison
**Expected:** Compiles successfully, outputs cyan
**Testing:** #if with comparison operators

```glsl
#define VALUE 10

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if VALUE > 5
        fragColor = vec4(0.0, 1.0, 1.0, 1.0);
    #else
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Tests preprocessor expression evaluation

---

### Test 14: elif Chain
**Expected:** Compiles successfully, outputs green
**Testing:** Multiple elif branches

```glsl
#define MODE 2

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if MODE == 1
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #elif MODE == 2
        fragColor = vec4(0.0, 1.0, 0.0, 1.0);
    #elif MODE == 3
        fragColor = vec4(0.0, 0.0, 1.0, 1.0);
    #else
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    #endif
}
```

**Notes:** Should take second branch (MODE == 2)

---

### Test 15: else Branch
**Expected:** Compiles successfully, outputs magenta
**Testing:** Simple if-else

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef NOT_DEFINED
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #else
        fragColor = vec4(1.0, 0.0, 1.0, 1.0);
    #endif
}
```

**Notes:** Should take else branch

---

### Test 16: Nested Conditionals
**Expected:** Compiles successfully, outputs yellow
**Testing:** Conditional inside another conditional

```glsl
#define OUTER_ENABLED
#define INNER_ENABLED

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef OUTER_ENABLED
        #ifdef INNER_ENABLED
            fragColor = vec4(1.0, 1.0, 0.0, 1.0);
        #else
            fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        #endif
    #else
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Both conditions true, should output yellow

---

### Test 17: defined() in Expression
**Expected:** Compiles successfully, outputs white
**Testing:** Using defined() function in #if

```glsl
#define FEATURE_A
#define FEATURE_B

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if defined(FEATURE_A) && defined(FEATURE_B)
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    #else
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Both macros defined, condition should be true

---

### Test 18: Complex Boolean Logic
**Expected:** Compiles successfully, outputs orange
**Testing:** Complex preprocessor expressions

```glsl
#define A
#define B
// C is not defined

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #if (defined(A) || defined(B)) && !defined(C)
        fragColor = vec4(1.0, 0.5, 0.0, 1.0);
    #else
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** (true || true) && !false = true

---

## Preprocessor Error Tests (2)

### Test 19: Unclosed Conditional
**Expected:** Preprocessor error about missing #endif
**Testing:** Conditional without matching #endif

```glsl
#define TEST

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef TEST
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // Missing #endif here!
}
```

**Notes:** Should report preprocessor error about unclosed conditional

---

### Test 20: Unmatched endif
**Expected:** Preprocessor error about unmatched #endif
**Testing:** #endif without opening conditional

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Should report preprocessor error about #endif without #if

---

## Testing Notes

- Test preprocessor functionality in Image tab (single-pass)
- Verify macros expand correctly (check error messages for expanded code if compilation fails)
- For conditional tests, verify correct branch is taken by checking output color
- Preprocessor errors should appear before compilation and prevent shader compilation
- Mark Pass/Fail in the status table above
- Note any unexpected behavior in the Actual column
