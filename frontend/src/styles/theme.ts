/**
 * Centralized theme configuration for FRAGCODER
 * Defines colors, typography, spacing, shadows, and transitions for the entire application.
 * This is the single source of truth for all design tokens.
 */

export const theme = {
  // ========================================
  // COLORS
  // ========================================
  colors: {
    // Light mode palette
    light: {
      // Base colors (inherited from shadcn/ui)
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',

      // Editor chrome
      editorBg: '0 0% 98%',
      editorHeader: '0 0% 96%',
      editorFooter: '0 0% 96%',

      // Tabs
      tabDefault: '0 0% 93%',
      tabHover: '0 0% 90%',
      tabActive: '0 0% 100%',
      tabBorder: '214.3 31.8% 91.4%',

      // Code editor
      codeEditorBg: '0 0% 99%',
      codeEditorGutter: '0 0% 95%',
      codeEditorSelection: '210 100% 95%',

      // Shader player
      playerBg: '0 0% 10%',
      playerControls: '0 0% 20%',
      playerControlsFg: '0 0% 90%',

      // Gallery & cards
      cardBg: '0 0% 100%',
      cardBorder: '214.3 31.8% 91.4%',
      cardHover: '0 0% 98%',

      // Status colors
      success: '142 76% 36%',
      successForeground: '0 0% 100%',
      warning: '38 92% 50%',
      warningForeground: '0 0% 100%',
      error: '0 84.2% 60.2%',
      errorForeground: '210 40% 98%',
      info: '199 89% 48%',
      infoForeground: '0 0% 100%',

      // Surface variants
      surfaceRaised: '0 0% 100%',
      surfaceSunken: '0 0% 96%',
      overlay: '0 0% 0%',
    },

    // Dark mode palette
    dark: {
      // Base colors (inherited from shadcn/ui)
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',

      // Editor chrome
      editorBg: '220 13% 13%',
      editorHeader: '220 13% 11%',
      editorFooter: '220 13% 11%',

      // Tabs
      tabDefault: '220 13% 15%',
      tabHover: '220 13% 18%',
      tabActive: '220 13% 21%',
      tabBorder: '217.2 32.6% 17.5%',

      // Code editor
      codeEditorBg: '220 13% 18%',
      codeEditorGutter: '220 13% 13%',
      codeEditorSelection: '217 89% 25%',

      // Shader player
      playerBg: '0 0% 8%',
      playerControls: '220 13% 15%',
      playerControlsFg: '210 40% 98%',

      // Gallery & cards
      cardBg: '220 13% 16%',
      cardBorder: '217.2 32.6% 20%',
      cardHover: '220 13% 18%',

      // Status colors
      success: '142 76% 36%',
      successForeground: '0 0% 100%',
      warning: '38 92% 50%',
      warningForeground: '0 0% 0%',
      error: '0 62.8% 30.6%',
      errorForeground: '210 40% 98%',
      info: '199 89% 48%',
      infoForeground: '0 0% 100%',

      // Surface variants
      surfaceRaised: '220 13% 18%',
      surfaceSunken: '220 13% 10%',
      overlay: '0 0% 0%',
    },
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================
  typography: {
    // Font families
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"Fira Code", "JetBrains Mono", "Monaco", "Cascadia Code", "Consolas", monospace',
    },

    // Font sizes
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    },

    // Font weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    // Line heights
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // ========================================
  // SPACING
  // ========================================
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // ========================================
  // BORDER RADIUS
  // ========================================
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px',
  },

  // ========================================
  // SHADOWS
  // ========================================
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // ========================================
  // TRANSITIONS
  // ========================================
  transitions: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },

  // ========================================
  // Z-INDEX SCALE
  // ========================================
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

export type Theme = typeof theme;
