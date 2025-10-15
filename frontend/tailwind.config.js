import { BACKGROUND_EDITOR } from './src/styles/editor_theme.ts';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'sans': ['Roboto Mono', 'monospace'],
      'serif': ['Roboto Mono', 'monospace'],
      'mono': ['Roboto Mono', 'monospace'],
    },
    extend: {
      fontSize: {
        'small': '12px',
        'editor': '14px',
        'large': '16px',
        'title': '24px',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
      colors: {
        // Background Colors (Dark theme only)
        background: {
          DEFAULT: 'hsl(38 5% 11%)',
          header: 'hsl(38 4% 17%)',
          editor: BACKGROUND_EDITOR,
          highlighted: 'hsl(38 3% 30%)',
        },
        lines: 'hsl(38 3% 30%)',

        // Foreground/Text Colors
        foreground: {
          DEFAULT: 'hsl(218 10% 85%)',
          highlighted: 'hsl(218 10% 100%)',
          muted: 'hsl(218 10% 55%)',
        },

        // Accent Colors
        accent: {
          DEFAULT: 'hsl(38 92% 50%)',
          highlighted: 'hsl(38 92% 70%)',
          shadow: 'hsl(38 92% 30%)',
          foreground: 'hsl(38 10% 9%)',
        },

        // Semantic Colors
        success: {
          DEFAULT: 'hsl(142 50% 40%)',
          highlighted: 'hsl(142 50% 50%)',
          foreground: 'hsl(0 0% 100%)',
        },
        error: {
          DEFAULT: 'hsl(9 70% 40%)',
          highlighted: 'hsl(9 70% 30%)',
          foreground: 'hsl(218 10% 96%)',
        },
        warning: {
          DEFAULT: 'hsl(48 80% 40%)',
          highlighted: 'hsl(48 80% 80%)',
          foreground: 'hsl(0 0% 100%)',
        },
        info: {
          DEFAULT: 'hsl(199 89% 48%)',
          foreground: 'hsl(0 0% 100%)',
        },

        // UI Component Colors (shadcn/ui compatibility)
        // border: 'hsl(38 5% 26%)',
        // input: 'hsl(38 5% 26%)',
        // ring: 'hsl(38 92% 50%)',
        // card: {
        //   DEFAULT: 'hsl(38 5% 19%)',
        //   foreground: 'hsl(218 10% 85%)',
        //   border: 'hsl(38 5% 26%)',
        //   hover: 'hsl(38 5% 22%)',
        // },
        // popover: {
        //   DEFAULT: 'hsl(38 5% 19%)',
        //   foreground: 'hsl(218 10% 85%)',
        // },
        // primary: {
        //   DEFAULT: 'hsl(38 92% 50%)',
        //   foreground: 'hsl(38 10% 9%)',
        // },
        // secondary: {
        //   DEFAULT: 'hsl(38 5% 26%)',
        //   foreground: 'hsl(218 10% 96%)',
        // },
        // muted: {
        //   DEFAULT: 'hsl(38 5% 26%)',
        //   foreground: 'hsl(218 10% 55%)',
        // },
        // destructive: {
        //   DEFAULT: 'hsl(9 70% 40%)',
        //   foreground: 'hsl(218 10% 96%)',
        // },

        // // Surface variants
        // surface: {
        //   raised: 'hsl(38 5% 22%)',
        //   sunken: 'hsl(38 10% 9%)',
        //   overlay: 'hsl(0 0% 0%)',
        // },
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
