/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070913', // page background in dark mode
          900: '#0D1122', // base background
          800: '#151A33', // card surface
          750: '#1C2242', // elevated card
          700: '#232B52', // hover surface
          600: '#2E386B', // borders on dark
        },
        paper: {
          DEFAULT: '#F3F4F8', // primary text on dark
          muted: '#9DA5C2',   // secondary text on dark
          dim: '#687196',     // tertiary / placeholder text
        },
        light: {
          bg: '#FAFAFC',      // light page background
          card: '#FFFFFF',    // light card surface
          elevated: '#F1F3F9',// light hover/elevated
          border: '#E2E6F0',  // light border
          ink: '#0F172A',     // light primary text
          muted: '#64748B',   // light muted text
          dim: '#94A3B8',     // light tertiary text
        },
        spark: {
          DEFAULT: '#F59E0B', // synapse amber spark — primary accent
          soft: '#FBBF24',
          glow: '#FDE68A',
          dim: '#B45309',
        },
        dendrite: {
          DEFAULT: '#6366F1', // indigo/periwinkle — links, secondary accents
          soft: '#818CF8',
          glow: '#C7D2FE',
        },
        mastered: {
          DEFAULT: '#10B981', // emerald teal — completed / mastered state
          soft: '#34D399',
          glow: '#A7F3D0',
        },
        overdue: {
          DEFAULT: '#F43F5E', // rose coral — overdue / alerts
          soft: '#FB7185',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 35px -5px rgba(245, 158, 11, 0.3)',
        'glow-dendrite': '0 0 35px -5px rgba(99, 102, 241, 0.3)',
        pill: '0 10px 30px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'pill-light': '0 10px 30px -10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 230, 240, 0.8)',
        card: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.25)',
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(15, 23, 42, 0.05)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'node-ping': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(245, 158, 11, 0)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'node-ping': 'node-ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

