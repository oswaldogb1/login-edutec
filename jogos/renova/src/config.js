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

  /** Pontos perdidos a cada mordida (0 = sem punição, só o susto). */
  penalidadeMordida: 8,

  /** Tempo (ms) que o aviso "corra!" fica na tela antes de a fuga começar. */
  tempoAvisoMs: 2200,

  /* --- Mordidas: alcançar o jogador não termina mais a fuga --------------
   * O animal morde, tira vida e recua um pouco. A fuga só acaba quando o
   * jogador chega a um abrigo, espanta o animal a pauladas ou fica sem vida.
   * ---------------------------------------------------------------------- */

  /** Tempo (ms) em que o animal recua depois de morder. */
  recuoAposMordidaMs: 1100,
  /** Quanto (metros) o animal é empurrado para trás ao morder. */
  empurraoMordida: 3.2,

  /** Golpes de porrete necessários para o animal desistir e fugir. */
  golpesParaEspantar: 3,

  /** Pontos perdidos ao desmaiar (vida zerada). */
  penalidadeDesmaio: 25
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

/* ---------------------------------------------------------------------------
 * VIDA DO JOGADOR
 * O animal não "captura" mais: ele morde. Cada mordida tira vida e espirra
 * sangue na tela. A fuga só termina mal quando a vida chega a zero.
 * ------------------------------------------------------------------------- */
export const VIDA = {
  /** Vida cheia no começo da partida. */
  maxima: 100,
  /** Quanto cada mordida tira. Com 20, o aluno aguenta 5 mordidas. */
  danoMordida: 20,
  /** Tempo (ms) de invulnerabilidade logo depois de uma mordida. */
  invulneravelMs: 1400,
  /** Vida recuperada por segundo fora de perseguição. */
  regeneracaoPorSegundo: 3,
  /** Vida recuperada por segundo dentro de uma Área Segura (bem mais rápido). */
  regeneracaoAbrigoPorSegundo: 14,
  /** Vida com que o jogador acorda depois de desmaiar. */
  vidaAoAcordar: 60
};

/* ---------------------------------------------------------------------------
 * PORRETE — revidar a pauladas
 * O jogador carrega um pedaço de madeira. Com F (ou clique) ele acerta o
 * animal, que fica atordoado por alguns segundos: é a janela para escapar.
 * ------------------------------------------------------------------------- */
export const PORRETE = {
  /** Alcance do golpe, em metros. */
  alcance: 3.6,
  /** Abertura do cone à frente do jogador, em graus (para os dois lados). */
  anguloGraus: 75,
  /** Intervalo mínimo (ms) entre um golpe e outro. */
  recargaMs: 650,
  /** Tempo (ms) em que o animal fica parado depois de apanhar. */
  atordoamentoMs: 2000,
  /** Quanto (metros) o animal é empurrado para trás ao apanhar. */
  empurrao: 4.5,
  /** Pontos ganhos por golpe certeiro (coragem conta!). */
  pontosPorGolpe: 5
};

/* ---------------------------------------------------------------------------
 * MULTIJOGADOR — todos os alunos na mesma sala
 * Cada aluno publica sua posição e lê a dos colegas por REST puro (sem SDK).
 * É opcional: se a rede falhar, o jogo continua normalmente sozinho.
 * ------------------------------------------------------------------------- */
export const MULTIJOGADOR = {
  /** Ligue/desligue a cidade compartilhada. */
  ativo: true,

  /**
   * Nó raiz EXCLUSIVO deste jogo dentro do banco compartilhado da escola.
   * Nunca aponte para fora daqui: `multijogador.js` recusa qualquer caminho
   * que não comece por este prefixo.
   */
  raiz: 'renova_cidade',

  /** Sala única: todo mundo entra na mesma cidade. */
  sala: 'geral',

  /** De quanto em quanto tempo (ms) a própria posição é publicada. */
  intervaloEnvioMs: 260,

  /** Poll de emergência (ms) quando o stream de eventos não funciona. */
  intervaloPollMs: 1800,

  /** Colega sem atualizar há mais tempo que isto (ms) some da cidade. */
  tempoInatividadeMs: 20000,

  /** Quantas mensagens do bate-papo ficam na tela. */
  mensagensVisiveis: 7,

  /** Tamanho máximo de uma mensagem digitada. */
  tamanhoMaxMensagem: 120,

  /** Distância (m) para o colega aparecer como "por perto" e poder conversar. */
  distanciaConversa: 14
};
