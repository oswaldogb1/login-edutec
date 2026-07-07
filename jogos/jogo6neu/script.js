/* ===================================================================
   GINÁSTICA QUIZ PRO — Lógica do jogo (sem cronômetro)
   Engajamento por: Chama Olímpica (streak visual + Modo Ouro),
   Aposta de Confiança (apostar x2 ou jogar seguro) e Ajudas (50:50/Dica/Pular).
   =================================================================== */
"use strict";

/* ---------------- Configuração dos modos ---------------- */
const MODOS = {
  treino: {
    nome: "Treino", tema: "treino", qtd: 20,
    chamaMax: 0,            // sem chama (relaxado)
    aposta: "nenhuma",      // sem aposta
    ajudas: { cincoCinco: Infinity, dica: Infinity, pular: Infinity },
    explicacaoSempre: true,
    desafios: false
  },
  campeonato: {
    nome: "Campeonato", tema: "campeonato", qtd: 30,
    chamaMax: 5,            // chama de 5 níveis; multiplicador cresce
    multiplicadores: [1, 2, 3, 4, 5],   // por nível de chama (0..5)
    aposta: "opcional",
    ajudas: { cincoCinco: 2, dica: 3, pular: 1 },
    explicacaoSempre: false,
    desafios: true
  },
  mestre: {
    nome: "Desafio do Mestre", tema: "mestre", qtd: 15,
    soDificil: true,        // prioriza perguntas difíceis
    chamaMax: 5,
    multiplicadores: [1, 2, 4, 6, 8, 10],
    aposta: "obrigatoria",  // toda resposta é uma aposta de alto risco
    ajudas: { cincoCinco: 0, dica: 0, pular: 0 },
    explicacaoSempre: false,
    desafios: true
  }
};

const NIVEIS = [
  { min: 96, nome: "Lenda Olímpica", medalha: "🏵️", classe: "Lendário" },
  { min: 81, nome: "Mestre",         medalha: "💠", classe: "Platina" },
  { min: 61, nome: "Especialista",   medalha: "🥇", classe: "Ouro" },
  { min: 31, nome: "Conhecedor",     medalha: "🥈", classe: "Prata" },
  { min: 0,  nome: "Iniciante",      medalha: "🥉", classe: "Bronze" }
];

const MEDALHAS = [
  { id: "primeiro_acerto", icone: "🎯", nome: "Primeiro Acerto", desc: "Acerte a 1ª pergunta" },
  { id: "chama_maxima",    icone: "🔥", nome: "Chama Máxima", desc: "Atinja o Modo Ouro (chama cheia)" },
  { id: "apostador",       icone: "🎲", nome: "Apostador de Ouro", desc: "Vença 5 apostas de alto risco" },
  { id: "maratonista",     icone: "🏃", nome: "Maratonista", desc: "Complete os 3 modos de jogo" },
  { id: "perfeito",        icone: "💯", nome: "Perfeição", desc: "Acerte todas as perguntas de uma partida" }
];

const PONTOS_BASE = 100;
const DESAFIOS = ["ouro", "valetudo", "surpresa"]; // a cada 5 perguntas

/* ---------------- Estado ---------------- */
let estado = null;
let opcoes = {};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function trocarTela(id) {
  $$(".tela").forEach((t) => { t.hidden = true; t.classList.remove("tela--ativa"); });
  const alvo = document.getElementById(id);
  alvo.hidden = false; alvo.classList.add("tela--ativa");
  window.scrollTo(0, 0);
}

/* ---------------- Persistência ---------------- */
const STORE = {
  ranking() { try { return JSON.parse(localStorage.getItem("gqp_ranking") || "[]"); } catch { return []; } },
  salvarRanking(r) { localStorage.setItem("gqp_ranking", JSON.stringify(r.slice(0, 50))); },
  medalhas() { try { return JSON.parse(localStorage.getItem("gqp_medalhas") || "[]"); } catch { return []; } },
  salvarMedalhas(m) { localStorage.setItem("gqp_medalhas", JSON.stringify([...new Set(m)])); },
  modos() { try { return JSON.parse(localStorage.getItem("gqp_modos") || "[]"); } catch { return []; } },
  salvarModos(m) { localStorage.setItem("gqp_modos", JSON.stringify([...new Set(m)])); }
};

/* ---------------- Áudio (Web Audio API) ---------------- */
const Som = (() => {
  let ctx = null, musicaTimer = null, ligado = true;
  function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function tom(freq, dur = 0.12, tipo = "sine", vol = 0.18) {
    if (!ligado) return;
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = tipo; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch {}
  }
  return {
    set(v) { ligado = v; },
    acerto(nivel = 1) { tom(480 + nivel * 90, 0.12, "triangle"); },
    chama() { [660, 880, 1175].forEach((f, i) => setTimeout(() => tom(f, 0.13, "sine", 0.2), i * 70)); },
    ouro() { [784, 988, 1318, 1568].forEach((f, i) => setTimeout(() => tom(f, 0.18, "triangle", 0.2), i * 90)); },
    erro() { tom(180, 0.25, "sawtooth", 0.15); },
    clique() { tom(700, 0.05, "square", 0.06); },
    gameover() { [330, 262, 196].forEach((f, i) => setTimeout(() => tom(f, 0.35, "sine", 0.16), i * 180)); },
    vitoria() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tom(f, 0.2, "triangle", 0.18), i * 120)); },
    iniciarMusica() {
      if (!ligado || musicaTimer) return;
      const notas = [392, 440, 523, 440, 392, 349, 392, 0]; let i = 0;
      musicaTimer = setInterval(() => { const n = notas[i % notas.length]; if (n) tom(n, 0.18, "sine", 0.045); i++; }, 380);
    },
    pararMusica() { if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; } }
  };
})();

/* ===================================================================
   INÍCIO DE PARTIDA
   =================================================================== */
function iniciarPartida(modoId) {
  const cfg = MODOS[modoId];
  let banco = embaralhar(PERGUNTAS.slice());
  if (cfg.soDificil) banco.sort((a, b) => b.dificuldade - a.dificuldade); // mestre: mais difíceis primeiro
  const perguntas = banco.slice(0, cfg.qtd).map(prepararPergunta);

  estado = {
    modoId, cfg, perguntas,
    idx: 0, pontos: 0,
    chama: 0, chamaMaxAtingida: 0, ouroAtivo: false, jaTeveOuro: false,
    acertos: 0, erros: 0, pulos: 0, apostasVencidas: 0,
    vidas: opcoes.vidas ? 3 : Infinity,
    ajudasRest: { ...cfg.ajudas },
    porCategoria: {},
    medalhasNovas: [],
    fase: "selecionar", escolha: null,
    desafioAtual: null,
    inicio: Date.now()
  };

  document.body.dataset.tema = cfg.tema;
  Som.set(opcoes.som);
  if (opcoes.som) Som.iniciarMusica();
  $("#chama-wrap").style.display = cfg.chamaMax ? "" : "none";
  $("#hud-vidas").style.display = opcoes.vidas ? "" : "none";
  $("#ajudas").style.display = (cfg.ajudas.cincoCinco || cfg.ajudas.dica || cfg.ajudas.pular) ? "" : "none";
  trocarTela("tela-jogo");
  renderPergunta();
}

function prepararPergunta(p) {
  const indices = embaralhar(p.opcoes.map((_, i) => i));
  return { ...p, opcoes: indices.map((i) => p.opcoes[i]), correta: indices.indexOf(p.correta) };
}

/* ===================================================================
   RENDER
   =================================================================== */
function renderPergunta() {
  const e = estado, cfg = e.cfg, p = e.perguntas[e.idx];
  e.fase = "selecionar"; e.escolha = null;
  e.dicaUsada = false; e.cincoUsada = false;

  // Desafio especial a cada 5 perguntas
  e.desafioAtual = null;
  const banner = $("#painel-banner"); banner.hidden = true; banner.className = "painel-banner";
  if (cfg.desafios && (e.idx + 1) % 5 === 0) {
    e.desafioAtual = DESAFIOS[Math.floor((e.idx + 1) / 5 - 1) % DESAFIOS.length];
    mostrarBannerDesafio(e.desafioAtual);
  }

  atualizarHUD();

  // Imagem (com fallback para emoji)
  const img = $("#pergunta-img"), emoji = $("#pergunta-emoji");
  const url = (window.IMAGENS && p.img && IMAGENS[p.img]) || "";
  emoji.textContent = p.imagem || "❓";
  img.onerror = () => { img.removeAttribute("src"); img.style.display = "none"; emoji.hidden = false; };
  img.onload = () => { img.style.display = "block"; emoji.hidden = true; };
  if (url) { emoji.hidden = true; img.style.display = "block"; img.alt = p.categoria + ": " + (p.opcoes[p.correta] || ""); img.src = url; }
  else { img.removeAttribute("src"); img.style.display = "none"; emoji.hidden = false; }

  $("#badge-categoria").textContent = p.categoria;
  $("#badge-dificuldade").textContent = "★".repeat(p.dificuldade) + "☆".repeat(3 - p.dificuldade);
  $("#pergunta-texto").textContent = p.descricao;

  // Dica/feedback reset
  $("#dica-texto").hidden = true; $("#dica-texto").textContent = "💡 " + (p.dica || "");
  const fb = $("#feedback-area"); fb.hidden = true; fb.innerHTML = "";
  $("#aposta-bar").hidden = true;

  // Opções
  const grid = $("#opcoes-grid"); grid.innerHTML = "";
  p.opcoes.forEach((texto, i) => {
    const btn = document.createElement("button");
    btn.className = "opcao-btn"; btn.dataset.idx = i;
    btn.innerHTML = `<span class="opcao-letra">${"ABCD"[i]}</span><span>${texto}</span>`;
    btn.setAttribute("aria-label", `Opção ${"ABCD"[i]}: ${texto}`);
    btn.addEventListener("click", () => selecionar(i));
    grid.appendChild(btn);
  });

  atualizarAjudas();
}

function mostrarBannerDesafio(tipo) {
  const banner = $("#painel-banner");
  const txt = {
    ouro: "🌟 RODADA DE OURO — pontos em DOBRO nesta pergunta!",
    valetudo: "🛡️ VALE TUDO — errar NÃO apaga sua Chama Olímpica!",
    surpresa: "🎁 SURPRESA — acerte e ganhe um bônus extra de pontos!"
  };
  banner.textContent = txt[tipo]; banner.classList.add(tipo); banner.hidden = false;
}

function atualizarHUD() {
  const e = estado;
  $("#hud-pontos").textContent = `⭐ ${e.pontos}`;
  $("#hud-progresso").textContent = `${e.idx + 1}/${e.perguntas.length}`;
  if (opcoes.vidas) $("#hud-vidas").textContent = e.vidas === Infinity ? "" : "❤️".repeat(Math.max(0, e.vidas)) + "🖤".repeat(Math.max(0, 3 - e.vidas));
  atualizarChama();
}

function atualizarChama() {
  const e = estado, cfg = e.cfg;
  if (!cfg.chamaMax) return;
  const wrap = $("#chama-wrap");
  const frac = Math.min(1, e.chama / cfg.chamaMax);
  $("#chama-fill").style.width = (frac * 100) + "%";
  $("#chama-mult").textContent = "x" + multiplicador();
  wrap.classList.toggle("ativa", e.chama > 0);
  wrap.classList.toggle("ouro", e.ouroAtivo);
}

function multiplicador() {
  const e = estado, m = e.cfg.multiplicadores;
  if (!m) return 1;
  return m[Math.min(e.chama, m.length - 1)];
}

function atualizarAjudas() {
  const e = estado, r = e.ajudasRest;
  const set = (id, qtdId, val) => {
    const btn = $(id);
    const inf = val === Infinity;
    $(qtdId).textContent = inf ? "" : `(${Math.max(0, val)})`;
    btn.disabled = e.fase !== "selecionar" || (!inf && val <= 0);
  };
  set("#btn-5050", "#qtd-5050", r.cincoCinco);
  set("#btn-dica", "#qtd-dica", r.dica);
  set("#btn-pular", "#qtd-pular", r.pular);
}

/* ===================================================================
   SELEÇÃO + APOSTA + REVELAÇÃO
   =================================================================== */
function selecionar(i) {
  const e = estado;
  if (e.fase !== "selecionar") return;
  Som.clique();
  e.escolha = i;
  $$("#opcoes-grid .opcao-btn").forEach((b) => b.classList.toggle("selecionada", +b.dataset.idx === i));

  if (e.cfg.aposta === "opcional") {
    $("#aposta-bar").hidden = false;            // jogador decide a confiança
    atualizarAjudas();
  } else if (e.cfg.aposta === "obrigatoria") {
    revelar(true);                              // mestre: sempre aposta alta
  } else {
    revelar(false);                             // treino: confirma direto
  }
}

function revelar(apostaAlta) {
  const e = estado, cfg = e.cfg, p = e.perguntas[e.idx];
  if (e.fase !== "selecionar") return;
  e.fase = "revelado";
  $("#aposta-bar").hidden = true;

  const acertou = e.escolha === p.correta;
  $$("#opcoes-grid .opcao-btn").forEach((b) => {
    const i = +b.dataset.idx; b.disabled = true;
    if (i === p.correta) b.classList.add("correta");
    else if (i === e.escolha) b.classList.add("errada");
  });
  registrarCategoria(p.categoria, acertou);

  if (acertou) processarAcerto(p, apostaAlta);
  else processarErro(p, apostaAlta);

  atualizarHUD(); atualizarAjudas();
  mostrarFeedback(p, acertou);
}

function processarAcerto(p, apostaAlta) {
  const e = estado, cfg = e.cfg;
  e.acertos++;

  // Chama sobe
  if (cfg.chamaMax) {
    e.chama = Math.min(cfg.chamaMax, e.chama + 1);
    e.chamaMaxAtingida = Math.max(e.chamaMaxAtingida, e.chama);
    if (e.chama >= cfg.chamaMax && !e.ouroAtivo) ativarModoOuro();
  }

  let ganho = PONTOS_BASE * multiplicador();
  if (apostaAlta) ganho *= 2;
  if (e.desafioAtual === "ouro") ganho *= 2;
  if (e.desafioAtual === "surpresa") ganho += 250;
  if (e.ouroAtivo) ganho = Math.round(ganho * 1.5);
  e.pontos += ganho;

  if (apostaAlta) { e.apostasVencidas++; if (e.apostasVencidas >= 5) ganharMedalha("apostador"); }
  if (e.idx === 0) ganharMedalha("primeiro_acerto");

  if (e.chama >= 3 && cfg.chamaMax) Som.chama(); else Som.acerto(e.chama);
  flutuarTexto(`+${ganho}` + (apostaAlta ? " 🔥APOSTA" : "") + (e.chama > 1 ? ` (x${multiplicador()})` : ""), "var(--certo)");
}

function processarErro(p, apostaAlta) {
  const e = estado;
  const protegido = e.desafioAtual === "valetudo";
  if (!protegido) { e.chama = 0; e.ouroAtivo = false; }
  e.erros++;

  // Aposta alta perdida custa pontos; vidas caem ao errar
  if (apostaAlta) e.pontos = Math.max(0, e.pontos - 150);
  if (opcoes.vidas) e.vidas--;

  Som.erro();
  flutuarTexto(protegido ? "🛡️ chama salva!" : (apostaAlta ? "💥 -150" : "✗"), "var(--errado)");
}

function ativarModoOuro() {
  const e = estado;
  e.ouroAtivo = true;
  if (!e.jaTeveOuro) { e.jaTeveOuro = true; e.pontos += 300; flutuarTexto("🌟 MODO OURO! +300", "var(--acento2)"); }
  ganharMedalha("chama_maxima");
  Som.ouro();
}

function registrarCategoria(cat, acertou) {
  const pc = estado.porCategoria;
  if (!pc[cat]) pc[cat] = { certo: 0, total: 0 };
  pc[cat].total++; if (acertou) pc[cat].certo++;
}

/* ===================================================================
   AJUDAS (lifelines)
   =================================================================== */
function usarAjuda(tipo) {
  const e = estado;
  if (e.fase !== "selecionar") return;
  const rest = e.ajudasRest[tipo];
  if (rest !== Infinity && rest <= 0) return;

  if (tipo === "dica") {
    if (e.dicaUsada) return;
    e.dicaUsada = true;
    $("#dica-texto").hidden = false;
  } else if (tipo === "cincoCinco") {
    if (e.cincoUsada) return;
    e.cincoUsada = true;
    const p = e.perguntas[e.idx];
    const erradas = embaralhar(p.opcoes.map((_, i) => i).filter((i) => i !== p.correta)).slice(0, 2);
    erradas.forEach((i) => $(`#opcoes-grid .opcao-btn[data-idx="${i}"]`).classList.add("eliminada"));
  } else if (tipo === "pular") {
    e.pulos++; Som.clique();
    if (e.idx >= e.perguntas.length - 1) return finalizar(false);
    e.idx++; return renderPergunta();
  }

  if (rest !== Infinity) e.ajudasRest[tipo]--;
  atualizarAjudas();
}

/* ===================================================================
   FEEDBACK + AVANÇO
   =================================================================== */
function mostrarFeedback(p, acertou) {
  const e = estado;
  const fb = $("#feedback-area");
  fb.className = "feedback-area " + (acertou ? "ok" : "nao"); fb.hidden = false;

  const titulo = acertou ? "✅ Correto!" : "❌ Resposta incorreta";
  let corpo = "";
  if (e.cfg.explicacaoSempre || !acertou)
    corpo = `<span>Resposta certa: <b>${p.opcoes[p.correta]}</b></span><br>${p.explicacao}`;

  const ultima = e.idx >= e.perguntas.length - 1;
  const semVidas = opcoes.vidas && e.vidas <= 0;
  const rotulo = (ultima || semVidas) ? "🏁 Ver resultado" : "Próxima ➡️";

  fb.innerHTML = `<span class="feedback-titulo">${titulo}</span>${corpo}
    <div><button class="btn-primario btn-proxima" id="btn-proxima">${rotulo}</button></div>`;
  const prox = $("#btn-proxima"); prox.focus(); prox.addEventListener("click", avancar);
}

function avancar() {
  const e = estado;
  const semVidas = opcoes.vidas && e.vidas <= 0;
  if (semVidas || e.idx >= e.perguntas.length - 1) return finalizar(semVidas);
  e.idx++; renderPergunta();
}

/* ===================================================================
   FINAL + RELATÓRIO
   =================================================================== */
function finalizar(porVidas) {
  Som.pararMusica();
  const e = estado;
  const total = e.acertos + e.erros;
  const pct = total ? Math.round((e.acertos / total) * 100) : 0;
  const nivel = NIVEIS.find((n) => pct >= n.min);
  const tempoSeg = Math.round((Date.now() - e.inicio) / 1000);

  if (pct === 100 && e.acertos === e.perguntas.length) ganharMedalha("perfeito");
  const ms = STORE.modos(); ms.push(e.modoId); STORE.salvarModos(ms);
  if (new Set(STORE.modos()).size >= 3) ganharMedalha("maratonista");

  if (porVidas) Som.gameover(); else Som.vitoria();

  const nome = (opcoes.nome || "Anônimo").slice(0, 16);
  const rk = STORE.ranking();
  rk.push({ nome, pontos: e.pontos, modo: e.modoId, pct, data: Date.now() });
  rk.sort((a, b) => b.pontos - a.pontos);
  STORE.salvarRanking(rk);

  renderResultado({ pct, nivel, tempoSeg, porVidas });
}

function renderResultado({ pct, nivel, tempoSeg, porVidas }) {
  const e = estado, pc = e.porCategoria;

  let pior = null;
  Object.entries(pc).forEach(([cat, d]) => { const t = d.certo / d.total; if (!pior || t < pior.taxa) pior = { cat, taxa: t, ...d }; });
  const sugestao = pior && pior.taxa < 1
    ? `📖 Sugestão de estudo: revise <b>${nomeCategoria(pior.cat)}</b> — acertou ${pior.certo}/${pior.total} (${Math.round(pior.taxa * 100)}%).`
    : "🌟 Excelente! Você domina todas as áreas. Tente um modo mais difícil!";

  const linhasCat = Object.entries(pc).map(([cat, d]) => {
    const p = Math.round((d.certo / d.total) * 100);
    return `<li><span>${nomeCategoria(cat)}</span><span class="mini-barra"><div style="width:${p}%"></div></span><span>${d.certo}/${d.total}</span></li>`;
  }).join("");

  const chips = e.medalhasNovas.length
    ? `<div class="medalhas-ganhas">${e.medalhasNovas.map((id) => { const m = MEDALHAS.find((x) => x.id === id); return `<span class="chip-medalha">${m.icone} ${m.nome}</span>`; }).join("")}</div>` : "";

  const tela = $("#tela-resultado");
  tela.innerHTML = `
    <div class="resultado-emblema">
      <div class="resultado-medalha-grande">${nivel.medalha}</div>
      <div class="resultado-nivel">${nivel.classe}</div>
      <p class="subtitulo">${nivel.nome} • ${porVidas ? "Sem vidas restantes" : "Partida concluída"}</p>
    </div>
    <div class="resultado-stats">
      <div class="stat-caixa"><b>${e.pontos}</b><span>pontos</span></div>
      <div class="stat-caixa"><b>${e.acertos}/${e.acertos + e.erros}</b><span>acertos (${pct}%)</span></div>
      <div class="stat-caixa"><b>🔥 ${e.chamaMaxAtingida}</b><span>maior chama</span></div>
      <div class="stat-caixa"><b>${formataTempo(tempoSeg)}</b><span>tempo total</span></div>
    </div>
    ${chips}
    <div class="relatorio">
      <h3>📊 Relatório de Aprendizado</h3>
      <ul>${linhasCat}</ul>
      <p class="sugestao">${sugestao}</p>
    </div>
    <div class="resultado-acoes">
      <button class="btn-primario" id="btn-jogar-novamente">↺ Jogar de novo</button>
      <button class="btn-secundario" id="btn-result-ranking">🏆 Ranking</button>
      <button class="btn-secundario" id="btn-result-menu">🏠 Menu</button>
    </div>`;
  $("#btn-jogar-novamente").addEventListener("click", () => iniciarPartida(e.modoId));
  $("#btn-result-ranking").addEventListener("click", renderRanking);
  $("#btn-result-menu").addEventListener("click", irMenu);
  trocarTela("tela-resultado");
}

function nomeCategoria(c) {
  return { Aparelho: "Aparelhos", Movimento: "Movimentos", Categoria: "Categorias (masc./fem.)", Regra: "Regras e Pontuação", "História": "História e Curiosidades" }[c] || c;
}
function formataTempo(s) { const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s`; }

/* ---------------- Medalhas ---------------- */
function ganharMedalha(id) {
  const e = estado;
  const jaTem = STORE.medalhas();
  if (jaTem.includes(id) || e.medalhasNovas.includes(id)) return;
  e.medalhasNovas.push(id);
  const m = MEDALHAS.find((x) => x.id === id);
  flutuarTexto(`${m.icone} ${m.nome}!`, "var(--acento2)");
  jaTem.push(id); STORE.salvarMedalhas(jaTem);
}
function flutuarTexto(txt, cor) {
  const el = document.createElement("div");
  el.className = "flutua"; el.textContent = txt; el.style.color = cor;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}

/* ===================================================================
   RANKING / MEDALHAS / PROFESSOR
   =================================================================== */
function renderRanking() {
  const rk = STORE.ranking();
  const nm = { treino: "Treino", campeonato: "Campeonato", mestre: "Mestre" };
  const linhas = rk.length
    ? rk.slice(0, 20).map((r, i) => `
        <div class="rank-linha">
          <span class="rank-pos">${["🥇","🥈","🥉"][i] || (i + 1)}</span>
          <span><span class="rank-nome">${escapeHtml(r.nome)}</span><br><span class="rank-modo">${nm[r.modo] || r.modo} • ${r.pct}%</span></span>
          <span class="rank-pts">${r.pontos}</span>
        </div>`).join("")
    : `<p class="vazio">Nenhuma pontuação ainda. Jogue uma partida! 🤸</p>`;
  const tela = $("#tela-ranking");
  tela.innerHTML = `
    <h2 class="tela-titulo">🏆 Ranking da Turma</h2>
    <div class="lista-cartao">${linhas}</div>
    <div class="resultado-acoes">
      <button class="btn-secundario" id="btn-limpar-ranking">🗑️ Limpar</button>
      <button class="btn-primario" id="btn-ranking-voltar">🏠 Menu</button>
    </div>`;
  $("#btn-ranking-voltar").addEventListener("click", irMenu);
  $("#btn-limpar-ranking").addEventListener("click", () => { if (confirm("Apagar todo o ranking da turma?")) { STORE.salvarRanking([]); renderRanking(); } });
  trocarTela("tela-ranking");
}

function renderMedalhas() {
  const tem = STORE.medalhas();
  const cards = MEDALHAS.map((m) => `
    <div class="medalha-card ${tem.includes(m.id) ? "conquistada" : ""}">
      <span class="ic">${m.icone}</span><span class="nm">${m.nome}</span><span class="ds">${m.desc}</span>
    </div>`).join("");
  const tela = $("#tela-medalhas");
  tela.innerHTML = `
    <h2 class="tela-titulo">🎖️ Medalhas (${tem.length}/${MEDALHAS.length})</h2>
    <div class="grade-medalhas">${cards}</div>
    <div class="resultado-acoes"><button class="btn-primario" id="btn-medalhas-voltar">🏠 Menu</button></div>`;
  $("#btn-medalhas-voltar").addEventListener("click", irMenu);
  trocarTela("tela-medalhas");
}

function renderProfessor() {
  const rk = STORE.ranking();
  const n = rk.length;
  const mediaPct = n ? Math.round(rk.reduce((s, r) => s + r.pct, 0) / n) : 0;
  const mediaPts = n ? Math.round(rk.reduce((s, r) => s + r.pontos, 0) / n) : 0;
  const cont = {};
  rk.forEach((r) => { const cl = NIVEIS.find((x) => r.pct >= x.min).classe; cont[cl] = (cont[cl] || 0) + 1; });
  const distrib = Object.entries(cont).map(([k, v]) => `<li><span>${k}</span><span>${v} aluno(s)</span></li>`).join("") || `<li class="vazio">Sem dados.</li>`;
  const sug = mediaPct >= 80 ? "A turma domina o conteúdo. Avance para regras avançadas e história."
    : mediaPct >= 50 ? "Bom desempenho. Reforce os aparelhos exclusivos de cada categoria e movimentos específicos."
    : "Retome o básico: identificação de aparelhos e categorias masculino/feminino.";
  const tela = $("#tela-professor");
  tela.innerHTML = `
    <h2 class="tela-titulo">👩‍🏫 Modo Professor</h2>
    <div class="resultado-stats">
      <div class="stat-caixa"><b>${n}</b><span>partidas</span></div>
      <div class="stat-caixa"><b>${mediaPct}%</b><span>média de acertos</span></div>
      <div class="stat-caixa"><b>${mediaPts}</b><span>pontuação média</span></div>
      <div class="stat-caixa"><b>${rk[0] ? escapeHtml(rk[0].nome) : "—"}</b><span>líder</span></div>
    </div>
    <div class="relatorio"><h3>Distribuição por nível</h3><ul>${distrib}</ul>
      <p class="sugestao">💡 Próxima aula: ${sug}</p></div>
    <div class="relatorio"><h3>Roteiro sugerido (40 min)</h3>
      <ul>
        <li><span>0–5 min</span><span>Introdução e regras</span></li>
        <li><span>5–15 min</span><span>Modo Treino (aprender)</span></li>
        <li><span>15–20 min</span><span>Discussão em grupo</span></li>
        <li><span>20–35 min</span><span>Modo Campeonato</span></li>
        <li><span>35–38 min</span><span>Desafio do Mestre</span></li>
        <li><span>38–40 min</span><span>Ranking e encerramento</span></li>
      </ul></div>
    <div class="resultado-acoes"><button class="btn-primario" id="btn-prof-voltar">🏠 Menu</button></div>`;
  $("#btn-prof-voltar").addEventListener("click", irMenu);
  trocarTela("tela-professor");
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ===================================================================
   NAVEGAÇÃO / EVENTOS
   =================================================================== */
function irMenu() { Som.pararMusica(); document.body.dataset.tema = ""; trocarTela("tela-menu"); }

function lerOpcoesMenu() {
  opcoes = {
    nome: $("#input-nome").value.trim(),
    vidas: $("#opt-vidas").checked,
    som: $("#opt-som").checked,
    daltonico: $("#opt-daltonico").checked
  };
  document.body.classList.toggle("daltonico", opcoes.daltonico);
}

function bind() {
  $$(".cartao-modo").forEach((c) => c.addEventListener("click", () => { lerOpcoesMenu(); iniciarPartida(c.dataset.modo); }));
  $("#btn-ranking-menu").addEventListener("click", renderRanking);
  $("#btn-medalhas").addEventListener("click", renderMedalhas);
  $("#btn-professor").addEventListener("click", renderProfessor);
  $("#opt-daltonico").addEventListener("change", (ev) => document.body.classList.toggle("daltonico", ev.target.checked));

  $("#btn-seguro").addEventListener("click", () => revelar(false));
  $("#btn-alto").addEventListener("click", () => revelar(true));

  $$(".btn-ajuda").forEach((b) => b.addEventListener("click", () => usarAjuda(b.dataset.ajuda)));

  $("#btn-pausa").addEventListener("click", abrirPausa);
  $("#btn-reiniciar").addEventListener("click", () => { if (estado) iniciarPartida(estado.modoId); });
  $("#btn-sair").addEventListener("click", irMenu);
  $("#btn-continuar").addEventListener("click", fecharPausa);
  $("#btn-pausa-sair").addEventListener("click", () => { fecharPausa(); irMenu(); });

  document.addEventListener("keydown", (ev) => {
    if ($("#tela-jogo").hidden) return;
    if (["1", "2", "3", "4"].includes(ev.key)) {
      const btn = $(`#opcoes-grid .opcao-btn[data-idx="${+ev.key - 1}"]`);
      if (btn && !btn.disabled && !btn.classList.contains("eliminada")) btn.click();
    } else if (ev.key.toLowerCase() === "d") { if (!$("#btn-dica").disabled) usarAjuda("dica"); }
    else if (ev.key === "Enter") { const p = $("#btn-proxima"); if (p) p.click(); }
    else if (ev.key === "Escape") { const ov = $("#overlay-pausa"); ov.hidden ? abrirPausa() : fecharPausa(); }
  });
}

function abrirPausa() { Som.pararMusica(); $("#overlay-pausa").hidden = false; }
function fecharPausa() { $("#overlay-pausa").hidden = true; if (estado && opcoes.som) Som.iniciarMusica(); }

document.addEventListener("DOMContentLoaded", () => {
  if (!window.PERGUNTAS || window.PERGUNTAS.length < 60) console.warn("Banco incompleto:", window.PERGUNTAS && window.PERGUNTAS.length);
  bind();
});
