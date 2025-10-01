# GLSL Preprocessor Examples

The ShaderEditor now supports macro preprocessing and conditional compilation! Here are some examples to get you started.

## Basic Macro Definition

```glsl
#define PI 3.14159265359
#define TWO_PI 6.28318530718

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float angle = uv.x * TWO_PI;
    float wave = sin(angle + iTime);
    fragColor = vec4(vec3(wave * 0.5 + 0.5), 1.0);
}
```

## Function-Like Macros

```glsl
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define CLAMP(x, minVal, maxVal) MIN(MAX(x, minVal), maxVal)
#define SMOOTHSTEP(edge0, edge1, x) CLAMP((x - edge0) / (edge1 - edge0), 0.0, 1.0)

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float value = SMOOTHSTEP(0.3, 0.7, uv.x);
    fragColor = vec4(vec3(value), 1.0);
}
```

## Conditional Compilation

```glsl
// Toggle features on/off
#define ENABLE_ANIMATION
#define HIGH_QUALITY

#ifdef ENABLE_ANIMATION
    #define TIME_FACTOR 1.0
#else
    #define TIME_FACTOR 0.0
#endif

#ifdef HIGH_QUALITY
    #define ITERATIONS 100
#else
    #define ITERATIONS 50
#endif

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float t = iTime * TIME_FACTOR;

    vec3 color = vec3(0.0);
    for (int i = 0; i < ITERATIONS; i++) {
        float fi = float(i) / float(ITERATIONS);
        color += vec3(sin(t + fi * 6.28), cos(t + fi * 3.14), sin(t * 2.0 + fi));
    }
    color /= float(ITERATIONS);

    fragColor = vec4(color * 0.5 + 0.5, 1.0);
}
```

## Platform/Feature Detection

```glsl
// Define platform-specific features
#define WEBGL2
#define SUPPORTS_DERIVATIVES

#ifdef SUPPORTS_DERIVATIVES
    #define USE_ANTIALIASING
#endif

#ifndef USE_ANTIALIASING
    #define AA_SAMPLES 1
#else
    #define AA_SAMPLES 4
#endif

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float d = sdCircle(uv, 0.3);

#ifdef USE_ANTIALIASING
    // Use derivatives for antialiasing
    float gradient = length(vec2(dFdx(d), dFdy(d)));
    float alpha = smoothstep(gradient, -gradient, d);
#else
    // Sharp edge
    float alpha = step(d, 0.0);
#endif

    fragColor = vec4(vec3(alpha), 1.0);
}
```

## Complex Macro Example

```glsl
// Rotation matrix macro
#define ROT2D(a) mat2(cos(a), -sin(a), sin(a), cos(a))

// Color palette macros
#define PALETTE_A vec3(0.5, 0.5, 0.5)
#define PALETTE_B vec3(0.5, 0.5, 0.5)
#define PALETTE_C vec3(1.0, 1.0, 1.0)
#define PALETTE_D vec3(0.0, 0.33, 0.67)

#define PALETTE(t) (PALETTE_A + PALETTE_B * cos(6.28318 * (PALETTE_C * t + PALETTE_D)))

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Rotate UV
    uv = ROT2D(iTime) * uv;

    // Generate pattern
    float pattern = sin(uv.x * 10.0) * cos(uv.y * 10.0);

    // Apply color palette
    vec3 color = PALETTE(pattern * 0.5 + 0.5);

    fragColor = vec4(color, 1.0);
}
```

## Nested Conditionals

```glsl
#define MODE_GRADIENT

#ifdef MODE_GRADIENT
    #define USE_COLOR
    #ifdef USE_COLOR
        #define COLOR_CHANNELS 3
    #else
        #define COLOR_CHANNELS 1
    #endif
#else
    #define COLOR_CHANNELS 1
#endif

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

#if COLOR_CHANNELS == 3
    vec3 color = vec3(uv.x, uv.y, 0.5);
    fragColor = vec4(color, 1.0);
#else
    float gray = (uv.x + uv.y) * 0.5;
    fragColor = vec4(vec3(gray), 1.0);
#endif
}
```

## Tips and Best Practices

1. **Use parentheses in macro definitions** to avoid operator precedence issues:
   ```glsl
   #define BAD a + b       // Can cause issues: 2 * BAD = 2 * a + b (not 2 * (a + b))
   #define GOOD (a + b)    // Correct: 2 * GOOD = 2 * (a + b)
   ```

2. **Macro parameters should be parenthesized** in the expansion:
   ```glsl
   #define SQUARE(x) ((x) * (x))  // Not just x * x
   ```

3. **Conditional compilation is evaluated at compile time**, so you can use it to:
   - Toggle expensive features for performance tuning
   - Enable/disable debug visualizations
   - Switch between different algorithms
   - Handle platform-specific code

4. **Macros are visible across tabs** when defined in the Common tab

5. **Use `#undef`** to remove macro definitions when needed:
   ```glsl
   #define TEMP_VALUE 42
   // ... use TEMP_VALUE ...
   #undef TEMP_VALUE
   ```

6. **Error line numbers** are automatically mapped back to your original source code, even after macro expansion!
