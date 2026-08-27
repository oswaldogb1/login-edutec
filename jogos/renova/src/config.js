/**
 * config.js
 * -----------------------------------------------------------------------------
 * Configurações gerais do jogo "Cidade Inteligente e Sustentável".
 * Altere os valores deste arquivo para adaptar o jogo à sua turma.
 * -----------------------------------------------------------------------------
 */

/* ---------------------------------------------------------------------------
 * FIREBASE
 * Para o Realtime Database, o campo `databaseURL` já é suficiente.
 * Se você quiser usar outros serviços do Firebase no futuro (Auth, Firestore...),
 * cole aqui o objeto completo de configuração do console do Firebase.
 * ------------------------------------------------------------------------- */
export const FIREBASE_CONFIG = {
  databaseURL: 'https://edutec-arnaldo-default-rtdb.firebaseio.com/',
  projectId: 'edutec-arnaldo'
};

/** Nó raiz onde os resultados são gravados: /resultados/{turma}/{idAutoGerado} */
export const NO_RESULTADOS = 'resultados';

/* ---------------------------------------------------------------------------
 * PROFESSOR
 * ------------------------------------------------------------------------- */
/** Senha da tela do professor (não é dado sensível — validação client-side). */
export const SENHA_PROFESSOR = '54321';

/* ---------------------------------------------------------------------------
 * REGRAS DO JOGO
 * ------------------------------------------------------------------------- */
export const REGRAS = {
  /** Tempo limite da partida em segundos. Use 0 para "sem limite de tempo". */
  tempoLimiteSegundos: 0,

  /** Pontos ganhos ao acertar na 1ª tentativa. */
  pontosAcertoPrimeira: 100,
  /** Quanto se perde a cada tentativa errada (nunca fica abaixo do mínimo). */
  penalidadePorErro: 30,
  /** Pontuação mínima garantida ao concluir um ponto de interação. */
  pontosMinimos: 20,
  /** Bônus concedido ao descobrir todos os pontos da cidade. */
  bonusExploradorCompleto: 200,

  /** Distância (em metros do mundo 3D) para poder interagir com um ponto. */
  distanciaInteracao: 5.5
};

/* ---------------------------------------------------------------------------
 * CONTROLES / MOVIMENTAÇÃO
 * ------------------------------------------------------------------------- */
export const JOGADOR = {
  altura: 1.7,          // altura dos olhos (metros)
  velocidade: 26,       // aceleração ao andar
  velocidadeCorrida: 48,// aceleração ao correr (Shift)
  atrito: 9,            // desaceleração
  raioColisao: 0.7      // "gordura" do jogador para colidir com paredes
};

/** Limite do mundo (a cidade é um quadrado de -LIMITE a +LIMITE). */
export const LIMITE_MUNDO = 145;
