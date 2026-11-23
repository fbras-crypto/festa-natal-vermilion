# Festa de Natal · Vermilion Group — Macau Nights

App mobile-first do evento (React + Vite + Tailwind + Lucide + Firebase Firestore).
Publicada em https://festa-natal-vermilion.netlify.app — cada alteração guardada no ramo `main` é publicada automaticamente pela Netlify.

## Onde está a parte visual
- `tailwind.config.js` — paleta de cores (vermelho Vermilion, dourado, marfim, verde-feltro) e tipos de letra
- `src/index.css` — fundos, padrão chinês (fretwork), efeito néon, animação das lanternas
- `src/App.jsx` — componentes decorativos (`Lantern`, `PokerChip`, `MahjongTile`, `ChipStack`, `PlayingCard`, `Ornament`) e o layout de cada ecrã
- Conteúdos (agenda, equipas, ementa, candidatos, contactos) estão no objeto `EVENT_DATA` no topo de `src/App.jsx`

## Correr localmente
```bash
npm install
npm run dev
```

## Notas
- PIN do painel Admin: `ADMIN_PIN` em `src/App.jsx`
- Não alterar `FIREBASE_CONFIG` (liga a app à base de dados do evento)
