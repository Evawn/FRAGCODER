# Styling Setup Plan for FRAGCODER

## Current State Analysis

Your app currently has:
- **Tailwind CSS** configured with shadcn/ui design system
- **Existing CSS variables** in `frontend/src/index.css` for light/dark themes (lines 6-59)
- **Hardcoded colors everywhere**: ~53 bg- classes, ~81 text- classes across 23 files
- **Inline hex colors** in `frontend/src/index.css` (lines 77-147) from Vite defaults
- **Inconsistent styling**: Mix of Tailwind utilities, inline styles, and hardcoded values

## Proposed Solution

### 1. Create a Centralized Theme Configuration

Create `frontend/src/styles/theme.ts` to define:
- Complete color palette (light & dark modes)
- Typography scale
- Spacing system
- Border radius values
- Shadow definitions
- Transition/animation settings

### 2. Update CSS Variables in index.css

- Remove conflicting Vite default styles (lines 77-147)
- Expand CSS variable definitions to cover all app needs:
  - Editor-specific colors (header, tabs, panels)
  - Shader player colors
  - Gallery/card colors
  - Status colors (success, warning, error, info)
  - Surface colors (elevated, sunken, overlay)

### 3. Extend Tailwind Config

Update `frontend/tailwind.config.js` to map all theme values to Tailwind utilities

### 4. Create Theme Provider & Hook (Optional)

- `frontend/src/contexts/ThemeContext.tsx` - for runtime theme switching
- `useTheme()` hook for components to access/toggle themes
- Persist theme preference to localStorage

### 5. Systematic Component Migration

Replace hardcoded colors in this order:
1. **Core UI components** (Button, Dialog, Dropdown - already partially themed)
2. **Editor components** (TabBar, EditorHeader, EditorFooter, etc.)
3. **Pages** (EditorPage, GalleryPage)
4. **Specialized components** (ShaderPlayer, ShaderCard, etc.)

### 6. Documentation

Create `frontend/STYLING.md` with:
- Theme structure explanation
- How to use CSS variables
- Color naming conventions
- Examples for common patterns

## Benefits

- **Single source of truth** for all colors and styles
- **Easy Figma sync** - update theme.ts from design system
- **Consistent visual language** across the app
- **Simple theme switching** capability
- **Maintainable** - change once, apply everywhere

## Next Steps After Approval

1. Create theme configuration file
2. Clean up and expand CSS variables
3. Update Tailwind config
4. Optionally add theme context/provider
5. Begin systematic component migration
6. Document the system

## Files to Create/Modify

### New Files
- `frontend/src/styles/theme.ts` - Theme configuration
- `frontend/src/contexts/ThemeContext.tsx` - Theme provider (optional)
- `frontend/STYLING.md` - Styling documentation

### Files to Modify
- `frontend/src/index.css` - Clean up and expand CSS variables
- `frontend/tailwind.config.js` - Extend with theme mappings
- All component files (23+ files) - Replace hardcoded colors

## Hardcoded Color Locations

Files with the most hardcoded colors (priority order):
1. `frontend/src/pages/EditorPage.tsx` - 6 bg-, 3 text- classes
2. `frontend/src/pages/GalleryPage.tsx` - 4 bg-, 9 text- classes
3. `frontend/src/components/editor/TabBar.tsx` - 4 bg-, 2 text- classes
4. `frontend/src/components/ShaderCard.tsx` - 3 bg-, 5 text- classes
5. `frontend/src/components/editor/EditorHeader.tsx` - 1 bg-, 1 border class
6. All dialog components (SaveAsDialog, RenameDialog, CloneDialog, etc.)
7. UI components (already partially using theme system)

## Integration with Figma

Once you provide your Figma design:
1. Extract color tokens from Figma
2. Map to CSS variable names
3. Update `theme.ts` with exact values
4. Test in both light and dark modes
5. Adjust as needed for accessibility (contrast ratios)
