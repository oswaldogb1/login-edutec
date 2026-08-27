/**
 * professor.js
 * -----------------------------------------------------------------------------
 * Painel do professor: ranking da turma em tempo real, pensado para projeção.
 *
 * ⚠️ ESTE MÓDULO É SOMENTE LEITURA ⚠️
 * Do SDK do Firebase importamos apenas `ref`, `onValue` e `get`.
 * `set()`, `update()` e `remove()` não são importados em lugar nenhum —
 * é impossível esta tela alterar ou apagar qualquer resultado.
 * -----------------------------------------------------------------------------
 */
import { FIREBASE_CONFIG, NO_RESULTADOS, SENHA_PROFESSOR } from './config.js';

const SDK_VERSAO = '10.12.5';
const $ = (id) => document.getElementById(id);

const CHAVE_SESSAO = 'cidade-inteligente:professor';

let db = null;
let refFn = null;
let onValueFn = null;
let getFn = null;

/** Últimos dados recebidos do banco: { TURMA: { id: registro } } */
let dadosBrutos = {};
/** IDs já exibidos, para destacar quem acabou de entrar no ranking. */
let idsConhecidos = new Set();
let primeiraCarga = true;

/* =========================================================================
 * Login
 * ======================================================================= */

$('form-senha').addEventListener('submit', (e) => {
  e.preventDefault();
  const senha = $('inp-senha').value.trim();

  if (senha !== SENHA_PROFESSOR) {
    $('erro-senha').textContent = 'Senha incorreta. Tente novamente.';
    $('inp-senha').value = '';
    $('inp-senha').focus();
    return;
  }

  try { sessionStorage.setItem(CHAVE_SESSAO, '1'); } catch { /* aba anônima */ }
  entrar();
});

function entrar() {
  $('prof-login').hidden = true;
  $('prof-app').hidden = false;
  conectar();
}

// se o professor já entrou nesta aba, não pede a senha de novo ao recarregar
try {
  if (sessionStorage.getItem(CHAVE_SESSAO) === '1') entrar();
} catch { /* sessionStorage indisponível */ }

/* =========================================================================
 * Conexão com o Firebase (leitura)
 * ======================================================================= */

function definirStatus(texto, online = true) {
  $('prof-status-texto').textContent = texto;
  $('prof-status').classList.toggle('offline', !online);
}

async function conectar() {
  try {
    const { initializeApp, getApps } = await import(/* @vite-ignore */
      `https://www.gstatic.com/firebasejs/${SDK_VERSAO}/firebase-app.js`);
    // Somente funções de LEITURA são importadas.
    const { getDatabase, ref, onValue, get } = await import(/* @vite-ignore */
      `https://www.gstatic.com/firebasejs/${SDK_VERSAO}/firebase-database.js`);

    refFn = ref;
    onValueFn = onValue;
    getFn = get;

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);

    // Listener em tempo real: qualquer aluno que terminar aparece na hora.
    onValueFn(
      refFn(db, NO_RESULTADOS),
      (snapshot) => {
        dadosBrutos = snapshot.val() || {};
        definirStatus(`Ao vivo · atualizado às ${new Date().toLocaleTimeString('pt-BR')}`, true);
        atualizarTurmas();
        renderizar();
      },
      (erro) => {
        console.error('[Firebase] Erro de leitura:', erro);
        definirStatus('Sem acesso ao banco de dados (verifique as regras de leitura).', false);
      }
    );
  } catch (erro) {
    console.error('[Firebase] Falha ao conectar:', erro);
    definirStatus('Falha ao conectar. Verifique a conexão com a internet.', false);
  }
}

/* =========================================================================
 * Montagem do ranking
 * ======================================================================= */

/** Transforma { TURMA: { id: registro } } numa lista plana de registros. */
function listarRegistros(filtroTurma) {
  const lista = [];
  for (const [turma, entradas] of Object.entries(dadosBrutos)) {
    if (filtroTurma !== '__todas__' && turma !== filtroTurma) continue;
    if (!entradas || typeof entradas !== 'object') continue;

    for (const [id, r] of Object.entries(entradas)) {
      if (!r || typeof r !== 'object') continue;
      lista.push({
        id,
        turma: r.turma || turma,
        nome: r.nome || 'Sem nome',
        pontuacao: Number(r.pontuacao) || 0,
        pontosDescobertos: Number(r.pontosDescobertos) || 0,
        totalPontos: Number(r.totalPontos) || 0,
        timestamp: Number(r.timestamp) || 0
      });
    }
  }
  return lista;
}

/** Mantém apenas a melhor tentativa de cada aluno (nome + turma). */
function melhorPorAluno(lista) {
  const melhores = new Map();
  for (const r of lista) {
    const chave = `${r.turma}|${r.nome.toLowerCase()}`;
    const atual = melhores.get(chave);
    if (!atual || r.pontuacao > atual.pontuacao) melhores.set(chave, r);
  }
  return [...melhores.values()];
}

function atualizarTurmas() {
  const select = $('sel-turma');
  const selecionada = select.value;
  const turmas = Object.keys(dadosBrutos).sort();

  select.innerHTML = '<option value="__todas__">Todas as turmas</option>';
  turmas.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });

  // preserva a turma que o professor já tinha escolhido
  select.value = turmas.includes(selecionada) ? selecionada : '__todas__';
}

function renderizar() {
  const filtro = $('sel-turma').value;
  const todasTentativas = $('chk-tentativas').checked;

  let lista = listarRegistros(filtro);
  const totalPartidas = lista.length;

  if (!todasTentativas) lista = melhorPorAluno(lista);

  lista.sort((a, b) =>
    b.pontuacao - a.pontuacao ||
    b.pontosDescobertos - a.pontosDescobertos ||
    a.timestamp - b.timestamp
  );

  // --- cartões de estatística ---
  const alunosUnicos = new Set(lista.map((r) => `${r.turma}|${r.nome.toLowerCase()}`)).size;
  const media = lista.length
    ? Math.round(lista.reduce((s, r) => s + r.pontuacao, 0) / lista.length)
    : 0;
  const maior = lista.length ? Math.max(...lista.map((r) => r.pontuacao)) : 0;

  $('stat-alunos').textContent = alunosUnicos;
  $('stat-partidas').textContent = totalPartidas;
  $('stat-media').textContent = media;
  $('stat-maior').textContent = maior;

  // --- tabela ---
  const corpo = $('ranking-corpo');
  corpo.innerHTML = '';
  $('prof-vazio').hidden = lista.length > 0;

  const medalhas = ['🥇', '🥈', '🥉'];

  lista.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (i < 3) tr.classList.add(`top${i + 1}`);
    if (!primeiraCarga && !idsConhecidos.has(r.id)) tr.classList.add('nova');

    const quando = r.timestamp
      ? new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';

    tr.innerHTML = `
      <td class="pos">${i < 3 ? medalhas[i] : i + 1}</td>
      <td>${escapar(r.nome)}${quando ? `<span class="detalhe">${quando}</span>` : ''}</td>
      <td>${escapar(r.turma)}</td>
      <td>${r.pontosDescobertos}${r.totalPontos ? ` / ${r.totalPontos}` : ''}</td>
      <td class="pontos">${r.pontuacao}</td>
    `;
    corpo.appendChild(tr);
  });

  idsConhecidos = new Set(listarRegistros('__todas__').map((r) => r.id));
  primeiraCarga = false;
}

/** Evita que um nome digitado pelo aluno vire HTML na tela projetada. */
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* =========================================================================
 * Controles da interface
 * ======================================================================= */

$('sel-turma').addEventListener('change', renderizar);
$('chk-tentativas').addEventListener('change', renderizar);

$('btn-atualizar').addEventListener('click', async () => {
  if (!db) return;
  definirStatus('Atualizando…', true);
  try {
    // get() é apenas uma leitura pontual — nada é escrito no banco.
    const snapshot = await getFn(refFn(db, NO_RESULTADOS));
    dadosBrutos = snapshot.val() || {};
    atualizarTurmas();
    renderizar();
    definirStatus(`Ao vivo · atualizado às ${new Date().toLocaleTimeString('pt-BR')}`, true);
  } catch (erro) {
    console.error('[Firebase] Erro ao atualizar:', erro);
    definirStatus('Não foi possível atualizar agora.', false);
  }
});

$('btn-telacheia').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
