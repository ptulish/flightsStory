/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0e1a',
          soft: '#0f1424',
          card: '#141a2e',
          elevated: '#1a2138',
        },
        line: '#222b45',
        ink: {
          DEFAULT: '#e7ecf5',
          muted: '#8a93ad',
          dim: '#5b6480',
        },
        brand: {
          50: '#eef3ff',
          100: '#dde7ff',
          200: '#bccfff',
          300: '#8eaeff',
          400: '#5e85ff',
          500: '#3b62ff',
          600: '#2545eb',
          700: '#1d34c2',
          800: '#1d2f99',
          900: '#1c2d7a',
        },
        accent: {
          cyan: '#22d3ee',
          violet: '#a78bfa',
          pink: '#f472b6',
          emerald: '#34d399',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(94,133,255,.25), 0 10px 40px -10px rgba(94,133,255,.35)',
        card: '0 1px 0 rgba(255,255,255,.03) inset, 0 12px 30px -16px rgba(0,0,0,.6)',
      },
      backgroundImage: {
        'grid': 'radial-gradient(rgba(94,133,255,.08) 1px, transparent 1px)',
        'aurora':
          'radial-gradient(60% 80% at 20% 0%, rgba(59,98,255,.25) 0%, transparent 60%), radial-gradient(50% 60% at 90% 10%, rgba(167,139,250,.18) 0%, transparent 60%), radial-gradient(40% 60% at 50% 100%, rgba(34,211,238,.14) 0%, transparent 60%)',
      },
      animation: {
        'fade-in': 'fade-in .4s ease both',
        'fade-up': 'fade-up .5s cubic-bezier(.2,.7,.2,1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'arc-dash': 'arc-dash 4s linear infinite',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'arc-dash': {
          to: { strokeDashoffset: -40 },
        },
      },
    },
  },
  plugins: [],
};
