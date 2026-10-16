/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16222C',
        steel: '#5B6B7A',
        mist: '#EDF0F2',
        line: '#D5DBE0',
        teal: { DEFAULT: '#0F6E7A', dark: '#0A545E' },
        forge: '#C8501E',
      },
      fontFamily: { sans: ['var(--font-plex)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
