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
import { REGRAS } from './config.js';
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
  respondido: false
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

function abrirPainel(ponto) {
  const d = ponto.dados;
  estado.pontoAberto = ponto;
  estado.tentativas = 0;
  estado.respondido = false;

  $('painel-zona').textContent = `Zona ${d.zonaNumero} — ${d.zonaNome}`;
  $('painel-zona').style.background = d.corCss;
  $('painel-titulo').textContent = `${d.icone} ${d.nome}`;
  $('painel-explicacao').textContent = d.explicacao;
  $('painel-curiosidade').textContent = `💡 ${d.curiosidade}`;
  $('painel-curiosidade').hidden = true;
  $('quiz-enunciado').textContent = d.pergunta.enunciado;
  $('quiz-feedback').textContent = '';
  $('quiz-feedback').className = 'quiz-feedback';
  $('painel-valor').textContent = `Vale ${REGRAS.pontosAcertoPrimeira} pontos`;
  $('btn-fechar-painel').textContent = 'Responder depois';
  $('btn-fechar-painel').classList.remove('destaque');

  // monta as alternativas
  const caixa = $('quiz-opcoes');
  caixa.innerHTML = '';
  d.pergunta.opcoes.forEach((texto, indice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'opcao';
    btn.innerHTML = `<span class="letra">${'ABCD'[indice]}</span><span>${texto}</span>`;
    btn.addEventListener('click', () => responder(ponto, indice, btn));
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

  // errou: pode tentar de novo, perdendo um pouco de pontuação
  estado.tentativas++;
  somErro();
  botao.classList.add('errada');
  botao.disabled = true;

  const proximoValor = valorAtual();
  feedback.className = 'quiz-feedback erro';
  feedback.textContent =
    `❌ Não é essa. Leia de novo a explicação e tente outra alternativa ` +
    `(agora vale ${proximoValor} pontos).`;
  $('painel-valor').textContent = `Vale ${proximoValor} pontos`;
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
  if (e.code === 'KeyE' && pontoProximo && estado.rodando && telas.painel.hidden) {
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
  if (pontoProximo) abrirPainel(pontoProximo);
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

function animar() {
  requestAnimationFrame(animar);

  const dt = Math.min(relogio.getDelta(), 0.1);
  const t = relogio.elapsedTime;

  mundo.animar(t);
  jogador.update(dt);

  if (estado.rodando) {
    verificarProximidade();

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
