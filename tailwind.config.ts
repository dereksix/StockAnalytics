import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--bg-base))',
        surface: 'rgb(var(--bg-surface))',
        elevated: 'rgb(var(--bg-elevated))',
        active: 'rgb(var(--bg-active))',
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          hover: 'rgb(var(--accent-hover))',
        },
        gain: 'rgb(var(--gain))',
        loss: 'rgb(var(--loss))',
        'border-subtle': 'rgb(var(--border-subtle))',
        'border-default': 'rgb(var(--border-default))',
        'text-primary': 'rgb(var(--text-primary))',
        'text-secondary': 'rgb(var(--text-secondary))',
        'text-tertiary': 'rgb(var(--text-tertiary))',
        'text-muted': 'rgb(var(--text-muted))',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'glow-accent': 'var(--glow-accent)',
        'glow-gain': 'var(--glow-gain)',
        'glow-loss': 'var(--glow-loss)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(248, 113, 113, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(248, 113, 113, 0.4)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
