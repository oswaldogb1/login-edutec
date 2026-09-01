/**
 * firebase.js
 * -----------------------------------------------------------------------------
 * Camada de gravação no Firebase Realtime Database.
 *
 * ⚠️ REGRA DE SEGURANÇA DO PROJETO ⚠️
 * Este módulo importa APENAS `push()` (criar registro novo).
 * As funções destrutivas do SDK — `set()`, `update()`, `remove()` — não são
 * importadas em lugar nenhum do projeto, então é fisicamente impossível
 * este código sobrescrever ou apagar dados existentes no banco.
 *
 * Estrutura gravada:  /resultados/{turma}/{idAutoGerado}
 * -----------------------------------------------------------------------------
 */
import { FIREBASE_CONFIG, NO_RESULTADOS } from './config.js';

const SDK_VERSAO = '10.12.5';
const URL_APP = `https://www.gstatic.com/firebasejs/${SDK_VERSAO}/firebase-app.js`;
const URL_DB = `https://www.gstatic.com/firebasejs/${SDK_VERSAO}/firebase-database.js`;

let _db = null;
let _ref = null;
let _push = null;
let _iniciando = null;

/**
 * Deixa o nome da turma seguro para virar uma chave do Realtime Database.
 * O Firebase não aceita  .  $  #  [  ]  /  em chaves.
 */
export function sanitizarTurma(turma) {
  return String(turma || '')
    .trim()
    .toUpperCase()
    // lista branca: so letras, numeros, hifen e underline viram parte da chave.
    // Isso ja descarta os caracteres proibidos pelo Firebase ( .  $  #  [  ]  / )
    // e qualquer caractere de controle que possa vir colado do teclado.
    .replace(/[^A-Z0-9ªºÀ-ÿ_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'SEM-TURMA';
}

/**
 * Carrega o SDK sob demanda (import dinâmico).
 * Se o aluno estiver offline, o jogo continua funcionando — apenas não grava.
 */
async function iniciar() {
  if (_db) return _db;
  if (_iniciando) return _iniciando;

  _iniciando = (async () => {
    const { initializeApp, getApps } = await import(/* @vite-ignore */ URL_APP);
    // Importamos SOMENTE o necessário para criar registros novos.
    const { getDatabase, ref, push } = await import(/* @vite-ignore */ URL_DB);

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _db = getDatabase(app);
    _ref = ref;
    _push = push;
    return _db;
  })();

  return _iniciando;
}

/**
 * Grava o resultado de um aluno criando SEMPRE um registro novo (push).
 *
 * @param {{nome:string, turma:string, pontuacao:number,
 *          pontosDescobertos:number, totalPontos:number,
 *          acertosPrimeira:number, duracaoSegundos:number}} resultado
 * @returns {Promise<{ok:boolean, id?:string, erro?:string}>}
 */
export async function salvarResultado(resultado) {
  const turma = sanitizarTurma(resultado.turma);

  const registro = {
    nome: String(resultado.nome || 'Sem nome').trim().slice(0, 60),
    turma,
    pontuacao: Number(resultado.pontuacao) || 0,
    pontosDescobertos: Number(resultado.pontosDescobertos) || 0,
    totalPontos: Number(resultado.totalPontos) || 0,
    acertosPrimeira: Number(resultado.acertosPrimeira) || 0,
    perguntasRespondidas: Number(resultado.perguntasRespondidas) || 0,
    totalPerguntas: Number(resultado.totalPerguntas) || 0,
    mordidas: Number(resultado.mordidas) || 0,
    golpes: Number(resultado.golpes) || 0,
    duracaoSegundos: Math.round(Number(resultado.duracaoSegundos) || 0),
    timestamp: Date.now(),
    dataLocal: new Date().toLocaleString('pt-BR')
  };

  try {
    await iniciar();
    // push() cria um filho com ID automático — nunca toca nos dados já existentes.
    const referencia = await _push(_ref(_db, `${NO_RESULTADOS}/${turma}`), registro);
    return { ok: true, id: referencia.key };
  } catch (erro) {
    console.error('[Firebase] Falha ao salvar resultado:', erro);
    return { ok: false, erro: erro?.message || String(erro) };
  }
}

/** Guarda o resultado localmente como plano B (ex.: aluno sem internet). */
export function salvarBackupLocal(resultado) {
  try {
    const chave = 'cidade-inteligente:resultados-pendentes';
    const anteriores = JSON.parse(localStorage.getItem(chave) || '[]');
    anteriores.push({ ...resultado, timestamp: Date.now() });
    localStorage.setItem(chave, JSON.stringify(anteriores.slice(-50)));
  } catch {
    /* localStorage indisponível (aba anônima, por exemplo) — ignoramos. */
  }
}
