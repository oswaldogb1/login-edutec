/**
 * multijogador.js
 * -----------------------------------------------------------------------------
 * Cidade compartilhada: todos os alunos entram na MESMA sala, se veem andando
 * pela cidade e conversam pelo teclado.
 *
 * ⚠️ REGRA DE SEGURANÇA DO PROJETO ⚠️
 * O banco é compartilhado com outros projetos da escola. Este módulo:
 *   - NÃO usa o SDK do Firebase — fala REST puro, então `set()`, `update()` e
 *     `remove()` continuam sem existir em lugar nenhum do projeto e o
 *     `firebase.js` (que grava os resultados) segue intocado;
 *   - só monta URLs por `montarCaminho()`, que força o prefixo
 *     `/{MULTIJOGADOR.raiz}/salas/{sala}` e recusa qualquer caminho fora dele;
 *   - só aceita DELETE em `jogadores/{id}` — nunca na sala, nunca no bate-papo,
 *     nunca fora daqui. Sair da partida apaga o próprio avatar; a faxina de
 *     fantasmas remove apenas quem está parado há minutos.
 * Há um autoteste no fim do arquivo que quebra o carregamento se essas regras
 * forem afrouxadas.
 *
 * Tudo aqui é opcional e falha em silêncio: sem internet, o jogo continua
 * normalmente — o aluno só não vê os colegas.
 * -----------------------------------------------------------------------------
 */
import { FIREBASE_CONFIG, MULTIJOGADOR } from './config.js';

/* =========================================================================
 * Montagem de URL — o único lugar do módulo que sabe falar com o banco
 * ======================================================================= */

const BASE = String(FIREBASE_CONFIG.databaseURL || '').replace(/\/+$/, '');
const PREFIXO = `${MULTIJOGADOR.raiz}/salas/${MULTIJOGADOR.sala}`;

/** Só letras, números, hífen, underline e barra podem entrar num caminho. */
const SUBCAMINHO_VALIDO = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;

/**
 * Monta a URL REST de um pedaço da sala.
 * @param {string} sub  ex.: '', 'jogadores', 'jogadores/abc123', 'mensagens'
 * @param {string} query  parâmetros extras já formatados (sem o "?")
 */
function montarCaminho(sub = '', query = '') {
  if (sub && !SUBCAMINHO_VALIDO.test(sub)) {
    throw new Error(`[Multijogador] Subcaminho inválido: ${sub}`);
  }
  const caminho = sub ? `${PREFIXO}/${sub}` : PREFIXO;
  if (!caminho.startsWith(`${MULTIJOGADOR.raiz}/salas/`)) {
    throw new Error(`[Multijogador] Caminho fora da área do jogo: ${caminho}`);
  }
  return `${BASE}/${caminho}.json${query ? `?${query}` : ''}`;
}

/** DELETE só é permitido no nó de UM jogador. */
function caminhoDeExclusao(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(id))) {
    throw new Error('[Multijogador] Id de jogador inválido para exclusão.');
  }
  return montarCaminho(`jogadores/${id}`);
}

/** Identificador estável desta aba (sobrevive a um F5, some ao fechar). */
function idDaSessao() {
  const chave = 'cidade-inteligente:id-jogador';
  try {
    const salvo = sessionStorage.getItem(chave);
    if (salvo) return salvo;
    const novo = `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(chave, novo);
    return novo;
  } catch {
    return `j${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Cor da camiseta do avatar, sorteada a partir do id (sempre a mesma). */
const CORES_CAMISETA = [
  0x38bdf8, 0xf472b6, 0xfacc15, 0x4ade80, 0xa78bfa,
  0xfb923c, 0x22d3ee, 0xf87171, 0x84cc16, 0xe879f9
];
export function corDoJogador(id) {
  let soma = 0;
  for (let i = 0; i < id.length; i++) soma = (soma * 31 + id.charCodeAt(i)) >>> 0;
  return CORES_CAMISETA[soma % CORES_CAMISETA.length];
}

/* =========================================================================
 * Sala compartilhada
 * ======================================================================= */

export class Multijogador {
  /**
   * @param {{nome:string, turma:string}} dadosDoAluno
   */
  constructor({ nome, turma }) {
    this.id = idDaSessao();
    this.nome = String(nome || 'Aluno').slice(0, 24);
    this.turma = String(turma || '').slice(0, 12);
    this.cor = corDoJogador(this.id);

    /** Colegas online: id → {nome, turma, x, z, angulo, vida, visto, ...} */
    this.colegas = new Map();
    /** Últimas mensagens do bate-papo, das mais antigas para as mais novas. */
    this.mensagens = [];

    this.conectado = false;
    /** Assinantes de mudanças (o main.js registra os seus aqui). */
    this._ouvintes = { colegas: [], mensagem: [], estado: [] };

    this._fonte = null;         // EventSource dos jogadores
    this._fonteChat = null;     // EventSource do bate-papo
    this._timerEnvio = null;
    this._timerPoll = null;
    this._timerFaxina = null;
    this._chavesVistas = new Set();
    this._ultimoEnvio = 0;
    this._pendente = null;
    this._encerrado = false;
  }

  /* ---------------------------------------------------------------------
   * Assinaturas
   * ------------------------------------------------------------------- */
  aoMudarColegas(fn) { this._ouvintes.colegas.push(fn); }
  aoReceberMensagem(fn) { this._ouvintes.mensagem.push(fn); }
  aoMudarEstado(fn) { this._ouvintes.estado.push(fn); }

  _avisar(evento, dado) {
    for (const fn of this._ouvintes[evento]) {
      try { fn(dado); } catch (erro) { console.warn('[Multijogador] ouvinte falhou:', erro); }
    }
  }

  _definirConectado(valor) {
    if (this.conectado === valor) return;
    this.conectado = valor;
    this._avisar('estado', valor);
  }

  /* ---------------------------------------------------------------------
   * Entrada e saída
   * ------------------------------------------------------------------- */

  /**
   * Entra na sala e liga os fluxos de dados. Nunca lança: se a rede falhar,
   * o jogo simplesmente segue offline.
   * @param {{x:number, z:number}} posicao posição inicial do aluno
   */
  async entrar(posicao) {
    if (!MULTIJOGADOR.ativo) return false;

    try {
      await this._enviar('PUT', `jogadores/${this.id}`, {
        nome: this.nome,
        turma: this.turma,
        x: Math.round(posicao.x * 10) / 10,
        z: Math.round(posicao.z * 10) / 10,
        angulo: 0,
        vida: 100,
        pontos: 0,
        emFuga: false,
        entrouEm: Date.now(),
        atualizadoEm: Date.now()
      });
      this._definirConectado(true);
    } catch (erro) {
      console.warn('[Multijogador] Não foi possível entrar na sala:', erro);
      this._definirConectado(false);
      return false;
    }

    this._ouvirJogadores();
    this._ouvirMensagens();

    // faxina dos avatares abandonados (aba fechada sem avisar)
    this._timerFaxina = setInterval(() => this._limparFantasmas(), 60000);

    // sair da cidade ao fechar a aba
    this._aoFechar = () => this.sair();
    window.addEventListener('pagehide', this._aoFechar);
    window.addEventListener('beforeunload', this._aoFechar);

    return true;
  }

  /** Apaga o próprio avatar e desliga tudo. */
  sair() {
    if (this._encerrado) return;
    this._encerrado = true;

    clearInterval(this._timerPoll);
    clearInterval(this._timerFaxina);
    this._fonte?.close();
    this._fonteChat?.close();
    window.removeEventListener('pagehide', this._aoFechar);
    window.removeEventListener('beforeunload', this._aoFechar);

    try {
      // `keepalive` faz o pedido sobreviver ao fechamento da aba
      fetch(caminhoDeExclusao(this.id), { method: 'DELETE', keepalive: true }).catch(() => {});
    } catch { /* sem rede: o avatar some sozinho por inatividade */ }
  }

  /* ---------------------------------------------------------------------
   * Envio da própria posição
   * ------------------------------------------------------------------- */

  /**
   * Registra o estado atual do aluno. Pode ser chamada a cada quadro: o envio
   * de verdade acontece no máximo a cada `intervaloEnvioMs`.
   */
  atualizar(estado) {
    if (!this.conectado || this._encerrado) return;
    this._pendente = estado;

    const agora = Date.now();
    if (agora - this._ultimoEnvio < MULTIJOGADOR.intervaloEnvioMs) return;
    this._ultimoEnvio = agora;

    const { x, z, angulo, vida, pontos, emFuga } = this._pendente;
    this._enviar('PATCH', `jogadores/${this.id}`, {
      x: Math.round(x * 10) / 10,
      z: Math.round(z * 10) / 10,
      angulo: Math.round(angulo * 100) / 100,
      vida: Math.round(vida),
      pontos: Math.round(pontos),
      emFuga: !!emFuga,
      atualizadoEm: agora
    }).catch(() => this._definirConectado(false));
  }

  /* ---------------------------------------------------------------------
   * Bate-papo
   * ------------------------------------------------------------------- */

  /**
   * Publica uma mensagem no bate-papo da sala.
   * @returns {Promise<boolean>}
   */
  async enviarMensagem(texto) {
    const limpo = String(texto || '').replace(/\s+/g, ' ').trim()
      .slice(0, MULTIJOGADOR.tamanhoMaxMensagem);
    if (!limpo) return false;
    if (!this.conectado) return false;

    try {
      // POST no Realtime Database = push(): sempre cria uma chave nova
      await this._enviar('POST', 'mensagens', {
        de: this.nome,
        turma: this.turma,
        id: this.id,
        texto: limpo,
        em: Date.now()
      });
      return true;
    } catch (erro) {
      console.warn('[Multijogador] Mensagem não enviada:', erro);
      this._definirConectado(false);
      return false;
    }
  }

  /* ---------------------------------------------------------------------
   * Recebimento
   * ------------------------------------------------------------------- */

  /** Colegas ativos agora (o próprio aluno fica de fora). */
  listarColegas() {
    const agora = performance.now();
    const vivos = [];
    for (const [id, c] of this.colegas) {
      if (agora - c.visto > MULTIJOGADOR.tempoInatividadeMs) continue;
      vivos.push({ id, ...c });
    }
    return vivos;
  }

  _ouvirJogadores() {
    this._abrirFluxo(
      montarCaminho('jogadores'),
      (tipo, caminho, dado) => this._aplicarJogadores(tipo, caminho, dado),
      () => this._ligarPoll()
    );
  }

  _ouvirMensagens() {
    // limitToLast mantém a leitura pequena mesmo que a sala acumule histórico
    const query = `orderBy=%22%24key%22&limitToLast=${MULTIJOGADOR.mensagensVisiveis}`;
    this._abrirFluxo(
      montarCaminho('mensagens', query),
      (tipo, caminho, dado) => this._aplicarMensagens(caminho, dado),
      () => { /* sem stream, o poll cuida também do bate-papo */ }
    );
  }

  /**
   * Abre um EventSource do Realtime Database. Os eventos `put` e `patch`
   * trazem `{path, data}`; `path` é relativo ao nó assinado.
   */
  _abrirFluxo(url, aplicar, aoFalhar) {
    let fonte;
    try {
      fonte = new EventSource(url);
    } catch (erro) {
      console.warn('[Multijogador] Stream indisponível:', erro);
      aoFalhar();
      return null;
    }

    const tratar = (tipo) => (evento) => {
      try {
        const corpo = JSON.parse(evento.data);
        aplicar(tipo, corpo.path, corpo.data);
        this._definirConectado(true);
      } catch { /* keep-alive e eventos vazios chegam aqui — ignoramos */ }
    };
    fonte.addEventListener('put', tratar('put'));
    fonte.addEventListener('patch', tratar('patch'));
    fonte.addEventListener('error', () => {
      // o navegador reconecta sozinho; o poll cobre o intervalo
      aoFalhar();
    });

    if (url.includes('/mensagens')) this._fonteChat = fonte;
    else this._fonte = fonte;
    return fonte;
  }

  /**
   * Aplica um evento do stream.
   *
   * A diferença entre `put` e `patch` é o que dá o nó nesta classe: o
   * Realtime Database manda em um `patch` APENAS os campos que mudaram. Um
   * colega parado só muda `atualizadoEm` — se tratássemos isso como um `put`,
   * o registro dele viraria `{atualizadoEm}` e ele perderia nome e posição.
   *
   * @param {'put'|'patch'} tipo
   * @param {string} caminho '/' (nó inteiro), '/{id}' ou '/{id}/{campo}'
   */
  _aplicarJogadores(tipo, caminho, dado) {
    const partes = String(caminho || '/').split('/').filter(Boolean);

    if (partes.length === 0) {
      if (tipo === 'put') {
        // snapshot completo do nó de jogadores
        this.colegas.clear();
        if (dado) for (const [id, info] of Object.entries(dado)) this._guardarColega(id, info);
      } else if (dado) {
        for (const [id, info] of Object.entries(dado)) this._mesclarColega(id, info);
      }
    } else if (partes.length === 1) {
      if (dado === null) this.colegas.delete(partes[0]);
      else if (tipo === 'put') this._guardarColega(partes[0], dado);
      else this._mesclarColega(partes[0], dado);
    } else {
      // atualização de um campo solto de um jogador
      this._mesclarColega(partes[0], { [partes[1]]: dado });
    }

    this._avisar('colegas', this.listarColegas());
  }

  /** Junta campos novos aos que já conhecemos deste colega. */
  _mesclarColega(id, campos) {
    if (id === this.id) return;
    const atual = this.colegas.get(id);
    if (!atual) {
      // patch de alguém que nunca vimos por inteiro: busca o cadastro completo
      this._buscarJogador(id);
      return;
    }
    this._guardarColega(id, { ...atual, ...campos });
  }

  /** Lê o nó completo de um jogador (usado quando só recebemos um patch dele). */
  _buscarJogador(id) {
    if (this._buscando?.has(id)) return;
    (this._buscando = this._buscando || new Set()).add(id);
    fetch(montarCaminho(`jogadores/${id}`), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (info) {
          this._guardarColega(id, info);
          this._avisar('colegas', this.listarColegas());
        }
      })
      .catch(() => {})
      .finally(() => this._buscando.delete(id));
  }

  _guardarColega(id, info) {
    if (!info || id === this.id) return;   // o próprio avatar não é desenhado
    const anterior = this.colegas.get(id);
    const carimbo = Number(info.atualizadoEm) || 0;

    this.colegas.set(id, {
      nome: String(info.nome || 'Colega').slice(0, 24),
      turma: String(info.turma || '').slice(0, 12),
      x: Number(info.x) || 0,
      z: Number(info.z) || 0,
      angulo: Number(info.angulo) || 0,
      vida: Number(info.vida ?? 100),
      pontos: Number(info.pontos) || 0,
      emFuga: !!info.emFuga,
      atualizadoEm: carimbo,
      // "visto" usa o relógio LOCAL: os computadores da escola não estão
      // sincronizados entre si, então comparar carimbos do servidor com
      // Date.now() daqui produziria colegas "sumindo" sem motivo.
      visto: (!anterior || anterior.atualizadoEm !== carimbo)
        ? performance.now()
        : anterior.visto
    });
  }

  _aplicarMensagens(caminho, dado) {
    const partes = String(caminho || '/').split('/').filter(Boolean);
    const novas = [];

    if (partes.length === 0) {
      if (dado) for (const [chave, msg] of Object.entries(dado)) novas.push([chave, msg]);
    } else if (partes.length === 1 && dado) {
      novas.push([partes[0], dado]);
    }

    for (const [chave, msg] of novas) {
      if (!msg || this._chavesVistas.has(chave)) continue;
      this._chavesVistas.add(chave);
      const mensagem = {
        chave,
        de: String(msg.de || 'Alguém').slice(0, 24),
        id: String(msg.id || ''),
        texto: String(msg.texto || '').slice(0, MULTIJOGADOR.tamanhoMaxMensagem),
        em: Number(msg.em) || Date.now(),
        propria: msg.id === this.id
      };
      this.mensagens.push(mensagem);
      this._avisar('mensagem', mensagem);
    }

    this.mensagens.sort((a, b) => a.em - b.em);
    if (this.mensagens.length > MULTIJOGADOR.mensagensVisiveis * 3) {
      this.mensagens = this.mensagens.slice(-MULTIJOGADOR.mensagensVisiveis * 3);
    }
  }

  /** Plano B quando o EventSource não funciona (proxy da escola, por exemplo). */
  _ligarPoll() {
    if (this._timerPoll || this._encerrado) return;
    const buscar = async () => {
      try {
        const r = await fetch(montarCaminho('jogadores'), { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        this._aplicarJogadores('put', '/', await r.json());
        this._definirConectado(true);

        const query = `orderBy=%22%24key%22&limitToLast=${MULTIJOGADOR.mensagensVisiveis}`;
        const rc = await fetch(montarCaminho('mensagens', query), { cache: 'no-store' });
        if (rc.ok) this._aplicarMensagens('/', await rc.json());
      } catch {
        this._definirConectado(false);
      }
    };
    this._timerPoll = setInterval(buscar, MULTIJOGADOR.intervaloPollMs);
    buscar();
  }

  /**
   * Remove avatares claramente abandonados — só depois de vários minutos
   * parados, para nunca apagar quem só ficou lendo um painel.
   */
  _limparFantasmas() {
    const limite = MULTIJOGADOR.tempoInatividadeMs * 6;
    const agora = Date.now();
    for (const [id, c] of this.colegas) {
      if (!c.atualizadoEm || agora - c.atualizadoEm < limite) continue;
      fetch(caminhoDeExclusao(id), { method: 'DELETE' }).catch(() => {});
      this.colegas.delete(id);
    }
  }

  /** Único ponto de escrita do módulo. */
  async _enviar(metodo, sub, corpo) {
    const r = await fetch(montarCaminho(sub), {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    this._definirConectado(true);
    return r.json().catch(() => null);
  }
}

/* =========================================================================
 * Autoteste das regras de caminho
 * Se alguém afrouxar `montarCaminho` ou `caminhoDeExclusao`, o módulo falha
 * ao carregar — bem melhor do que descobrir isso escrevendo no nó errado.
 * ======================================================================= */
(function autoteste() {
  const prefixoEsperado = `${BASE}/${MULTIJOGADOR.raiz}/salas/${MULTIJOGADOR.sala}`;
  const deveFalhar = ['../resultados', 'jogadores/../../resultados', '/jogadores', 'a b'];

  if (!montarCaminho('jogadores').startsWith(prefixoEsperado)) {
    throw new Error('[Multijogador] montarCaminho saiu da área do jogo!');
  }
  for (const ruim of deveFalhar) {
    let passou = false;
    try { montarCaminho(ruim); passou = true; } catch { /* esperado */ }
    if (passou) throw new Error(`[Multijogador] caminho perigoso aceito: ${ruim}`);
  }
  let passouExclusao = false;
  try { caminhoDeExclusao('../mensagens'); passouExclusao = true; } catch { /* esperado */ }
  if (passouExclusao) throw new Error('[Multijogador] exclusão fora de jogadores/ aceita!');
})();
