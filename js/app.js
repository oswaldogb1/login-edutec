let DB = {};

// URL genérica e limpa para a página de login do Google
function loginUrl() {
  return "https://accounts.google.com/signin";
}

// Elementos da Interface
const serieSelect = document.getElementById("serie");
const countPill = document.getElementById("countPill");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

// Carregar os dados do arquivo TXT
async function carregarBancoDeDados() {
  try {
    const response = await fetch('data/banco_dados.txt');
    if (!response.ok) throw new Error("Erro na rede");
    const texto = await response.text();
    processarTexto(texto);
    configurarSelectTurmas();
  } catch (erro) {
    console.error("Falha ao carregar:", erro);
    alert("Erro ao carregar banco_dados.txt. Verifique se o projeto está online.");
  }
}

// Processar o TXT para o formato do sistema
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
      
      if (!DB[turma]) {
        DB[turma] = [];
      }
      DB[turma].push({ name: nome, email: email });
    }
  }
}

// Preencher a caixa de seleção de turmas
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

// Mostra os estudantes automaticamente
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

// Função para copiar o texto para a área de transferência
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

// Renderizar a lista de alunos com os botões atualizados
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

    // Botão 1: Copiar E-mail
    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar E-mail";
    btnCopiar.className = "btn-secondary";
    btnCopiar.addEventListener("click", async () => {
      await copiarParaAreaDeTransferencia(st.email);
      btnCopiar.textContent = "Copiado!";
      setTimeout(() => btnCopiar.textContent = "Copiar E-mail", 1500);
    });

    // Botão 2: Abrir Login
    const btnEntrar = document.createElement("a");
    btnEntrar.href = loginUrl();
    btnEntrar.target = "_blank";
    btnEntrar.rel = "noopener";
    btnEntrar.textContent = "Abrir Login";
    btnEntrar.className = "btn-primary";

    actions.appendChild(btnCopiar);
    actions.appendChild(btnEntrar);

    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

// Escuta a mudança no select e a busca
serieSelect.addEventListener("change", mostrarEstudantes);
searchInput.addEventListener("input", renderizarLista);

// Inicializa o sistema
carregarBancoDeDados();
