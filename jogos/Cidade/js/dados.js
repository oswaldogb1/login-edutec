/* ==========================================================================
   dados.js — o "miolo educativo" do jogo
   --------------------------------------------------------------------------
   É AQUI que o professor pode mexer sem saber programar:
     - textos das soluções e das consequências
     - quanto cada solução custa
     - quanto cada solução mexe em cada indicador
     - a fórmula da pontuação
     - os perfis de cidade e as perguntas de reflexão
   Nada aqui depende do Firebase nem do desenho do mapa.
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1) OS 5 INDICADORES DA CIDADE
     Todos vão de 0 a 100 e começam em 50 (cidade "normal").
     Atenção: em DESIGUALDADE, quanto MENOR melhor (por isso melhorAlto:false).
     ------------------------------------------------------------------ */
  CI.INDICADORES = [
    { id: 'empregos',     nome: 'Empregos',              icone: '💼', cor: '#3987e5', melhorAlto: true  },
    { id: 'ambiente',     nome: 'Meio Ambiente',         icone: '🌱', cor: '#199e70', melhorAlto: true  },
    { id: 'qualidade',    nome: 'Qualidade de Vida',     icone: '😊', cor: '#c98500', melhorAlto: true  },
    { id: 'direitos',     nome: 'Privacidade e Direitos',icone: '🛡️', cor: '#9085e9', melhorAlto: true  },
    { id: 'desigualdade', nome: 'Desigualdade Social',   icone: '⚖️', cor: '#e66767', melhorAlto: false }
  ];

  /* Valor inicial de cada indicador */
  CI.INDICADORES_INICIAIS = function () {
    return { empregos: 50, ambiente: 50, qualidade: 50, direitos: 50, desigualdade: 50 };
  };

  /* Verba (dinheiro) que cada aluno recebe no começo da partida */
  CI.ORCAMENTO_INICIAL = 1000;

  /* ------------------------------------------------------------------
     2) OS TIPOS DE ZONA DO MAPA
     ------------------------------------------------------------------ */
  CI.ZONAS = {
    rua:         { nome: 'Rua' },
    residencial: { nome: 'Bairro residencial' },
    comercial:   { nome: 'Área comercial' },
    industrial:  { nome: 'Área industrial' },
    verde:       { nome: 'Área verde' }
  };

  /* ------------------------------------------------------------------
     3) AS SOLUÇÕES INTELIGENTES
     Cada solução tem:
       custo   : quanto tira da verba
       zonas   : onde pode ser colocada no mapa
       efeitos : quanto muda cada indicador (positivo ou negativo)
       bom/ruim: frases curtas mostradas ao aluno
     Lembrete de leitura dos efeitos:
       empregos/ambiente/qualidade/direitos -> número positivo é BOM
       desigualdade                          -> número positivo é RUIM
     ------------------------------------------------------------------ */
  CI.SOLUCOES = [
    {
      id: 'semaforo', nome: 'Semáforos inteligentes', icone: '🚦', custo: 80,
      zonas: ['rua'],
      efeitos: { qualidade: 9, ambiente: 3 },
      bom:  'O trânsito anda melhor e acontecem menos acidentes.',
      ruim: 'Custa caro para a prefeitura: é dinheiro que deixa de ir para outras áreas.'
    },
    {
      id: 'robos', nome: 'Robôs nas fábricas', icone: '🤖', custo: 120,
      zonas: ['industrial'],
      efeitos: { qualidade: 4, empregos: -13, desigualdade: 8, ambiente: -2 },
      bom:  'As fábricas produzem muito mais e mais rápido.',
      ruim: 'Muitos trabalhadores perdem o emprego, e o lucro fica com poucos donos.'
    },
    {
      id: 'lixo', nome: 'Coleta de lixo com sensores', icone: '🗑️', custo: 70,
      zonas: ['residencial', 'comercial'],
      efeitos: { ambiente: 10, qualidade: 5, empregos: -6, desigualdade: 3 },
      bom:  'A cidade fica bem mais limpa e o caminhão só passa onde precisa.',
      ruim: 'Parte dos garis e coletores perde o trabalho.'
    },
    {
      id: 'solar', nome: 'Energia solar', icone: '☀️', custo: 110,
      zonas: ['residencial', 'comercial', 'industrial'],
      efeitos: { ambiente: 13, qualidade: 3, empregos: 2 },
      bom:  'Menos poluição e conta de luz mais barata para todo mundo.',
      ruim: 'A instalação é cara: gasta bastante da verba da cidade de uma vez só.'
    },
    {
      id: 'cameras', nome: 'Câmeras com reconhecimento facial', icone: '📷', custo: 90,
      zonas: ['rua', 'comercial', 'residencial'],
      efeitos: { qualidade: 7, direitos: -15, desigualdade: 4 },
      bom:  'As pessoas se sentem mais seguras nas ruas.',
      ruim: 'Todo mundo é filmado o tempo todo — e os erros do sistema costumam sobrar para os mais pobres.'
    },
    {
      id: 'app_transporte', nome: 'Transporte por aplicativo', icone: '🚗', custo: 60,
      zonas: ['rua', 'comercial'],
      efeitos: { qualidade: 7, empregos: 5, desigualdade: 9, ambiente: -3 },
      bom:  'Fica muito mais fácil se locomover pela cidade.',
      ruim: 'Os motoristas trabalham sem carteira assinada, sem férias e sem descanso garantido.'
    },
    {
      id: 'drones', nome: 'Entregas por drones', icone: '🛸', custo: 100,
      zonas: ['comercial', 'industrial'],
      efeitos: { qualidade: 7, empregos: -11, desigualdade: 6, ambiente: 2 },
      bom:  'As entregas chegam em minutos e sem poluir.',
      ruim: 'Entregadores e motoboys ficam sem trabalho.'
    },
    {
      id: 'wifi', nome: 'Wi-Fi público e telecentros', icone: '📶', custo: 85,
      zonas: ['residencial', 'comercial', 'verde'],
      efeitos: { qualidade: 6, desigualdade: -11, empregos: 3, direitos: 2 },
      bom:  'Quem não tem internet em casa consegue estudar e procurar emprego.',
      ruim: 'É caro manter: precisa de dinheiro público todo mês para não parar de funcionar.'
    },
    {
      id: 'hortas', nome: 'Hortas urbanas automatizadas', icone: '🥬', custo: 75,
      zonas: ['verde', 'residencial'],
      efeitos: { ambiente: 11, qualidade: 5, empregos: 2, desigualdade: 3 },
      bom:  'Comida fresca e barata perto de casa, com menos transporte poluindo.',
      ruim: 'Só quem fez curso consegue as vagas de trabalho: quem não estudou fica de fora.'
    },
    {
      id: 'totens', nome: 'Totens de autoatendimento', icone: '🖥️', custo: 55,
      zonas: ['comercial'],
      efeitos: { qualidade: 5, empregos: -10, desigualdade: 5 },
      bom:  'As filas andam mais rápido e o atendimento funciona 24 horas.',
      ruim: 'Atendentes são demitidos, e idosos têm dificuldade de usar as máquinas.'
    },

    /* --- Duas soluções "de equilíbrio": servem para consertar estragos --- */
    {
      id: 'capacitacao', nome: 'Escola de formação em tecnologia', icone: '🎓', custo: 95,
      zonas: ['residencial', 'comercial'],
      efeitos: { empregos: 10, desigualdade: -9, qualidade: 4 },
      bom:  'Quem perdeu o emprego aprende uma profissão nova e volta a trabalhar.',
      ruim: 'Demora: o resultado só aparece depois de meses de estudo, e a escola custa caro.'
    },
    {
      id: 'lei_dados', nome: 'Conselho de proteção de dados', icone: '🛡️', custo: 70,
      zonas: ['comercial', 'residencial'],
      efeitos: { direitos: 13, qualidade: 2, desigualdade: -2 },
      bom:  'A cidade cria regras: as imagens e os dados das pessoas não podem ser usados de qualquer jeito.',
      ruim: 'Algumas empresas de tecnologia reclamam e ameaçam ir embora da cidade.'
    }
  ];

  /* ------------------------------------------------------------------
     4) EFEITO DE REPETIR A MESMA SOLUÇÃO
     Regra de ouro do jogo: repetir a MESMA tecnologia dá cada vez menos
     benefício, mas os problemas continuam se somando por inteiro.
     (Ex.: encher a cidade de robôs quase não melhora mais nada,
      mas o desemprego cresce sempre igual.)

       fator de benefício = 1 / (1 + 0,40 × quantidade já colocada)
       1ª vez = 100% | 2ª = 71% | 3ª = 56% | 4ª = 45% ...

     O custo, ao contrário, sobe 15% a cada repetição.
     ------------------------------------------------------------------ */
  var DESCONTO_REPETICAO = 0.40;
  var AUMENTO_CUSTO      = 0.15;

  CI.custoDaSolucao = function (solucao, jaColocadas) {
    return Math.round(solucao.custo * (1 + AUMENTO_CUSTO * jaColocadas));
  };

  /* Calcula quanto cada indicador vai mudar, já considerando as repetições.
     Devolve um objeto tipo { empregos: -13, qualidade: 2.8, ... } */
  CI.efeitosDaSolucao = function (solucao, jaColocadas) {
    var fatorBeneficio = 1 / (1 + DESCONTO_REPETICAO * jaColocadas);
    var resultado = {};

    CI.INDICADORES.forEach(function (ind) {
      var valor = solucao.efeitos[ind.id];
      if (!valor) return;

      // O efeito é BOM quando: sobe um indicador "quanto maior melhor",
      // ou quando desce um indicador "quanto menor melhor" (desigualdade).
      var ehBom = ind.melhorAlto ? (valor > 0) : (valor < 0);

      resultado[ind.id] = ehBom
        ? valor * fatorBeneficio   // benefício encolhe quando repete
        : valor;                   // problema continua igual, sempre
    });

    return resultado;
  };

  /* ------------------------------------------------------------------
     5) A FÓRMULA DA PONTUAÇÃO ("cidade mais eficiente")
     --------------------------------------------------------------
     A ideia central: NÃO ganha quem usa mais tecnologia.
     Ganha quem consegue EQUILÍBRIO — melhorar vários indicadores sem
     deixar nenhum outro afundar.

     Passo a passo:
       a) Transformamos desigualdade em "equidade" (100 - desigualdade),
          assim os 5 números viram "quanto maior, melhor".
       b) media = média dos 5 números.
       c) pior  = o MENOR dos 5 números (o ponto fraco da cidade).
       d) nota  = 65% da média + 35% do pior indicador.
          -> É esse "pior" que castiga quem automatiza tudo e deixa o
             desemprego ou a desigualdade explodirem.
       e) fator de participação: quem não constrói quase nada fica em 85%
          da nota (cidade parada também não é solução).
       f) multiplicamos por 10 para a pontuação ficar de 0 a 1000.

     Quer deixar mais rígido com o equilíbrio? Aumente o 0.35 (e diminua
     o 0.65 na mesma medida).
     ------------------------------------------------------------------ */
  CI.PESO_MEDIA = 0.65;
  CI.PESO_PIOR  = 0.35;

  CI.calcularPontuacao = function (ind, qtdSolucoes) {
    var equidade = 100 - ind.desigualdade;
    var valores = [ind.empregos, ind.ambiente, ind.qualidade, ind.direitos, equidade];

    var soma = 0, pior = valores[0];
    for (var i = 0; i < valores.length; i++) {
      soma += valores[i];
      if (valores[i] < pior) pior = valores[i];
    }
    var media = soma / valores.length;

    var nota = CI.PESO_MEDIA * media + CI.PESO_PIOR * pior;

    // participação: 0 construções = 0.85 | 8 ou mais construções = 1.00
    var fatorParticipacao = 0.85 + 0.15 * Math.min(1, (qtdSolucoes || 0) / 8);

    return Math.max(0, Math.round(nota * fatorParticipacao * 10));
  };

  /* ------------------------------------------------------------------
     6) PERFIL DA CIDADE (relatório final) + PERGUNTAS DE REFLEXÃO
     A ordem importa: o primeiro perfil cuja condição for verdadeira vence.
     ------------------------------------------------------------------ */
  CI.PERFIS = [
    {
      id: 'parada', emoji: '🌾', nome: 'Cidade Parada no Tempo',
      condicao: function (i, qtd) { return qtd < 3; },
      texto: 'Você quase não mexeu na cidade. Nada piorou… mas nada melhorou também. Ficar parado também é uma escolha — e ela tem consequências.',
      perguntas: [
        'Uma cidade que não muda nada é uma cidade justa?',
        'Quais problemas do seu bairro poderiam melhorar com tecnologia?',
        'Por que às vezes é difícil decidir mudar alguma coisa?'
      ]
    },
    {
      id: 'equilibrada', emoji: '🌳', nome: 'Equilibrada e Sustentável',
      condicao: function (i, qtd) {
        return Math.min(i.empregos, i.ambiente, i.qualidade, i.direitos, 100 - i.desigualdade) >= 58;
      },
      texto: 'Parabéns! Você usou tecnologia sem deixar ninguém para trás: tem emprego, natureza, direitos e menos desigualdade. Foi preciso escolher com cuidado — e não só apertar todos os botões.',
      perguntas: [
        'Qual escolha foi a mais difícil de fazer? Por quê?',
        'Alguma tecnologia você decidiu NÃO usar? O que pesou nessa decisão?',
        'Quem deveria decidir, na vida real, quais tecnologias entram numa cidade?'
      ]
    },
    {
      id: 'automatizada', emoji: '🤖', nome: 'Automatizada mas Desigual',
      condicao: function (i) { return i.empregos < 42 || i.desigualdade > 64; },
      texto: 'Sua cidade é moderna e rápida, mas muita gente ficou sem trabalho e a diferença entre ricos e pobres aumentou. A máquina produz — só que o dinheiro não chega para todos.',
      perguntas: [
        'Quando uma máquina substitui um trabalhador, para onde vai o dinheiro que era o salário dele?',
        'O que a cidade poderia oferecer para quem perdeu o emprego?',
        'Automatizar é sempre ruim? O que faria essa mesma cidade ser justa?'
      ]
    },
    {
      id: 'vigiada', emoji: '📷', nome: 'Segura mas Vigiada',
      condicao: function (i) { return i.direitos < 42; },
      texto: 'Tem câmera em cada esquina e a cidade parece segura. Só que ninguém tem mais privacidade: tudo o que você faz vira dado guardado por alguém.',
      perguntas: [
        'Você trocaria a sua privacidade por mais segurança? Até que ponto?',
        'Quem fica com as imagens e os dados das câmeras? Quem controla isso?',
        'Se o sistema errar e acusar a pessoa errada, quem paga essa conta?'
      ]
    },
    {
      id: 'poluida', emoji: '🏭', nome: 'Produtiva mas Poluída',
      condicao: function (i) { return i.ambiente < 42; },
      texto: 'A cidade produz muito, mas o ar, a água e as áreas verdes pagaram o preço. Tecnologia também gasta energia e gera lixo.',
      perguntas: [
        'De onde vem a energia que faz tudo isso funcionar?',
        'Quem mora perto das fábricas costuma ser quem tem mais ou menos dinheiro? Por quê?',
        'O que daria para fazer diferente sem parar a produção?'
      ]
    },
    {
      id: 'construcao', emoji: '🏗️', nome: 'Cidade em Construção',
      condicao: function () { return true; },  // caso nenhum outro se encaixe
      texto: 'Sua cidade avançou em algumas áreas e ainda tem pontos fracos para resolver. Toda cidade real está sempre assim: no meio do caminho.',
      perguntas: [
        'Qual é hoje o ponto mais fraco da sua cidade? O que resolveria?',
        'Qual tecnologia trouxe mais problema do que solução para você?',
        'Se você tivesse o dobro da verba, no que gastaria primeiro?'
      ]
    }
  ];

  CI.perfilDaCidade = function (ind, qtdSolucoes) {
    for (var i = 0; i < CI.PERFIS.length; i++) {
      if (CI.PERFIS[i].condicao(ind, qtdSolucoes || 0)) return CI.PERFIS[i];
    }
    return CI.PERFIS[CI.PERFIS.length - 1];
  };

  /* ------------------------------------------------------------------
     7) TUTORIAL (3 telas curtas, linguagem de 6º/7º ano)
     ------------------------------------------------------------------ */
  CI.TUTORIAL = [
    {
      emoji: '🏙️',
      titulo: 'Você é o prefeito!',
      texto: 'Esta é a sua cidade vista de cima. Ela tem <b>casas</b>, <b>lojas</b>, <b>fábricas</b>, <b>parques</b> e <b>ruas</b>.<br><br>Sua missão: deixar a cidade <b>mais eficiente</b> usando tecnologia.'
    },
    {
      emoji: '💡',
      titulo: 'Toda tecnologia tem dois lados',
      texto: 'Escolha uma solução na lista e coloque no mapa.<br><br>Cada uma melhora algumas coisas <b>e piora outras</b>. Robôs produzem mais, mas tiram empregos. Câmeras dão segurança, mas acabam com a privacidade.'
    },
    {
      emoji: '⚖️',
      titulo: 'Ganha quem equilibra',
      texto: 'A cidade mais eficiente <b>não é a que tem mais tecnologia</b>.<br><br>É a que melhora vários indicadores <b>sem deixar nenhum afundar</b>. Fique de olho no seu indicador mais fraco: é ele que derruba sua nota!'
    }
  ];

})();
