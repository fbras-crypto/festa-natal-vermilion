/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vermilion: { DEFAULT: '#E34234', dark: '#C2321F', light: '#F06A5E' },
        ink: { DEFAULT: '#140A0B', soft: '#241314' },
        gold: { DEFAULT: '#F59E0B', light: '#FCD34D', deep: '#B7791F' },
        ivory: '#F7F1E3',
        jade: { DEFAULT: '#0E3B3A', light: '#16524F' },
        lacquer: '#7A1712',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
