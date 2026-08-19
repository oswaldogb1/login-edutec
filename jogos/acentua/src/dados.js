/* =====================================================================
   EXPRESSO TÔNICO — dados do mundo

   Mapa de 5600 x 4200 atravessando cinco paisagens: cidade, vilarejo,
   serra (com túneis e ladeiras), deserto e floresta. Os trilhos são
   curvos: cada aresta guarda pontos de controle e vira uma polilinha
   suave em `construirMalha()`.
   ===================================================================== */

var MUNDO = { l: 5600, a: 4200 };

var CORES = {
  oxitona: '#ffc93c',
  paroxitona: '#37d6cf',
  proparoxitona: '#ff5f9e',
  deposito: '#ff9d4d',
  central: '#9fc4ff'
};

var ROTULOS = {
  oxitona: 'OXÍTONA',
  paroxitona: 'PAROXÍTONA',
  proparoxitona: 'PROPAROXÍTONA',
  monossilabo: 'MONOSSÍLABO'
};

/* Conteúdo que aparece na plataforma de cada bairro: é o "cartaz da
   estação", lido toda vez que o aluno para ali. */
var BAIRROS = {
  oxitona: {
    nome: 'VILAREJO OXÍTONA',
    lema: 'A força está na ÚLTIMA sílaba.',
    regra: 'Acentua-se a oxítona terminada em -A(S), -E(S), -O(S), -EM e -ENS.',
    exemplos: 'so-FÁ · ca-FÉ · ci-PÓ · tam-BÉM · pa-ra-BÉNS · com-pu-ta-DOR'
  },
  paroxitona: {
    nome: 'OÁSIS PAROXÍTONA',
    lema: 'A força está na PENÚLTIMA sílaba.',
    regra: 'É o povoado mais cheio do português. Só recebe acento quando NÃO termina '
      + 'em -a(s), -e(s), -o(s): então acentuam-se as terminadas em -l, -n, -r, -x, '
      + '-ps, -i(s), -us, -um/-uns, -ã(s), -ão(s) e em ditongo.',
    exemplos: 'FÁ-cil · HÍ-fen · a-ÇÚ-car · TÓ-rax · JÚ-ri · ÁL-bum · his-TÓ-ria · CA-sa'
  },
  proparoxitona: {
    nome: 'CLAREIRA PROPAROXÍTONA',
    lema: 'A força está na ANTEPENÚLTIMA sílaba.',
    regra: 'Vila sem exceção: TODA proparoxítona é acentuada. Se você ouviu a força '
      + 'três sílabas atrás, pode acentuar sem medo.',
    exemplos: 'MÉ-di-co · PÚ-bli-co · LÂM-pa-da · SÁ-ba-do · MÚ-si-ca'
  }
};

/* ------------------------------------------------------------------ */
/* Nós da malha                                                        */
/* ------------------------------------------------------------------ */

var NOS = {
  central: { x: 2800, y: 2100, tipo: 'central', nome: 'ESTAÇÃO CENTRAL' },

  c_n: { x: 2800, y: 1560, tipo: 'juncao', sinal: true },
  c_s: { x: 2800, y: 2680, tipo: 'juncao', sinal: true },
  c_l: { x: 3480, y: 2100, tipo: 'juncao' },
  c_o: { x: 2120, y: 2100, tipo: 'juncao' },

  t1: { x: 3320, y: 900, tipo: 'juncao' },
  n_o: { x: 1780, y: 1280, tipo: 'juncao' },
  n_l: { x: 4000, y: 1240, tipo: 'juncao' },
  t2: { x: 4820, y: 1760, tipo: 'juncao', sinal: true },
  s_l: { x: 4180, y: 3060, tipo: 'juncao' },
  s_o: { x: 1760, y: 2960, tipo: 'juncao' },

  ox: { x: 2680, y: 520, tipo: 'bairro', bairro: 'oxitona' },
  par: { x: 5180, y: 2560, tipo: 'bairro', bairro: 'paroxitona' },
  pro: { x: 980, y: 3400, tipo: 'bairro', bairro: 'proparoxitona' },

  dep1: { x: 1080, y: 900, tipo: 'deposito', nome: 'DEPÓSITO DA SERRA' },
  dep2: { x: 4700, y: 3720, tipo: 'deposito', nome: 'DEPÓSITO DO OÁSIS' }
};

/* ------------------------------------------------------------------ */
/* Arestas                                                             */
/*   curva   : pontos de controle intermediários (a linha vira suave)   */
/*   tunel   : [ini, fim] em fração da aresta                           */
/*   ladeira : [ini, fim, sentido] — +1 sobe indo de `a` para `b`       */
/*   obras   : [ini, fim] em fração da aresta                           */
/* ------------------------------------------------------------------ */

var ARESTAS = [
  { a: 'central', b: 'c_n', curva: [[2880, 1880], [2740, 1700]] },
  { a: 'central', b: 'c_s', curva: [[2900, 2360], [2760, 2520]] },
  { a: 'central', b: 'c_l', curva: [[3060, 2020], [3260, 2160]] },
  { a: 'central', b: 'c_o', curva: [[2560, 2180], [2320, 2040]] },

  { a: 'c_n', b: 't1', curva: [[2920, 1300], [3160, 1060]] },
  { a: 't1', b: 'ox', curva: [[3080, 700], [2880, 560]], ladeira: [0.2, 0.8, 1] },

  { a: 'c_n', b: 'n_o', curva: [[2440, 1420], [2080, 1220]],
    tunel: [0.42, 0.68], ladeira: [0.1, 0.42, 1] },
  { a: 'n_o', b: 'dep1', curva: [[1520, 1140], [1240, 940]], ladeira: [0.15, 0.85, 1] },
  { a: 'c_o', b: 'n_o', curva: [[1980, 1840], [1800, 1560]] },

  { a: 'c_l', b: 'n_l', curva: [[3680, 1820], [3900, 1500]] },
  { a: 'n_l', b: 't2', curva: [[4320, 1160], [4680, 1380]],
    tunel: [0.34, 0.62], ladeira: [0.6, 0.95, -1] },
  { a: 't1', b: 'n_l', curva: [[3560, 980], [3820, 1080]] },

  { a: 'c_l', b: 't2', curva: [[3920, 2200], [4460, 2020]], obras: [0.4, 0.66] },
  { a: 't2', b: 'par', curva: [[5060, 2020], [5240, 2300]] },
  { a: 'par', b: 's_l', curva: [[4940, 2900], [4540, 3020]] },
  { a: 's_l', b: 'dep2', curva: [[4360, 3340], [4600, 3540]] },
  { a: 'c_s', b: 's_l', curva: [[3200, 2920], [3720, 3040]], obras: [0.3, 0.52] },

  { a: 'c_s', b: 's_o', curva: [[2420, 2880], [2060, 2920]] },
  { a: 'c_o', b: 's_o', curva: [[2000, 2420], [1840, 2700]] },
  { a: 's_o', b: 'pro', curva: [[1520, 3140], [1200, 3220]], ladeira: [0.25, 0.7, -1] }
];

/* ------------------------------------------------------------------ */
/* Paisagens: a ordem importa, cada uma é pintada por cima da anterior  */
/* ------------------------------------------------------------------ */

var REGIOES = [
  { tipo: 'serra', x: 700, y: 480, l: 1500, a: 1120, nome: 'SERRA DO ACENTO' },
  { tipo: 'serra', x: 3560, y: 640, l: 1500, a: 900 },
  { tipo: 'vilarejo', x: 2260, y: 260, l: 1180, a: 780, nome: 'VILAREJO' },
  { tipo: 'deserto', x: 4180, y: 1560, l: 1360, a: 2200, nome: 'DESERTO DAS OXÍTONAS' },
  { tipo: 'floresta', x: 620, y: 2400, l: 2000, a: 1560, nome: 'MATA DAS PROPAROXÍTONAS' },
  { tipo: 'cidade', x: 2180, y: 1620, l: 1560, a: 1080, nome: 'CIDADE' }
];

var AGUA = [
  { x: 1180, y: 2680, l: 620, a: 300, nome: 'LAGO DO HIATO' },
  { x: 4880, y: 3480, l: 520, a: 320, nome: 'OÁSIS DO TIL' },
  { x: 3020, y: 3560, l: 720, a: 260, nome: 'RIO DAS SÍLABAS' }
];

if (typeof module !== 'undefined') {
  module.exports = { MUNDO, CORES, ROTULOS, BAIRROS, NOS, ARESTAS, REGIOES, AGUA };
}
