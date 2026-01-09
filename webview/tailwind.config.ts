import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // VSCode theme colors via CSS variables
        background: 'var(--vscode-editor-background)',
        foreground: 'var(--vscode-editor-foreground)',
        border: 'var(--vscode-panel-border)',
        input: 'var(--vscode-input-background)',
        ring: 'var(--vscode-focusBorder)',
        primary: {
          DEFAULT: 'var(--vscode-button-background)',
          foreground: 'var(--vscode-button-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--vscode-button-secondaryBackground)',
          foreground: 'var(--vscode-button-secondaryForeground)',
        },
        destructive: {
          DEFAULT: 'var(--vscode-errorForeground)',
          foreground: 'var(--vscode-editor-foreground)',
        },
        muted: {
          DEFAULT: 'var(--vscode-input-background)',
          foreground: 'var(--vscode-descriptionForeground)',
        },
        accent: {
          DEFAULT: 'var(--vscode-list-activeSelectionBackground)',
          foreground: 'var(--vscode-list-activeSelectionForeground)',
        },
        card: {
          DEFAULT: 'var(--vscode-editor-background)',
          foreground: 'var(--vscode-editor-foreground)',
        },
      },
      borderRadius: {
        lg: '6px',
        md: '4px',
        sm: '2px',
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        lg: ['14px', { lineHeight: '22px' }],
        xl: ['16px', { lineHeight: '24px' }],
      },
    },
  },
  plugins: [],
};

export default config;
