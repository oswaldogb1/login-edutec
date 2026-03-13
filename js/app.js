let DB = {};

// Função para construir a URL do Google
function loginUrl(email) {
  const base = "https://accounts.google.com/signin/v2/identifier";
  const params = new URLSearchParams({
    hl: "pt-BR",
    flowEntry: "ServiceLogin",
    flowName: "GlifWebSignIn",
    Email: email,
    identifier: email,
    login_hint: email
  });
  return base + "?" + params.toString();
}

// Elementos da Interface
const serieSelect = document.getElementById("serie");
const countPill = document.getElementById("countPill");
const goBtn = document.getElementById("goBtn");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const backBtn = document.getElementById("backBtn");
const openAllBtn = document.getElementById("openAllBtn");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const warnBox = document.getElementById("warnBox");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

// 1. Carregar os dados do arquivo TXT
async function carregarBancoDeDados() {
  try {
    const response = await fetch('data/banco_dados.txt');
    if (!response.ok) throw new Error("Erro na rede");
    const texto = await response.text();
    processarTexto(texto);
    configurarSelectTurmas();
  } catch (erro) {
    console.error("Falha ao carregar:", erro);
    alert("Erro ao carregar banco_dados.txt. Certifique-se de que o aplicativo está rodando em um servidor web (online) e não apenas abrindo o arquivo HTML localmente.");
  }
}

// 2. Processar o TXT para o formato do sistema
function processarTexto(texto) {
  const linhas = texto.split('\n');
  
  for (let linha of linhas) {
    linha = linha.trim();
    // Ignora linhas vazias ou o cabeçalho
    if (!linha || linha.toLowerCase().startsWith('turma')) continue;
    
    // O separador configurado é o ponto e vírgula
    const colunas = linha.split(';');
    if (colunas.length >= 3) {
      const turma = colunas[0].trim();
      const nome = colunas[1].trim();
      const email = colunas[2].trim();
      
      if (!DB[turma]) {
        DB[turma] = [];
      }
      DB[turma].push({ name: nome, email: email });
    }
  }
}

// 3. Preencher a caixa de seleção de turmas
function configurarSelectTurmas() {
  serieSelect.innerHTML = "";
  const turmas = Object.keys(DB).sort((a, b) => a.localeCompare(b, "pt-BR"));
  
  for (const t of turmas) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    serieSelect.appendChild(opt);
  }
  atualizarContagem();
}

function obterEstudantesAtuais() {
  const turmaSelecionada = serieSelect.value;
  return (DB[turmaSelecionada] || []).slice();
}

function atualizarContagem() {
  const qtd = obterEstudantesAtuais().length;
  countPill.textContent = qtd + (qtd === 1 ? " estudante" : " estudantes");
}

function mostrarEstudantes() {
  if (!serieSelect.value) return;
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

    const btnEntrar = document.createElement("a");
    btnEntrar.href = loginUrl(st.email);
    btnEntrar.target = "_blank";
    btnEntrar.rel = "noopener";
    btnEntrar.textContent = "Entrar";
    btnEntrar.className = "btn-primary";

    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar E-mail";
    btnCopiar.className = "btn-secondary";
    btnCopiar.addEventListener("click", async () => {
      await copiarParaAreaDeTransferencia(st.email);
      btnCopiar.textContent = "Copiado!";
      setTimeout(() => btnCopiar.textContent = "Copiar E-mail", 1500);
    });

    actions.appendChild(btnCopiar);
    actions.appendChild(btnEntrar);

    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  }

  openAllBtn.dataset.filtered = JSON.stringify(filtrados.map(st => st.email));
}

// Eventos
goBtn.addEventListener("click", mostrarEstudantes);
backBtn.addEventListener("click", esconderEstudantes);

serieSelect.addEventListener("change", () => {
  atualizarContagem();
  if (!studentsView.classList.contains("hidden")) renderizarLista();
});

searchInput.addEventListener("input", renderizarLista);

openAllBtn.addEventListener("click", () => {
  const emails = JSON.parse(openAllBtn.dataset.filtered || "[]");
  if (!emails.length) return;
  
  const MAX_ABAS = 15;
  const limitados = emails.slice(0, MAX_ABAS);
  for (const em of limitados) {
    window.open(loginUrl(em), "_blank", "noopener");
  }
  if (emails.length > MAX_ABAS) {
    alert("Foram abertas " + MAX_ABAS + " abas. Para evitar bloqueio do seu navegador, limitei a abertura. Use a busca para abrir o restante.");
  }
});

// Inicializa o sistema puxando os dados do arquivo txt
carregarBancoDeDados();