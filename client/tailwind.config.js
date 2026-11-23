/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
        sans: ['"Kantumruy Pro"', 'system-ui', 'sans-serif'],
      },
      colors: {
        khmer: {
          gold: '#f5b82e',
          lotus: '#ec4899',
          jade: '#10b981',
          wood: '#5c3a21',
          cream: '#fef8e7',
        },
      },
    },
  },
  plugins: [],
};
