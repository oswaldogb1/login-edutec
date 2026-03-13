let DB = {};

// URL base para login do Google
function loginUrl(email) {
  return `https://accounts.google.com/signin/v2/identifier?hl=pt-BR&email=${encodeURIComponent(email)}`;
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

// Carregar os dados
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

// Processar o TXT
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

// Configurar select
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

// Mostrar estudantes
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

// Copiar
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

// Função para iniciar sessão no Google
function iniciarSessaoGoogle(email) {
  // Abre a página de login com o email pré-preenchido
  const url = loginUrl(email);
  
  // Tenta abrir em uma nova aba
  const novaJanela = window.open(url, '_blank');
  
  // Se o navegador bloquear pop-up, avisa o usuário
  if (!novaJanela || novaJanela.closed || typeof novaJanela.closed == 'undefined') {
    alert('O navegador bloqueou a abertura da página. Por favor, permita pop-ups para este site ou clique no link manualmente:\n\n' + url);
    
    // Opção alternativa: criar um link clicável
    const linkManual = document.createElement('a');
    linkManual.href = url;
    linkManual.target = '_blank';
    linkManual.rel = 'noopener';
    linkManual.textContent = 'Clique aqui para fazer login';
    linkManual.style.display = 'block';
    linkManual.style.marginTop = '10px';
    linkManual.style.color = '#1a73e8';
    
    // Mostra o link para o usuário
    alert('Você pode acessar: ' + url);
  }
}

// Renderizar lista
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

    // Botão de Copiar
    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar E-mail";
    btnCopiar.className = "btn-secondary";
    btnCopiar.addEventListener("click", async () => {
      await copiarParaAreaDeTransferencia(st.email);
      btnCopiar.textContent = "Copiado!";
      setTimeout(() => btnCopiar.textContent = "Copiar E-mail", 1500);
    });

    // Botão: Iniciar sessão
    const btnEntrar = document.createElement("button"); // Mudamos de <a> para <button>
    btnEntrar.textContent = "Iniciar sessão";
    btnEntrar.className = "btn-primary";
    btnEntrar.addEventListener("click", () => iniciarSessaoGoogle(st.email));

    actions.appendChild(btnCopiar);
    actions.appendChild(btnEntrar);

    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

serieSelect.addEventListener("change", mostrarEstudantes);
searchInput.addEventListener("input", renderizarLista);
carregarBancoDeDados();
