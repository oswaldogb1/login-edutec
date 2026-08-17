/* ==========================================================================
   firebase.js — comunicação com o Firebase Realtime Database (via REST)
   --------------------------------------------------------------------------
   ATENÇÃO, PROFESSOR / MANUTENÇÃO FUTURA:

   Este banco de dados é COMPARTILHADO com outros jogos e sites da escola.
   Por isso, este arquivo tem UMA regra de ouro:

        >>> TODO caminho gravado/lido começa obrigatoriamente com
        >>> "cidade_inteligente/" — nada fora disso é tocado. <<<

   Como isso é garantido no código:
   1. Só existe UMA função que monta URL: montarCaminho(). Todas as operações
      (ler, gravar, apagar) passam por ela — não há fetch() solto neste arquivo.
   2. montarCaminho() sempre concatena o nó raiz NO_RAIZ na frente e depois
      CONFERE o resultado. Se por algum motivo o caminho final não começar com
      "cidade_inteligente/", a função lança erro e NADA é enviado.
   3. Caracteres perigosos ("..", "/" no começo, "#", "$", "[", "]") são
      bloqueados, para ninguém conseguir "subir" para a raiz do banco.
   4. Gravação usa sempre PATCH (atualização parcial). Não existe PUT neste
      arquivo — PUT substituiria o conteúdo do nó.
   5. DELETE só existe em apagarSala(), que só aceita um código de sala válido
      (4 letras/números) e monta o caminho "cidade_inteligente/salas/CODIGO".
      É impossível apagar a raiz ou outro jogo por aqui.
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  /* Endereço do banco (sem barra no final) */
  var URL_BASE = 'https://edutec-arnaldo-default-rtdb.firebaseio.com';

  /* Nó exclusivo deste jogo. NUNCA mude para "" ou "/". */
  var NO_RAIZ = 'cidade_inteligente';

  /* Tempo máximo de espera de cada requisição (rede de escola costuma ser lenta) */
  var TEMPO_LIMITE = 9000;

  /* Estado de conexão observado nas últimas requisições */
  var online = true;

  /* ------------------------------------------------------------------
     montarCaminho(sub) -> URL completa e SEGURA
     Exemplo: montarCaminho('salas/AB12/jogadores/j1')
       => https://.../cidade_inteligente/salas/AB12/jogadores/j1.json
     ------------------------------------------------------------------ */
  function montarCaminho(sub) {
    if (typeof sub !== 'string') {
      throw new Error('Caminho inválido: precisa ser texto.');
    }

    // tira espaços e barras extras do começo/fim e barras duplicadas do meio
    var limpo = sub.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/{2,}/g, '/');

    if (limpo === '') {
      throw new Error('Caminho vazio: gravar na raiz do nó do jogo não é permitido.');
    }
    if (limpo.indexOf('..') !== -1) {
      throw new Error('Caminho suspeito (".." não é permitido).');
    }
    // caracteres proibidos em chaves do Firebase (e que poderiam bagunçar a URL)
    if (/[.#$\[\]]/.test(limpo)) {
      throw new Error('Caminho com caracteres proibidos: ' + limpo);
    }
    // Só aceitamos letras, números, hífen, sublinhado e barra
    if (!/^[A-Za-z0-9_\-\/]+$/.test(limpo)) {
      throw new Error('Caminho com caracteres não permitidos: ' + limpo);
    }

    var completo = NO_RAIZ + '/' + limpo;

    // CONFERÊNCIA FINAL (a "trava de segurança")
    if (completo.indexOf(NO_RAIZ + '/') !== 0) {
      throw new Error('BLOQUEADO: o caminho não está dentro de /' + NO_RAIZ + '/');
    }

    return URL_BASE + '/' + completo + '.json';
  }

  /* ------------------------------------------------------------------
     requisicao() - envelope comum com timeout e tratamento de erro.
     Nunca lança erro de rede para fora: devolve { ok:false }.
     Assim, se a internet cair, o jogo continua funcionando localmente.
     ------------------------------------------------------------------ */
  function requisicao(url, metodo, corpo) {
    var opcoes = { method: metodo, cache: 'no-store' };

    if (corpo !== undefined) {
      opcoes.headers = { 'Content-Type': 'application/json' };
      opcoes.body = JSON.stringify(corpo);
    }

    // AbortController pode não existir em navegadores muito antigos
    var abortador = null;
    var temporizador = null;
    if (typeof AbortController !== 'undefined') {
      abortador = new AbortController();
      opcoes.signal = abortador.signal;
      temporizador = setTimeout(function () { abortador.abort(); }, TEMPO_LIMITE);
    }

    return fetch(url, opcoes)
      .then(function (resposta) {
        if (temporizador) clearTimeout(temporizador);
        if (!resposta.ok) {
          online = false;
          return { ok: false, erro: 'HTTP ' + resposta.status };
        }
        return resposta.json().then(function (dados) {
          online = true;
          return { ok: true, dados: dados };
        });
      })
      .catch(function (e) {
        if (temporizador) clearTimeout(temporizador);
        online = false;
        return { ok: false, erro: (e && e.message) || 'falha de rede' };
      });
  }

  /* ------------------------------------------------------------------
     API pública usada pelo resto do jogo
     ------------------------------------------------------------------ */
  var api = {

    NO_RAIZ: NO_RAIZ,

    /* Lê um caminho. Devolve Promise<{ok, dados}> */
    ler: function (sub) {
      var url;
      try { url = montarCaminho(sub); }
      catch (e) { return Promise.resolve({ ok: false, erro: e.message }); }
      return requisicao(url, 'GET');
    },

    /* Grava/atualiza SÓ os campos enviados (PATCH). Nunca apaga irmãos. */
    gravar: function (sub, objeto) {
      var url;
      try { url = montarCaminho(sub); }
      catch (e) { return Promise.resolve({ ok: false, erro: e.message }); }
      if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) {
        return Promise.resolve({ ok: false, erro: 'PATCH exige um objeto.' });
      }
      return requisicao(url, 'PATCH', objeto);
    },

    /* Apaga UMA sala inteira deste jogo. Único DELETE do sistema.
       Só o professor chama, e só quando pede "Limpar sala". */
    apagarSala: function (codigo) {
      if (!api.codigoValido(codigo)) {
        return Promise.resolve({ ok: false, erro: 'Código de sala inválido.' });
      }
      var url;
      try { url = montarCaminho('salas/' + codigo); }
      catch (e) { return Promise.resolve({ ok: false, erro: e.message }); }
      return requisicao(url, 'DELETE');
    },

    /* Código de sala = 4 letras maiúsculas/números */
    codigoValido: function (codigo) {
      return typeof codigo === 'string' && /^[A-Z0-9]{4}$/.test(codigo);
    },

    /* Sorteia um código curto. Sem letras/números que se confundem (O,0,I,1). */
    sortearCodigo: function () {
      var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var c = '';
      for (var i = 0; i < 4; i++) {
        c += letras.charAt(Math.floor(Math.random() * letras.length));
      }
      return c;
    },

    /* Cria um identificador simples para o jogador (só letras e números) */
    novoIdJogador: function () {
      return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /* true se a última requisição funcionou */
    estaOnline: function () { return online && (typeof navigator === 'undefined' || navigator.onLine !== false); }
  };

  CI.firebase = api;

  /* ------------------------------------------------------------------
     AUTOTESTE DE SEGURANÇA (roda ao abrir a página).
     Se alguém, no futuro, mexer em montarCaminho() e quebrar a proteção,
     um aviso aparece no console do navegador (F12).
     ------------------------------------------------------------------ */
  (function autoteste() {
    var tentativasProibidas = ['', '/', '../outro_jogo', 'salas/../../raiz', '#', 'salas/AB.CD'];
    var falhou = false;

    tentativasProibidas.forEach(function (t) {
      try {
        montarCaminho(t);
        falhou = true;
        console.error('[Cidade Inteligente] FALHA DE SEGURANÇA: caminho proibido aceito ->', t);
      } catch (e) { /* certo: tem que dar erro */ }
    });

    // um caminho normal precisa continuar funcionando e ficar dentro do nó do jogo
    var exemplo = montarCaminho('salas/AB12/jogadores/j1');
    if (exemplo.indexOf(URL_BASE + '/' + NO_RAIZ + '/') !== 0) {
      falhou = true;
      console.error('[Cidade Inteligente] FALHA DE SEGURANÇA: caminho fora do nó do jogo ->', exemplo);
    }

    if (!falhou) {
      console.log('[Cidade Inteligente] Proteção do banco OK: tudo é gravado dentro de /' + NO_RAIZ + '/');
    }
  })();

})();
