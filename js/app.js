let DB = {};

// Elementos da Interface Principal
const serieSelect = document.getElementById("serie");
const countPill = document.getElementById("countPill");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

// Botões de ação dos estudantes
const btnAbrirLink = document.getElementById("btnAbrirLink");
const btnAbrirJogos = document.getElementById("btnAbrirJogos");

// Elementos para Link Temporário, Jogos e Modal
const btnCompartilharLink = document.getElementById("btnCompartilharLink");
const btnAdicionarJogo = document.getElementById("btnAdicionarJogo");
const passwordModal = document.getElementById("passwordModal");
const modalMsg = document.getElementById("modalMsg");
const senhaInput = document.getElementById("senhaInput");
const btnConfirmarSenha = document.getElementById("btnConfirmarSenha");
const btnCancelarSenha = document.getElementById("btnCancelarSenha");

const SENHA_ADMIN = "arnaldotec";
const FIREBASE_BASE = "https://edutec-arnaldo-default-rtdb.firebaseio.com";
const FIREBASE_URL = FIREBASE_BASE + "/link_temporario.json";
const JOGOS_URL = FIREBASE_BASE + "/jogos.json";

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
  const qtd = obterEstudantesAtuais().length;
  countPill.textContent = qtd + (qtd === 1 ? " estudante" : " estudantes");
  renderizarLista();
  searchInput.focus();
}

function esconderEstudantes() {
  studentsView.classList.add("hidden");
  studentsPlaceholder.classList.remove("hidden");
  countPill.textContent = "0 estudantes";
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
      btnCopiar.textContent = "Copiado com sucesso!";
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

// Eventos de mudança e digitação
serieSelect.addEventListener("change", mostrarEstudantes);
searchInput.addEventListener("input", renderizarLista);


// --- LÓGICA DO LINK TEMPORÁRIO ---

// Guarda a URL ativa compartilhada pelo professor (ou null se não houver).
let linkAtivo = null;

async function carregarLinkCompartilhado() {
  try {
    const res = await fetch(FIREBASE_URL);
    const data = await res.json();

    if (data && data.url && data.timestamp) {
      const agora = new Date().getTime();
      const tempoDecorrido = agora - data.timestamp;
      const trintaMinutos = 30 * 60 * 1000;

      if (tempoDecorrido > trintaMinutos) {
        await fetch(FIREBASE_URL, { method: 'DELETE' });
        linkAtivo = null;
      } else {
        linkAtivo = data.url;
      }
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

btnAbrirJogos.addEventListener("click", () => {
  window.location.href = "jogos.html";
});


// --- LÓGICA DO MODAL DE SENHA (ADMINISTRATIVO) ---

// Ação pendente, executada após a senha correta ser confirmada.
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


// --- AÇÕES ADMINISTRATIVAS ---

async function compartilharLink() {
  const urlInput = prompt("Cole ou digite o link (URL) que deseja compartilhar com os estudantes:");
  if (!urlInput) return;

  const urlValida = urlInput.startsWith("http") ? urlInput : "https://" + urlInput;
  const linkData = { url: urlValida, timestamp: new Date().getTime() };

  try {
    await fetch(FIREBASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkData)
    });
    alert("Link compartilhado! Ele ficará disponível por 30 minutos.");
    carregarLinkCompartilhado();
  } catch (e) {
    alert("Ocorreu um erro ao salvar o link.");
    console.error(e);
  }
}

async function adicionarJogo() {
  const nome = prompt("Digite o NOME do jogo:");
  if (!nome || !nome.trim()) return;

  const urlInput = prompt(
    "Cole o LINK do jogo:\n\n" +
    "• Jogo dentro do site (recomendado): jogos/nome-do-jogo/index.html\n" +
    "• Jogo externo (itch.io, etc.): cole o endereço completo começando com https://"
  );
  if (!urlInput || !urlInput.trim()) return;

  const valor = urlInput.trim();
  // Começa com http(s) -> link externo, usado como está.
  // Caso contrário -> caminho relativo de um jogo hospedado dentro do próprio site.
  const urlValida = /^https?:\/\//i.test(valor) ? valor : valor.replace(/^\/+/, "");
  const jogoData = { nome: nome.trim(), url: urlValida, timestamp: new Date().getTime() };

  try {
    // POST gera uma chave automática no Firebase, preservando os jogos já existentes.
    await fetch(JOGOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jogoData)
    });
    alert('Jogo "' + jogoData.nome + '" adicionado! Já está disponível na Pasta de Jogos.');
  } catch (e) {
    alert("Ocorreu um erro ao adicionar o jogo.");
    console.error(e);
  }
}

btnCompartilharLink.addEventListener("click", () =>
  abrirModalSenha("Digite a senha de administrador para compartilhar um link:", compartilharLink)
);

btnAdicionarJogo.addEventListener("click", () =>
  abrirModalSenha("Digite a senha de administrador para adicionar um jogo:", adicionarJogo)
);


// --- INICIALIZAÇÃO GERAL ---

carregarBancoDeDados();
carregarLinkCompartilhado();

// Verificar a expiração do link periodicamente (a cada 1 minuto)
setInterval(carregarLinkCompartilhado, 60000);
