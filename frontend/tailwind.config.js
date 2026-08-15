function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

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
          dark: withOpacity('--primary-dark-rgb'),
          DEFAULT: withOpacity('--primary-rgb'),
          light: withOpacity('--primary-light-rgb'),
          glow: withOpacity('--primary-glow-rgb'),
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
