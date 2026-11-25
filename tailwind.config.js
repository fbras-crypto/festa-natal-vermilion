/** @type {import('tailwindcss').Config} */
// Identidade "Uma Noite em Macau" (Figma: Vermilion | utilities › Festa de natal 15 anos)
// Os nomes dos tokens mantêm-se para não partir o App.jsx; os valores seguem o Figma.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelho das cartas e das lanternas (#C9363A no Figma)
        vermilion: { DEFAULT: '#C9363A', dark: '#8E2228', light: '#E0585C' },
        // Fundo base (#2E1E1E no Figma)
        ink: { DEFAULT: '#2E1E1E', soft: '#3D2425' },
        // Antes dourado: o Figma não usa dourado. Passa a branco/prata dos textos e filetes.
        gold: { DEFAULT: '#E2E7EA', light: '#FFFFFF', deep: '#B7BEC2' },
        // Branco das cartas
        ivory: '#FFFFFF',
        // Antes verde-feltro: passa a bordô escuro
        jade: { DEFAULT: '#4A1C1E', light: '#5E2427' },
        lacquer: '#7A1F23',
      },
      fontFamily: {
        // Mitr: sobretítulos e texto ("FESTA DE NATAL 2026", "TEATRO DA LUZ")
        sans: ['Mitr', 'system-ui', 'sans-serif'],
        // Tenor Sans: títulos ("UMA NOITE EM MACAU") e números das cartas
        display: ['"Tenor Sans"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        macau: '0.3em',
      },
    },
  },
  plugins: [],
};
