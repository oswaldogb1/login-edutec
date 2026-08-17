/* ==========================================================================
   app.js — navegação entre as telas + peças de interface reaproveitadas
   (caixa de diálogo, avisinhos, tutorial, entrada do aluno e do professor)
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  /* Senha do painel do professor. Para trocar, mude só esta linha. */
  var SENHA_PROFESSOR = '54321';

  /* ==================================================================
     PEÇAS DE INTERFACE (CI.ui)
     ================================================================== */
  var ui = {

    /* Troca a tela visível */
    mostrarTela: function (id) {
      var telas = document.querySelectorAll('.tela');
      for (var i = 0; i < telas.length; i++) telas[i].classList.remove('ativa');
      var alvo = document.getElementById(id);
      if (alvo) alvo.classList.add('ativa');

      // o mapa só fica animando quando a tela do jogo está aberta (economiza bateria/CPU)
      if (CI.jogo) {
        if (id === 'tela-jogo') CI.jogo.comecarAnimacao();
        else CI.jogo.pararAnimacao();
      }
      window.scrollTo(0, 0);
    },

    /* Caixa de diálogo central */
    modal: function (opcoes) {
      var caixa = document.getElementById('modal');
      document.getElementById('modal-icone').textContent = opcoes.icone || '💡';
      document.getElementById('modal-titulo').textContent = opcoes.titulo || '';
      document.getElementById('modal-corpo').innerHTML = opcoes.corpo || '';

      var linha = document.getElementById('modal-botoes');
      linha.innerHTML = '';

      var botoes = opcoes.botoes || [{ texto: 'Fechar', classe: 'btn-neutro' }];
      botoes.forEach(function (b) {
        var el = document.createElement('button');
        el.className = 'btn ' + (b.classe || 'btn-neutro');
        el.textContent = b.texto;
        el.addEventListener('click', function () {
          caixa.classList.add('oculto');
          if (typeof b.acao === 'function') b.acao();
        });
        linha.appendChild(el);
      });

      caixa.classList.remove('oculto');
    },

    /* Avisinho rápido no rodapé */
    aviso: function (texto, tipo) {
      var caixa = document.getElementById('avisos');
      var el = document.createElement('div');
      el.className = 'aviso ' + (tipo || '');
      el.textContent = texto;
      caixa.appendChild(el);
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 2800);
    }
  };

  CI.ui = ui;

  /* ==================================================================
     TELA INICIAL
     ================================================================== */
  function ligarInicio() {
    document.getElementById('btn-sou-professor').addEventListener('click', function () {
      document.getElementById('campo-senha').value = '';
      document.getElementById('erro-senha').textContent = '';
      ui.mostrarTela('tela-senha');
      document.getElementById('campo-senha').focus();
    });

    document.getElementById('btn-sou-aluno').addEventListener('click', function () {
      document.getElementById('erro-entrar').textContent = '';
      ui.mostrarTela('tela-entrar');
      document.getElementById('campo-codigo').focus();
    });

    // botões genéricos de "voltar"
    var voltas = document.querySelectorAll('[data-voltar]');
    for (var i = 0; i < voltas.length; i++) {
      voltas[i].addEventListener('click', function () {
        ui.mostrarTela(this.getAttribute('data-voltar'));
      });
    }
  }

  /* ==================================================================
     ENTRADA DO PROFESSOR
     ================================================================== */
  function ligarSenha() {
    function conferir() {
      var valor = document.getElementById('campo-senha').value.trim();
      if (valor === SENHA_PROFESSOR) {
        ui.mostrarTela('tela-painel');
        CI.professor.abrirPainel();
      } else {
        document.getElementById('erro-senha').textContent = 'Senha incorreta. Tente de novo.';
        document.getElementById('campo-senha').value = '';
      }
    }

    document.getElementById('btn-confirmar-senha').addEventListener('click', conferir);
    document.getElementById('campo-senha').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') conferir();
    });
  }

  /* ==================================================================
     ENTRADA DO ALUNO
     ================================================================== */
  function ligarEntrada() {
    var campoCodigo = document.getElementById('campo-codigo');
    var campoNome = document.getElementById('campo-nome');
    var erro = document.getElementById('erro-entrar');
    var botao = document.getElementById('btn-confirmar-entrar');

    campoCodigo.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    });

    function entrar() {
      var codigo = campoCodigo.value.trim().toUpperCase();
      var nome = campoNome.value.trim().replace(/\s+/g, ' ').slice(0, 16);

      if (!CI.firebase.codigoValido(codigo)) {
        erro.textContent = 'O código tem 4 letras ou números. Confira na lousa.';
        return;
      }
      if (nome.length < 2) {
        erro.textContent = 'Escreva seu nome (pelo menos 2 letras).';
        return;
      }

      erro.textContent = '';
      botao.disabled = true;
      botao.textContent = 'Entrando…';

      CI.firebase.ler('salas/' + codigo + '/status').then(function (r) {
        botao.disabled = false;
        botao.textContent = 'Jogar';

        if (r.ok && r.dados === null) {
          erro.textContent = 'Sala não encontrada. Confira o código com o professor.';
          return;
        }
        if (!r.ok) {
          // Sem internet: deixamos jogar assim mesmo e sincronizamos depois
          ui.aviso('Sem internet agora — você joga e a pontuação vai depois.', 'mau');
        }

        comecarPartida(codigo, nome);
      });
    }

    botao.addEventListener('click', entrar);
    campoNome.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') entrar(); });
    campoCodigo.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') document.getElementById('campo-nome').focus();
    });
  }

  /* Reaproveita o mesmo "id de jogador" se o aluno já tinha entrado nesta sala
     (assim, atualizar a página não cria um jogador duplicado no ranking). */
  function idDoJogador(codigo, nome) {
    var chave = 'ci_v1_' + codigo + '_' + nome.toLowerCase();
    try {
      var salvo = JSON.parse(localStorage.getItem(chave) || 'null');
      if (salvo && salvo.idJogador) return salvo.idJogador;
    } catch (err) { /* sem localStorage: segue com id novo */ }
    return CI.firebase.novoIdJogador();
  }

  var partida = { codigo: null, nome: null, id: null };

  function comecarPartida(codigo, nome) {
    partida.codigo = codigo;
    partida.nome = nome;
    partida.id = idDoJogador(codigo, nome);

    var jaViuTutorial = false;
    try { jaViuTutorial = localStorage.getItem('ci_tutorial_visto') === 'sim'; } catch (err) {}

    if (jaViuTutorial) {
      abrirJogo();
    } else {
      abrirTutorial();
    }
  }

  function abrirJogo() {
    ui.mostrarTela('tela-jogo');
    CI.jogo.iniciar(partida.codigo, partida.nome, partida.id);
  }

  /* ==================================================================
     TUTORIAL (3 telas curtas)
     ================================================================== */
  var passoTutorial = 0;

  function abrirTutorial() {
    passoTutorial = 0;
    desenharTutorial();
    ui.mostrarTela('tela-tutorial');
  }

  function desenharTutorial() {
    var t = CI.TUTORIAL[passoTutorial];
    document.getElementById('tutorial-conteudo').innerHTML =
      '<div class="tutorial-emoji">' + t.emoji + '</div>' +
      '<h2>' + t.titulo + '</h2>' +
      '<p>' + t.texto + '</p>';

    var pontos = document.getElementById('tutorial-pontos');
    pontos.innerHTML = '';
    for (var i = 0; i < CI.TUTORIAL.length; i++) {
      var s = document.createElement('span');
      if (i === passoTutorial) s.className = 'on';
      pontos.appendChild(s);
    }

    document.getElementById('btn-tutorial-avancar').textContent =
      (passoTutorial === CI.TUTORIAL.length - 1) ? 'Começar a jogar!' : 'Próximo';
    document.getElementById('btn-tutorial-voltar').textContent =
      (passoTutorial === 0) ? 'Sair' : 'Voltar';
  }

  function ligarTutorial() {
    document.getElementById('btn-tutorial-avancar').addEventListener('click', function () {
      if (passoTutorial < CI.TUTORIAL.length - 1) {
        passoTutorial++;
        desenharTutorial();
      } else {
        try { localStorage.setItem('ci_tutorial_visto', 'sim'); } catch (err) {}
        abrirJogo();
      }
    });

    document.getElementById('btn-tutorial-voltar').addEventListener('click', function () {
      if (passoTutorial === 0) ui.mostrarTela('tela-entrar');
      else { passoTutorial--; desenharTutorial(); }
    });
  }

  /* ==================================================================
     RELATÓRIO FINAL — botão de voltar para a tela inicial
     ================================================================== */
  function ligarRelatorio() {
    document.getElementById('btn-relatorio-inicio').addEventListener('click', function () {
      ui.mostrarTela('tela-inicio');
    });
  }

  /* ==================================================================
     PARTIDA / LIGAR TUDO
     ================================================================== */
  function iniciarAplicacao() {
    ligarInicio();
    ligarSenha();
    ligarEntrada();
    ligarTutorial();
    ligarRelatorio();
    CI.jogo.ligarEventos();
    CI.professor.ligarEventos();

    // Avisa quando a internet vai e volta
    window.addEventListener('online',  function () { ui.aviso('Internet de volta! Sincronizando…', 'ok'); });
    window.addEventListener('offline', function () { ui.aviso('Sem internet — pode continuar jogando.', 'mau'); });

    console.log('[Cidade Inteligente] pronto. Todos os dados ficam em /' + CI.firebase.NO_RAIZ + '/');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAplicacao);
  } else {
    iniciarAplicacao();
  }

})();
