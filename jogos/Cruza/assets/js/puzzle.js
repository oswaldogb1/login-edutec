/* ==========================================================================
   CRUZA! — Cidades Inteligentes e Sustentáveis
   Definicao do tabuleiro: palavras, dicas e posicoes (layout 17x17 fixo,
   gerado com 21 cruzamentos para que todas as 15 palavras se conectem).
   ========================================================================== */
(function (global) {
  'use strict';

  var LAYOUT = [
    { w: 'SUSTENTABILIDADE', r: 0,  c: 2,  d: 'V', clue: 'Qual é o princípio de utilizar os recursos naturais sem prejudicar as futuras gerações?', hint: 'Começa com S e é a palavra mais longa da grade. Lema: usar hoje sem faltar amanhã.' },
    { w: 'TECNOLOGIA',       r: 1,  c: 5,  d: 'H', clue: 'Conjunto de ferramentas e conhecimentos utilizados para melhorar os serviços de uma cidade.', hint: 'Começa com T. Sensores, aplicativos e internet fazem parte dela.' },
    { w: 'RECICLAGEM',       r: 4,  c: 7,  d: 'V', clue: 'Processo de reaproveitamento de materiais que seriam descartados.', hint: 'Começa com R. É o destino da lata, do papel e da garrafa depois da coleta seletiva.' },
    { w: 'ENERGIA',          r: 9,  c: 9,  d: 'H', clue: 'Recurso necessário para iluminação, funcionamento de aparelhos e atividades urbanas.', hint: 'Começa com E. É medida em quilowatt-hora e vem cobrada na conta de luz.' },
    { w: 'ÁGUA',             r: 11, c: 6,  d: 'H', clue: 'Recurso natural essencial à vida e que deve ser preservado.', hint: 'Começa com A e tem só 4 letras. Sua fórmula química é H₂O.' },
    { w: 'MOBILIDADE',       r: 0,  c: 9,  d: 'V', clue: 'Forma como as pessoas e veículos se deslocam pela cidade.', hint: 'Começa com M. Quando o trânsito melhora e o ônibus passa mais, dizemos que ela melhorou.' },
    { w: 'INOVAÇÃO',         r: 3,  c: 15, d: 'V', clue: 'Criação de novas ideias e soluções para melhorar a vida das pessoas.', hint: 'Começa com I. É o que uma startup faz quando cria algo que ainda não existia.' },
    { w: 'CIDADANIA',        r: 3,  c: 8,  d: 'H', clue: 'Participação das pessoas na construção de uma cidade melhor.', hint: 'Começa com C. Tem a ver com direitos, deveres, votar e participar.' },
    { w: 'TRANSPORTE',       r: 1,  c: 5,  d: 'V', clue: 'Meios utilizados para deslocar pessoas e mercadorias, como ônibus, bicicletas e carros.', hint: 'Começa com T. Ônibus, metrô e bicicleta são meios de…' },
    { w: 'ARBORIZAÇÃO',      r: 7,  c: 2,  d: 'H', clue: 'Plantio e cuidado de árvores em áreas urbanas.', hint: 'Começa com A. É o que deixa a rua mais sombreada e fresca no verão.' },
    { w: 'SOLAR',            r: 0,  c: 11, d: 'V', clue: 'Tipo de energia obtida a partir da luz do Sol.', hint: 'Começa com S e tem 5 letras. Vem das placas instaladas no telhado.' },
    { w: 'DIGITAL',          r: 9,  c: 1,  d: 'H', clue: 'Aquilo que utiliza recursos tecnológicos e sistemas informatizados.', hint: 'Começa com D. É o oposto de analógico.' },
    { w: 'LIXO',             r: 15, c: 10, d: 'H', clue: 'Material que é descartado pelas pessoas e precisa ser destinado corretamente.', hint: 'Começa com L e tem 4 letras. Vai para a lixeira e depois para o aterro.' },
    { w: 'ECONOMIA',         r: 9,  c: 11, d: 'V', clue: 'Organização dos recursos para evitar desperdícios e melhorar seu uso.', hint: 'Começa com E. Também é o nome do ato de gastar menos do que se tem.' },
    { w: 'PLANEJAMENTO',     r: 13, c: 0,  d: 'H', clue: 'Organização antecipada das ações necessárias para melhorar uma cidade.', hint: 'Começa com P. É o que se faz no papel antes de começar a obra.' }
  ];

  var ROWS = 17, COLS = 17;

  /** Remove acentos e devolve maiusculas: "INOVAÇÃO" -> "INOVACAO" */
  function normalize(s) {
    return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  }

  /**
   * Monta a estrutura completa do tabuleiro:
   *  - grid[r][c] = { letter, words:[idx], num }  ou null quando vazio
   *  - words[i]   = { id, raw, answer, clue, r, c, dir, len, cells:[{r,c}], num }
   */
  function build() {
    var grid = [], r, c, i, j;
    for (r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (c = 0; c < COLS; c++) grid[r][c] = null;
    }

    var words = LAYOUT.map(function (item, idx) {
      var answer = normalize(item.w);
      return {
        id: 'w' + idx,
        index: idx,
        raw: item.w,
        answer: answer,
        clue: item.clue,
        hint: item.hint,
        r: item.r, c: item.c,
        dir: item.d,
        len: answer.length,
        cells: [],
        num: 0
      };
    });

    words.forEach(function (word) {
      var dr = word.dir === 'V' ? 1 : 0;
      var dc = word.dir === 'H' ? 1 : 0;
      for (i = 0; i < word.len; i++) {
        var rr = word.r + dr * i, cc = word.c + dc * i;
        if (!grid[rr][cc]) grid[rr][cc] = { letter: word.answer[i], words: [], num: 0 };
        grid[rr][cc].words.push(word.index);
        word.cells.push({ r: rr, c: cc });
      }
    });

    // Numeracao classica de cruzadinha: percorre linha a linha marcando inicios.
    var n = 0;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        if (!grid[r][c]) continue;
        var starts = words.filter(function (w) { return w.r === r && w.c === c; });
        if (starts.length) {
          n++;
          grid[r][c].num = n;
          starts.forEach(function (w) { w.num = n; });
        }
      }
    }

    // Cruzamentos (celulas usadas por mais de uma palavra)
    var crossings = 0;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].words.length > 1) crossings++;
    }

    words.sort(function (a, b) { return a.num - b.num; });

    return { grid: grid, words: words, rows: ROWS, cols: COLS, crossings: crossings };
  }

  global.Puzzle = { build: build, normalize: normalize, ROWS: ROWS, COLS: COLS, LAYOUT: LAYOUT };
})(window);
