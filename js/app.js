// App de login institucional — apenas leitura.
// Os professores compartilham links e jogos a partir de outro site;
// esta página apenas lê os dados do Firebase (link temporário e jogos).

let DB = {};

// Elementos da interface
const serieSelect = document.getElementById("serie");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

const btnAbrirLink = document.getElementById("btnAbrirLink");
const btnAbrirJogos = document.getElementById("btnAbrirJogos");

// Modal de jogos
const jogosModal = document.getElementById("jogosModal");
const btnFecharJogos = document.getElementById("btnFecharJogos");
const jogosGrid = document.getElementById("jogosGrid");
const jogosPlaceholder = document.getElementById("jogosPlaceholder");

const FIREBASE_BASE = "https://edutec-arnaldo-default-rtdb.firebaseio.com";
const FIREBASE_URL = FIREBASE_BASE + "/link_temporario.json";
const JOGOS_URL = FIREBASE_BASE + "/jogos.json";

// Senha para excluir jogos.
const SENHA_JOGOS = "54321Paz";


// --- BANCO DE DADOS E LISTAGEM ---

async function carregarBancoDeDados() {
  try {
    const response = await fetch('data/banco_dados.txt');
    if (!response.ok) throw new Error("Erro na rede");
    const texto = await response.text();
    processarTexto(texto);
    configurarSelectTurmas();
  } catch (erro) {
    console.error("Falha ao carregar:", erro);
    alert("Erro ao carregar banco_dados.txt.");
  }
}

function processarTexto(texto) {
  const linhas = texto.split('\n');
  for (let linha of linhas) {
    linha = linha.trim();
    if (!linha || linha.toLowerCase().startsWith('turma')) continue;
    const colunas = linha.split(';');
    if (colunas.length >= 3) {
      const turma = colunas[0].trim();
      const nome = colunas[1].trim();
      const email = colunas[2].trim();
      if (!DB[turma]) DB[turma] = [];
      DB[turma].push({ name: nome, email: email });
    }
  }
}

function configurarSelectTurmas() {
  serieSelect.innerHTML = '<option value="">-- Selecione a Turma --</option>';
  const turmas = Object.keys(DB).sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const t of turmas) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    serieSelect.appendChild(opt);
  }
}

function obterEstudantesAtuais() {
  const turmaSelecionada = serieSelect.value;
  return (DB[turmaSelecionada] || []).slice();
}

function mostrarEstudantes() {
  if (!serieSelect.value) {
    esconderEstudantes();
    return;
  }
  studentsPlaceholder.classList.add("hidden");
  studentsView.classList.remove("hidden");
  renderizarLista();
  searchInput.focus();
}

function esconderEstudantes() {
  studentsView.classList.add("hidden");
  studentsPlaceholder.classList.remove("hidden");
  searchInput.value = "";
  list.innerHTML = "";
}

async function copiarParaAreaDeTransferencia(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function renderizarLista() {
  const turma = serieSelect.value;
  const estudantes = obterEstudantesAtuais();
  const termoBusca = (searchInput.value || "").trim().toLowerCase();
  seriePill.textContent = "Turma: " + turma;

  const filtrados = !termoBusca ? estudantes : estudantes.filter(st =>
    (st.name || "").toLowerCase().includes(termoBusca) || (st.email || "").toLowerCase().includes(termoBusca)
  );
  shownPill.textContent = "Mostrando: " + filtrados.length + " de " + estudantes.length;

  list.innerHTML = "";
  for (const st of filtrados) {
    const row = document.createElement("div");
    row.className = "student";

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = st.name || "(sem nome)";

    const email = document.createElement("div");
    email.className = "email";
    email.textContent = st.email || "(sem e-mail)";

    meta.appendChild(name);
    meta.appendChild(email);

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar E-mail";
    btnCopiar.className = "btn-primary";
    btnCopiar.addEventListener("click", async () => {
      await copiarParaAreaDeTransferencia(st.email);
      btnCopiar.textContent = "Copiado!";
      btnCopiar.style.backgroundColor = "#2c3e35";
      setTimeout(() => {
        btnCopiar.textContent = "Copiar E-mail";
        btnCopiar.style.backgroundColor = "";
      }, 1500);
    });

    actions.appendChild(btnCopiar);
    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

serieSelect.addEventListener("change", mostrarEstudantes);
searchInput.addEventListener("input", renderizarLista);


// --- LINK TEMPORÁRIO DO PROFESSOR (somente leitura) ---

let linkAtivo = null;

async function carregarLinkCompartilhado() {
  try {
    const res = await fetch(FIREBASE_URL);
    const data = await res.json();

    if (data && data.url && data.timestamp) {
      const tempoDecorrido = new Date().getTime() - data.timestamp;
      const trintaMinutos = 30 * 60 * 1000;
      // Expiração é apenas visual aqui: como não há mais painel de administração,
      // não removemos o registro no Firebase — só ignoramos links vencidos.
      linkAtivo = tempoDecorrido > trintaMinutos ? null : data.url;
    } else {
      linkAtivo = null;
    }
  } catch (e) {
    console.error("Erro ao carregar o link compartilhado.", e);
  }
  atualizarBotaoLink();
}

function atualizarBotaoLink() {
  btnAbrirLink.classList.toggle("indisponivel", !linkAtivo);
}

btnAbrirLink.addEventListener("click", () => {
  if (linkAtivo) {
    window.open(linkAtivo, "_blank");
  } else {
    alert("Nenhum link foi compartilhado pelo professor no momento.");
  }
});


// --- JOGOS (somente leitura) ---

async function carregarJogos() {
  jogosGrid.innerHTML = "";
  jogosPlaceholder.classList.remove("hidden");
  jogosPlaceholder.innerHTML = "<p>Carregando jogos...</p>";
  try {
    const res = await fetch(JOGOS_URL);
    const data = await res.json();
    renderizarJogos(data || {});
  } catch (e) {
    console.error("Erro ao carregar os jogos.", e);
    jogosPlaceholder.innerHTML = "<p>Não foi possível carregar os jogos. Tente novamente.</p>";
  }
}

function renderizarJogos(jogos) {
  // Do mais recente para o mais antigo.
  const entradas = Object.entries(jogos).sort(
    (a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0)
  );

  jogosGrid.innerHTML = "";

  if (entradas.length === 0) {
    jogosPlaceholder.classList.remove("hidden");
    jogosPlaceholder.innerHTML = "<p>Nenhum jogo foi adicionado ainda. Volte mais tarde!</p>";
    return;
  }

  jogosPlaceholder.classList.add("hidden");

  for (const [id, jogo] of entradas) {
    const card = document.createElement("div");
    card.className = "jogo-card";

    const titulo = document.createElement("div");
    titulo.className = "jogo-nome";
    titulo.textContent = jogo.nome || "(sem nome)";

    const btnJogar = document.createElement("button");
    btnJogar.className = "btn-primary";
    btnJogar.textContent = "Jogar";
    btnJogar.addEventListener("click", () => window.open(jogo.url, "_blank"));

    const btnRemover = document.createElement("button");
    btnRemover.className = "btn-remover";
    btnRemover.textContent = "✕";
    btnRemover.title = "Excluir jogo";
    btnRemover.setAttribute("aria-label", "Excluir jogo");
    btnRemover.addEventListener("click", () => removerJogo(id, jogo.nome || ""));

    const acoes = document.createElement("div");
    acoes.className = "jogo-acoes";
    acoes.appendChild(btnJogar);
    acoes.appendChild(btnRemover);

    card.appendChild(titulo);
    card.appendChild(acoes);
    jogosGrid.appendChild(card);
  }
}

async function removerJogo(id, nome) {
  const senha = prompt('Digite a senha para excluir o jogo "' + nome + '":');
  if (senha === null) return; // cancelou
  if (senha !== SENHA_JOGOS) {
    alert("Senha incorreta! O jogo não foi excluído.");
    return;
  }
  try {
    await fetch(FIREBASE_BASE + "/jogos/" + id + ".json", { method: "DELETE" });
    carregarJogos();
  } catch (e) {
    alert("Ocorreu um erro ao excluir o jogo.");
    console.error(e);
  }
}

function abrirModalJogos() {
  jogosModal.classList.remove("hidden");
  carregarJogos();
}

function fecharModalJogos() {
  jogosModal.classList.add("hidden");
}

btnAbrirJogos.addEventListener("click", abrirModalJogos);
btnFecharJogos.addEventListener("click", fecharModalJogos);
jogosModal.addEventListener("click", (e) => {
  if (e.target === jogosModal) fecharModalJogos();
});


// --- INICIALIZAÇÃO ---

carregarBancoDeDados();
carregarLinkCompartilhado();

// Reverifica o link do professor periodicamente (a cada 1 minuto).
setInterval(carregarLinkCompartilhado, 60000);
