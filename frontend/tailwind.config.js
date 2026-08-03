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
          deep: '#16352A',
          medium: '#1F4A38',
          light: '#2E6F54',
          pale: '#449673',
        },
        gold: {
          dark: '#B88E2F',
          DEFAULT: '#D4A93A',
          light: '#E8CD82',
          glow: '#FFECA1',
        },
        parchment: {
          DEFAULT: '#F3EAD3',
          dark: '#E5D6B3',
          light: '#FAF6ED',
        },
        offwhite: '#F6F1E3',
      },
      fontFamily: {
        adventure: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}
