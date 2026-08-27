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
  velocidade: 40,       // aceleração ao andar  (velocidade final ~4,4 m/s)
  velocidadeCorrida: 72,// aceleração ao correr (Shift) (velocidade final ~8 m/s)
  atrito: 9,            // desaceleração
  raioColisao: 0.7      // "gordura" do jogador para colidir com paredes
};

/* ---------------------------------------------------------------------------
 * FUGA DO ANIMAL
 * A cada resposta errada um animal aparece e persegue o jogador. Ele precisa
 * correr (Shift) até uma das Áreas Seguras espalhadas pela cidade. Ao chegar,
 * a pergunta reabre para nova tentativa.
 * ------------------------------------------------------------------------- */
export const PERSEGUICAO = {
  /** Ligue/desligue a mecânica inteira (o professor pode preferir sem ela). */
  ativa: true,

  /**
   * Velocidade do animal em m/s.
   * Referência: andando o jogador faz ~4,4 m/s e correndo ~8 m/s.
   * Com 6,5 o animal alcança quem anda, mas não quem corre.
   */
  velocidadeAnimal: 6.5,

  /** A que distância, atrás do jogador, o animal aparece. */
  distanciaSurgimento: 16,

  /** Distância em que o animal alcança o jogador. */
  distanciaCaptura: 2.0,

  /** Raio da Área Segura: entrou no círculo, está a salvo. */
  raioAreaSegura: 7,

  /** Pontos perdidos ao ser alcançado (0 = sem punição, só o susto). */
  penalidadeCaptura: 20,

  /** Tempo (ms) que o aviso "corra!" fica na tela antes de a fuga começar. */
  tempoAvisoMs: 2200
};

/** Limite do mundo (a cidade é um quadrado de -LIMITE a +LIMITE). */
export const LIMITE_MUNDO = 145;

/**
 * Posições das Áreas Seguras. Ficam nas diagonais entre as zonas, de modo que
 * toda zona tenha um abrigo a ~51 metros — perto o bastante para a fuga ser
 * possível, longe o bastante para exigir corrida.
 */
export const AREAS_SEGURAS = [
  { x: -36, z: -36 },
  { x: 36, z: -36 },
  { x: -36, z: 36 },
  { x: 36, z: 36 }
];
