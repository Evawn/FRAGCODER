# Edge Cases and Stress Tests

Test edge cases, corner scenarios, and stress testing for preprocessing, compilation, and error reporting.

## Test Status Tracker

| Test # | Test Name | Expected | Actual | Pass/Fail |
|--------|-----------|----------|---------|-----------|
| 1 | Line Mapping After Conditionals | ✓ Correct line number | | |
| 2 | Macro Creates Invalid GLSL | ✗ Error at expansion site | | |
| 3 | Conditional Removes mainImage | ✗ Missing mainImage error | | |
| 4 | Define Creates Syntax Error | ✗ Error points to usage | | |
| 5 | Very Long Macro Chain | ✓ Compile (slow) | | |
| 6 | Recursive Macro Limit | ✗ Max recursion error | | |
| 7 | Many Nested Conditionals | ✓ Compile | | |
| 8 | Many Macro Definitions | ✓ Compile | | |
| 9 | Empty Preprocessor Directives | ✓ Compile | | |
| 10 | Whitespace Edge Cases | ✓ Compile | | |
| 11 | Macro Parameter Edge Cases | ✓ Compile | | |
| 12 | WebGL 2.0 Precision Handling | ✓ Compile | | |
| 13 | Multiple Errors Same Line | ✗ Show all errors | | |
| 14 | Error Across Macro Expansion | ✗ Traceable error | | |
| 15 | Common Error Used in Multiple Passes | ✗ Error in all passes | | |

---

## Line Number Mapping Edge Cases (4)

### Test 1: Line Mapping After Conditionals
**Expected:** Errors report correct line in source
**Testing:** Line numbers when preprocessor removes lines

```glsl
#define FEATURE_A

#ifdef FEATURE_A
    // These 3 lines are removed by preprocessor
    // More removed lines
    // Even more removed lines
#endif

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float missingVar;  // Line 10 in source (but fewer in preprocessed)
    fragColor = vec4(missingVar);
}
```

**Notes:** Error should report line 10, not a lower line number

---

### Test 2: Macro Creates Invalid GLSL
**Expected:** Error at macro expansion location
**Testing:** Macro expands to syntactically invalid code

```glsl
#define BAD_MACRO (vec3(1.0, 2.0)  // Missing closing paren and semicolon

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 color = BAD_MACRO;  // Error should point here
    fragColor = vec4(color, 1.0);
}
```

**Notes:** Check if error points to line 4 or line 1

---

### Test 3: Conditional Removes mainImage
**Expected:** Error about missing mainImage
**Testing:** Preprocessor conditionally excludes entry point

```glsl
#define DISABLE_RENDERING

#ifndef DISABLE_RENDERING
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
#endif
```

**Notes:** Should error about missing mainImage function

---

### Test 4: Define Creates Syntax Error
**Expected:** Error points to usage location
**Testing:** Macro definition that breaks syntax

```glsl
#define SEMICOLON ;
#define BROKEN return 1.0 SEMICOLON SEMICOLON  // Double semicolon

float getValue() {
    BROKEN  // Expands to: return 1.0 ; ;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = vec4(getValue());
}
```

**Notes:** Check where syntax error is reported

---

## Performance and Limit Tests (4)

### Test 5: Very Long Macro Chain
**Expected:** Compiles (may be slow), no max recursion error
**Testing:** Deep macro dependencies without cycles

```glsl
#define A1 1.0
#define A2 (A1 + 1.0)
#define A3 (A2 + 1.0)
#define A4 (A3 + 1.0)
#define A5 (A4 + 1.0)
#define A6 (A5 + 1.0)
#define A7 (A6 + 1.0)
#define A8 (A7 + 1.0)
#define A9 (A8 + 1.0)
#define A10 (A9 + 1.0)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = A10;  // Should expand to ((((((((1.0 + 1.0) + 1.0)...
    fragColor = vec4(vec3(val / 10.0), 1.0);
}
```

**Notes:** Tests legitimate deep expansion (not circular)

---

### Test 6: Recursive Macro Limit
**Expected:** Max recursion error from preprocessor
**Testing:** Circular macro definition

```glsl
#define RECURSIVE (1.0 + RECURSIVE)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = RECURSIVE;
    fragColor = vec4(val);
}
```

**Notes:** Should hit 100 iteration limit and report error

---

### Test 7: Many Nested Conditionals
**Expected:** Compiles successfully
**Testing:** Deep conditional nesting

```glsl
#define L1
#define L2
#define L3
#define L4
#define L5

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float value = 0.0;

    #ifdef L1
        value += 0.2;
        #ifdef L2
            value += 0.2;
            #ifdef L3
                value += 0.2;
                #ifdef L4
                    value += 0.2;
                    #ifdef L5
                        value += 0.2;
                    #endif
                #endif
            #endif
        #endif
    #endif

    fragColor = vec4(vec3(value), 1.0);
}
```

**Notes:** Tests nested conditionals (10+ levels)

---

### Test 8: Many Macro Definitions
**Expected:** Compiles successfully
**Testing:** Large number of macros

```glsl
#define M01 0.01
#define M02 0.02
#define M03 0.03
#define M04 0.04
#define M05 0.05
#define M06 0.06
#define M07 0.07
#define M08 0.08
#define M09 0.09
#define M10 0.10
#define M11 0.11
#define M12 0.12
#define M13 0.13
#define M14 0.14
#define M15 0.15
#define M16 0.16
#define M17 0.17
#define M18 0.18
#define M19 0.19
#define M20 0.20

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float sum = M01 + M02 + M03 + M04 + M05 +
                M06 + M07 + M08 + M09 + M10 +
                M11 + M12 + M13 + M14 + M15 +
                M16 + M17 + M18 + M19 + M20;
    fragColor = vec4(vec3(sum), 1.0);
}
```

**Notes:** Tests many macro definitions (50+ if extended)

---

## Preprocessor Quirks (3)

### Test 9: Empty Preprocessor Directives
**Expected:** Compiles successfully
**Testing:** Edge cases in directive parsing

```glsl
#define EMPTY
#define SPACE

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    #ifdef EMPTY
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    #else
        fragColor = vec4(0.0, 1.0, 0.0, 1.0);
    #endif
}
```

**Notes:** Empty and whitespace-only macro values

---

### Test 10: Whitespace Edge Cases
**Expected:** Compiles successfully
**Testing:** Whitespace handling in macros

```glsl
#define   SPACED   1.0
#define MULTILINE(a, b) \
    ((a) + (b))

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = MULTILINE(
        SPACED,
        2.0
    );
    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** Extra spaces, tabs, multi-line macros

---

### Test 11: Macro Parameter Edge Cases
**Expected:** Compiles successfully
**Testing:** Complex macro parameter scenarios

```glsl
#define COMPLEX(a, b) ((a) * (b) + ((a) - (b)))

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Nested macro calls
    float val = COMPLEX(
        COMPLEX(uv.x, uv.y),
        COMPLEX(uv.y, uv.x)
    );

    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** Nested macro calls with complex expressions

---

## WebGL-Specific Tests (1)

### Test 12: WebGL 2.0 Precision Handling
**Expected:** Compiles successfully
**Testing:** Precision handling in WebGL 2.0 (GLSL ES 3.00)

```glsl
precision highp float;
precision lowp int;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    highp vec2 uv = fragCoord / iResolution.xy;
    mediump float val = sin(uv.x * 10.0);
    lowp int count = 5;

    for (lowp int i = 0; i < count; i++) {
        val *= 0.9;
    }

    fragColor = vec4(vec3(val), 1.0);
}
```

**Notes:** Multiple precision qualifiers, should use user's precision

---

## Complex Error Scenarios (3)

### Test 13: Multiple Errors Same Line
**Expected:** All errors reported
**Testing:** Multiple issues on single line

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float a = undefinedA + undefinedB + undefinedC;
    fragColor = vec4(a);
}
```

**Notes:** Should report all three undefined identifiers

---

### Test 14: Error Across Macro Expansion
**Expected:** Error traceable to source
**Testing:** Type error in macro expansion

```glsl
#define VEC4_FROM_FLOAT(x) vec4(x)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Pass vec3 where float expected - type error in macro
    fragColor = VEC4_FROM_FLOAT(vec3(1.0, 0.5, 0.2));
}
```

**Notes:** Check if error points to macro definition or usage

---

### Test 15: Common Error Used in Multiple Passes
**Expected:** Error shows in all passes that use Common
**Testing:** Error propagation from Common to all passes

**Common Tab:**
```glsl
float brokenFunction() {
    return notDefined;  // Error in Common
}
```

**Buffer A Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = brokenFunction();
    fragColor = vec4(val);
}
```

**Image Tab:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float val = brokenFunction();
    fragColor = vec4(val);
}
```

**Notes:** Error should appear in both Buffer A and Image (or just Common)

---

## Additional Manual Testing Checklist

Beyond these test cases, manually verify:

### Error Display
- [ ] Error decorations appear immediately on compile
- [ ] Error decorations clear when error is fixed
- [ ] Multiple errors show without overlap
- [ ] Error messages are readable and helpful
- [ ] Clicking error navigates to correct line
- [ ] Errors persist when switching tabs and back

### Tab Behavior
- [ ] Errors in Image tab only show in Image
- [ ] Errors in Buffer A only show in Buffer A
- [ ] Errors in Common show in Common tab
- [ ] Switching tabs preserves error state
- [ ] Compiling one tab doesn't clear errors in other tabs

### Preprocessor Integration
- [ ] Preprocessor errors prevent compilation
- [ ] Preprocessor errors show before GLSL errors
- [ ] Preprocessor errors have different styling (if applicable)
- [ ] Line mapping works with macros
- [ ] Line mapping works with conditionals

### Performance
- [ ] Large shaders compile in reasonable time
- [ ] Many macros don't cause lag
- [ ] Deep conditionals don't cause lag
- [ ] Error display is fast (< 100ms)

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] WebGL 2.0 context creation succeeds

---

## Testing Notes

- These tests are more complex and may require careful analysis
- Pay special attention to line number mapping
- Check error messages for clarity and usefulness
- Document unexpected behavior thoroughly
- Some tests may reveal limitations or bugs - that's expected!
- Mark Pass/Fail in status table above
