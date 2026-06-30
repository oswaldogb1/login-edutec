// Página "Pasta de Jogos" — lista os jogos compartilhados pelo professor.

const jogosGrid = document.getElementById("jogosGrid");
const jogosPlaceholder = document.getElementById("jogosPlaceholder");

// Modal de senha (reaproveitado para remover jogos).
const passwordModal = document.getElementById("passwordModal");
const modalMsg = document.getElementById("modalMsg");
const senhaInput = document.getElementById("senhaInput");
const btnConfirmarSenha = document.getElementById("btnConfirmarSenha");
const btnCancelarSenha = document.getElementById("btnCancelarSenha");

const SENHA_ADMIN = "arnaldotec";
const FIREBASE_BASE = "https://edutec-arnaldo-default-rtdb.firebaseio.com";
const JOGOS_URL = FIREBASE_BASE + "/jogos.json";

function urlJogo(id) {
  return FIREBASE_BASE + "/jogos/" + id + ".json";
}

async function carregarJogos() {
  try {
    const res = await fetch(JOGOS_URL);
    const data = await res.json();
    renderizarJogos(data || {});
  } catch (e) {
    console.error("Erro ao carregar os jogos.", e);
    jogosPlaceholder.classList.remove("hidden");
    jogosPlaceholder.innerHTML = "<p>Não foi possível carregar os jogos. Tente novamente.</p>";
    jogosGrid.innerHTML = "";
  }
}

function renderizarJogos(jogos) {
  // Ordena do mais recente para o mais antigo.
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
    btnRemover.title = "Remover jogo (administrador)";
    btnRemover.addEventListener("click", () =>
      abrirModalSenha('Digite a senha de administrador para remover "' + (jogo.nome || "") + '":', () =>
        removerJogo(id)
      )
    );

    const acoes = document.createElement("div");
    acoes.className = "jogo-acoes";
    acoes.appendChild(btnJogar);
    acoes.appendChild(btnRemover);

    card.appendChild(titulo);
    card.appendChild(acoes);
    jogosGrid.appendChild(card);
  }
}

async function removerJogo(id) {
  try {
    await fetch(urlJogo(id), { method: "DELETE" });
    carregarJogos();
  } catch (e) {
    alert("Ocorreu um erro ao remover o jogo.");
    console.error(e);
  }
}


// --- MODAL DE SENHA ---

let acaoPendente = null;

function abrirModalSenha(mensagem, acao) {
  modalMsg.textContent = mensagem;
  acaoPendente = acao;
  senhaInput.value = "";
  passwordModal.classList.remove("hidden");
  senhaInput.focus();
}

function fecharModalSenha() {
  passwordModal.classList.add("hidden");
  acaoPendente = null;
}

btnCancelarSenha.addEventListener("click", fecharModalSenha);

senhaInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    btnConfirmarSenha.click();
  }
});

btnConfirmarSenha.addEventListener("click", async () => {
  if (senhaInput.value !== SENHA_ADMIN) {
    alert("Senha incorreta!");
    senhaInput.value = "";
    senhaInput.focus();
    return;
  }
  const acao = acaoPendente;
  fecharModalSenha();
  if (acao) await acao();
});


// --- INICIALIZAÇÃO ---

carregarJogos();
