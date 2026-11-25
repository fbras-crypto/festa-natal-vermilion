# Festa de Natal · Vermilion Group — Uma Noite em Macau

App mobile-first do evento (React + Vite + Tailwind + Lucide + Firebase Firestore).
Publicada em https://festa-natal-vermilion.netlify.app — cada alteração guardada no ramo `main` é publicada automaticamente pela Netlify.

## Onde está a parte visual
A identidade segue o Figma "Vermilion | utilities", página "Festa de natal 15 anos" (banner de email, backdrop e peças de decoração).
- `tailwind.config.js` — cores do Brandbook (C9363A, 631B1D, 2E1E1E, 2E2E2E, E2E7EA) e das peças (marfim e verde do mahjong, dourado do dragão); tipos de letra Tenor Sans, Mitr e Ma Shan Zheng
- `src/index.css` — fundo em gradiente radial, padrão treliça, moldura dupla, coroas das cartas, baloiço das lanternas
- `src/assets/` — SVG exportados do Figma: lanterna, cartas "1·5", logótipo branco e coroas
- `src/App.jsx` — componentes decorativos (`Lantern`, `CardCrown`, `PokerChip`, `MahjongTile`, `ChipStack`, `PlayingCard`, `Ornament`) e o layout de cada ecrã
- `index.html` — carrega as fontes. A Ma Shan Zheng só traz os caracteres usados (龍虎鳳鯉獅福喜發中東八萬): se mudarem os emblemas das mesas, acrescentar os novos caracteres ao parâmetro `text=` do link
- Conteúdos (agenda, equipas, ementa, candidatos, contactos) estão no objeto `EVENT_DATA` no topo de `src/App.jsx`

## Correr localmente
```bash
npm install
npm run dev
```

## Notas
- PIN do painel Admin: `ADMIN_PIN` em `src/App.jsx`
- Não alterar `FIREBASE_CONFIG` (liga a app à base de dados do evento)
