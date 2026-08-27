/**
 * main.js
 * -----------------------------------------------------------------------------
 * Ponto de entrada do jogo "Cidade Inteligente e Sustentável".
 *
 * Responsabilidades:
 *   - montar cena / câmera / renderer do Three.js
 *   - controlar o fluxo de telas (início → tutorial → jogo → resultado)
 *   - detectar proximidade dos pontos de interação e abrir o painel educativo
 *   - somar pontos e gravar o resultado no Firebase ao final
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { criarMundo } from './world.js';
import { Jogador } from './player.js';
import { HUD } from './hud.js';
import { TOTAL_PONTOS } from './zones.js';
import { REGRAS, PERSEGUICAO } from './config.js';
import { Perseguicao } from './perseguicao.js';
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
  iniciadoEm: 0,
  rodando: false,
  finalizado: false,
  pontoAberto: null,
  tentativas: 0,
  respondido: false,

  /** Alternativas ja marcadas como erradas nesta pergunta. */
  erradas: new Set(),
  /** Fuga em andamento? */
  emFuga: false,
  /** Pergunta que sera reaberta quando a fuga acabar. */
  pontoPendente: null
};

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
  travarMouse();
}

/**
 * Pede a captura do mouse. Alguns navegadores recusam o pedido (por exemplo,
 * logo depois de sair do modo travado). Nesse caso o jogo continua jogável
 * com o teclado e mostramos um aviso pedindo um clique na tela.
 */
function travarMouse() {
  try {
    jogador.controls.lock();
  } catch (erro) {
    console.warn('[Jogo] Não foi possível capturar o mouse agora:', erro);
  }
  setTimeout(() => {
    const precisaClique = estado.rodando && !estado.finalizado &&
      !jogador.controls.isLocked && telas.painel.hidden;
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
 * Painel de interação (explicação + pergunta)
 * ======================================================================= */
const prompt = $('prompt-interacao');
let pontoProximo = null;

/**
 * Abre o painel de um ponto de interação.
 * @param {object} ponto
 * @param {?string} mensagemRetomada  texto mostrado quando o painel reabre
 *        depois de uma fuga — nesse caso as tentativas anteriores são mantidas.
 */
function abrirPainel(ponto, mensagemRetomada = null) {
  const d = ponto.dados;
  estado.pontoAberto = ponto;
  estado.respondido = false;
  if (!mensagemRetomada) {
    estado.tentativas = 0;
    estado.erradas.clear();
  }

  $('painel-retomada').hidden = !mensagemRetomada;
  if (mensagemRetomada) $('painel-retomada').textContent = mensagemRetomada;

  $('painel-zona').textContent = `Zona ${d.zonaNumero} — ${d.zonaNome}`;
  $('painel-zona').style.background = d.corCss;
  $('painel-titulo').textContent = `${d.icone} ${d.nome}`;
  $('painel-explicacao').textContent = d.explicacao;
  $('painel-curiosidade').textContent = `💡 ${d.curiosidade}`;
  $('painel-curiosidade').hidden = true;
  $('quiz-enunciado').textContent = d.pergunta.enunciado;
  $('quiz-feedback').textContent = '';
  $('quiz-feedback').className = 'quiz-feedback';
  $('painel-valor').textContent = `Vale ${valorAtual()} pontos`;
  $('btn-fechar-painel').textContent = 'Responder depois';
  $('btn-fechar-painel').classList.remove('destaque');
  $('btn-fechar-painel').disabled = false;

  // monta as alternativas (as já erradas voltam marcadas e desativadas)
  const caixa = $('quiz-opcoes');
  caixa.innerHTML = '';
  d.pergunta.opcoes.forEach((texto, indice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opcao';
    btn.innerHTML = `<span class="letra">${'ABCD'[indice]}</span><span>${texto}</span>`;
    if (estado.erradas.has(indice)) {
      btn.classList.add('errada');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => responder(ponto, indice, btn));
    }
    caixa.appendChild(btn);
  });

  telas.painel.hidden = false;
  jogador.soltarTeclas();
  jogador.ativo = false;
  if (jogador.controls.isLocked) jogador.controls.unlock();
}

function valorAtual() {
  return Math.max(
    REGRAS.pontosMinimos,
    REGRAS.pontosAcertoPrimeira - estado.tentativas * REGRAS.penalidadePorErro
  );
}

function responder(ponto, indice, botao) {
  if (estado.respondido) return;
  const pergunta = ponto.dados.pergunta;
  const feedback = $('quiz-feedback');

  if (indice === pergunta.correta) {
    const ganho = valorAtual();
    if (estado.tentativas === 0) estado.acertosPrimeira++;
    estado.respondido = true;
    botao.classList.add('certa');
    somAcerto();

    estado.pontuacao += ganho;
    if (!ponto.descoberto) {
      ponto.marcarDescoberto();
      estado.descobertos++;
      somDescoberta();
    }

    feedback.className = 'quiz-feedback ok';
    feedback.textContent = `✅ Correto! +${ganho} pontos. ${pergunta.explicacaoResposta}`;
    $('painel-curiosidade').hidden = false;
    $('btn-fechar-painel').textContent = 'Continuar explorando';
    $('btn-fechar-painel').classList.add('destaque');

    // desabilita as demais alternativas
    [...$('quiz-opcoes').children].forEach((b) => {
      b.disabled = true;
      b.classList.add('travada');
    });

    hud.atualizarPontuacao(estado.pontuacao, estado.descobertos, TOTAL_PONTOS);

    if (estado.descobertos >= TOTAL_PONTOS) {
      setTimeout(() => finalizar('Parabéns! Você descobriu todos os pontos da cidade! 🎉'), 1200);
    }
    return;
  }

  // errou: perde um pouco do valor da pergunta e um animal vem atrás do jogador
  estado.tentativas++;
  estado.erradas.add(indice);
  somErro();
  botao.classList.add('errada');
  botao.disabled = true;

  const proximoValor = valorAtual();
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
    `❌ Não é essa! Um animal apareceu e vem na sua direção. ` +
    `Corra até uma Área Segura para tentar de novo (a pergunta passa a valer ${proximoValor} pontos).`;

  setTimeout(() => iniciarFuga(ponto), PERSEGUICAO.tempoAvisoMs);
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
      ? `${animal.icone} ${animal.nome} invadiu o abrigo! Este já foi usado — corra (Shift) até OUTRA 🛡️ Área Segura.`
      : `${animal.icone} ${animal.nome} está atrás de você! Corra (Shift) até uma 🛡️ Área Segura.`,
    'ruim', 2800
  );
  somPerseguicao();

  jogador.ativo = true;
  travarMouse();
}

/**
 * Encerra a fuga e devolve o jogador à pergunta.
 * @param {'salvo'|'capturado'} desfecho
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
  } else {
    const perda = Math.min(PERSEGUICAO.penalidadeCaptura, estado.pontuacao);
    estado.pontuacao -= perda;
    hud.atualizarPontuacao(estado.pontuacao, estado.descobertos, TOTAL_PONTOS);

    // o jogador "acorda" no abrigo mais perto
    const abrigo = perseguicao.areaMaisProxima(jogador.posicao);
    if (abrigo) jogador.posicionar(abrigo.x, abrigo.z + 3, abrigo);

    somErro();
    mensagem = perda > 0
      ? `😱 O animal te alcançou! Foi só um susto, mas custou ${perda} pontos. Você foi levado até a Área Segura.`
      : '😱 O animal te alcançou! Foi só um susto — você foi levado até a Área Segura.';
    mostrarAvisoFuga('😱 Te pegou!', 'ruim', 1600);
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
  el.textContent = texto;
  el.className = `aviso-fuga ${tipo}`;
  el.hidden = false;
  clearTimeout(timerAvisoFuga);
  timerAvisoFuga = setTimeout(() => { el.hidden = true; }, duracaoMs);
}

$('btn-fechar-painel').addEventListener('click', () => {
  telas.painel.hidden = true;
  estado.pontoAberto = null;
  if (!estado.finalizado) travarMouse();
});

/* =========================================================================
 * Detecção de proximidade / tecla E
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
    const jaVisto = maisProximo.descoberto;
    prompt.hidden = false;
    prompt.innerHTML =
      `<kbd>E</kbd> ${jaVisto ? 'rever' : 'descobrir'} ` +
      `<strong style="color:${maisProximo.dados.corCss}">${maisProximo.dados.nome}</strong>`;
  } else {
    pontoProximo = null;
    prompt.hidden = true;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && pontoProximo && estado.rodando &&
      telas.painel.hidden && !estado.emFuga) {
    abrirPainel(pontoProximo);
  }
});

// clique na cena: recaptura o mouse ou, se já capturado, interage (igual ao E)
renderer.domElement.addEventListener('mousedown', () => {
  if (!estado.rodando || estado.finalizado || !telas.painel.hidden) return;

  if (!jogador.controls.isLocked) {
    travarMouse();
    return;
  }
  if (pontoProximo && !estado.emFuga) abrirPainel(pontoProximo);
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

  // uma fuga em andamento é cancelada junto com a partida
  if (estado.emFuga) {
    estado.emFuga = false;
    estado.pontoPendente = null;
    perseguicao.encerrar();
    hud.definirFuga(null);
  }
  $('aviso-fuga').hidden = true;
  if (jogador.controls.isLocked) jogador.controls.unlock();

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
  $('resultado-acertos').textContent = `${estado.acertosPrimeira} de ${TOTAL_PONTOS}`;
  $('resultado-tempo').textContent = formatarTempo(duracao);
  $('resultado-bonus').hidden = bonus === 0;
  $('resultado-bonus').textContent = `🏆 Bônus de explorador completo: +${bonus} pontos!`;

  const dados = {
    nome: estado.nome,
    turma: estado.turma,
    pontuacao: estado.pontuacao,
    pontosDescobertos: estado.descobertos,
    totalPontos: TOTAL_PONTOS,
    acertosPrimeira: estado.acertosPrimeira,
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

/**
 * Um passo da simulacao. Fica separado do laco de renderizacao para poder ser
 * chamado manualmente (ver `jogo.simular()` no modo debug).
 */
function passo(dt, t) {
  mundo.animar(t);
  jogador.update(dt);

  if (estado.rodando) {
    verificarProximidade();

    // fuga do animal (congela junto com o jogador quando o jogo está pausado)
    if (estado.emFuga && jogador.ativo) {
      const desfecho = perseguicao.update(dt, jogador.posicao);

      camera.getWorldDirection(direcao);
      hud.atualizarFuga(
        jogador.posicao,
        { x: direcao.x, z: direcao.z },
        perseguicao.posicao,
        perseguicao.distanciaDoJogador(jogador.posicao),
        perseguicao.areaMaisProxima(jogador.posicao)
      );

      if (desfecho !== 'nada') terminarFuga(desfecho);
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
hud.atualizarPontuacao(0, 0, TOTAL_PONTOS);
$('total-pontos-tutorial').textContent = TOTAL_PONTOS;
$('total-pontos-inicio').textContent = TOTAL_PONTOS;
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
    /** Roda a simulacao manualmente, util quando a aba esta em segundo plano. */
    simular(segundos = 1, dt = 1 / 60) {
      const quadros = Math.round(segundos / dt);
      for (let i = 0; i < quadros; i++) passo(dt, performance.now() / 1000);
      return { pos: { ...jogador.posicao }, emFuga: estado.emFuga };
    },
    irPara(idDoPonto) {
      const p = mundo.pontos.find((x) => x.dados.id === idDoPonto);
      if (!p) return `Ponto "${idDoPonto}" não encontrado.`;
      jogador.posicionar(p.posicao.x, p.posicao.z + 4.5, p.posicao);
      return `Você está em ${p.dados.nome}.`;
    }
  };
  console.info('[Jogo] Modo debug ativo — use window.jogo no console.');
}

// evita rolagem da página com as setas/espaço enquanto se joga
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) &&
      estado.rodando && telas.painel.hidden) {
    e.preventDefault();
  }
});
