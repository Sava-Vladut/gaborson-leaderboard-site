/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#04080c',
        surface: '#08111a',
        elevated: '#0d1c2a',
        line: '#132030',
        'line-bright': '#1e3550',
        accent: '#00e0ff',
        gold: '#f0b830',
        silver: '#9ab0c8',
        bronze: '#c87840',
        ink: '#dceeff',
        'ink-dim': '#7a9bb8',
        'ink-ghost': '#3a5570',
        success: '#00ff80',
        danger: '#ff3050',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        pixel: ['"PixelPurl"', 'monospace'],
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0,224,255,0.18), 0 0 40px rgba(0,224,255,0.08)',
        'glow-gold':   '0 0 20px rgba(240,184,48,0.20), 0 0 40px rgba(240,184,48,0.10)',
        'glow-silver': '0 0 16px rgba(154,176,200,0.15)',
        'glow-bronze': '0 0 16px rgba(200,120,64,0.15)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in':    'fadeIn 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2.8s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.4,0,0.2,1) forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,224,255,0.15)' },
          '50%':      { boxShadow: '0 0 24px rgba(0,224,255,0.45), 0 0 48px rgba(0,224,255,0.18)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
