/* ============================================================================
 *  FESTA DE NATAL · VERMILION GROUP — App do evento (mobile-first)
 *  React + Tailwind CSS + Lucide React + Firebase Cloud Firestore
 * ============================================================================
 *
 *  COMO FUNCIONA O "MODO HÍBRIDO":
 *  - Enquanto o FIREBASE_CONFIG tiver os placeholders "COLAR_..._AQUI", a app
 *    arranca em MODO DEMO (dados fictícios em memória, sem erros).
 *  - Assim que colares as chaves reais do Firebase, liga-se automaticamente
 *    ao Cloud Firestore e tudo passa a sincronizar em tempo real.
 *
 *  ESTRUTURA NO FIRESTORE (criada automaticamente na primeira escrita):
 *    teams/{idEquipa}          -> { score }
 *    candidates/{idCandidato}  -> { votes, category }
 *    ballots/{ronda_dispositivo} -> registo de cada boletim (auditoria)
 *    settings/event            -> { votingOpen, showResults, voteRound }
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  Eye,
  EyeOff,
  FolderOpen,
  Gift,
  ImagePlus,
  Images,
  Lock,
  MapPin,
  Medal,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Navigation,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Upload,
  UtensilsCrossed,
  Vote,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 *  1) CONFIGURAÇÃO DO FIREBASE — cola aqui as chaves do teu projeto
 *     (Consola Firebase → Definições do projeto → As tuas apps → Web)
 * ------------------------------------------------------------------------- */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDJ-UG5aBglDSTex0FNr20ptiQ2bT4ZgtI',
  authDomain: 'festa-natal-vermilion-2026.firebaseapp.com',
  projectId: 'festa-natal-vermilion-2026',
  storageBucket: 'festa-natal-vermilion-2026.firebasestorage.app',
  messagingSenderId: '1029148346697',
  appId: '1:1029148346697:web:b5aa17f238f9e438037298',
};

/* PIN do painel de organização. Atenção: fica visível no código da página,
 * por isso serve para evitar cliques acidentais, não como segurança forte. */
const ADMIN_PIN = '2026';

/* GALERIA — as fotos originais seguem para um cenário do Make (pasta "Marketing"),
 * que as guarda no Google Drive. Uma versão leve fica no Firestore para a galeria
 * aparecer logo em todos os telemóveis. Deixa o webhook vazio para não enviar para o Drive. */
const PHOTO_UPLOAD_WEBHOOK = 'https://hook.eu2.make.com/bolfoudoljv9l4c9jsgmqvgduzg28hf0';
const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1Xx_Y8DC07OPXybn-K2iQVU4wAVB-ZKnC';
const GALLERY_MAX_FILES = 10; // fotos por envio

/* ----------------------------------------------------------------------------
 *  2) DADOS DO EVENTO — edita tudo aqui (horários, provas, ementa, equipas,
 *     candidatos, moradas e contactos). Os textos aparecem tal e qual na app.
 * ------------------------------------------------------------------------- */
const EVENT_DATA = {
  // Informação geral
  evento: {
    nome: 'Festa de Natal',
    tema: 'Macau Nights · Casino Vermilion', // tema visual da noite
    empresa: 'Vermilion Group',
    dataISO: '2026-12-11', // usado para destacar o momento "a decorrer"
    dataTexto: 'Sexta-feira, 11 de dezembro de 2026',
    mensagemBoasVindas:
      'Esta noite, o Vermilion Group muda-se para Macau: lanternas, fichas e muita sorte. Façam as vossas apostas!',
  },

  // Agenda do dia — por ordem cronológica. "local" é texto livre.
  // Horas depois da meia-noite (ex.: 00:30) contam como parte da mesma noite.
  agenda: [
    {
      hora: '14:00',
      titulo: 'Receção',
      descricao: 'Chegada, check-in e boas-vindas a todos os colaboradores.',
      local: 'Teatro da Luz',
      icone: 'gift',
    },
    {
      hora: '14:30',
      titulo: 'Kick Off',
      descricao: '14:30 Direção · 15:00 BU Mobilidade Internacional · 15:30 BU OPLS · 16:00 BU Vermilion Intelligent',
      local: 'Teatro da Luz',
      icone: 'mic',
    },
    {
      hora: '16:30',
      titulo: 'Coffee Break',
      descricao: 'Pausa para um café e dois dedos de conversa antes do Team Building.',
      local: 'Teatro da Luz',
      icone: 'coffee',
    },
    {
      hora: '17:00',
      titulo: 'Team Building',
      descricao: 'Das 17:00 às 18:00 — 5 mesas, 7 rondas no Casino Vermilion! Consulta as mesas e as rondas no separador "Team".',
      local: 'Teatro da Luz',
      icone: 'swords',
    },
    {
      hora: '18:30',
      titulo: 'Concurso Mister & Miss Vermilion',
      descricao: 'Desfile dos candidatos e votação ao vivo na app, no separador "Mister & Miss".',
      local: 'Teatro da Luz',
      icone: 'crown',
    },
    {
      hora: '20:00',
      titulo: 'Jantar de Natal',
      descricao: 'Jantar de Natal. Consulta a ementa no separador "Jantar".',
      local: 'Teatro da Luz',
      icone: 'dinner',
    },
    {
      hora: '23:00',
      titulo: 'DJ',
      descricao: 'Das 23:00 às 03:00 — pista aberta! Música e muita animação até de madrugada.',
      local: 'Teatro da Luz',
      icone: 'music',
    },
    {
      hora: '00:30',
      titulo: 'Ceia',
      descricao: 'Ceia servida durante a festa, para recarregar energias. O DJ continua até às 03:00.',
      local: 'Teatro da Luz',
      icone: 'moon',
    },
  ],

  // Mesas do Team Building — "id" não deve ter espaços nem acentos.
  // "cor" em hexadecimal; "emblema" é o caráter chinês da mesa (aparece nas cartas e no pódio).
  // "membros" fica vazio até haver a lista final de jogadores de cada mesa.
  equipas: [
    { id: 'dragao', nome: 'Dragão', emblema: '龍', cor: '#E34234', membros: [] },
    { id: 'tigre', nome: 'Tigre', emblema: '虎', cor: '#F59E0B', membros: [] },
    { id: 'fenix', nome: 'Fénix', emblema: '鳳', cor: '#F472B6', membros: [] },
    { id: 'carpa', nome: 'Carpa', emblema: '鯉', cor: '#60A5FA', membros: [] },
    { id: 'leao', nome: 'Leão', emblema: '獅', cor: '#34D399', membros: [] },
  ],

  // Regras gerais do Team Building (aparecem no separador "Rondas")
  teamBuilding: {
    host: 'Filipa Brás',
    preparacao: 'Filipa Magalhães',
    regras: [
      '5 mesas, com cerca de 40 jogadores no total (cerca de 8 por mesa). Todas as mesas jogam a mesma ronda ao mesmo tempo.',
      'Mesas: Dragão, Tigre, Fénix, Carpa e Leão.',
      '7 rondas de 5 minutos cada (cerca de 1 hora no total).',
      'Sem esforço físico e sem telemóveis — ficam no cofre de telemóveis à entrada.',
      'Regra da casa: toda a gente da mesa joga em todas as rondas.',
    ],
    pontos: [25, 20, 15, 10, 5], // pontos do 1.º ao 5.º lugar em cada ronda
    regrasPontos: [
      'Se uma mesa não fizer a tarefa dentro do tempo fica com 0 pontos.',
      'Empates: as mesas empatadas recebem os pontos do lugar mais alto (por exemplo, duas mesas em 2.º recebem 20 cada) e a seguinte fica em 4.º.',
      'Desempate final (se duas mesas acabarem com os mesmos pontos): pergunta rápida da host — ganha a primeira mesa a responder.',
    ],
  },

  // Rondas do Team Building (5 minutos cada)
  provas: [
    {
      nome: 'O Cofre do Casino',
      duracao: '5 min',
      resumo: 'A mesa tem de descobrir o código de 4 dígitos de um cofre. Cada pessoa recebe uma pista que não pode mostrar, só ler em voz alta. Ninguém resolve sozinho.',
      comoSeJoga: [
        'Cada pessoa tem uma pista e lê-a em voz alta. As pistas não se mostram nem se passam.',
        'Quando a mesa achar que tem o código, escreve-o no cartão de resposta e entrega à host.',
        'Cada mesa tem 3 tentativas.',
        'As pistas 1 a 6 chegam para resolver. As pistas 7 e 8 servem para confirmar e garantem que, numa mesa de 8, toda a gente tem uma pista. Se a mesa tiver menos de 8 pessoas, retira-se primeiro a 8 e depois a 7.',
      ],
      pontuacao: ['Pela ordem em que as mesas acertam. As mesas que não acertarem no tempo ficam empatadas em último.'],
    },
    {
      nome: 'Blackjack de Contas',
      duracao: '5 min',
      resumo: 'A mesa recebe 10 cartas e faz o maior número de combinações diferentes que somem 21. Cada pessoa apresenta pelo menos uma.',
      comoSeJoga: [
        'Todas as mesas recebem a mesma mão de 10 cartas, para ser justo.',
        'Valores: Ás vale 1 ou 11, figuras valem 10, as outras cartas valem o número.',
        'Uma combinação é um conjunto de 2 ou mais cartas que soma 21. A mesma carta pode entrar em várias combinações, mas não se pode repetir a mesma combinação.',
        'A mesa escreve as combinações na folha de resposta, com o nome de quem a encontrou ao lado. Cada pessoa tem de ter pelo menos uma.',
      ],
      pontuacao: [
        'Ganha a mesa com mais combinações válidas.',
        'Uma combinação errada anula uma certa.',
        'Uma mesa onde alguém não apresentou nenhuma perde 2 combinações.',
      ],
    },
    {
      nome: 'Linha do Tempo Vermilion',
      duracao: '5 min',
      resumo: 'A mesa ordena 15 cartões com marcos dos 15 anos da Vermilion, e cada pessoa coloca um cartão à vez.',
      comoSeJoga: [
        'Os cartões estão baralhados e virados para baixo. À vez, cada pessoa tira um cartão e coloca-o na linha, no sítio onde acha que encaixa. A mesa pode discutir, mas é quem tirou o cartão que decide.',
        'Quando todos os cartões estiverem na mesa, a mesa pode fazer uma única troca entre dois cartões.',
        'No fim do tempo, a host ou a ajudante vira os cartões: o ano está no verso.',
      ],
      pontuacao: ['Ganha a mesa com mais cartões na posição certa. Em caso de empate, ganha a que terminou primeiro.'],
    },
    {
      nome: 'Quanto Vale a Ficha?',
      duracao: '5 min',
      resumo: 'A mesa adivinha o preço de 5 objetos de luxo. Cada pessoa estima um objeto, e a mesa só pode corrigir uma resposta.',
      comoSeJoga: [
        'A mesa recebe 5 fotos, numeradas de 1 a 5. Cada pessoa fica com um objeto (numa mesa de 8, três objetos ficam com 2 pessoas, que decidem juntas).',
        'Quem tem o objeto escreve o preço na folha de resposta. No fim, a mesa pode alterar uma única resposta.',
      ],
      pontuacao: ['Para cada objeto, calcula-se a diferença percentual em relação ao preço real. Ganha a mesa com a menor diferença média.'],
    },
    {
      nome: 'Palavra Proibida',
      duracao: '5 min',
      resumo: 'Cada pessoa, à vez, faz a mesa adivinhar palavras de casino sem usar as palavras proibidas do cartão.',
      comoSeJoga: [
        'Cada pessoa tem cerca de 30 segundos. Tira cartões do monte e tenta fazer a mesa adivinhar o máximo de palavras.',
        'Não pode dizer a palavra, as palavras proibidas, partes delas, nem fazer gestos ou sons. Pode passar um cartão.',
        'Um elemento de outra mesa, ou a ajudante, controla as palavras proibidas.',
      ],
      pontuacao: ['Ganha a mesa com mais palavras adivinhadas. Cada palavra proibida dita anula uma certa.'],
    },
    {
      nome: 'O Grande Assalto',
      duracao: '5 min',
      resumo: 'A mesa escreve em cadeia a história de um assalto a um casino de Macau. Cada pessoa acrescenta uma frase com uma palavra sorteada.',
      comoSeJoga: [
        'A folha já traz a primeira frase: "Eram onze da noite no Casino Dragão Dourado, em Macau, quando as luzes se apagaram de repente…"',
        'Cada pessoa tira uma palavra do saco e, à vez, escreve uma frase que continua a história e que inclui essa palavra.',
        'A última pessoa tem de fechar a história: o assalto resultou ou não?',
      ],
      pontuacao: [
        'A host (ou um pequeno júri) lê as histórias durante a ronda seguinte e ordena-as segundo três critérios: todas as palavras usadas, a história faz sentido e tem graça.',
        'A história vencedora é lida em voz alta no fim do team building ou ao jantar.',
      ],
    },
    {
      nome: 'Poker Face',
      duracao: '5 min',
      resumo: 'Uma mesa tenta fazer rir os jogadores de outra mesa enquanto estes têm água na boca.',
      comoSeJoga: [
        'Joga-se em roda: o Dragão tenta fazer rir o Tigre, o Tigre faz rir a Fénix, a Fénix faz rir a Carpa, a Carpa faz rir o Leão e o Leão faz rir o Dragão. Cada mesa ataca e defende ao mesmo tempo.',
        'Quem defende tem um gole de água na boca e não pode engolir. Quem ataca pode fazer caretas, contar piadas e imitar, mas não pode tocar em ninguém.',
        'Quem se rir ou deitar a água fora sai da ronda.',
      ],
      pontuacao: ['Ganha a mesa com mais pessoas que aguentaram até ao fim dos 4 minutos.'],
    },
  ],

  // Etiquetas de restrições alimentares / alergénios
  // (as classes Tailwind têm de estar escritas por extenso para funcionarem)
  etiquetas: {
    vegetariano: { texto: 'Vegetariano', classe: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' },
    vegano: { texto: 'Vegano', classe: 'bg-green-500/15 text-green-300 ring-green-400/30' },
    semGluten: { texto: 'Sem Glúten', classe: 'bg-sky-500/15 text-sky-300 ring-sky-400/30' },
    semLactose: { texto: 'Sem Lactose', classe: 'bg-indigo-500/15 text-indigo-300 ring-indigo-400/30' },
    frutosSecos: { texto: 'Contém Frutos Secos', classe: 'bg-amber-500/15 text-amber-300 ring-amber-400/30' },
    marisco: { texto: 'Contém Marisco', classe: 'bg-rose-500/15 text-rose-300 ring-rose-400/30' },
    alcool: { texto: 'Contém Álcool', classe: 'bg-purple-500/15 text-purple-300 ring-purple-400/30' },
  },

  // Ementa do jantar
  ementa: [
    {
      categoria: 'Entradas / Couvert',
      itens: [
        { nome: 'Pão regional, manteiga e azeite aromatizado', descricao: 'Seleção de pães quentes da padaria.', etiquetas: ['vegetariano'] },
        { nome: 'Creme de castanha', descricao: 'Com crocante de presunto e cebolinho.', etiquetas: ['semGluten'] },
        { nome: 'Salada de queijo de cabra e figos', descricao: 'Mel, nozes caramelizadas e rúcula.', etiquetas: ['vegetariano', 'frutosSecos'] },
      ],
    },
    {
      categoria: 'Prato Principal',
      itens: [
        { opcao: 'Carne', nome: 'Lombo de vitela com molho de vinho do Porto', descricao: 'Puré trufado e legumes salteados.', etiquetas: ['semGluten', 'alcool'] },
        { opcao: 'Peixe', nome: 'Bacalhau confitado com broa', descricao: 'Grão, espinafres e azeite de alho.', etiquetas: [] },
        { opcao: 'Vegetariano / Vegano', nome: 'Wellington de cogumelos e castanha', descricao: 'Com redução de frutos vermelhos.', etiquetas: ['vegano', 'frutosSecos'] },
      ],
    },
    {
      categoria: 'Sobremesas',
      itens: [
        { nome: 'Rabanadas com creme de ovos', descricao: 'A tradição em versão gourmet.', etiquetas: ['vegetariano'] },
        { nome: 'Tronco de Natal de chocolate', descricao: 'Chocolate negro e avelã.', etiquetas: ['vegetariano', 'frutosSecos'] },
        { nome: 'Salada de frutas da época', descricao: 'Leve e fresca.', etiquetas: ['vegano', 'semGluten', 'semLactose'] },
      ],
    },
    {
      categoria: 'Bebidas',
      itens: [
        { nome: 'Vinho tinto e branco (Douro)', descricao: 'Seleção da casa.', etiquetas: ['alcool'] },
        { nome: 'Espumante para o brinde', descricao: 'No momento da Gala.', etiquetas: ['alcool'] },
        { nome: 'Águas, refrigerantes e sumos naturais', descricao: 'À discrição durante o jantar.', etiquetas: ['vegano'] },
        { nome: 'Café e chá', descricao: 'Servidos com a sobremesa.', etiquetas: ['vegano'] },
      ],
    },
  ],

  // Candidatos — "id" único, sem espaços. "foto" é opcional (URL de imagem);
  // sem foto, aparece um avatar com as iniciais.
  candidatos: {
    mister: [
      { id: 'm-tiago', nome: 'Tiago Lopes', departamento: 'CipleMaster', curiosidade: 'Sabe dançar kizomba melhor do que fala inglês (e é professor de inglês).', foto: '' },
      { id: 'm-bruno', nome: 'Bruno Costa', departamento: 'UPP Partners', curiosidade: 'Já correu uma maratona vestido de Pai Natal.', foto: '' },
      { id: 'm-miguel', nome: 'Miguel Santos', departamento: 'OK Student', curiosidade: 'Colecionador de canecas de 23 países diferentes.', foto: '' },
      { id: 'm-diogo', nome: 'Diogo Fernandes', departamento: 'IT', curiosidade: 'Resolve um cubo de Rubik em menos de 1 minuto.', foto: '' },
    ],
    miss: [
      { id: 'f-marta', nome: 'Marta Sousa', departamento: 'Marketing', curiosidade: 'Faz o melhor arroz-doce do grupo — está comprovado.', foto: '' },
      { id: 'f-sofia', nome: 'Sofia Martins', departamento: 'OPLS', curiosidade: 'Fala 4 línguas e está a aprender a 5.ª.', foto: '' },
      { id: 'f-rita', nome: 'Rita Gomes', departamento: 'Micillic', curiosidade: 'Já cantou karaoke num barco no Douro.', foto: '' },
      { id: 'f-leonor', nome: 'Leonor Correia', departamento: 'Business Development', curiosidade: 'Nunca perdeu um jogo de Monopoly. Nunca.', foto: '' },
    ],
  },

  // Locais — se o Team Building e o Jantar forem em sítios diferentes,
  // acrescenta outro local à lista. "estacionamento" é opcional.
  locais: [
    {
      id: 'evento',
      tipo: 'Local do evento · Tudo no mesmo sítio',
      nome: 'Teatro da Luz',
      morada: 'Largo da Luz 2, 1600-458 Lisboa',
      estacionamento: '',
    },
  ],

  // Contactos úteis — telefone em formato internacional (+351...)
  contactos: [
    { papel: 'Coordenação do Evento', nome: 'Equipa de Marketing', telefone: '+351 916 861 147' },
    { papel: 'Coordenação do Evento', nome: 'Equipa de Marketing', telefone: '+351 968 666 533' },
  ],

  // Dados fictícios usados APENAS no modo demo (sem Firebase)
  demo: {
    pontos: { dragao: 120, tigre: 105, fenix: 135, carpa: 90, leao: 110 },
    votos: { 'm-tiago': 12, 'm-bruno': 18, 'm-miguel': 9, 'm-diogo': 14, 'f-marta': 16, 'f-sofia': 11, 'f-rita': 20, 'f-leonor': 7 },
    definicoes: { votingOpen: true, showResults: true },
  },
};

/* ============================================================================
 *  3) CAMADA DE DADOS — Firestore (ao vivo) ou memória local (demo)
 * ========================================================================== */
const DEFAULT_SETTINGS = { votingOpen: false, showResults: false, voteRound: 1 };
const ALL_CANDIDATES = [
  ...EVENT_DATA.candidatos.mister.map((c) => ({ ...c, category: 'mister' })),
  ...EVENT_DATA.candidatos.miss.map((c) => ({ ...c, category: 'miss' })),
];

const hasRealConfig = Object.values(FIREBASE_CONFIG).every(
  (v) => typeof v === 'string' && v.trim() !== '' && !v.startsWith('COLAR_')
);

let db = null;
if (hasRealConfig) {
  try {
    db = getFirestore(initializeApp(FIREBASE_CONFIG));
  } catch (err) {
    console.error('[Firebase] Falha ao inicializar — a usar modo demo.', err);
  }
}
const IS_LIVE = Boolean(db);

function createLiveBackend() {
  const mapField = (snap, field) => {
    const out = {};
    snap.forEach((d) => (out[d.id] = Number(d.data()[field]) || 0));
    return out;
  };
  return {
    subscribeTeams: (cb, onErr) => onSnapshot(collection(db, 'teams'), (s) => cb(mapField(s, 'score')), onErr),
    subscribeVotes: (cb, onErr) => onSnapshot(collection(db, 'candidates'), (s) => cb(mapField(s, 'votes')), onErr),
    subscribeSettings: (cb, onErr) =>
      onSnapshot(doc(db, 'settings', 'event'), (d) => cb({ ...DEFAULT_SETTINGS, ...(d.data() || {}) }), onErr),

    addPoints: (teamId, delta) =>
      setDoc(doc(db, 'teams', teamId), { score: increment(delta), updatedAt: serverTimestamp() }, { merge: true }),
    setPoints: (teamId, value) =>
      setDoc(doc(db, 'teams', teamId), { score: value, updatedAt: serverTimestamp() }, { merge: true }),

    // Voto atómico: increment(1) garante que votos simultâneos nunca se perdem
    castVote: ({ misterId, missId, round, deviceId }) => {
      const b = writeBatch(db);
      b.set(doc(db, 'candidates', misterId), { votes: increment(1), category: 'mister' }, { merge: true });
      b.set(doc(db, 'candidates', missId), { votes: increment(1), category: 'miss' }, { merge: true });
      b.set(doc(db, 'ballots', `${round}_${deviceId}`), { misterId, missId, round, at: serverTimestamp() });
      return b.commit();
    },

    updateSettings: (patch) => setDoc(doc(db, 'settings', 'event'), patch, { merge: true }),

    // Galeria: últimas 150 fotos, mais recentes primeiro
    subscribePhotos: (cb, onErr) =>
      onSnapshot(
        query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(150)),
        (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
        onErr
      ),
    addPhoto: (photo) => addDoc(collection(db, 'photos'), { ...photo, hidden: false, createdAt: serverTimestamp() }),
    setPhotoHidden: (id, hidden) => updateDoc(doc(db, 'photos', id), { hidden }),

    resetScores: () => {
      const b = writeBatch(db);
      EVENT_DATA.equipas.forEach((t) => b.set(doc(db, 'teams', t.id), { score: 0, updatedAt: serverTimestamp() }, { merge: true }));
      return b.commit();
    },
    // Repor votos também avança a "ronda", para que todos os telemóveis possam voltar a votar
    resetVotes: () => {
      const b = writeBatch(db);
      ALL_CANDIDATES.forEach((c) => b.set(doc(db, 'candidates', c.id), { votes: 0, category: c.category }, { merge: true }));
      b.set(doc(db, 'settings', 'event'), { voteRound: increment(1) }, { merge: true });
      return b.commit();
    },
  };
}

function createDemoBackend() {
  const state = {
    teams: { ...EVENT_DATA.demo.pontos },
    votes: { ...EVENT_DATA.demo.votos },
    settings: { ...DEFAULT_SETTINGS, ...EVENT_DATA.demo.definicoes },
  };
  state.photos = [];
  const listeners = { teams: new Set(), votes: new Set(), settings: new Set(), photos: new Set() };
  const copy = (k) => (Array.isArray(state[k]) ? [...state[k]] : { ...state[k] });
  const emit = (k) => listeners[k].forEach((cb) => cb(copy(k)));
  const subscribe = (k) => (cb) => {
    listeners[k].add(cb);
    cb(copy(k));
    return () => listeners[k].delete(cb);
  };
  const delay = () => new Promise((r) => setTimeout(r, 150));
  return {
    subscribeTeams: subscribe('teams'),
    subscribeVotes: subscribe('votes'),
    subscribeSettings: subscribe('settings'),
    subscribePhotos: subscribe('photos'),
    addPhoto: async (photo) => {
      await delay();
      state.photos = [{ ...photo, id: `demo-${Date.now()}-${Math.random()}`, hidden: false, createdAt: new Date() }, ...state.photos];
      emit('photos');
    },
    setPhotoHidden: async (id, hidden) => {
      await delay();
      state.photos = state.photos.map((p) => (p.id === id ? { ...p, hidden } : p));
      emit('photos');
    },
    addPoints: async (id, delta) => { await delay(); state.teams[id] = (state.teams[id] || 0) + delta; emit('teams'); },
    setPoints: async (id, value) => { await delay(); state.teams[id] = value; emit('teams'); },
    castVote: async ({ misterId, missId }) => {
      await delay();
      state.votes[misterId] = (state.votes[misterId] || 0) + 1;
      state.votes[missId] = (state.votes[missId] || 0) + 1;
      emit('votes');
    },
    updateSettings: async (patch) => { await delay(); state.settings = { ...state.settings, ...patch }; emit('settings'); },
    resetScores: async () => { await delay(); EVENT_DATA.equipas.forEach((t) => (state.teams[t.id] = 0)); emit('teams'); },
    resetVotes: async () => {
      await delay();
      ALL_CANDIDATES.forEach((c) => (state.votes[c.id] = 0));
      state.settings = { ...state.settings, voteRound: (state.settings.voteRound || 1) + 1 };
      emit('votes');
      emit('settings');
    },
  };
}

const backend = IS_LIVE ? createLiveBackend() : createDemoBackend();

/* Hook que subscreve tudo em tempo real (onSnapshot no modo ao vivo) */
function useLiveEvent() {
  const [teams, setTeams] = useState({});
  const [votes, setVotes] = useState({});
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const onErr = (err) => {
      console.error('[Firestore]', err);
      setError(err?.code === 'permission-denied' ? 'Sem permissões no Firestore (verifica as regras).' : 'Ligação ao servidor interrompida.');
    };
    const ok = (setter) => (v) => { setError(null); setter(v); };
    const unsubs = [
      backend.subscribeTeams(ok(setTeams), onErr),
      backend.subscribeVotes(ok(setVotes), onErr),
      backend.subscribeSettings(ok(setSettings), onErr),
      backend.subscribePhotos(setPhotos, (err) => console.error('[Firestore] galeria', err)),
    ];
    return () => unsubs.forEach((u) => typeof u === 'function' && u());
  }, []);

  return { teams, votes, photos, settings: settings || DEFAULT_SETTINGS, ready: settings !== null, error };
}

/* ---------- Controlo anti-voto duplicado (localStorage do dispositivo) ---------- */
const LS_PREFIX = 'vermilion-natal-2026';
const safeStorage = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, val) { try { window.localStorage.setItem(key, val); } catch { /* modo privado */ } },
};
function getDeviceId() {
  let id = safeStorage.get(`${LS_PREFIX}-device`);
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
    safeStorage.set(`${LS_PREFIX}-device`, id);
  }
  return id;
}
const voteKey = (round) => `${LS_PREFIX}-voto-r${round}`;
function readStoredVote(round) {
  try { return JSON.parse(safeStorage.get(voteKey(round)) || 'null'); } catch { return null; }
}

/* ============================================================================
 *  4) COMPONENTES DE UI
 * ========================================================================== */
const cx = (...c) => c.filter(Boolean).join(' ');

function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="sticky top-[60px] z-20 -mx-4 bg-ink/90 px-4 py-3 backdrop-blur">
      <div className="flex rounded-2xl bg-ink-soft p-1 ring-1 ring-white/5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cx(
              'flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition',
              value === t.id ? 'bg-vermilion text-white shadow-lg shadow-vermilion/30' : 'text-white/60 active:bg-white/5'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-4 mt-2">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">◆ {eyebrow}</p>}
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
    </div>
  );
}

function Card({ className, children, ...props }) {
  return (
    <div className={cx('rounded-2xl bg-ink-soft p-4 ring-1 ring-white/5', className)} {...props}>
      {children}
    </div>
  );
}

function Avatar({ name, foto, size = 'h-16 w-16', accent = '#E34234' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (foto) return <img src={foto} alt={name} className={cx(size, 'rounded-full object-cover ring-2 ring-white/10')} />;
  return (
    <div
      className={cx(size, 'flex items-center justify-center rounded-full font-display text-xl font-bold text-white ring-2 ring-white/10')}
      style={{ background: `linear-gradient(135deg, ${accent}, #1F2937)` }}
    >
      {initials}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-8 w-14 shrink-0 rounded-full transition', checked ? 'bg-emerald-500' : 'bg-white/15', disabled && 'opacity-50')}
    >
      <span className={cx('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-7' : 'left-1')} />
    </button>
  );
}

/* ---------- Elementos decorativos "Casino Macau" (inspirados no moodboard) ---------- */

// Lanterna chinesa vermelha com brilho e baloiço suave
function Lantern({ size = 48, string = 16, delay = 0, char = '福' }) {
  return (
    <div className="lantern flex flex-col items-center" style={{ animationDelay: `${delay}s` }} aria-hidden="true">
      <div className="w-px bg-gold/60" style={{ height: string }} />
      <svg width={size} height={size * 1.3} viewBox="0 0 80 104">
        <defs>
          <radialGradient id="lanternGlow" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#FFC08A" />
            <stop offset="40%" stopColor="#F05A3C" />
            <stop offset="100%" stopColor="#8F1C14" />
          </radialGradient>
        </defs>
        <rect x="24" y="2" width="32" height="9" rx="2" fill="#F59E0B" />
        <ellipse cx="40" cy="48" rx="35" ry="37" fill="url(#lanternGlow)" />
        <path d="M40 11C18 20 18 76 40 85M40 11C62 20 62 76 40 85M40 11C30 22 30 74 40 85M40 11C50 22 50 74 40 85" stroke="#7A1712" strokeOpacity=".45" strokeWidth="1.4" fill="none" />
        <rect x="24" y="83" width="32" height="8" rx="2" fill="#F59E0B" />
        <path d="M36 91v12M40 91v13M44 91v12" stroke="#E34234" strokeWidth="2" />
        <text x="40" y="57" textAnchor="middle" fontSize="24" fontWeight="700" fill="#FDE68A" fontFamily="serif">{char}</text>
      </svg>
    </div>
  );
}

// Ficha de casino (poker chip) — usada como ícone, logótipo e marcador
function PokerChip({ size = 36, color = '#E34234', children, className }) {
  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: `repeating-conic-gradient(${color} 0deg 30deg, #F7F1E3 30deg 45deg)`,
        boxShadow: '0 2px 8px rgba(0,0,0,.55)',
      }}
    >
      <span className="absolute rounded-full" style={{ inset: Math.round(size * 0.15), background: color, border: '1.5px dashed rgba(247,241,227,.75)' }} />
      <span className="relative flex items-center justify-center text-white">{children}</span>
    </span>
  );
}

// Peça de mahjong em marfim
function MahjongTile({ char = '發', color = '#15803D', className }) {
  return (
    <span
      className={cx('inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-md bg-ivory font-serif text-xl font-bold', className)}
      style={{ color, boxShadow: '0 3px 0 #C9BFA5, 0 5px 10px rgba(0,0,0,.45)' }}
    >
      {char}
    </span>
  );
}

// Pilha de fichas (usada no pódio do Team Building)
function ChipStack({ count, color }) {
  return (
    <div className="flex flex-col items-center pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="-mt-2 h-5 w-14 rounded-[50%] border-2 border-dashed first:mt-0"
          style={{ backgroundColor: color, borderColor: '#F7F1E3', boxShadow: '0 3px 0 rgba(0,0,0,.45)' }}
        />
      ))}
    </div>
  );
}

// Carta de jogar em marfim, com índice nos cantos
function PlayingCard({ rank, suit, suitColor = '#E34234', className, children }) {
  const Index = ({ flip }) => (
    <div
      className={cx('pointer-events-none absolute flex flex-col items-center font-display font-bold leading-none', flip ? 'bottom-2 right-2.5 rotate-180' : 'left-2.5 top-2')}
      style={{ color: suitColor }}
    >
      <span className="text-base">{rank}</span>
      <span className="text-sm">{suit}</span>
    </div>
  );
  return (
    <div className={cx('relative rounded-2xl bg-ivory p-4 text-ink ring-1 ring-black/10', className)} style={{ boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
      <Index />
      <Index flip />
      {children}
    </div>
  );
}

// Divisor ornamental dourado
function Ornament({ label }) {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="gold-line h-px flex-1" />
      <span className="text-xs text-gold">◆</span>
      {label && <span className="font-display text-lg font-bold text-gold">{label}</span>}
      {label && <span className="text-xs text-gold">◆</span>}
      <div className="gold-line h-px flex-1" />
    </div>
  );
}

const CHINESE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const AGENDA_ICONS = { gift: Gift, swords: Swords, clock: Clock, dinner: UtensilsCrossed, crown: Crown, sparkles: Sparkles, mic: Mic, coffee: Coffee, music: Music, moon: Moon };

// Converte "HH:MM" em minutos; horas antes das 06:00 contam como depois da meia-noite da mesma festa
const toEventMinutes = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return (h < 6 ? h + 24 : h) * 60 + m;
};

/* ---------------------------- 1. AGENDA ---------------------------- */
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function AgendaView() {
  const now = useNow();
  const { evento, agenda } = EVENT_DATA;
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  // A festa continua depois da meia-noite: até às 06:00 do dia seguinte ainda conta como noite do evento
  const yesterday = new Date(now.getTime() - 86400000);
  const yISO = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
  const isEventDay = (todayISO === evento.dataISO && now.getHours() >= 6) || (yISO === evento.dataISO && now.getHours() < 6);
  const nowMin = toEventMinutes(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  const currentIdx = isEventDay ? agenda.reduce((acc, item, i) => (toEventMinutes(item.hora) <= nowMin ? i : acc), -1) : -1;

  const eventDate = new Date(`${evento.dataISO}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((eventDate - startOfToday) / 86400000);

  return (
    <div className="animate-fade-up">
      <div className="macau-hero relative -mx-4 overflow-hidden px-5 pb-8">
        <div className="fretwork pointer-events-none absolute inset-0" />
        {/* Lanternas suspensas */}
        <div className="pointer-events-none relative flex items-start justify-between px-1">
          <Lantern size={46} string={6} delay={0} />
          <Lantern size={66} string={30} delay={0.7} char="喜" />
          <Lantern size={38} string={2} delay={1.3} />
          <Lantern size={56} string={18} delay={0.4} char="發" />
        </div>

        <div className="relative -mt-2">
          <div className="flex items-center gap-2">
            <MahjongTile char="發" />
            <MahjongTile char="中" color="#C2321F" />
            <p className="ml-1 text-[11px] font-bold uppercase tracking-[0.25em] text-gold-light">{evento.tema}</p>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">{evento.empresa} apresenta</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight">
            Bem-vindos à<br />
            <span className="neon-gold flicker">{evento.nome}</span>
          </h1>
          <p className="mt-2 text-2xl tracking-[0.4em]">
            <span className="text-ivory">♠</span> <span className="text-vermilion-light">♥</span>{' '}
            <span className="text-vermilion-light">♦</span> <span className="text-ivory">♣</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-white/85">{evento.mensagemBoasVindas}</p>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15">
            <CalendarDays size={14} /> {evento.dataTexto}
          </span>
          {daysLeft > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink">
              Faltam {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
            </span>
          )}
          {daysLeft === 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-ink">É hoje! 🎉</span>
          )}
        </div>
      </div>

      <SectionTitle eyebrow="Programa" title="Agenda do dia" />
      <ol className="relative ml-3 border-l-2 border-dashed border-white/10">
        {agenda.map((item, i) => {
          const Icon = AGENDA_ICONS[item.icone] || Clock;
          const active = i === currentIdx;
          const past = currentIdx > -1 && i < currentIdx;
          return (
            <li key={i} className="relative mb-5 pl-7">
              <span className={cx('absolute -left-[19px] top-1 rounded-full ring-4 ring-ink', past && 'opacity-50 grayscale')}>
                <PokerChip size={34} color={active ? '#D97706' : '#C2321F'}>
                  <Icon size={13} />
                </PokerChip>
              </span>
              <Card className={cx(active && 'ring-2 ring-gold', past && 'opacity-60')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xl font-bold text-gold">{item.hora}</span>
                  {active && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold uppercase text-gold">A decorrer</span>}
                </div>
                <h3 className="mt-1 text-base font-bold">{item.titulo}</h3>
                <p className="mt-1 text-sm text-white/65">{item.descricao}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white/50">
                  <MapPin size={13} className="text-vermilion-light" /> {item.local}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------- 2. TEAM BUILDING ------------------------- */
const MEDAL_COLORS = ['#F59E0B', '#CBD5E1', '#D97706'];

function rankTeams(teams) {
  return EVENT_DATA.equipas
    .map((t) => ({ ...t, score: teams[t.id] || 0 }))
    .sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome));
}

function Leaderboard({ teams }) {
  const ranked = rankTeams(teams);
  const max = Math.max(1, ...ranked.map((t) => t.score));
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const stackSizes = { 0: 7, 1: 5, 2: 3 };

  return (
    <div className="animate-fade-up">
      <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Classificação ao vivo
      </div>

      {/* Pódio — mesa de feltro com pilhas de fichas */}
      <div className="felt mb-6 rounded-3xl p-4 pb-0 ring-2 ring-gold/40" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,.5)' }}>
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-gold-light/80">♠ Mesa VIP ♥</p>
        <div className="flex items-end justify-center gap-3">
          {podium.map((t) => {
            const pos = ranked.indexOf(t);
            return (
              <div key={t.id} className="flex w-1/3 flex-col items-center">
                {pos === 0 && <Crown className="mb-1 text-gold drop-shadow-[0_0_8px_rgba(245,158,11,.8)]" size={22} />}
                <div
                  className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-ivory text-2xl font-bold ring-2"
                  style={{ color: t.cor, '--tw-ring-color': MEDAL_COLORS[pos] }}
                >
                  {t.emblema}
                </div>
                <p className="line-clamp-1 text-center text-xs font-semibold">{t.nome}</p>
                <p className="text-sm font-bold text-gold-light">{t.score} pts</p>
                <ChipStack count={stackSizes[pos]} color={t.cor} />
                <div className="mt-2 w-full rounded-t-xl py-1 text-center font-display text-xl font-extrabold text-ink" style={{ backgroundColor: MEDAL_COLORS[pos] }}>
                  {pos + 1}.º
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela completa */}
      <div className="space-y-2">
        {ranked.map((t, i) => (
          <Card key={t.id} className="flex items-center gap-3 py-3 transition-all">
            <div className="w-7 text-center">
              {i < 3 ? <Medal size={22} style={{ color: MEDAL_COLORS[i] }} /> : <span className="font-bold text-white/40">{i + 1}.º</span>}
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
              style={{ backgroundColor: `${t.cor}22`, color: t.cor }}
            >
              {t.emblema}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{t.nome}</p>
                <p className="shrink-0 text-sm font-bold tabular-nums">{t.score}</p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(t.score / max) * 100}%`, backgroundColor: t.cor }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RuleList({ items, ordered = false }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((r, i) => (
        <li key={i} className="flex gap-2 text-sm text-white/75">
          <span className="mt-0.5 shrink-0 text-xs text-gold">{ordered ? `${i + 1}.` : '◆'}</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

function TeamBuildingView({ teams }) {
  const [tab, setTab] = useState('pontuacao');
  const tb = EVENT_DATA.teamBuilding;
  const lugares = ['1.º', '2.º', '3.º', '4.º', '5.º'];
  return (
    <div>
      <SectionTitle eyebrow="Casino de Macau" title="Team Building" subtitle="5 mesas, 7 rondas de 5 minutos e classificação em tempo real." />
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'equipas', label: 'Mesas' },
          { id: 'provas', label: 'Rondas' },
          { id: 'pontuacao', label: 'Pontuação' },
        ]}
      />
      <div className="mt-2">
        {tab === 'equipas' && (
          <div className="animate-fade-up grid grid-cols-1 gap-3">
            {EVENT_DATA.equipas.map((t) => (
              <PlayingCard key={t.id} rank={t.emblema} suit="" suitColor={t.cor} className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl font-serif text-4xl font-bold" style={{ backgroundColor: `${t.cor}1f`, color: t.cor }}>
                    {t.emblema}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink/50">Mesa</p>
                    <h3 className="font-display text-2xl font-bold text-ink">{t.nome}</h3>
                    <p className="text-xs text-ink/50">
                      {t.membros?.length ? `${t.membros.length} jogadores` : 'Cerca de 8 jogadores'}
                    </p>
                  </div>
                </div>
                {t.membros?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.membros.map((m) => (
                      <span key={m} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink/80 ring-1 ring-ink/10">{m}</span>
                    ))}
                  </div>
                )}
              </PlayingCard>
            ))}
          </div>
        )}

        {tab === 'provas' && (
          <div className="animate-fade-up space-y-3">
            {/* Regras gerais */}
            <Card className="ring-gold/30">
              <h3 className="font-display text-lg font-bold text-gold">Regras gerais</h3>
              <RuleList items={tb.regras} />
              <p className="mt-3 text-xs text-white/50">
                Host: <strong className="text-white/80">{tb.host}</strong> · Preparação dos desafios: <strong className="text-white/80">{tb.preparacao}</strong>
              </p>
            </Card>

            {/* Pontos por ronda */}
            <Card>
              <h3 className="font-display text-lg font-bold text-gold">Pontos por ronda</h3>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {tb.pontos.map((p, i) => (
                  <div key={i} className="flex flex-col items-center rounded-xl bg-white/5 py-2">
                    <PokerChip size={30} color={['#D97706', '#94A3B8', '#B45309', '#C2321F', '#7A1712'][i]}>
                      <span className="text-[10px] font-bold">{p}</span>
                    </PokerChip>
                    <span className="mt-1 text-[11px] font-semibold text-white/60">{lugares[i]}</span>
                  </div>
                ))}
              </div>
              <RuleList items={tb.regrasPontos} />
            </Card>

            {/* Rondas */}
            {EVENT_DATA.provas.map((p, i) => (
              <Card key={p.nome} className="p-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                    <MahjongTile char={CHINESE_NUMERALS[i] || i + 1} color="#C2321F" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gold">Ronda {i + 1} · {p.duracao}</p>
                      <h3 className="font-semibold">{p.nome}</h3>
                      <p className="mt-1 text-sm text-white/65">{p.resumo}</p>
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-white/40 transition group-open:rotate-90" />
                  </summary>
                  <div className="border-t border-white/5 px-4 pb-4 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">Como se joga</p>
                    <RuleList items={p.comoSeJoga} />
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/50">Pontuação</p>
                    <RuleList items={p.pontuacao} />
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}

        {tab === 'pontuacao' && <Leaderboard teams={teams} />}
      </div>
    </div>
  );
}

/* ----------------------------- 3. JANTAR ----------------------------- */
function JantarView() {
  return (
    <div className="animate-fade-up">
      <div className="mb-4 mt-2 flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Jantar de Natal" title="Ementa" subtitle="Avisa a organização se tiveres alguma restrição alimentar não indicada." />
        <div className="-mt-1 shrink-0"><Lantern size={34} string={4} char="福" /></div>
      </div>
      <div className="space-y-5">
        {EVENT_DATA.ementa.map((cat) => (
          <section key={cat.categoria}>
            <div className="mb-2"><Ornament label={cat.categoria} /></div>
            <Card className="divide-y divide-white/5 p-0 ring-gold/20">
              {cat.itens.map((item) => (
                <div key={item.nome} className="p-4">
                  {item.opcao && <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-vermilion-light">{item.opcao}</p>}
                  <p className="font-semibold">{item.nome}</p>
                  {item.descricao && <p className="mt-0.5 text-sm text-white/60">{item.descricao}</p>}
                  {item.etiquetas?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.etiquetas.map((k) => {
                        const e = EVENT_DATA.etiquetas[k];
                        return e ? (
                          <span key={k} className={cx('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', e.classe)}>{e.texto}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ------------------------ 4. MISTER & MISS ------------------------ */
function CandidateGrid({ title, list, accent, rank, suit }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Crown size={18} className="text-gold" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {list.map((c) => (
          <PlayingCard key={c.id} rank={rank} suit={suit} suitColor={accent} className="flex flex-col items-center px-5 pb-9 pt-6 text-center">
            <div className="rounded-full p-1" style={{ background: 'linear-gradient(135deg,#F59E0B,#B7791F)' }}>
              <Avatar name={c.nome} foto={c.foto} accent={accent} />
            </div>
            <p className="mt-3 text-sm font-bold leading-tight text-ink">{c.nome}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-vermilion-dark">{c.departamento}</p>
            <p className="mt-2 text-xs text-ink/60">{c.curiosidade}</p>
          </PlayingCard>
        ))}
      </div>
    </section>
  );
}

function VotePicker({ title, list, selected, onSelect, accent }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-white/60">{title}</h3>
      <div className="space-y-2">
        {list.map((c) => {
          const on = selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition active:scale-[0.99]',
                on ? 'bg-vermilion/15 ring-2 ring-vermilion' : 'bg-ink-soft ring-white/5'
              )}
            >
              <Avatar name={c.nome} foto={c.foto} size="h-11 w-11" accent={accent} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.nome}</p>
                <p className="text-xs text-white/50">{c.departamento}</p>
              </div>
              <span className={cx('flex h-6 w-6 items-center justify-center rounded-full ring-2', on ? 'bg-vermilion ring-vermilion' : 'ring-white/20')}>
                {on && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VotingPanel({ settings, ready, notify }) {
  const round = settings.voteRound || 1;
  const [stored, setStored] = useState(() => readStoredVote(round));
  const [mister, setMister] = useState(null);
  const [miss, setMiss] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => setStored(readStoredVote(round)), [round]);

  const nameOf = (id) => ALL_CANDIDATES.find((c) => c.id === id)?.nome || '—';

  const submit = async () => {
    if (!mister || !miss || sending) return;
    if (readStoredVote(round)) return setStored(readStoredVote(round));
    setSending(true);
    try {
      const deviceId = getDeviceId();
      await backend.castVote({ misterId: mister, missId: miss, round, deviceId });
      const record = { misterId: mister, missId: miss, at: new Date().toISOString(), deviceId };
      safeStorage.set(voteKey(round), JSON.stringify(record));
      setStored(record);
      notify('Voto registado! Obrigado 🎉');
    } catch (err) {
      console.error(err);
      notify('Não foi possível registar o voto. Tenta novamente.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!ready) return <p className="py-10 text-center text-sm text-white/50">A carregar…</p>;

  if (stored) {
    return (
      <Card className="animate-pop mt-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <ShieldCheck size={28} />
        </div>
        <h3 className="mt-3 font-display text-xl font-bold">O teu voto já foi registado</h3>
        <p className="mt-1 text-sm text-white/60">Cada telemóvel só pode votar uma vez.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Mister</p>
            <p className="font-semibold">{nameOf(stored.misterId)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Miss</p>
            <p className="font-semibold">{nameOf(stored.missId)}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!settings.votingOpen) {
    return (
      <Card className="animate-pop mt-2 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Lock size={26} />
        </div>
        <h3 className="mt-3 font-display text-xl font-bold">Votações fechadas</h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-white/60">
          A votação abre durante a Gala. Fica atento ao palco — esta página atualiza-se sozinha.
        </p>
      </Card>
    );
  }

  return (
    <div className="animate-fade-up pb-24">
      <p className="mb-4 rounded-xl bg-gold/10 px-3 py-2 text-sm text-gold-light ring-1 ring-gold/20">
        Escolhe <strong>1 Mister</strong> e <strong>1 Miss</strong>. Só podes votar uma vez.
      </p>
      <VotePicker title="Mister Vermilion" list={EVENT_DATA.candidatos.mister} selected={mister} onSelect={setMister} accent="#E34234" />
      <VotePicker title="Miss Vermilion" list={EVENT_DATA.candidatos.miss} selected={miss} onSelect={setMiss} accent="#F59E0B" />
      <div className="fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-md px-4 pb-safe">
        <button
          onClick={submit}
          disabled={!mister || !miss || sending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-vermilion py-4 font-bold shadow-xl shadow-vermilion/30 transition active:scale-[0.98] disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
        >
          <Vote size={20} />
          {sending ? 'A enviar…' : !mister || !miss ? 'Escolhe um Mister e uma Miss' : 'Submeter voto'}
        </button>
      </div>
    </div>
  );
}

function ResultsBars({ title, list, votes, accent }) {
  const rows = list.map((c) => ({ ...c, v: votes[c.id] || 0 })).sort((a, b) => b.v - a.v);
  const total = rows.reduce((s, r) => s + r.v, 0);
  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <span className="text-xs text-white/50">{total} votos</span>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => {
          const pct = total ? Math.round((r.v / total) * 100) : 0;
          return (
            <div key={r.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold">
                  {i === 0 && r.v > 0 && <Crown size={14} className="text-gold" />}
                  {r.nome}
                </span>
                <span className="tabular-nums text-white/70">
                  {r.v} · <strong className="text-white">{pct}%</strong>
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: i === 0 && r.v > 0 ? `linear-gradient(90deg, ${accent}, #F59E0B)` : accent, opacity: i === 0 ? 1 : 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MisterMissView({ votes, settings, ready, notify }) {
  const [tab, setTab] = useState('participantes');
  return (
    <div>
      <SectionTitle eyebrow="Concurso" title="Mister & Miss Vermilion" subtitle={settings.votingOpen ? '🟢 Votações abertas' : '🔒 Votações fechadas'} />
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'participantes', label: 'Participantes' },
          { id: 'votar', label: 'Votação' },
          { id: 'resultados', label: 'Resultados' },
        ]}
      />
      <div className="mt-2">
        {tab === 'participantes' && (
          <div className="animate-fade-up">
            <CandidateGrid title="Candidatos a Mister Vermilion" list={EVENT_DATA.candidatos.mister} accent="#1F2937" rank="K" suit="♠" />
            <CandidateGrid title="Candidatas a Miss Vermilion" list={EVENT_DATA.candidatos.miss} accent="#E34234" rank="Q" suit="♥" />
          </div>
        )}
        {tab === 'votar' && <VotingPanel settings={settings} ready={ready} notify={notify} />}
        {tab === 'resultados' &&
          (settings.showResults ? (
            <div className="animate-fade-up">
              <ResultsBars title="Mister Vermilion" list={EVENT_DATA.candidatos.mister} votes={votes} accent="#E34234" />
              <ResultsBars title="Miss Vermilion" list={EVENT_DATA.candidatos.miss} votes={votes} accent="#F59E0B" />
            </div>
          ) : (
            <Card className="animate-pop mt-2 overflow-hidden py-10 text-center">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-vermilion/15 text-vermilion-light">
                <EyeOff size={28} />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">Votação a decorrer</h3>
              <p className="mt-1 text-sm text-white/60">Resultados revelados em breve! 🥁</p>
            </Card>
          ))}
      </div>
    </div>
  );
}

/* ----------------------------- 5. GALERIA ----------------------------- */

// Lê uma imagem escolhida no telemóvel (respeita a orientação da câmara)
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Formato de imagem não suportado')); };
    img.src = url;
  });
}

// Redimensiona para JPEG (maxSide em píxeis). Devolve um Blob.
function resizeToBlob(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve({ blob: b, w, h }), 'image/jpeg', quality));
}

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });

// Prepara uma foto: versão leve para a galeria + versão de alta qualidade para o Drive
async function preparePhoto(file) {
  const { img, url } = await loadImage(file);
  try {
    // Miniatura para a galeria (cabe num documento do Firestore)
    let thumb = null;
    for (const [side, q] of [[1080, 0.72], [900, 0.65], [720, 0.6]]) {
      const r = await resizeToBlob(img, side, q);
      const dataUrl = await blobToDataUrl(r.blob);
      thumb = { dataUrl, w: r.w, h: r.h };
      if (dataUrl.length < 850000) break;
    }
    // Original para o Drive: mantém o ficheiro se for JPEG/PNG até 4,5 MB; senão converte em JPEG de alta qualidade
    let original = file;
    if (!/^image\/(jpeg|png)$/.test(file.type) || file.size > 4.5 * 1024 * 1024) {
      const r = await resizeToBlob(img, 3200, 0.9);
      original = r.blob;
    }
    return { thumb, original };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sendToDrive({ original, author, fileName }) {
  if (!PHOTO_UPLOAD_WEBHOOK) return Promise.resolve();
  const fd = new FormData();
  fd.append('file', original, fileName);
  fd.append('author', author || 'Anónimo');
  fd.append('fileName', fileName);
  // 'no-cors' — o envio é feito, mesmo sem lermos a resposta do Make
  return fetch(PHOTO_UPLOAD_WEBHOOK, { method: 'POST', body: fd, mode: 'no-cors' });
}

const formatPhotoTime = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  return d ? d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'agora';
};

function Lightbox({ photos, index, onClose, onNav }) {
  const p = photos[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNav(-1);
      if (e.key === 'ArrowRight') onNav(1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onNav]);
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-black" onClick={onClose}>
      <div className="pt-safe flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-white/70">
          {p.author || 'Anónimo'} · {formatPhotoTime(p.createdAt)}
        </span>
        <button aria-label="Fechar" className="rounded-full bg-white/10 p-2"><X size={18} /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-2" onClick={(e) => e.stopPropagation()}>
        <img src={p.img} alt={`Foto de ${p.author || 'convidado'}`} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
        {photos.length > 1 && (
          <>
            <button onClick={() => onNav(-1)} aria-label="Anterior" className="absolute left-2 rounded-full bg-black/50 p-2"><ChevronLeft /></button>
            <button onClick={() => onNav(1)} aria-label="Seguinte" className="absolute right-2 rounded-full bg-black/50 p-2"><ChevronRight /></button>
          </>
        )}
      </div>
      <p className="pb-safe py-4 text-center text-xs text-white/40">{index + 1} / {photos.length}</p>
    </div>
  );
}

function GalleryView({ photos, notify }) {
  const visible = photos.filter((p) => !p.hidden && p.img);
  const [author, setAuthor] = useState(() => safeStorage.get(`${LS_PREFIX}-nome`) || '');
  const [progress, setProgress] = useState(null); // { done, total }
  const [open, setOpen] = useState(-1);
  const inputRef = useRef(null);

  const nav = useCallback((d) => setOpen((i) => (i + d + visible.length) % visible.length), [visible.length]);
  const close = useCallback(() => setOpen(-1), []);

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    e.target.value = '';
    if (!files.length) return;
    if (files.length > GALLERY_MAX_FILES) notify(`Máximo ${GALLERY_MAX_FILES} fotos de cada vez — vou enviar as primeiras ${GALLERY_MAX_FILES}.`);
    const batch = files.slice(0, GALLERY_MAX_FILES);
    const name = author.trim().slice(0, 40);
    safeStorage.set(`${LS_PREFIX}-nome`, name);
    setProgress({ done: 0, total: batch.length });
    let ok = 0;
    for (const [i, file] of batch.entries()) {
      try {
        const { thumb, original } = await preparePhoto(file);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = (name || 'convidado').normalize('NFD').replace(/[^\w-]+/g, '_');
        const fileName = `festa-natal-2026_${stamp}_${safeName}_${i + 1}.jpg`;
        await backend.addPhoto({ img: thumb.dataUrl, w: thumb.w, h: thumb.h, author: name || 'Anónimo' });
        sendToDrive({ original, author: name, fileName }).catch((err) => console.error('[Drive]', err));
        ok += 1;
      } catch (err) {
        console.error(err);
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setProgress(null);
    notify(ok === batch.length ? (ok === 1 ? 'Foto partilhada! 📸' : `${ok} fotos partilhadas! 📸`) : `Enviadas ${ok} de ${batch.length}. Tenta novamente as restantes.`, ok ? 'ok' : 'error');
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-4 mt-2 flex items-start justify-between gap-3">
        <SectionTitle eyebrow="Memórias da noite" title="Galeria" subtitle="Partilha as tuas fotos da festa — ficam visíveis para todos e guardadas pela organização." />
        <div className="-mt-1 shrink-0"><Lantern size={34} string={4} char="喜" /></div>
      </div>

      <Card className="mb-5 ring-gold/25">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/50" htmlFor="gallery-author">O teu nome (opcional)</label>
        <input
          id="gallery-author"
          value={author}
          maxLength={40}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Ex.: Ana Ribeiro"
          className="mt-1.5 w-full rounded-xl bg-ink px-3 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-gold"
        />
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!!progress}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-vermilion py-3.5 font-bold shadow-lg shadow-vermilion/30 transition active:scale-[0.98] disabled:opacity-60"
        >
          {progress ? <Upload size={20} className="animate-bounce" /> : <ImagePlus size={20} />}
          {progress ? `A enviar ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…` : 'Adicionar fotos'}
        </button>
        {progress && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        )}
        <p className="mt-2 text-center text-[11px] text-white/40">Até {GALLERY_MAX_FILES} fotos de cada vez. Mantém a app aberta até terminar.</p>
      </Card>

      {visible.length === 0 ? (
        <Card className="py-10 text-center">
          <Camera size={34} className="mx-auto text-gold" />
          <h3 className="mt-3 font-display text-xl font-bold">Ainda não há fotos</h3>
          <p className="mt-1 text-sm text-white/60">Sê o primeiro a partilhar um momento da noite!</p>
        </Card>
      ) : (
        <>
          <p className="mb-2 flex items-center gap-1.5 text-xs text-white/50"><Images size={14} /> {visible.length} {visible.length === 1 ? 'foto' : 'fotos'}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {visible.map((p, i) => (
              <button key={p.id} onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-white/10">
                <img src={p.img} alt={`Foto de ${p.author || 'convidado'}`} loading="lazy" className="h-full w-full object-cover transition group-active:scale-95" />
              </button>
            ))}
          </div>
        </>
      )}

      {open > -1 && <Lightbox photos={visible} index={open} onClose={close} onNav={nav} />}
    </div>
  );
}

/* --------------------------- 6. INFO / LOCAL --------------------------- */
function InfoView() {
  const digits = (tel) => tel.replace(/[^\d]/g, '');
  return (
    <div className="animate-fade-up">
      <SectionTitle eyebrow="Info" title="Localização" subtitle="Toca para abrir a navegação." />
      <div className="space-y-3">
        {EVENT_DATA.locais.map((l) => {
          const q = encodeURIComponent(`${l.nome}, ${l.morada}`);
          return (
            <Card key={l.id}>
              <span className="rounded-full bg-vermilion/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-vermilion-light">{l.tipo}</span>
              <h3 className="mt-2 font-display text-lg font-bold">{l.nome}</h3>
              <p className="mt-1 flex gap-1.5 text-sm text-white/70">
                <MapPin size={16} className="mt-0.5 shrink-0 text-gold" /> {l.morada}
              </p>
              {l.estacionamento && (
                <p className="mt-2 flex gap-1.5 text-sm text-white/60">
                  <Car size={16} className="mt-0.5 shrink-0 text-gold" /> {l.estacionamento}
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-ink active:scale-[0.98]">
                  <MapPin size={16} /> Google Maps
                </a>
                <a href={`https://waze.com/ul?q=${q}&navigate=yes`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white active:scale-[0.98]">
                  <Navigation size={16} /> Waze
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle eyebrow="Precisas de ajuda?" title="Contactos úteis" />
      <div className="space-y-3">
        {EVENT_DATA.contactos.map((c) => (
          <Card key={`${c.papel}-${c.telefone}`} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold">{c.papel}</p>
              <p className="font-semibold">{c.nome}</p>
              <p className="text-sm tabular-nums text-white/50">{c.telefone}</p>
            </div>
            <a href={`tel:${c.telefone.replace(/\s/g, '')}`} aria-label={`Ligar para ${c.papel}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-vermilion active:scale-95">
              <Phone size={18} />
            </a>
            <a href={`https://wa.me/${digits(c.telefone)}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.papel}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 active:scale-95">
              <MessageCircle size={18} />
            </a>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-white/30">Vermilion Group · Boas Festas 2026 🎄</p>
    </div>
  );
}

/* ============================================================================
 *  5) PAINEL DE ORGANIZAÇÃO (Admin com PIN)
 * ========================================================================== */
function DangerAction({ label, onConfirm }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setStep(0); }
  };
  if (step === 0)
    return (
      <button onClick={() => setStep(1)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-semibold text-red-300 ring-1 ring-red-500/30">
        <RotateCcw size={16} /> {label}
      </button>
    );
  return (
    <div className="animate-pop rounded-xl bg-red-500/10 p-3 ring-1 ring-red-500/40">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-200">
        <AlertTriangle size={16} />
        {step === 1 ? 'Tens a certeza?' : 'Última confirmação: isto não pode ser desfeito.'}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setStep(0)} className="rounded-lg bg-white/10 py-2 text-sm font-semibold">Cancelar</button>
        <button
          disabled={busy}
          onClick={() => (step === 1 ? setStep(2) : run())}
          className="rounded-lg bg-red-600 py-2 text-sm font-bold disabled:opacity-50"
        >
          {step === 1 ? 'Sim, continuar' : busy ? 'A repor…' : 'Repor a zero'}
        </button>
      </div>
    </div>
  );
}

function TeamPointsRow({ team, score, notify }) {
  const [value, setValue] = useState('');
  const act = async (fn, msg) => {
    try { await fn(); if (msg) notify(msg); } catch (e) { console.error(e); notify('Erro ao atualizar pontos.', 'error'); }
  };
  const add = (d, msg) => act(() => (score + d < 0 ? backend.setPoints(team.id, 0) : backend.addPoints(team.id, d)), msg);
  const setExact = () => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) return notify('Indica um número válido (≥ 0).', 'error');
    act(() => backend.setPoints(team.id, n), `${team.nome}: ${n} pts`);
    setValue('');
  };
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <span style={{ color: team.cor }}>{team.emblema}</span> {team.nome}
        </p>
        <p className="font-display text-xl font-bold tabular-nums text-gold">{score}</p>
      </div>
      {/* Botões rápidos: pontos pelo lugar na ronda (1.º a 5.º) e correção */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {EVENT_DATA.teamBuilding.pontos.map((p, i) => (
          <button key={i} onClick={() => add(p, `${team.nome}: +${p} (${i + 1}.º lugar)`)} className={cx('rounded-lg py-2 text-sm font-bold active:scale-95', i === 0 ? 'bg-vermilion' : 'bg-vermilion/70')}>
            {i + 1}.º +{p}
          </button>
        ))}
        <button onClick={() => add(-5, `${team.nome}: −5`)} className="rounded-lg bg-white/10 py-2 text-sm font-bold active:scale-95">−5</button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && setExact()}
          placeholder="Valor exato"
          className="min-w-0 flex-1 rounded-lg bg-ink px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-gold"
        />
        <button onClick={setExact} className="rounded-lg bg-white px-3 text-sm font-semibold text-ink">Definir</button>
      </div>
    </div>
  );
}

function AdminPanel({ open, onClose, teams, votes, photos, settings, notify }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && !unlocked) setTimeout(() => inputRef.current?.focus(), 100);
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open, unlocked]);

  if (!open) return null;

  const tryPin = (e) => {
    e?.preventDefault();
    if (pin === ADMIN_PIN) { setUnlocked(true); setPinError(false); } else { setPinError(true); setPin(''); }
  };
  const setSetting = async (patch, msg) => {
    try { await backend.updateSettings(patch); notify(msg); } catch (e) { console.error(e); notify('Erro ao guardar definição.', 'error'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm">
      <div className="pt-safe flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <ShieldCheck size={20} className="text-gold" /> Painel de Organização
        </p>
        <button onClick={onClose} aria-label="Fechar" className="rounded-full bg-white/10 p-2"><X size={18} /></button>
      </div>

      {!unlocked ? (
        <form onSubmit={tryPin} className="mx-auto flex w-full max-w-xs flex-1 flex-col items-center justify-center px-6">
          <Lock size={36} className="text-gold" />
          <p className="mt-3 text-center text-sm text-white/60">Introduz o PIN da organização</p>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
            className={cx('mt-4 w-full rounded-2xl bg-ink-soft py-4 text-center text-3xl tracking-[0.5em] outline-none ring-2', pinError ? 'ring-red-500' : 'ring-white/10 focus:ring-gold')}
          />
          {pinError && <p className="mt-2 text-sm text-red-400">PIN incorreto</p>}
          <button type="submit" className="mt-4 w-full rounded-2xl bg-vermilion py-3 font-bold">Desbloquear</button>
        </form>
      ) : (
        <div className="no-scrollbar mx-auto w-full max-w-md flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-16">
          <div className={cx('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', IS_LIVE ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gold/10 text-gold-light')}>
            {IS_LIVE ? <Wifi size={16} /> : <WifiOff size={16} />}
            {IS_LIVE ? 'Ligado ao Firestore — as alterações chegam a todos.' : 'Modo demo — alterações só neste dispositivo.'}
          </div>

          {/* Controlo das votações */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Mister & Miss</h3>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Votações {settings.votingOpen ? 'abertas' : 'fechadas'}</p>
                <p className="text-xs text-white/50">Permite ou bloqueia novos votos</p>
              </div>
              <Toggle checked={settings.votingOpen} onChange={(v) => setSetting({ votingOpen: v }, v ? 'Votações abertas' : 'Votações fechadas')} />
            </Card>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  {settings.showResults ? <Eye size={16} /> : <EyeOff size={16} />} Resultados {settings.showResults ? 'visíveis' : 'ocultos'}
                </p>
                <p className="text-xs text-white/50">Mostra ou esconde as pontuações ao público</p>
              </div>
              <Toggle checked={settings.showResults} onChange={(v) => setSetting({ showResults: v }, v ? 'Resultados revelados!' : 'Resultados ocultos')} />
            </Card>
          </section>

          {/* Votos reais (sempre visíveis para a organização) */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Votos em tempo real (só organização)</h3>
            <ResultsBars title="Mister" list={EVENT_DATA.candidatos.mister} votes={votes} accent="#E34234" />
            <ResultsBars title="Miss" list={EVENT_DATA.candidatos.miss} votes={votes} accent="#F59E0B" />
          </section>

          {/* Pontos do Team Building */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Pontos do Team Building</h3>
            {EVENT_DATA.equipas.map((t) => (
              <TeamPointsRow key={t.id} team={t} score={teams[t.id] || 0} notify={notify} />
            ))}
          </section>

          {/* Galeria */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Galeria ({photos.length} fotos)</h3>
            <a href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-ink">
              <FolderOpen size={16} /> Abrir pasta das fotos no Drive
            </a>
            {photos.length > 0 && <p className="text-xs text-white/50">Toca numa foto para a esconder ou voltar a mostrar na galeria pública.</p>}
            <div className="grid grid-cols-4 gap-1.5">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    try { await backend.setPhotoHidden(p.id, !p.hidden); notify(p.hidden ? 'Foto visível' : 'Foto escondida'); } catch (e) { console.error(e); notify('Erro ao atualizar foto.', 'error'); }
                  }}
                  className="relative aspect-square overflow-hidden rounded-md ring-1 ring-white/10"
                >
                  <img src={p.img} alt="" className={cx('h-full w-full object-cover', p.hidden && 'opacity-25 grayscale')} />
                  {p.hidden && <EyeOff size={18} className="absolute inset-0 m-auto text-red-300" />}
                </button>
              ))}
            </div>
          </section>

          {/* Reset de emergência */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-300/80">Reset de emergência</h3>
            <p className="text-xs text-white/50">Usar apenas depois dos testes, antes do início oficial. Repor votos permite que todos os telemóveis voltem a votar.</p>
            <DangerAction label="Repor pontuações do Team Building" onConfirm={async () => { await backend.resetScores(); notify('Pontuações repostas a zero'); }} />
            <DangerAction label="Repor votos Mister & Miss" onConfirm={async () => { await backend.resetVotes(); notify('Votos repostos a zero'); }} />
          </section>

          <button onClick={() => { setUnlocked(false); setPin(''); onClose(); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold">
            <Lock size={16} /> Bloquear e sair
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 *  6) APP PRINCIPAL
 * ========================================================================== */
const NAV = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'team', label: 'Team', icon: Trophy },
  { id: 'jantar', label: 'Jantar', icon: UtensilsCrossed },
  { id: 'mm', label: 'Mister & Miss', icon: Crown },
  { id: 'galeria', label: 'Galeria', icon: Camera },
  { id: 'info', label: 'Info', icon: MapPin },
];

export default function App() {
  const { teams, votes, photos, settings, ready, error } = useLiveEvent();
  const [tab, setTab] = useState('agenda');
  const [adminOpen, setAdminOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((text, type = 'ok') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const go = (id) => {
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const leader = useMemo(() => rankTeams(teams)[0], [teams]);

  return (
    <div className="app-shell mx-auto min-h-screen max-w-md">
      {/* Cabeçalho */}
      <header className="pt-safe sticky top-0 z-40 border-b border-gold/20 bg-ink/90 backdrop-blur">
        <div className="flex h-[60px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <PokerChip size={34} color="#E34234"><span className="font-display text-sm font-extrabold">V</span></PokerChip>
            <div className="leading-tight">
              <p className="text-sm font-bold">Vermilion Group</p>
              <p className="text-[11px] text-gold-light/70">Festa de Natal · Macau Nights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              title={IS_LIVE ? 'Sincronizado em tempo real' : 'Modo demonstração (sem Firebase)'}
              className={cx('flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase', IS_LIVE ? (error ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300') : 'bg-gold/15 text-gold')}
            >
              {IS_LIVE ? (error ? <WifiOff size={11} /> : <Wifi size={11} />) : null}
              {IS_LIVE ? (error ? 'Offline' : 'Ao vivo') : 'Demo'}
            </span>
            <button onClick={() => setAdminOpen(true)} className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white/40 ring-1 ring-white/10 active:bg-white/5">
              Admin
            </button>
          </div>
        </div>
        {error && <p className="bg-red-500/10 px-4 py-1.5 text-center text-xs text-red-300">{error}</p>}
      </header>

      {/* Conteúdo */}
      <main className="px-4 pb-32 pt-2">
        {tab === 'agenda' && (
          <>
            <AgendaView />
            {leader && leader.score > 0 && (
              <button onClick={() => go('team')} className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-gold/20 to-transparent p-4 text-left ring-1 ring-gold/30">
                <Trophy className="text-gold" />
                <div className="flex-1">
                  <p className="text-xs text-white/60">Lidera o Team Building</p>
                  <p className="font-bold">{leader.emblema} {leader.nome} · {leader.score} pts</p>
                </div>
                <ChevronRight size={18} className="text-white/40" />
              </button>
            )}
          </>
        )}
        {tab === 'team' && <TeamBuildingView teams={teams} />}
        {tab === 'jantar' && <JantarView />}
        {tab === 'mm' && <MisterMissView votes={votes} settings={settings} ready={ready} notify={notify} />}
        {tab === 'galeria' && <GalleryView photos={photos} notify={notify} />}
        {tab === 'info' && <InfoView />}
      </main>

      {/* Navegação inferior fixa */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-gold/25 bg-ink/95 backdrop-blur">
        <div className="mx-auto grid h-[72px] max-w-md grid-cols-6">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => go(id)} className="relative flex flex-col items-center justify-center gap-1">
                {active && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-gradient-to-r from-vermilion via-gold to-vermilion" />}
                <Icon size={22} className={active ? 'text-vermilion' : 'text-white/45'} />
                <span className={cx('text-[10px] font-semibold leading-none', active ? 'text-white' : 'text-white/45')}>{label}</span>
                {id === 'mm' && settings.votingOpen && <span className="absolute right-[22%] top-3 h-2 w-2 rounded-full bg-gold" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notificações */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
          <div className={cx('animate-pop rounded-full px-4 py-2 text-sm font-semibold shadow-xl', toast.type === 'error' ? 'bg-red-600' : 'bg-white text-ink')}>
            {toast.text}
          </div>
        </div>
      )}

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} teams={teams} votes={votes} photos={photos} settings={settings} notify={notify} />
    </div>
  );
}
