/** @type {import('tailwindcss').Config} */
// Identidade visual "Uma Noite em Macau" — valores tirados do Figma
// ("Vermilion | utilities" › página "Festa de natal 15 anos").
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cores do Brandbook usadas nas peças da festa
        vermilion: { DEFAULT: '#C9363A', dark: '#631B1D' }, // vermelho Vermilion · vinho (centro das fichas, fundo)
        ink: { DEFAULT: '#2E1E1E', soft: '#3A2627' }, // castanho-escuro do fundo · superfície dos cartões
        graphite: '#2E2E2E',
        mist: '#E2E7EA', // texto secundário, fios e molduras
        // Cores das peças de decoração
        card: { edge: '#AEAEAE' }, // contorno das cartas
        chip: { black: '#1E1A1A', 'black-center': '#332E2E' }, // ficha preta
        ivory: { DEFAULT: '#F9F5EC', light: '#FFFDF6', edge: '#D1C9B8' }, // face das peças de mahjong
        jade: '#116B52', // friso e 發 das peças de mahjong
        gold: '#D9982B', // dourado do dragão (só em detalhes pontuais)
      },
      fontFamily: {
        sans: ['Mitr', 'system-ui', 'sans-serif'], // texto corrido, etiquetas e "eyebrows"
        display: ['"Tenor Sans"', 'Georgia', 'serif'], // títulos e números (como nas cartas)
        hanzi: ['"Ma Shan Zheng"', '"Noto Serif SC"', 'serif'], // caracteres chineses (peças de mahjong)
      },
      letterSpacing: {
        eyebrow: '0.3em', // "FESTA DE NATAL 2026" no banner
        title: '0.08em', // "UMA NOITE EM MACAU"
      },
    },
  },
  plugins: [],
};
