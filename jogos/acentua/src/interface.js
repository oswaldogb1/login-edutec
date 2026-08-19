/* =====================================================================
   EXPRESSO TÔNICO — telas, HUD e painéis das estações
   ===================================================================== */

var jogo = null;
var entradas = { acelerar: false, frear: false };
var ultimoQuadro = 0;

function el(id) { return document.getElementById(id); }
function mostrar(n) { n.classList.remove('oculto'); }
function esconder(n) { n.classList.add('oculto'); }

function trocarTela(id) {
  ['tela-entrada', 'tela-jogo', 'tela-fim'].forEach(function (t) {
    var no = el(t);
    if (t === id) mostrar(no); else esconder(no);
  });
}

var NOMES_PAISAGEM = {
  cidade: 'Cidade', vilarejo: 'Vilarejo', serra: 'Serra',
  deserto: 'Deserto', floresta: 'Mata', planicie: 'Campo aberto'
};

function nomeDaPaisagem(bioma) { return NOMES_PAISAGEM[bioma] || 'Campo aberto'; }

function tempoTexto(seg) {
  var s = Math.max(0, Math.round(seg));
  var m = Math.floor(s / 60);
  return (m < 10 ? '0' : '') + m + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
}

function escapar(t) {
  return String(t).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/* =================================================== 1. ENTRADA ====== */

function iniciarInterface() {
  iniciarDesenho(el('cena'));
  montarRecordes();

  el('form-entrada').addEventListener('submit', function (ev) {
    ev.preventDefault();
    comecar(el('apelido').value.trim() || 'Maquinista', 18);
  });

  el('btn-de-novo').addEventListener('click', function () { trocarTela('tela-entrada'); });
  el('bt-ajuda').addEventListener('click', function () {
    el('caixa-ajuda').classList.toggle('oculto');
  });

  ligarControles();
  requestAnimationFrame(laco);
}

function comecar(apelido, meta) {
  jogo = novoJogo({ apelido: apelido, meta: meta, banco: PALAVRAS });
  trocarTela('tela-jogo');
  redimensionar();
  ultimoQuadro = 0;
  fecharTodosPaineis();
}

/* ==================================================== 2. LAÇO ======== */

function laco(t) {
  var dt = ultimoQuadro ? Math.min(0.05, (t - ultimoQuadro) / 1000) : 0;
  ultimoQuadro = t;

  if (jogo && jogo.estado !== 'fim') {
    atualizar(jogo, dt, entradas);
    atualizarEscolha(jogo);
    if (jogo.painel) abrirPainelNaTela(jogo.painel);
    desenhar(jogo);
    atualizarHud();
    if (jogo.estado === 'fim') mostrarFim();
  }
  requestAnimationFrame(laco);
}

/* ===================================================== 3. HUD ======== */

function atualizarHud() {
  var j = jogo;
  el('hud-tempo').textContent = tempoTexto(j.tempo);
  el('hud-pontos').textContent = j.pontos;
  el('hud-entregas').textContent = j.entregues + '/' + j.meta;
  el('hud-lugar').textContent = nomeDaPaisagem(biomaEm(j.trem.x, j.trem.y));
  el('hud-velocidade').textContent = Math.round(j.trem.vel) + ' km/h';

  var carvao = el('hud-carvao-barra');
  carvao.style.width = (j.carvao) + '%';
  carvao.className = j.carvao < 25 ? 'barra-cheia baixa' : 'barra-cheia';

  // fichas dos passageiros a bordo
  var caixa = el('hud-bordo');
  var chave = j.passageiros.map(function (p) { return p.id; }).join(',');
  if (caixa.dataset.chave !== chave) {
    caixa.dataset.chave = chave;
    caixa.innerHTML = j.passageiros.map(function (p) {
      return '<div class="ficha" data-id="' + p.id + '">' +
        '<span class="ficha-palavra">' + escapar(p.palavra) + '</span>' +
        '<i class="ficha-paciencia"></i></div>';
    }).join('');
    if (j.passageiros.length === 0) {
      caixa.innerHTML = '<div class="vagao-vazio">vagões vazios — vá à Estação Central</div>';
    }
  }
  j.passageiros.forEach(function (p) {
    var no = caixa.querySelector('.ficha[data-id="' + p.id + '"] .ficha-paciencia');
    if (no) {
      no.style.width = Math.max(0, p.paciencia) + '%';
      no.className = 'ficha-paciencia' + (p.paciencia < 30 ? ' urgente' : '');
    }
  });

  // aviso flutuante
  var aviso = el('hud-aviso');
  if (j.aviso) {
    aviso.textContent = j.aviso.texto;
    aviso.style.color = j.aviso.cor;
    mostrar(aviso);
  } else {
    esconder(aviso);
  }

  // aviso antecipado de obstáculo
  var alerta = el('alerta-obstaculo');
  if (j.alerta) {
    var chave = j.alerta.tipo + '|' + j.alerta.dica;
    if (alerta.dataset.tipo !== chave) {
      alerta.dataset.tipo = chave;
      el('alerta-icone').textContent = j.alerta.icone;
      el('alerta-titulo').textContent = j.alerta.titulo;
      el('alerta-dica').textContent = j.alerta.dica;
      alerta.style.borderColor = j.alerta.cor;
      el('alerta-titulo').style.color = j.alerta.cor;
    }
    var perto = 1 - Math.min(1, j.alerta.dist / 620);
    el('alerta-barra').style.width = (perto * 100) + '%';
    el('alerta-barra').style.background = j.alerta.cor;
    el('alerta-metros').textContent = Math.round(j.alerta.dist) + ' m';
    alerta.classList.toggle('iminente', perto > 0.72);
    mostrar(alerta);
  } else {
    alerta.dataset.tipo = '';
    esconder(alerta);
  }

  // castigo
  var trava = el('hud-trava');
  if (j.travadoPor > 0) {
    trava.textContent = 'PARADO ' + j.travadoPor.toFixed(1) + 's';
    mostrar(trava);
  } else {
    esconder(trava);
  }
}

/* ================================================ 4. CONTROLES ======= */

function ligarControles() {
  document.addEventListener('keydown', function (ev) {
    if (!jogo || jogo.estado === 'fim') return;
    var k = ev.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { entradas.acelerar = true; ev.preventDefault(); }
    if (k === 'arrowdown' || k === 's') { entradas.frear = true; ev.preventDefault(); }
    if (k === 'arrowleft' || k === 'a') { girarEscolha(jogo, -1); ev.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { girarEscolha(jogo, 1); ev.preventDefault(); }
    if (k === ' ') { usarApito(); ev.preventDefault(); }
    if (k === 'enter' && jogo.painel) { fecharPainelNaTela(); ev.preventDefault(); }
  });

  document.addEventListener('keyup', function (ev) {
    var k = ev.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') entradas.acelerar = false;
    if (k === 'arrowdown' || k === 's') entradas.frear = false;
  });

  botaoContinuo('bt-acelerar', function (v) { entradas.acelerar = v; });
  botaoContinuo('bt-frear', function (v) { entradas.frear = v; });
  el('bt-esq').addEventListener('click', function () { girarEscolha(jogo, -1); });
  el('bt-dir').addEventListener('click', function () { girarEscolha(jogo, 1); });
  el('bt-apito').addEventListener('click', usarApito);
}

function botaoContinuo(id, cb) {
  var b = el(id);
  ['pointerdown', 'pointerenter'].forEach(function (e) {
    b.addEventListener(e, function (ev) { if (ev.buttons || ev.type === 'pointerdown') cb(true); });
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) {
    b.addEventListener(e, function () { cb(false); });
  });
}

function usarApito() {
  if (!jogo) return;
  var n = apitar(jogo);
  el('bt-apito').classList.add('apitando');
  setTimeout(function () { el('bt-apito').classList.remove('apitando'); }, 220);
  if (n > 0) avisar(jogo, '📣 ' + n + ' vaca(s) saíram da linha!', '#46d98a');
}

/* ================================================== 5. PAINÉIS ======= */

var painelAtual = null;

function fecharTodosPaineis() {
  painelAtual = null;
  ['painel-central', 'painel-bairro', 'painel-deposito'].forEach(function (id) {
    esconder(el(id));
  });
}

function abrirPainelNaTela(p) {
  if (painelAtual === p) { atualizarPainelAberto(p); return; }
  painelAtual = p;
  fecharTodosPaineis();
  painelAtual = p;
  if (p.tipo === 'central') montarPainelCentral(p);
  else if (p.tipo === 'bairro') montarPainelBairro(p);
  else montarPainelDeposito(p);
}

function atualizarPainelAberto(p) {
  if (p.tipo !== 'central') return;
  var caixa = el('central-saidas');
  var chave = jogo.escolha.opcoes.map(function (o) { return o.destino; }).join(',')
    + '|' + jogo.escolha.indice;
  if (caixa.dataset.chave === chave) return;
  caixa.dataset.chave = chave;

  caixa.innerHTML = jogo.escolha.opcoes.map(function (o, i) {
    var d = descricaoSaida(p.no, o.destino);
    return '<button class="saida' + (i === jogo.escolha.indice ? ' escolhida' : '') +
      '" data-i="' + i + '"><span class="seta">' + d.seta + '</span>' + d.texto + '</button>';
  }).join('');

  Array.prototype.forEach.call(caixa.querySelectorAll('.saida'), function (b) {
    b.addEventListener('click', function () {
      jogo.escolha.indice = parseInt(b.getAttribute('data-i'), 10);
      caixa.dataset.chave = '';
      atualizarPainelAberto(p);
    });
  });
}

/** Para onde leva esta saída: rumo cardeal + o que existe naquele sentido. */
function descricaoSaida(deId, paraId) {
  var a = NOS[deId], b = NOS[paraId];
  var dx = b.x - a.x, dy = b.y - a.y;
  var seta = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? '→' : '←')
    : (dy > 0 ? '↓' : '↑');
  var rumo = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'leste' : 'oeste')
    : (dy > 0 ? 'sul' : 'norte');

  // segue reto pelo mesmo rumo até achar uma estação
  var atual = paraId, veioDe = deId, passos = 0;
  while (passos++ < 6) {
    var n = NOS[atual];
    if (n.tipo === 'bairro') return { seta: seta, texto: ROTULOS[n.bairro] };
    if (n.tipo === 'deposito') return { seta: seta, texto: 'DEPÓSITO DE CARVÃO' };
    if (n.tipo === 'central' && passos > 1) return { seta: seta, texto: 'ESTAÇÃO CENTRAL' };
    var ops = opcoesDeSaida(jogo, atual, veioDe);
    if (!ops.length) break;
    var reto = ops[indiceMaisReto(ops)];
    veioDe = atual;
    atual = reto.destino;
  }
  return { seta: seta, texto: 'anel ' + rumo };
}

function fecharPainelNaTela() {
  if (!jogo.painel) return;
  fecharPainel(jogo);
  painelAtual = null;
  fecharTodosPaineis();
}

/* --- central --- */

function montarPainelCentral(p) {
  var caixa = el('central-lista');
  if (p.embarcados.length === 0) {
    caixa.innerHTML = '<p class="nota">Nenhum passageiro embarcou: os vagões já estão cheios ' +
      'ou a plataforma está vazia.</p>';
  } else {
    caixa.innerHTML = p.embarcados.map(function (x) {
      return '<div class="ficha grande">' +
        '<span class="ficha-palavra">' + escapar(x.palavra) + '</span></div>';
    }).join('');
  }
  el('central-fila').textContent = jogo.fila.length + ' esperando na plataforma';
  atualizarPainelAberto(p);
  mostrar(el('painel-central'));
}

/* --- bairro --- */

function montarPainelBairro(p) {
  var b = BAIRROS[p.bairro];
  el('bairro-nome').textContent = b.nome;
  el('bairro-nome').style.color = CORES[p.bairro];
  el('bairro-lema').textContent = b.lema;
  el('bairro-regra').textContent = b.regra;
  el('bairro-exemplos').textContent = b.exemplos;
  el('bairro-retorno').textContent = '';
  el('bairro-retorno').className = 'retorno';
  desenharFichasBairro();
  mostrar(el('painel-bairro'));
}

function desenharFichasBairro() {
  var caixa = el('bairro-fichas');
  if (jogo.passageiros.length === 0) {
    caixa.innerHTML = '<p class="nota">Nenhum passageiro a bordo.</p>';
    return;
  }
  caixa.innerHTML = jogo.passageiros.map(function (p) {
    return '<button class="ficha grande clicavel" data-id="' + p.id + '">' +
      '<span class="ficha-palavra">' + escapar(p.palavra) + '</span>' +
      '<span class="ficha-acao">desce aqui</span></button>';
  }).join('');
  Array.prototype.forEach.call(caixa.querySelectorAll('.ficha'), function (b) {
    b.addEventListener('click', function () {
      var r = desembarcar(jogo, parseInt(b.getAttribute('data-id'), 10));
      if (!r) return;
      var retorno = el('bairro-retorno');
      if (r.ok) {
        retorno.className = 'retorno bom';
        retorno.textContent = '✅ ' + r.palavra + ' chegou em casa! +' + (100 + r.bonus) + ' pontos';
      } else {
        retorno.className = 'retorno ruim';
        retorno.innerHTML = '❌ <b>' + escapar(r.palavra) + '</b> não mora aqui — é ' +
          escapar(r.certo) + '.<br><span class="regra">📘 ' + escapar(r.regra) + '</span>';
      }
      if (jogo.estado === 'fim') { fecharTodosPaineis(); return; }
      desenharFichasBairro();
    });
  });
}

/* --- depósito --- */

var acentoSelecionado = null;
var arrasto = null;

function montarPainelDeposito(p) {
  var d = p.desafio;
  acentoSelecionado = null;
  el('dep-retorno').textContent = '';
  el('dep-retorno').className = 'retorno';
  el('dep-palavra').innerHTML = Array.from(d.semAcento).map(function (letra, i) {
    var vogal = d.alvos.indexOf(i) >= 0;
    return '<span class="letra' + (vogal ? ' vogal' : '') + '"' +
      (vogal ? ' data-alvo="' + i + '"' : '') + '>' + letra + '</span>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('.chip-acento'), function (c) {
    c.classList.remove('selecionado');
  });
  mostrar(el('painel-deposito'));
}

function ligarDeposito() {
  Array.prototype.forEach.call(document.querySelectorAll('.chip-acento'), function (chip) {
    chip.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      selecionarAcento(chip.getAttribute('data-acento'));
      var f = chip.cloneNode(true);
      f.classList.add('chip-fantasma');
      document.body.appendChild(f);
      arrasto = { fantasma: f, moveu: false };
      posFantasma(ev.clientX, ev.clientY);
      chip.setPointerCapture(ev.pointerId);
    });
    chip.addEventListener('pointermove', function (ev) {
      if (!arrasto) return;
      arrasto.moveu = true;
      posFantasma(ev.clientX, ev.clientY);
      realcar(ev.clientX, ev.clientY);
    });
    chip.addEventListener('pointerup', function (ev) {
      if (!arrasto) return;
      var alvo = arrasto.moveu ? alvoEm(ev.clientX, ev.clientY) : null;
      arrasto.fantasma.remove();
      arrasto = null;
      limparRealce();
      if (alvo) aplicarAcento(alvo);
    });
    chip.addEventListener('pointercancel', function () {
      if (arrasto) { arrasto.fantasma.remove(); arrasto = null; limparRealce(); }
    });
  });

  el('dep-palavra').addEventListener('click', function (ev) {
    var no = ev.target.closest ? ev.target.closest('[data-alvo]') : null;
    if (no && acentoSelecionado) {
      aplicarAcento({ tipo: 'vogal', indice: parseInt(no.getAttribute('data-alvo'), 10) });
    }
  });
  el('dep-sem-acento').addEventListener('click', function () {
    aplicarAcento({ tipo: 'sem' });
  });
}

function posFantasma(x, y) {
  arrasto.fantasma.style.left = x + 'px';
  arrasto.fantasma.style.top = y + 'px';
}

function selecionarAcento(a) {
  acentoSelecionado = a;
  Array.prototype.forEach.call(document.querySelectorAll('.chip-acento'), function (c) {
    c.classList.toggle('selecionado', c.getAttribute('data-acento') === a);
  });
}

function alvoEm(x, y) {
  var no = document.elementFromPoint(x, y);
  while (no && no !== document.body) {
    if (no.hasAttribute && no.hasAttribute('data-alvo')) {
      return { tipo: 'vogal', indice: parseInt(no.getAttribute('data-alvo'), 10), no: no };
    }
    if (no.id === 'dep-sem-acento') return { tipo: 'sem', no: no };
    no = no.parentNode;
  }
  return null;
}

function realcar(x, y) {
  limparRealce();
  var a = alvoEm(x, y);
  if (a && a.no) a.no.classList.add('alvo-ativo');
}

function limparRealce() {
  Array.prototype.forEach.call(document.querySelectorAll('.alvo-ativo'), function (n) {
    n.classList.remove('alvo-ativo');
  });
}

function aplicarAcento(alvo) {
  if (!jogo.painel || jogo.painel.tipo !== 'deposito') return;
  var resposta = alvo.tipo === 'sem'
    ? { semAcento: true }
    : { indice: alvo.indice, acento: acentoSelecionado || 'agudo' };
  var r = responderAcento(jogo, resposta);
  var retorno = el('dep-retorno');
  if (!r) return;

  if (r.ok) {
    retorno.className = 'retorno bom';
    retorno.innerHTML = '✅ <b>' + escapar(r.palavra) + '</b> — ' + escapar(r.rotulo) +
      '. Caldeira cheia!';
    setTimeout(function () { if (jogo.painel) fecharPainelNaTela(); }, 900);
    return;
  }
  retorno.className = 'retorno ruim';
  retorno.innerHTML = r.tentativas >= 2
    ? '❌ Ainda não. É <b>' + escapar(r.rotulo) + '</b>.<br><span class="regra">📘 ' +
      escapar(r.regra) + '</span>'
    : '❌ Não é aí. A caldeira só enche com o acento no lugar certo.';
}

/* ==================================================== 6. FIM ========= */

function mostrarFim() {
  var j = jogo;
  el('fim-apelido').textContent = j.apelido;
  el('fim-tempo').textContent = tempoTexto(j.tempo);
  el('fim-pontos').textContent = j.pontos;
  el('fim-entregas').textContent = j.entregues;
  el('fim-erros').textContent = j.errosEntrega;

  var caixa = el('fim-lista');
  if (j.relatorio.length === 0) {
    caixa.innerHTML = '<div class="sem-erros"><b>Viagem impecável!</b><br>' +
      'Nenhum passageiro foi para o bairro errado e nenhum acento saiu do lugar.</div>';
  } else {
    var mostrar12 = j.relatorio.slice(0, 12);
    var resto = j.relatorio.length - mostrar12.length;
    caixa.innerHTML = mostrar12.map(function (e) {
      return '<div class="item-relatorio">' +
        '<div class="palavra">' + escapar(e.palavra) +
        '<span class="etiqueta" style="background:' + (CORES[e.tipo] || '#8fa8cc') + '">' +
        escapar(e.rotulo) + '</span></div>' +
        '<div class="linha">' + escapar(e.oQue) +
        (e.vezes > 1 ? ' <b>(' + e.vezes + '×)</b>' : '') + '</div>' +
        '<div class="regra">📘 ' + escapar(e.regra) + '</div>' +
        '</div>';
    }).join('') + (resto > 0
      ? '<p class="nota">…e mais ' + resto + ' palavra(s) com o mesmo tipo de tropeço.</p>'
      : '');
  }

  guardarRecorde(j);
  montarRecordes();
  trocarTela('tela-fim');
}

/* ------------------------------------------------------- recordes --- */

function lerRecordes() {
  try {
    return JSON.parse(localStorage.getItem('expresso-tonico-recordes') || '[]');
  } catch (e) { return []; }
}

function guardarRecorde(j) {
  try {
    var lista = lerRecordes();
    lista.push({
      apelido: j.apelido, pontos: j.pontos, tempo: Math.round(j.tempo),
      entregues: j.entregues, meta: j.meta, erros: j.errosEntrega,
      quando: new Date().toLocaleDateString('pt-BR')
    });
    lista.sort(function (a, b) { return b.pontos - a.pontos; });
    localStorage.setItem('expresso-tonico-recordes', JSON.stringify(lista.slice(0, 12)));
  } catch (e) { /* file:// sem localStorage: segue sem placar */ }
}

function montarRecordes() {
  var lista = lerRecordes();
  ['recordes-entrada', 'recordes-fim'].forEach(function (id) {
    var caixa = el(id);
    if (!caixa) return;
    if (lista.length === 0) {
      caixa.innerHTML = '<p class="nota">Nenhuma viagem registrada neste computador ainda.</p>';
      return;
    }
    caixa.innerHTML = '<table class="placar"><tr><th></th><th>Maquinista</th><th>Pontos</th>' +
      '<th>Tempo</th><th>Entregas</th></tr>' +
      lista.map(function (r, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + escapar(r.apelido) + '</td>' +
          '<td><b>' + r.pontos + '</b></td><td>' + tempoTexto(r.tempo) + '</td>' +
          '<td>' + r.entregues + '/' + r.meta + '</td></tr>';
      }).join('') + '</table>';
  });
}

window.addEventListener('DOMContentLoaded', function () {
  iniciarInterface();
  ligarDeposito();
});
