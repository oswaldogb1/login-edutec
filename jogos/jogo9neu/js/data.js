/* ============================================================
   BANCO DE CONTEÚDO — Tabuleiro Tático e Quiz
   ------------------------------------------------------------
   Zonas válidas do tabuleiro (data-zone no SVG):
     goalArea   -> área do goleiro (6 m)
     nineMeter  -> linha de 9 m (tiro livre)
     sevenMeter -> marca de 7 m (tiro de 7 m)
     centerLine -> linha central
     goal       -> o gol
     court      -> resto da quadra
   ============================================================ */

// ---- Situações do Tabuleiro Tático ----
const BOARD_SITUATIONS = [
  {
    text: "Clique na ÁREA onde somente o goleiro pode tocar a bola com os pés — proibida para jogadores de linha.",
    answer: "goalArea",
    explanation: "A área do goleiro (linha de 6 m) é exclusiva do goleiro. Jogadores de linha não podem pisar nela para atacar ou defender."
  },
  {
    text: "Um jogador de linha invadiu para finalizar mais perto do gol. Clique na zona em que essa invasão é FALTA.",
    answer: "goalArea",
    explanation: "Pisar na área do goleiro com vantagem anula o lance. Só é permitido saltar POR CIMA dela e soltar a bola antes de cair."
  },
  {
    text: "Clique no local exato de onde é cobrado o TIRO DE 7 METROS (penalidade máxima).",
    answer: "sevenMeter",
    explanation: "O tiro de 7 m é cobrado da marca de 7 m, em lance individual contra o goleiro, após falta que anule clara chance de gol."
  },
  {
    text: "A falta aconteceu DENTRO da área. Clique na linha de onde o tiro livre será recuado e cobrado.",
    answer: "nineMeter",
    explanation: "Quando a falta ocorre dentro da área do goleiro, a cobrança é recuada para a linha de 9 m (linha de tiro livre)."
  },
  {
    text: "Clique na LINHA DE 9 METROS, também chamada de linha de tiro livre.",
    answer: "nineMeter",
    explanation: "A linha tracejada de 9 m marca a distância mínima da defesa em cobranças e é a linha do tiro livre."
  },
  {
    text: "Clique no GOL — onde a bola precisa cruzar totalmente a linha para valer ponto.",
    answer: "goal",
    explanation: "O gol é validado quando a bola ultrapassa completamente a linha do gol, entre as traves e sob o travessão."
  },
  {
    text: "A partida vai começar. Clique na LINHA CENTRAL, de onde é feito o tiro de saída.",
    answer: "centerLine",
    explanation: "O jogo começa (e recomeça após cada gol) com o tiro de saída sobre a linha central."
  },
  {
    text: "Clique na região onde os jogadores de linha atacam e se movimentam livremente (fora das áreas demarcadas).",
    answer: "court",
    explanation: "A quadra de jogo (fora da área do goleiro) é o espaço livre para passes, dribles e movimentação dos jogadores de linha."
  },
  {
    text: "O goleiro defendeu e quer contra-atacar rápido. Clique na zona de onde ele SÓ pode sair com a bola controlada.",
    answer: "goalArea",
    explanation: "O goleiro pode sair da sua área, mas ao cruzar a linha de 6 m passa a ser tratado como jogador de linha e não pode voltar com a bola."
  },
  {
    text: "Cobrança de tiro livre: clique na zona onde os DEFENSORES devem recuar para dar distância.",
    answer: "nineMeter",
    explanation: "Na cobrança, os defensores precisam ficar a pelo menos 3 m do cobrador — a linha de 9 m é a referência dessa distância."
  },
  {
    text: "Clique na ZONA PROIBIDA para o pé do atacante durante uma finalização normal.",
    answer: "goalArea",
    explanation: "O atacante não pode apoiar o pé dentro da área do goleiro ao finalizar; deve arremessar antes ou saltando sobre a área."
  },
  {
    text: "Clique de onde parte a bola para reiniciar o jogo após um gol (tiro de saída).",
    answer: "centerLine",
    explanation: "Após um gol, o jogo reinicia com tiro de saída no centro da quadra, sobre a linha central."
  },
  {
    text: "Houve pênalti! Clique na marca usada para essa cobrança individual contra o goleiro.",
    answer: "sevenMeter",
    explanation: "A 'penalidade máxima' do handebol é o tiro de 7 m, cobrado da marca de 7 m em duelo direto com o goleiro."
  },
  {
    text: "Clique na linha que divide a quadra em duas metades iguais.",
    answer: "centerLine",
    explanation: "A linha central separa os dois campos de jogo e serve de referência para o tiro de saída."
  },
  {
    text: "O ponta armou o arremesso a média distância, saltando por cima da linha da área. Clique na linha que ele NÃO pode pisar.",
    answer: "goalArea",
    explanation: "A linha de 6 m delimita a área do goleiro; o atacante pode saltar sobre ela, mas não apoiar o pé dentro antes de arremessar."
  },
  {
    text: "Clique no espaço da quadra usado para tabelas, dribles e a construção da jogada de ataque.",
    answer: "court",
    explanation: "A movimentação ofensiva acontece na quadra aberta, entre a linha de 9 m e a linha central."
  }
];

// ---- Perguntas do Quiz ----
const QUIZ_QUESTIONS = [
  {
    q: "Quantos jogadores de cada equipe ficam em quadra no handebol?",
    options: ["5", "6", "7", "11"],
    answer: 2,
    explanation: "São 7 jogadores: 6 de linha + 1 goleiro."
  },
  {
    q: "Qual a duração de uma partida oficial de handebol adulto?",
    options: ["2 tempos de 20 min", "2 tempos de 30 min", "4 tempos de 15 min", "1 tempo de 45 min"],
    answer: 1,
    explanation: "São dois tempos de 30 minutos, com intervalo de 10 a 15 minutos."
  },
  {
    q: "Quantos passos um jogador pode dar com a bola na mão sem driblar?",
    options: ["1", "2", "3", "Passos ilimitados"],
    answer: 2,
    explanation: "São permitidos no máximo 3 passos com a bola na mão."
  },
  {
    q: "Por quantos segundos um jogador pode segurar a bola parado, sem jogar?",
    options: ["3 segundos", "5 segundos", "8 segundos", "Sem limite"],
    answer: 0,
    explanation: "Segurar a bola parada por mais de 3 segundos é infração."
  },
  {
    q: "O goleiro pode receber um passe de um companheiro DENTRO da própria área?",
    options: ["Sim, sempre", "Não, é tiro livre para o adversário", "Sim, mas só com os pés", "Somente no contra-ataque"],
    answer: 1,
    explanation: "Devolver a bola ao goleiro dentro da área é infração — resulta em tiro livre para o adversário."
  },
  {
    q: "Em que situação é marcado um tiro de 7 metros?",
    options: ["Bola na linha lateral", "Falta que impede clara chance de gol", "Início de cada tempo", "Substituição irregular"],
    answer: 1,
    explanation: "O tiro de 7 m é dado quando uma falta anula uma clara oportunidade de gol."
  },
  {
    q: "Um jogador de linha pode tocar a bola com o pé de propósito?",
    options: ["Sim, como no futebol", "Não, é proibido", "Só o goleiro", "Só fora da área"],
    answer: 1,
    explanation: "Jogadores de linha não podem tocar a bola intencionalmente abaixo do joelho — só o goleiro pode usar os pés."
  },
  {
    q: "A qual distância do gol fica a linha de tiro livre?",
    options: ["6 metros", "7 metros", "9 metros", "12 metros"],
    answer: 2,
    explanation: "A linha de tiro livre fica a 9 m do gol (a linha tracejada da quadra)."
  },
  {
    q: "A qual distância do gol fica a linha da área do goleiro?",
    options: ["4 metros", "6 metros", "9 metros", "7 metros"],
    answer: 1,
    explanation: "A área do goleiro é delimitada pela linha de 6 m."
  },
  {
    q: "O que acontece na regra de 'jogo passivo'?",
    options: [
      "A equipe ganha um ponto extra",
      "O árbitro adverte e pode dar a posse ao adversário se não houver tentativa de finalizar",
      "O jogo é paralisado por 2 minutos",
      "Nada, é permitido"
    ],
    answer: 1,
    explanation: "No jogo passivo (enrolação), o árbitro sinaliza; persistindo a falta de ação ofensiva, a posse passa ao adversário."
  },
  {
    q: "Quantos árbitros comandam oficialmente uma partida de handebol?",
    options: ["1", "2", "3", "4"],
    answer: 1,
    explanation: "A partida é conduzida por 2 árbitros com autoridade igual."
  },
  {
    q: "Qual punição corresponde a uma exclusão temporária?",
    options: ["1 minuto", "2 minutos", "5 minutos", "Cartão vermelho direto"],
    answer: 1,
    explanation: "A exclusão temporária tira o jogador por 2 minutos; a equipe fica com um a menos nesse período."
  },
  {
    q: "O que é o 'drible' no handebol?",
    options: [
      "Quicar a bola no chão continuamente",
      "Correr segurando a bola",
      "Passar entre as pernas do adversário",
      "Um tipo de arremesso"
    ],
    answer: 0,
    explanation: "Driblar é quicar a bola no chão; só se pode driblar uma vez seguida por sequência de passos."
  },
  {
    q: "Após dar um drible e segurar a bola, o jogador pode driblar de novo?",
    options: ["Sim, quantas vezes quiser", "Não, é 'dois dribles' (falta)", "Só uma vez a mais", "Só no contra-ataque"],
    answer: 1,
    explanation: "Driblar, segurar e driblar novamente é a infração de 'dois dribles', punida com tiro livre."
  },
  {
    q: "De onde é reiniciado o jogo quando a bola sai pela linha lateral?",
    options: ["Tiro de meta", "Tiro lateral no ponto onde saiu", "Tiro de 7 m", "Tiro de saída no centro"],
    answer: 1,
    explanation: "Bola na lateral gera tiro lateral, cobrado no ponto por onde a bola saiu, para a equipe que não a tocou por último."
  },
  {
    q: "Quando a bola sai pela linha de fundo tocada por último num defensor (não goleiro), o reinício é:",
    options: ["Tiro de meta (goleiro)", "Escanteio (tiro de canto)", "Tiro de 7 m", "Tiro de saída"],
    answer: 1,
    explanation: "É marcado o tiro de canto (escanteio) para o ataque."
  },
  {
    q: "Qual posição é responsável por organizar o ataque, como um 'armador central'?",
    options: ["Pivô", "Ponta", "Central (meia)", "Goleiro"],
    answer: 2,
    explanation: "O armador central organiza o jogo ofensivo e distribui a bola aos demais."
  },
  {
    q: "O jogador que atua colado à defesa adversária, de costas para o gol, é o:",
    options: ["Pivô", "Ponta", "Armador", "Líbero"],
    answer: 0,
    explanation: "O pivô joga infiltrado na defesa, abrindo espaços e finalizando de perto."
  }
];
