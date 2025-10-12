# FRAGCODER Styling Guide

This document explains the styling system for FRAGCODER, including how to use themes, CSS variables, and Tailwind utilities consistently across the application.

## Overview

FRAGCODER uses a **centralized theme system** with three main components:

1. **[theme.ts](src/styles/theme.ts)** - Single source of truth for all design tokens (colors, spacing, typography, etc.)
2. **[index.css](src/index.css)** - CSS variables that map theme values and enable dark mode switching
3. **[tailwind.config.js](tailwind.config.js)** - Tailwind configuration that exposes CSS variables as utility classes

## Architecture

```
theme.ts (Design Tokens)
    ↓
index.css (CSS Variables)
    ↓
tailwind.config.js (Tailwind Utilities)
    ↓
Components (Usage)
```

---

## Using Colors

### Available Color Categories

#### 1. Base Colors (shadcn/ui)
For general UI elements:
- `background` / `foreground` - Main page background and text
- `card` / `card-foreground` - Card containers
- `primary` / `primary-foreground` - Primary actions
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Muted/disabled states
- `accent` / `accent-foreground` - Accent highlights

#### 2. Editor Chrome
For the main editor interface:
- `editor-bg` - Main editor background
- `editor-header` - Top toolbar/header
- `editor-footer` - Bottom status bar

#### 3. Tabs
For tab components:
- `tab-default` - Default tab state
- `tab-hover` - Hovered tab
- `tab-active` - Active/selected tab
- `tab-border` - Tab borders

#### 4. Code Editor
For code editing areas:
- `code-editor-bg` - Code area background
- `code-editor-gutter` - Line numbers gutter
- `code-editor-selection` - Selected text

#### 5. Shader Player
For the WebGL preview area:
- `player-bg` - Canvas/preview background
- `player-controls` - Playback controls bar
- `player-controls-fg` - Controls text/icons

#### 6. Gallery & Cards
For shader gallery and card components:
- `card-bg` - Card background
- `card-border` - Card borders
- `card-hover` - Card hover state

#### 7. Status Colors
For notifications and states:
- `success` / `success-foreground` - Success states
- `warning` / `warning-foreground` - Warning states
- `error` / `error-foreground` - Error states
- `info` / `info-foreground` - Informational states

#### 8. Surface Variants
For layering and depth:
- `surface-raised` - Elevated surfaces (modals, dropdowns)
- `surface-sunken` - Recessed areas
- `overlay` - Semi-transparent overlays

### Usage Examples

#### Background Colors
```tsx
// Editor chrome
<div className="bg-editor-header">Header</div>
<div className="bg-editor-bg">Main editor area</div>
<div className="bg-editor-footer">Footer</div>

// Tabs
<button className="bg-tab hover:bg-tab-hover data-[state=active]:bg-tab-active">
  Tab
</button>

// Cards
<div className="bg-card-bg border border-card-border hover:bg-card-hover">
  Card content
</div>

// Status
<div className="bg-success text-success-foreground">Success!</div>
<div className="bg-error text-error-foreground">Error!</div>
```

#### Text Colors
```tsx
<h1 className="text-foreground">Main heading</h1>
<p className="text-muted-foreground">Subtle text</p>
<span className="text-primary">Emphasized text</span>
<button className="text-player-controls-fg">Control label</button>
```

#### Border Colors
```tsx
<div className="border border-border">Default border</div>
<div className="border border-tab-border">Tab border</div>
<div className="border border-card-border">Card border</div>
```

---

## Dark Mode

Dark mode is automatically handled via CSS variables. To toggle dark mode:

```tsx
// In a component
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
};

// Check if dark mode is active
const isDark = document.documentElement.classList.contains('dark');
```

### Theme Persistence

To save theme preference (example implementation):

```tsx
// Save preference
localStorage.setItem('theme', isDark ? 'dark' : 'light');

// Load on mount
useEffect(() => {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
}, []);
```

---

## Typography

### Font Families

```tsx
// Sans-serif (default)
<div className="font-sans">UI text</div>

// Monospace (for code)
<code className="font-mono">const x = 42;</code>
```

### Font Sizes

Available sizes: `xs`, `sm`, `base` (default), `lg`, `xl`, `2xl`, `3xl`, `4xl`

```tsx
<p className="text-xs">Extra small</p>
<p className="text-sm">Small</p>
<p className="text-base">Base (16px)</p>
<p className="text-lg">Large</p>
<h1 className="text-4xl">Heading</h1>
```

### Font Weights

```tsx
<p className="font-normal">Normal (400)</p>
<p className="font-medium">Medium (500)</p>
<p className="font-semibold">Semibold (600)</p>
<p className="font-bold">Bold (700)</p>
```

---

## Spacing

Use consistent spacing values: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`

```tsx
// Padding
<div className="p-sm">Small padding (8px)</div>
<div className="p-md">Medium padding (16px)</div>
<div className="px-lg py-md">Mixed padding</div>

// Margins
<div className="m-sm">Small margin</div>
<div className="mb-lg">Bottom margin</div>

// Gap (for flexbox/grid)
<div className="flex gap-md">Flex items with gap</div>
```

---

## Border Radius

Available values: `none`, `sm`, `md`, `lg`, `xl`, `full`

```tsx
<button className="rounded-md">Rounded button</button>
<div className="rounded-lg">Rounded container</div>
<img className="rounded-full" />  {/* Circle */}
```

---

## Shadows

```tsx
<div className="shadow-sm">Small shadow</div>
<div className="shadow-md">Medium shadow</div>
<div className="shadow-lg">Large shadow</div>
<div className="shadow-xl">Extra large shadow</div>
<div className="shadow-inner">Inner shadow</div>
```

---

## Transitions

### Duration
```tsx
<button className="transition-fast">Fast (150ms)</button>
<button className="transition-normal">Normal (200ms)</button>
<button className="transition-slow">Slow (300ms)</button>
```

### Combined with Properties
```tsx
<button className="transition-colors duration-fast hover:bg-tab-hover">
  Hover me
</button>

<div className="transition-all duration-normal hover:scale-105">
  Animated card
</div>
```

---

## Common Patterns

### Button with Hover State
```tsx
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90
  px-md py-sm
  rounded-md
  transition-colors duration-fast
">
  Click me
</button>
```

### Card Component
```tsx
<div className="
  bg-card-bg
  border border-card-border
  hover:bg-card-hover
  rounded-lg
  p-lg
  shadow-md
  transition-colors duration-fast
">
  Card content
</div>
```

### Tab Button
```tsx
<button className="
  bg-tab
  hover:bg-tab-hover
  data-[state=active]:bg-tab-active
  border-b-2 border-tab-border
  data-[state=active]:border-primary
  px-md py-sm
  transition-colors duration-fast
">
  Tab label
</button>
```

### Status Badge
```tsx
<span className="
  bg-success text-success-foreground
  px-sm py-xs
  rounded-md
  text-xs font-medium
">
  Success
</span>

<span className="
  bg-error text-error-foreground
  px-sm py-xs
  rounded-md
  text-xs font-medium
">
  Error
</span>
```

### Modal Overlay
```tsx
<div className="
  fixed inset-0
  bg-overlay/50
  backdrop-blur-sm
  z-[1300]
">
  <div className="
    bg-surface-raised
    rounded-lg
    shadow-xl
    p-xl
    max-w-lg
    mx-auto
    mt-[20vh]
  ">
    Modal content
  </div>
</div>
```

---

## Color Naming Conventions

### HSL Format
All colors use HSL (Hue, Saturation, Lightness) format for better manipulation:

```css
/* CSS Variable */
--primary: 222.2 47.4% 11.2%;

/* Usage in Tailwind */
background-color: hsl(var(--primary));
```

### Foreground Pairing
Always pair colors with their foreground variants for accessibility:

```tsx
// ✅ Good
<div className="bg-primary text-primary-foreground">Text</div>

// ❌ Bad (may have contrast issues)
<div className="bg-primary text-foreground">Text</div>
```

### Opacity Modifiers
Use Tailwind's opacity syntax for transparency:

```tsx
<div className="bg-primary/50">50% opacity</div>
<div className="bg-overlay/80">80% opacity overlay</div>
```

---

## Z-Index Scale

Use consistent z-index values defined in [theme.ts](src/styles/theme.ts):

```tsx
// Inline styles (when needed)
<div style={{ zIndex: theme.zIndex.modal }}>Modal</div>

// Or use Tailwind arbitrary values
<div className="z-[1400]">Modal</div>
<div className="z-[1500]">Popover</div>
```

**Defined Z-Index Layers:**
- `base`: 0
- `dropdown`: 1000
- `sticky`: 1100
- `fixed`: 1200
- `modalBackdrop`: 1300
- `modal`: 1400
- `popover`: 1500
- `tooltip`: 1600

---

## Updating the Theme

### Adding a New Color

1. **Add to theme.ts**:
```typescript
// In src/styles/theme.ts
colors: {
  light: {
    newColor: '200 50% 50%',
  },
  dark: {
    newColor: '200 80% 30%',
  },
}
```

2. **Add CSS variable to index.css**:
```css
/* In src/index.css */
:root {
  --new-color: 200 50% 50%;
}

.dark {
  --new-color: 200 80% 30%;
}
```

3. **Map to Tailwind (if needed)**:
```javascript
// In tailwind.config.js
colors: {
  'new-color': 'hsl(var(--new-color))',
}
```

4. **Use in components**:
```tsx
<div className="bg-new-color">Content</div>
```

---

## Best Practices

### ✅ DO

- **Use semantic color names**: `bg-editor-header` instead of `bg-gray-800`
- **Maintain foreground pairs**: Always use matching foreground colors
- **Use CSS variables**: Enables automatic dark mode switching
- **Group related styles**: Keep background, text, and border colors together
- **Use transitions**: Add smooth hover/focus states with `transition-colors`
- **Follow spacing scale**: Use defined spacing values (`p-md`, `gap-lg`)

### ❌ DON'T

- **Avoid hardcoded colors**: Don't use `bg-blue-500` or hex colors directly
- **Don't mix systems**: Don't use both CSS variables and hardcoded Tailwind colors
- **Don't skip accessibility**: Always ensure sufficient contrast ratios
- **Don't create one-off values**: Add new values to theme instead
- **Don't use inline styles**: Use Tailwind utilities when possible

---

## Figma Integration

When syncing with Figma designs:

1. **Extract design tokens** from Figma (colors, spacing, typography)
2. **Update theme.ts** with exact HSL values
3. **Test both themes** (light and dark modes)
4. **Verify accessibility** (WCAG AA contrast ratios: 4.5:1 for text, 3:1 for UI)
5. **Document changes** in this file

### Contrast Checking
Use tools like:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Accessibility panel
- [Accessible Colors](https://accessible-colors.com/)

---

## Quick Reference

### Editor Layout
```tsx
<div className="bg-editor-bg text-foreground h-screen flex flex-col">
  <header className="bg-editor-header border-b border-border p-md">
    Header
  </header>

  <main className="flex-1 overflow-hidden">
    Main content
  </main>

  <footer className="bg-editor-footer border-t border-border p-sm">
    Footer
  </footer>
</div>
```

### Responsive Spacing
```tsx
<div className="p-md lg:p-lg xl:p-xl">
  Responsive padding
</div>
```

### Focus States
```tsx
<button className="
  focus:outline-none
  focus:ring-2
  focus:ring-ring
  focus:ring-offset-2
">
  Accessible button
</button>
```

---

## Resources

- **Theme Definition**: [src/styles/theme.ts](src/styles/theme.ts)
- **CSS Variables**: [src/index.css](src/index.css)
- **Tailwind Config**: [tailwind.config.js](tailwind.config.js)
- **Tailwind Docs**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

---

## Support

For questions or issues with the styling system:
1. Check this documentation first
2. Review [theme.ts](src/styles/theme.ts) for available tokens
3. Inspect [index.css](src/index.css) for CSS variable definitions
4. Consult [tailwind.config.js](tailwind.config.js) for utility mappings

**Last Updated**: October 2025
