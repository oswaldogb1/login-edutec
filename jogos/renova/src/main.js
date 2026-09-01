/**
 * main.js
 * -----------------------------------------------------------------------------
 * Ponto de entrada do jogo "Cidade Inteligente e Sustentável".
 *
 * Responsabilidades:
 *   - montar cena / câmera / renderer do Three.js
 *   - controlar o fluxo de telas (início → tutorial → jogo → resultado)
 *   - detectar proximidade dos pontos de interação e abrir o painel educativo
 *   - conduzir a SÉRIE de perguntas de cada ponto (ver `zones.js`)
 *   - cuidar da vida do jogador, das mordidas e do revide a pauladas
 *   - manter o aluno conectado à cidade compartilhada com a turma
 *   - somar pontos e gravar o resultado no Firebase ao final
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { criarMundo } from './world.js';
import { Jogador } from './player.js';
import { HUD } from './hud.js';
import { TOTAL_PONTOS, TOTAL_PERGUNTAS } from './zones.js';
import { REGRAS, PERSEGUICAO, PORRETE, VIDA, MULTIJOGADOR, AREAS_SEGURAS } from './config.js';
import { Perseguicao } from './perseguicao.js';
import { Porrete } from './porrete.js';
import { Multijogador } from './multijogador.js';
import { Colegas } from './colegas.js';
import { criarSangue } from './models.js';
import { salvarResultado, salvarBackupLocal } from './firebase.js';

/* =========================================================================
 * Atalhos de DOM
 * ======================================================================= */
const $ = (id) => document.getElementById(id);

const telas = {
  carregando: $('tela-carregando'),
  inicio: $('tela-inicio'),
  tutorial: $('tela-tutorial'),
  pausa: $('tela-pausa'),
  resultado: $('tela-resultado'),
  painel: $('painel')
};

/* =========================================================================
 * Estado da partida
 * ======================================================================= */
const estado = {
  nome: '',
  turma: '',
  pontuacao: 0,
  descobertos: 0,
  acertosPrimeira: 0,
  respondidas: 0,
  iniciadoEm: 0,
  rodando: false,
  finalizado: false,
  pontoAberto: null,
  respondido: false,

  /** Vida do jogador. Zerou, ele desmaia e acorda num abrigo. */
  vida: VIDA.maxima,
  /** Instante (em segundos de jogo) até quando ele não pode ser mordido. */
  invulneravelAte: 0,
  /** Contadores só para o resumo final. */
  mordidas: 0,
  golpes: 0,

  /**
   * Avanço de cada ponto de interação:
   *   id → { indice, tentativas, erradas:Set }
   * `indice` é a pergunta atual da série; `tentativas` e `erradas` valem para
   * ESSA pergunta e sobrevivem à fuga, para o valor continuar decaindo.
   */
  progresso: new Map(),

  /** Fuga em andamento? */
  emFuga: false,
  /** Pergunta que sera reaberta quando a fuga acabar. */
  pontoPendente: null,
  /** Ponto cuja próxima pergunta abre ao clicar no botão do rodapé. */
  proximaPergunta: null
};

/** Relógio de jogo em segundos — anda com o `dt`, então `simular()` respeita. */
let tempoDeJogo = 0;

/* =========================================================================
 * Áudio (bipes curtos gerados por WebAudio — sem arquivos externos)
 * ======================================================================= */
let audioCtx = null;
function bip(frequencia, duracao = 0.12, tipo = 'sine', volume = 0.06) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.value = frequencia;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracao);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracao);
  } catch {
    /* áudio indisponível — o jogo segue normalmente */
  }
}
const somAcerto = () => { bip(660, 0.1); setTimeout(() => bip(880, 0.16), 90); };
const somErro = () => bip(180, 0.2, 'square', 0.05);
const somPerseguicao = () => { bip(150, 0.28, 'sawtooth', 0.07); setTimeout(() => bip(120, 0.32, 'sawtooth', 0.07), 200); };
const somSalvo = () => { bip(520, 0.1); setTimeout(() => bip(780, 0.1), 90); setTimeout(() => bip(1040, 0.25), 180); };
const somDescoberta = () => { bip(520, 0.09); setTimeout(() => bip(700, 0.09), 80); setTimeout(() => bip(950, 0.2), 170); };
const somMordida = () => { bip(90, 0.3, 'square', 0.09); setTimeout(() => bip(70, 0.35, 'sawtooth', 0.08), 80); };
const somPancada = () => { bip(240, 0.09, 'square', 0.08); setTimeout(() => bip(120, 0.18, 'triangle', 0.07), 50); };
const somVento = () => bip(400, 0.07, 'triangle', 0.03);
const somChat = () => bip(880, 0.06, 'sine', 0.04);

/* =========================================================================
 * Three.js: cena, câmera, renderer
 * ======================================================================= */
const container = $('cena');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);

const mundo = criarMundo(scene, camera);
const jogador = new Jogador(camera, renderer.domElement, mundo.colisores);
scene.add(jogador.objeto);
jogador.posicionar(8, 42, { x: 0, z: 0 }); // chega pela avenida sul, de frente para a praça central

const hud = new HUD();

// mecânica de fuga: um animal persegue o jogador a cada resposta errada
const perseguicao = new Perseguicao(scene, mundo.colisores, mundo.areasSeguras);
// e o jogador não está desarmado: dá para revidar a pauladas
const porrete = new Porrete(camera);
const sangue = criarSangue(scene);

// cidade compartilhada: os colegas da turma andando pelo mesmo mapa
const colegas = new Colegas(scene);
let multi = null;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================================================================
 * Fluxo de telas
 * ======================================================================= */
function mostrar(tela) {
  Object.values(telas).forEach((t) => { if (t) t.hidden = true; });
  if (tela) tela.hidden = false;
}

function iniciarJogo() {
  mostrar(null);
  $('hud').hidden = false;
  estado.rodando = true;
  estado.iniciadoEm = performance.now();
  jogador.ativo = true;
  porrete.mostrar(true);
  hud.atualizarVida(estado.vida);
  conectarNaCidade();
  travarMouse();
}

/**
 * Pede a captura do mouse. Alguns navegadores recusam o pedido (por exemplo,
 * logo depois de sair do modo travado). Nesse caso o jogo continua jogável
 * com o teclado e mostramos um aviso pedindo um clique na tela.
 */
function travarMouse() {
  if (hud.chatAberto) return;   // digitando: o mouse fica livre de propósito
  try {
    // Pedimos a captura direto no canvas em vez de chamar `controls.lock()`.
    // O motivo é só o tratamento de erro: no Chrome atual `requestPointerLock()`
    // devolve uma Promise, o PointerLockControls descarta esse retorno, e cada
    // recusa do navegador vira um "unhandled rejection" vermelho no console.
    // O controle continua funcionando igual — ele reage ao evento
    // `pointerlockchange` do documento, não ao retorno desta chamada.
    const pedido = renderer.domElement.requestPointerLock();
    if (pedido && typeof pedido.catch === 'function') {
      pedido.catch((erro) => console.warn('[Jogo] Captura do mouse recusada:', erro));
    }
  } catch (erro) {
    console.warn('[Jogo] Não foi possível capturar o mouse agora:', erro);
  }
  setTimeout(() => {
    const precisaClique = estado.rodando && !estado.finalizado &&
      !jogador.controls.isLocked && telas.painel.hidden && !hud.chatAberto;
    $('aviso-mouse').hidden = !precisaClique;
  }, 400);
}

/* ---- Tela inicial: nome e turma ---- */
$('form-inicio').addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = $('inp-nome').value.trim();
  const turma = $('inp-turma').value.trim();

  if (nome.length < 2) {
    $('erro-inicio').textContent = 'Digite seu nome (pelo menos 2 letras).';
    return;
  }
  if (turma.length < 1) {
    $('erro-inicio').textContent = 'Digite sua turma (ex.: 9ºA).';
    return;
  }

  estado.nome = nome;
  estado.turma = turma.toUpperCase();
  hud.definirJogador(estado.nome, estado.turma);
  $('erro-inicio').textContent = '';
  mostrar(telas.tutorial);
});

$('btn-jogar').addEventListener('click', iniciarJogo);

/* ---- Pausa ---- */
jogador.controls.addEventListener('unlock', () => {
  if (!estado.rodando || estado.finalizado) return;
  if (!telas.painel.hidden) return; // painel aberto usa o mouse livre de propósito
  // Esc fecha o bate-papo — e, como o navegador solta o mouse junto, o jogo
  // também pausa. Basta clicar em "Continuar" para voltar.
  if (hud.chatAberto) fecharChat();
  jogador.soltarTeclas();
  jogador.ativo = false;
  mostrar(telas.pausa);
});

jogador.controls.addEventListener('lock', () => {
  $('aviso-mouse').hidden = true;
  if (estado.rodando && telas.painel.hidden) {
    mostrar(null);
    jogador.ativo = true;
  }
});

$('btn-continuar').addEventListener('click', travarMouse);
$('btn-finalizar').addEventListener('click', () => finalizar('Você encerrou a exploração.'));

/* =========================================================================
 * Painel de interação (explicação + série de perguntas)
 * ======================================================================= */
const prompt = $('prompt-interacao');
let pontoProximo = null;

/** Avanço do ponto, criado na primeira visita. */
function progressoDe(ponto) {
  const id = ponto.dados.id;
  let p = estado.progresso.get(id);
  if (!p) {
    p = { indice: 0, tentativas: 0, erradas: new Set() };
    estado.progresso.set(id, p);
  }
  return p;
}

/** Quantas perguntas ainda faltam neste ponto. */
function faltamNoPonto(ponto) {
  return ponto.dados.perguntas.length - progressoDe(ponto).indice;
}

/**
 * Abre o painel de um ponto de interação, na pergunta em que ele parou.
 * @param {object} ponto
 * @param {?string} mensagemRetomada  texto mostrado quando o painel reabre
 *        depois de uma fuga — nesse caso as tentativas anteriores são mantidas.
 */
function abrirPainel(ponto, mensagemRetomada = null) {
  const d = ponto.dados;
  const prog = progressoDe(ponto);
  const total = d.perguntas.length;

  estado.pontoAberto = ponto;
  estado.proximaPergunta = null;
  estado.respondido = false;

  $('painel-retomada').hidden = !mensagemRetomada;
  if (mensagemRetomada) $('painel-retomada').textContent = mensagemRetomada;

  $('painel-zona').textContent = `Zona ${d.zonaNumero} — ${d.zonaNome}`;
  $('painel-zona').style.background = d.corCss;
  $('painel-titulo').textContent = `${d.icone} ${d.nome}`;
  $('painel-explicacao').textContent = d.explicacao;
  $('quiz-feedback').textContent = '';
  $('quiz-feedback').className = 'quiz-feedback';
  $('btn-fechar-painel').classList.remove('destaque');
  $('btn-fechar-painel').disabled = false;

  const caixa = $('quiz-opcoes');
  caixa.innerHTML = '';

  // série concluída: o painel vira um resumo do que foi aprendido ali
  if (prog.indice >= total) {
    $('painel-progresso').textContent = `✔ ${total} de ${total} perguntas`;
    $('painel-curiosidade').textContent = `💡 ${d.curiosidade}`;
    $('painel-curiosidade').hidden = false;
    $('quiz-enunciado').textContent = 'Você já respondeu tudo o que este ponto tinha a ensinar.';
    $('painel-valor').textContent = 'Ponto concluído';
    $('btn-fechar-painel').textContent = 'Continuar explorando';
    $('btn-fechar-painel').classList.add('destaque');
    telas.painel.hidden = false;
    fecharControles();
    return;
  }

  const pergunta = d.perguntas[prog.indice];
  $('painel-progresso').textContent = `Pergunta ${prog.indice + 1} de ${total}`;
  $('painel-curiosidade').textContent = `💡 ${d.curiosidade}`;
  $('painel-curiosidade').hidden = true;
  $('quiz-enunciado').textContent = pergunta.enunciado;
  $('painel-valor').textContent = `Vale ${valorAtual(prog)} pontos`;
  $('btn-fechar-painel').textContent = 'Responder depois';

  // monta as alternativas (as já erradas voltam marcadas e desativadas)
  pergunta.opcoes.forEach((texto, indice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opcao';
    btn.innerHTML = `<span class="letra">${'ABCD'[indice]}</span><span>${texto}</span>`;
    if (prog.erradas.has(indice)) {
      btn.classList.add('errada');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => responder(ponto, indice, btn));
    }
    caixa.appendChild(btn);
  });

  telas.painel.hidden = false;
  fecharControles();
}

/** Congela o jogador enquanto o painel está aberto. */
function fecharControles() {
  jogador.soltarTeclas();
  jogador.ativo = false;
  porrete.mostrar(false);
  if (hud.chatAberto) fecharChat();
  if (jogador.controls.isLocked) jogador.controls.unlock();
}

function valorAtual(prog) {
  return Math.max(
    REGRAS.pontosMinimos,
    REGRAS.pontosAcertoPrimeira - prog.tentativas * REGRAS.penalidadePorErro
  );
}

function responder(ponto, indice, botao) {
  if (estado.respondido) return;
  const prog = progressoDe(ponto);
  const pergunta = ponto.dados.perguntas[prog.indice];
  const total = ponto.dados.perguntas.length;
  const feedback = $('quiz-feedback');

  if (indice === pergunta.correta) {
    const ganho = valorAtual(prog);
    if (prog.tentativas === 0) estado.acertosPrimeira++;
    estado.respondido = true;
    botao.classList.add('certa');
    somAcerto();

    estado.pontuacao += ganho;
    estado.respondidas++;

    // essa pergunta acabou: a próxima começa com o valor cheio
    prog.indice++;
    prog.tentativas = 0;
    prog.erradas.clear();

    const concluiu = prog.indice >= total;
    if (concluiu && !ponto.descoberto) {
      ponto.marcarDescoberto();
      estado.descobertos++;
      somDescoberta();
    }

    feedback.className = 'quiz-feedback ok';
    feedback.textContent = `✅ Correto! +${ganho} pontos. ${pergunta.explicacaoResposta}`;
    $('painel-curiosidade').hidden = !concluiu;

    if (concluiu) {
      $('btn-fechar-painel').textContent = 'Continuar explorando';
    } else {
      $('btn-fechar-painel').textContent = `Próxima pergunta (${prog.indice + 1} de ${total}) →`;
      estado.proximaPergunta = ponto;
    }
    $('btn-fechar-painel').classList.add('destaque');

    // desabilita as demais alternativas
    [...$('quiz-opcoes').children].forEach((b) => {
      b.disabled = true;
      b.classList.add('travada');
    });

    atualizarPlacar();

    if (estado.respondidas >= TOTAL_PERGUNTAS) {
      setTimeout(
        () => finalizar('Parabéns! Você respondeu todas as perguntas da cidade! 🎉'),
        1400
      );
    }
    return;
  }

  // errou: perde um pouco do valor da pergunta e um animal vem atrás do jogador
  prog.tentativas++;
  prog.erradas.add(indice);
  somErro();
  botao.classList.add('errada');
  botao.disabled = true;

  const proximoValor = valorAtual(prog);
  $('painel-valor').textContent = `Vale ${proximoValor} pontos`;
  feedback.className = 'quiz-feedback erro';

  if (!PERSEGUICAO.ativa) {
    feedback.textContent =
      `❌ Não é essa. Leia de novo a explicação e tente outra alternativa ` +
      `(agora vale ${proximoValor} pontos).`;
    return;
  }

  // trava o painel enquanto o aviso aparece: nem responder de novo, nem fechar
  // para escapar da fuga — errou, corre.
  estado.respondido = true;
  [...$('quiz-opcoes').children].forEach((b) => { b.disabled = true; });
  $('btn-fechar-painel').disabled = true;
  $('btn-fechar-painel').textContent = 'Prepare-se para correr…';

  feedback.textContent =
    `❌ Não é essa! Um animal apareceu e vem na sua direção. Corra até uma Área Segura, ` +
    `ou vire e revide a pauladas (F) — a pergunta passa a valer ${proximoValor} pontos.`;

  setTimeout(() => iniciarFuga(ponto), PERSEGUICAO.tempoAvisoMs);
}

function atualizarPlacar() {
  hud.atualizarPontuacao(
    estado.pontuacao, estado.descobertos, TOTAL_PONTOS,
    estado.respondidas, TOTAL_PERGUNTAS
  );
}

/* =========================================================================
 * Fuga do animal
 * ======================================================================= */

/** Fecha o painel e solta o animal atrás do jogador. */
function iniciarFuga(ponto) {
  if (estado.finalizado || estado.emFuga) return;

  telas.painel.hidden = true;
  estado.pontoPendente = ponto;
  estado.emFuga = true;
  estado.respondido = false;

  camera.getWorldDirection(direcao);
  const animal = perseguicao.iniciar(jogador.posicao, { x: direcao.x, z: direcao.z });

  hud.definirFuga(animal, perseguicao.abrigoBloqueado);
  mostrarAvisoFuga(
    perseguicao.abrigoBloqueado
      ? `${animal.icone} ${animal.nome} invadiu o abrigo! Corra (Shift) até OUTRA 🛡️ Área Segura — ou revide com <kbd>F</kbd>.`
      : `${animal.icone} ${animal.nome} está atrás de você! Corra (Shift) até uma 🛡️ Área Segura — ou revide com <kbd>F</kbd>.`,
    'ruim', 3200
  );
  somPerseguicao();

  jogador.ativo = true;
  porrete.mostrar(true);
  travarMouse();
}

/**
 * O animal alcançou o jogador: mordida, sangue e vida a menos.
 * A fuga NÃO acaba aqui — o aluno continua correndo (ou revidando).
 */
function levarMordida() {
  if (tempoDeJogo < estado.invulneravelAte) return;
  estado.invulneravelAte = tempoDeJogo + VIDA.invulneravelMs / 1000;
  estado.mordidas++;

  estado.vida = Math.max(0, estado.vida - VIDA.danoMordida);
  const perda = Math.min(PERSEGUICAO.penalidadeMordida, estado.pontuacao);
  estado.pontuacao -= perda;

  hud.atualizarVida(estado.vida);
  hud.respingarSangue(estado.vida <= 40 ? 10 : 7);
  atualizarPlacar();
  somMordida();

  // sangue no mundo 3D, entre o jogador e o animal
  // a meio caminho entre o jogador e o animal: perto o bastante para se ver,
  // longe o bastante para nao explodir dentro da lente da camera
  const alvo = perseguicao.posicao || jogador.posicao;
  sangue.explodir(
    {
      x: jogador.posicao.x + (alvo.x - jogador.posicao.x) * 0.55,
      y: 1.2,
      z: jogador.posicao.z + (alvo.z - jogador.posicao.z) * 0.55
    },
    estado.vida <= 40 ? 1.3 : 1
  );

  if (estado.vida <= 0) {
    terminarFuga('desmaiado');
    return;
  }
  mostrarAvisoFuga(`🩸 Mordida! −${VIDA.danoMordida} de vida. Continue correndo!`, 'ruim', 1400);
}

/** O jogador girou o porrete. Só acerta o que estiver à frente e no alcance. */
function golpear() {
  if (!estado.emFuga || estado.finalizado || !jogador.ativo) return;
  if (!porrete.golpear()) return;   // ainda recarregando

  camera.getWorldDirection(direcao);
  if (!perseguicao.estaNoAlcance(jogador.posicao, { x: direcao.x, z: direcao.z })) {
    somVento();
    return;
  }

  const resultado = perseguicao.levarPancada(jogador.posicao);
  estado.golpes++;
  estado.pontuacao += PORRETE.pontosPorGolpe;
  atualizarPlacar();
  somPancada();

  if (resultado.espantou) {
    terminarFuga('espantado');
    return;
  }
  mostrarAvisoFuga(
    `🪵 Acertou! O bicho ficou tonto por ${(PORRETE.atordoamentoMs / 1000).toFixed(0)} s — aproveite e corra!`,
    'ok', 1600
  );
}

/**
 * Encerra a fuga e devolve o jogador à pergunta.
 * @param {'salvo'|'espantado'|'desmaiado'} desfecho
 */
function terminarFuga(desfecho) {
  if (!estado.emFuga) return;
  estado.emFuga = false;
  perseguicao.encerrar();
  hud.definirFuga(null);

  const ponto = estado.pontoPendente;
  estado.pontoPendente = null;
  let mensagem;

  if (desfecho === 'salvo') {
    somSalvo();
    mensagem = '🛡️ Você chegou à Área Segura! Agora respire e tente a pergunta de novo.';
    mostrarAvisoFuga('🛡️ Em segurança!', 'ok', 1400);
  } else if (desfecho === 'espantado') {
    somSalvo();
    mensagem =
      `🪵 Depois de ${PERSEGUICAO.golpesParaEspantar} pauladas o animal desistiu e fugiu. ` +
      'Coragem também vale pontos — volte para a pergunta.';
    mostrarAvisoFuga('🪵 O bicho desistiu e fugiu!', 'ok', 1800);
  } else {
    // vida zerada: desmaia, perde pontos e acorda no abrigo mais próximo
    const perda = Math.min(PERSEGUICAO.penalidadeDesmaio, estado.pontuacao);
    estado.pontuacao -= perda;
    estado.vida = VIDA.vidaAoAcordar;
    hud.atualizarVida(estado.vida);
    hud.limparSangue();
    atualizarPlacar();

    const abrigo = perseguicao.areaMaisProxima(jogador.posicao) ||
      { x: AREAS_SEGURAS[0].x, z: AREAS_SEGURAS[0].z };
    jogador.posicionar(abrigo.x, abrigo.z + 3, abrigo);

    somErro();
    mensagem = perda > 0
      ? `😵 Você ficou sem vida e desmaiou. Custou ${perda} pontos, mas alguém te levou até a Área Segura — e você já está de pé.`
      : '😵 Você ficou sem vida e desmaiou. Alguém te levou até a Área Segura — e você já está de pé.';
    mostrarAvisoFuga('😵 Você desmaiou!', 'ruim', 2000);
  }

  if (!ponto || estado.finalizado) return;

  // reabre a pergunta preservando as tentativas já feitas
  setTimeout(() => {
    if (estado.finalizado) return;
    abrirPainel(ponto, mensagem);
  }, 900);
}

/** Mensagem grande no centro da tela, some sozinha. */
let timerAvisoFuga = null;
function mostrarAvisoFuga(texto, tipo, duracaoMs) {
  const el = $('aviso-fuga');
  el.innerHTML = texto;
  el.className = `aviso-fuga ${tipo}`;
  el.hidden = false;
  clearTimeout(timerAvisoFuga);
  timerAvisoFuga = setTimeout(() => { el.hidden = true; }, duracaoMs);
}

$('btn-fechar-painel').addEventListener('click', () => {
  const proximo = estado.proximaPergunta;
  telas.painel.hidden = true;
  estado.pontoAberto = null;
  estado.proximaPergunta = null;

  if (estado.finalizado) return;
  porrete.mostrar(true);

  // acertou e ainda há perguntas neste ponto: emenda a próxima na hora
  if (proximo) {
    abrirPainel(proximo);
    return;
  }
  travarMouse();
});

/* =========================================================================
 * Cidade compartilhada (multijogador) e bate-papo
 * ======================================================================= */

function conectarNaCidade() {
  if (!MULTIJOGADOR.ativo || multi) return;

  multi = new Multijogador({ nome: estado.nome, turma: estado.turma });

  multi.aoMudarColegas((lista) => {
    colegas.sincronizar(lista);
    hud.atualizarColegas(lista.length, multi.conectado);
    hud.definirColegasNoMapa(lista.map((c) => ({ x: c.x, z: c.z })));
  });

  multi.aoReceberMensagem((msg) => {
    hud.adicionarMensagem(msg);
    if (!msg.propria) {
      colegas.falar(msg.id, msg.texto);
      somChat();
    }
  });

  multi.aoMudarEstado((conectado) => {
    hud.atualizarColegas(colegas.quantidade, conectado);
  });

  hud.atualizarColegas(0, false);
  multi.entrar(jogador.posicao).then((entrou) => {
    hud.avisoNoChat(entrou
      ? '🏙️ Você entrou na cidade da turma. Aperte T para conversar.'
      : '📴 Sem conexão com a sala: você está explorando sozinho.');
  });
}

function abrirChat() {
  if (!estado.rodando || estado.finalizado || !telas.painel.hidden) return;
  hud.abrirChat();
  // o jogador para de andar, mas o mundo continua rodando à sua volta
  jogador.soltarTeclas();
  jogador.bloqueado = true;
}

function fecharChat() {
  hud.fecharChat();
  jogador.bloqueado = false;
}

$('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = $('chat-entrada').value;
  fecharChat();
  if (!texto.trim()) return;          // Enter vazio: só fecha a caixa

  if (!multi || !multi.conectado) {
    hud.avisoNoChat('📴 Sem conexão: a mensagem não foi enviada.');
    return;
  }
  multi.enviarMensagem(texto);
});

$('chat-entrada').addEventListener('keydown', (e) => {
  // as teclas do bate-papo não podem vazar para os controles do jogo
  e.stopPropagation();
  if (e.code === 'Escape') fecharChat();
});

/* =========================================================================
 * Detecção de proximidade / teclas
 * ======================================================================= */
function verificarProximidade() {
  if (!estado.rodando || !telas.painel.hidden) return;

  // fugindo de um animal nao da para parar e ler um painel
  if (estado.emFuga) {
    pontoProximo = null;
    prompt.hidden = true;
    return;
  }

  const pos = jogador.posicao;
  let maisProximo = null;
  let menorDist = Infinity;

  for (const p of mundo.pontos) {
    const d = Math.hypot(pos.x - p.posicao.x, pos.z - p.posicao.z);
    if (d < menorDist) { menorDist = d; maisProximo = p; }
  }

  if (maisProximo && menorDist <= REGRAS.distanciaInteracao) {
    pontoProximo = maisProximo;
    const faltam = faltamNoPonto(maisProximo);
    const acao = faltam === 0
      ? 'rever'
      : maisProximo.descoberto ? 'rever' : `responder (${faltam} pergunta${faltam > 1 ? 's' : ''})`;
    prompt.hidden = false;
    prompt.innerHTML =
      `<kbd>E</kbd> ${acao} ` +
      `<strong style="color:${maisProximo.dados.corCss}">${maisProximo.dados.nome}</strong>`;
  } else {
    pontoProximo = null;
    prompt.hidden = true;
  }
}

document.addEventListener('keydown', (e) => {
  if (hud.chatAberto) return;   // digitando: o jogo não escuta o teclado
  if (!estado.rodando || estado.finalizado) return;

  if (e.code === 'KeyE' && pontoProximo && telas.painel.hidden && !estado.emFuga) {
    abrirPainel(pontoProximo);
    return;
  }
  if ((e.code === 'KeyF' || e.code === 'Space') && telas.painel.hidden && estado.emFuga) {
    e.preventDefault();
    golpear();
    return;
  }
  if (e.code === 'KeyT' && telas.painel.hidden) {
    e.preventDefault();
    abrirChat();
  }
});

// clique na cena: recaptura o mouse, revida na fuga ou interage (igual ao E)
renderer.domElement.addEventListener('mousedown', () => {
  if (!estado.rodando || estado.finalizado || !telas.painel.hidden) return;

  if (!jogador.controls.isLocked) {
    travarMouse();
    return;
  }
  if (estado.emFuga) golpear();
  else if (pontoProximo) abrirPainel(pontoProximo);
});

/* =========================================================================
 * Fim de jogo + gravação no Firebase
 * ======================================================================= */
async function finalizar(mensagem) {
  if (estado.finalizado) return;
  estado.finalizado = true;
  estado.rodando = false;
  jogador.ativo = false;
  jogador.soltarTeclas();
  jogador.bloqueado = false;
  porrete.mostrar(false);

  // uma fuga em andamento é cancelada junto com a partida
  if (estado.emFuga) {
    estado.emFuga = false;
    estado.pontoPendente = null;
    perseguicao.encerrar();
    hud.definirFuga(null);
  }
  $('aviso-fuga').hidden = true;
  hud.limparSangue();
  if (hud.chatAberto) fecharChat();
  if (jogador.controls.isLocked) jogador.controls.unlock();

  // sai da cidade compartilhada (apaga só o próprio avatar)
  multi?.sair();
  colegas.limpar();

  const duracao = (performance.now() - estado.iniciadoEm) / 1000;

  // bônus por explorar a cidade inteira
  let bonus = 0;
  if (estado.descobertos >= TOTAL_PONTOS) {
    bonus = REGRAS.bonusExploradorCompleto;
    estado.pontuacao += bonus;
  }

  $('hud').hidden = true;
  mostrar(telas.resultado);

  $('resultado-mensagem').textContent = mensagem;
  $('resultado-nome').textContent = estado.nome;
  $('resultado-turma').textContent = estado.turma;
  $('resultado-pontos').textContent = estado.pontuacao;
  $('resultado-descobertos').textContent = `${estado.descobertos} de ${TOTAL_PONTOS}`;
  $('resultado-respondidas').textContent = `${estado.respondidas} de ${TOTAL_PERGUNTAS}`;
  $('resultado-acertos').textContent = `${estado.acertosPrimeira} de ${TOTAL_PERGUNTAS}`;
  $('resultado-tempo').textContent = formatarTempo(duracao);
  $('resultado-fuga').textContent =
    `${estado.mordidas} mordida${estado.mordidas === 1 ? '' : 's'} · ` +
    `${estado.golpes} paulada${estado.golpes === 1 ? '' : 's'}`;
  $('resultado-bonus').hidden = bonus === 0;
  $('resultado-bonus').textContent = `🏆 Bônus de explorador completo: +${bonus} pontos!`;

  const dados = {
    nome: estado.nome,
    turma: estado.turma,
    pontuacao: estado.pontuacao,
    pontosDescobertos: estado.descobertos,
    totalPontos: TOTAL_PONTOS,
    acertosPrimeira: estado.acertosPrimeira,
    perguntasRespondidas: estado.respondidas,
    totalPerguntas: TOTAL_PERGUNTAS,
    mordidas: estado.mordidas,
    golpes: estado.golpes,
    duracaoSegundos: duracao
  };

  const status = $('resultado-status');
  status.className = 'status enviando';
  status.textContent = '⏳ Enviando sua pontuação para o ranking da turma...';

  const r = await salvarResultado(dados);
  if (r.ok) {
    status.className = 'status ok';
    status.textContent = '✅ Pontuação registrada no ranking da turma!';
  } else {
    salvarBackupLocal(dados);
    status.className = 'status erro';
    status.textContent =
      '⚠️ Não foi possível enviar agora (sem internet?). Sua pontuação ficou salva neste ' +
      'navegador — mostre a tela para o professor.';
  }
}

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}min ${String(s).padStart(2, '0')}s`;
}

$('btn-reiniciar').addEventListener('click', () => window.location.reload());

/* =========================================================================
 * Laço principal
 * ======================================================================= */
const relogio = new THREE.Clock();
const direcao = new THREE.Vector3();
let acumuladorMapa = 0;

/** Recupera vida devagar fora da fuga — bem mais rápido dentro de um abrigo. */
function regenerarVida(dt) {
  if (estado.emFuga || estado.vida >= VIDA.maxima) return;
  const pos = jogador.posicao;
  const noAbrigo = AREAS_SEGURAS.some(
    (a) => Math.hypot(pos.x - a.x, pos.z - a.z) <= PERSEGUICAO.raioAreaSegura
  );
  const taxa = noAbrigo ? VIDA.regeneracaoAbrigoPorSegundo : VIDA.regeneracaoPorSegundo;
  estado.vida = Math.min(VIDA.maxima, estado.vida + taxa * dt);
  hud.atualizarVida(estado.vida);
}

/**
 * Um passo da simulacao. Fica separado do laco de renderizacao para poder ser
 * chamado manualmente (ver `jogo.simular()` no modo debug).
 */
function passo(dt, t) {
  tempoDeJogo += dt;
  mundo.animar(t);
  jogador.update(dt);
  sangue.atualizar(dt);
  porrete.update(dt, Math.min(1, jogador.rapidez / 6));

  if (estado.rodando) {
    verificarProximidade();
    regenerarVida(dt);

    // colegas na mesma cidade
    colegas.update(dt, t, jogador.posicao);
    hud.definirColegaPerto(colegas.maisProximo);
    if (multi) {
      camera.getWorldDirection(direcao);
      multi.atualizar({
        x: jogador.posicao.x,
        z: jogador.posicao.z,
        angulo: Math.atan2(direcao.x, direcao.z),
        vida: estado.vida,
        pontos: estado.pontuacao,
        emFuga: estado.emFuga
      });
    }

    // fuga do animal (congela junto com o jogador quando o jogo está pausado)
    if (estado.emFuga && jogador.ativo) {
      const desfecho = perseguicao.update(dt, jogador.posicao);

      camera.getWorldDirection(direcao);
      hud.atualizarFuga(
        jogador.posicao,
        { x: direcao.x, z: direcao.z },
        perseguicao.posicao,
        perseguicao.distanciaDoJogador(jogador.posicao),
        perseguicao.areaMaisProxima(jogador.posicao),
        {
          golpes: perseguicao.golpes,
          atordoado: perseguicao.atordoado,
          segundos: perseguicao.segundosDeAtordoamento,
          noAlcance: perseguicao.estaNoAlcance(
            jogador.posicao, { x: direcao.x, z: direcao.z }
          )
        }
      );

      if (desfecho === 'mordida') levarMordida();
      else if (desfecho === 'salvo') terminarFuga('salvo');
    }

    // tempo limite (se configurado)
    if (REGRAS.tempoLimiteSegundos > 0) {
      const restante = REGRAS.tempoLimiteSegundos - (performance.now() - estado.iniciadoEm) / 1000;
      hud.atualizarTempo(Math.max(0, restante));
      if (restante <= 0) finalizar('⏱ Tempo esgotado! Veja o que você descobriu:');
    } else {
      hud.atualizarTempo(null);
    }

    // minimapa: ~12 quadros por segundo é suficiente e economiza CPU
    acumuladorMapa += dt;
    if (acumuladorMapa > 0.08) {
      acumuladorMapa = 0;
      camera.getWorldDirection(direcao);
      hud.atualizarMapa(jogador.posicao, { x: direcao.x, z: direcao.z }, mundo.pontos);
    }
  }
}

function animar() {
  requestAnimationFrame(animar);
  passo(Math.min(relogio.getDelta(), 0.1), relogio.elapsedTime);
  renderer.render(scene, camera);
}

/* =========================================================================
 * Boot
 * ======================================================================= */
atualizarPlacar();
hud.atualizarVida(estado.vida);
hud.definirColegaPerto(null);
$('total-pontos-tutorial').textContent = TOTAL_PONTOS;
$('total-pontos-inicio').textContent = TOTAL_PONTOS;
document.querySelectorAll('.total-perguntas').forEach((el) => {
  el.textContent = TOTAL_PERGUNTAS;
});
$('golpes-tutorial').textContent = PERSEGUICAO.golpesParaEspantar;
animar();

// O primeiro render já aconteceu na chamada de animar() acima, então basta um
// pequeno atraso para trocar a tela de carregamento pela tela inicial.
// (Não usamos requestAnimationFrame aqui: em abas de segundo plano ele fica
// represado, e o aluno ficaria preso no "Construindo a cidade…".)
setTimeout(() => {
  if (estado.rodando || estado.finalizado) return;
  mostrar(telas.inicio);
}, 300);

/* ---------------------------------------------------------------------------
 * Modo de depuração: abra a página com ?debug=1 para expor `window.jogo`
 * no console (útil para testar ou para o professor demonstrar rapidamente).
 * Ex.: jogo.irPara('parque')  →  teleporta até um ponto de interação.
 * ------------------------------------------------------------------------- */
if (new URLSearchParams(location.search).has('debug')) {
  window.jogo = {
    estado,
    jogador,
    mundo,
    finalizar,
    perseguicao,
    porrete,
    colegas,
    get multijogador() { return multi; },
    /** Roda a simulacao manualmente, util quando a aba esta em segundo plano. */
    simular(segundos = 1, dt = 1 / 60) {
      const quadros = Math.round(segundos / dt);
      for (let i = 0; i < quadros; i++) passo(dt, performance.now() / 1000);
      return { pos: { ...jogador.posicao }, emFuga: estado.emFuga, vida: estado.vida };
    },
    irPara(idDoPonto) {
      const p = mundo.pontos.find((x) => x.dados.id === idDoPonto);
      if (!p) return `Ponto "${idDoPonto}" não encontrado.`;
      jogador.posicionar(p.posicao.x, p.posicao.z + 4.5, p.posicao);
      return `Você está em ${p.dados.nome}.`;
    },
    /** Dá uma paulada agora (ignora a mira, útil para testar a mecânica). */
    bater() {
      golpear();
      return { golpes: perseguicao.golpes, atordoado: perseguicao.atordoado };
    },
    /** Força uma mordida, para conferir sangue e barra de vida. */
    morder() {
      estado.invulneravelAte = 0;
      levarMordida();
      return estado.vida;
    },
    /** Manda uma mensagem no bate-papo da turma. */
    dizer(texto) {
      return multi ? multi.enviarMensagem(texto) : Promise.resolve(false);
    }
  };
  console.info('[Jogo] Modo debug ativo — use window.jogo no console.');
}

// evita rolagem da página com as setas/espaço enquanto se joga
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) &&
      estado.rodando && telas.painel.hidden && !hud.chatAberto) {
    e.preventDefault();
  }
});
