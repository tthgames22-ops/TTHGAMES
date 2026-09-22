/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        ludo: {
          red: '#EF4444',
          green: '#22C55E',
          yellow: '#F59E0B',
          blue: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
}
