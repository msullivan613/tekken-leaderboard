import type { Config } from 'tailwindcss';

// Palette lives in CSS custom properties (src/styles/tokens.css) so the whole
// theme — including the light/dark pair — swaps without touching components.
// Note there is no global `accent`: P1/P2 are match-context only (§5.8).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        link: 'rgb(var(--link) / <alpha-value>)',
        p1: 'rgb(var(--p1) / <alpha-value>)',
        p2: 'rgb(var(--p2) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
} satisfies Config;
