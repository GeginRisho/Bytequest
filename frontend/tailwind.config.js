/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jungle: {
          deep: '#FDFBF7',      // Warm off-white page background
          medium: '#FFFFFF',    // Content card backgrounds
          light: '#E2E8F0',     // Inactive borders / dividers
          pale: '#64748B',      // Dim slate text labels
        },
        gold: {
          dark: '#991B1B',      // Crimson dark red accent (error / active state)
          DEFAULT: '#D32F2F',   // Main brand scarlet red (decorative elements / buttons)
          light: '#EF4444',     // Bright red hover state
          glow: '#D32F2F',
        },
        parchment: {
          DEFAULT: '#FFFFFF',
          dark: '#F5F5F5',
          light: '#FAFAFA',
        },
        offwhite: '#1E293B',    // High-contrast slate-900 text for light surfaces
      },
      fontFamily: {
        adventure: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        code: ['"Fira Code"', 'monospace'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}
