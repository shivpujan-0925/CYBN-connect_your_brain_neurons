/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0C1B', // page background (deepest)
          900: '#0F1225', // base background
          800: '#171B33', // card surface
          700: '#1D2240', // elevated surface / hover
          600: '#2A3157', // borders on dark
        },
        paper: {
          DEFAULT: '#EDEAE3', // primary text, warm off-white
          muted: '#A6ABC4',   // secondary text
          dim: '#6E7392',     // tertiary / placeholder text
        },
        spark: {
          DEFAULT: '#F2B84B', // amber synapse spark — primary accent / CTA
          soft: '#F7D386',
          dim: '#8A6A2E',
        },
        dendrite: {
          DEFAULT: '#8B7FFF', // periwinkle — links, secondary accents, graph
          soft: '#B3ACFF',
        },
        mastered: {
          DEFAULT: '#4ECDC4', // teal — completed / mastered state
          soft: '#8FE3DC',
        },
        overdue: {
          DEFAULT: '#E8637A', // soft coral — overdue / destructive
          soft: '#F2A0B0',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(242, 184, 75, 0.35)',
        'glow-dendrite': '0 0 40px -8px rgba(139, 127, 255, 0.35)',
        card: '0 1px 0 0 rgba(237, 234, 227, 0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'node-ping': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(242, 184, 75, 0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(242, 184, 75, 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'node-ping': 'node-ping 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
