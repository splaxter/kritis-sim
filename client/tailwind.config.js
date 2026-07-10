/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0a0a0a',
          'bg-secondary': '#1a1a1a',
          'bg-highlight': '#2a2a2a',
          green: '#00ff00',
          'green-dim': '#00aa00',
          'green-muted': '#006600',
          warning: '#ffaa00',
          danger: '#ff4444',
          success: '#44ff44',
          info: '#4488ff',
          border: '#333333',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      keyframes: {
        kenburns: { '0%': { transform: 'scale(1.0)' }, '100%': { transform: 'scale(1.08)' } },
      },
      animation: {
        kenburns: 'kenburns 40s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
