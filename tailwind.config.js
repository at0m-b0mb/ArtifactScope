/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#080b14',
          1: '#0d1220',
          2: '#131a2c',
          3: '#1a2236',
          4: '#1e2740',
        },
        primary: {
          DEFAULT: 'rgb(var(--p-600) / <alpha-value>)',
          50:  '#f5f3ff',
          100: '#ede9fe',
          400: 'rgb(var(--p-400) / <alpha-value>)',
          500: 'rgb(var(--p-500) / <alpha-value>)',
          600: 'rgb(var(--p-600) / <alpha-value>)',
          700: 'rgb(var(--p-700) / <alpha-value>)',
          900: 'rgb(var(--p-900) / <alpha-value>)',
        },
        accent: {
          DEFAULT: '#0ea5e9',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        success: { DEFAULT: '#22c55e', 400: '#4ade80', 600: '#16a34a' },
        warning: { DEFAULT: '#f59e0b', 400: '#fbbf24', 600: '#d97706' },
        danger:  { DEFAULT: '#ef4444', 400: '#f87171', 600: '#dc2626' },
        muted: '#94a3b8',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['Consolas', 'Cascadia Code', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.15s ease-out',
        'slide-left': 'slideLeft 0.15s ease-out',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                        to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideLeft: { from: { transform: 'translateX(-8px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-cyan':   '0 0 20px rgba(14, 165, 233, 0.3)',
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
