let DB = {};

// Elementos da Interface
const serieSelect = document.getElementById("serie");
const countPill = document.getElementById("countPill");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

// Novos Elementos para Link Temporário
const btnCompartilharLink = document.getElementById("btnCompartilharLink");
const linkDisplayBox = document.getElementById("linkDisplayBox");
const FIREBASE_URL = "https://edutec-arnaldo-default-rtdb.firebaseio.com/link_temporario.json";

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

// Configurar a caixa de seleção de turmas
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

// Mostrar a lista de estudantes
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

// Função nativa para copiar texto
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

// Renderizar a lista na tela apenas com o botão Copiar
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

    // Criação do único botão (Copiar E-mail)
    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "Copiar E-mail";
    btnCopiar.className = "btn-primary"; // Botão principal e destacado
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


// --- Lógica do Link Temporário ---

// Carregar e verificar se há link válido no Firebase
async function carregarLinkCompartilhado() {
  try {
    const res = await fetch(FIREBASE_URL);
    const data = await res.json();
    
    if (data && data.url && data.timestamp) {
      const agora = new Date().getTime();
      const tempoDecorrido = agora - data.timestamp;
      const trintaMinutos = 30 * 60 * 1000;

      if (tempoDecorrido > trintaMinutos) {
        // Link expirou (mais de 30 minutos) - deletar do banco
        await fetch(FIREBASE_URL, { method: 'DELETE' });
        linkDisplayBox.innerHTML = "";
      } else {
        // Mostrar link
        linkDisplayBox.innerHTML = `<a href="${data.url}" target="_blank">${data.url}</a>`;
      }
    } else {
      linkDisplayBox.innerHTML = "";
    }
  } catch (e) {
    console.error("Erro ao carregar o link compartilhado.", e);
  }
}

// Compartilhar novo link (solicitando senha)
async function compartilharLink() {
  const senha = prompt("Digite a senha do professor para compartilhar um link:");
  if (senha !== "arnaldotec") {
    if (senha !== null) alert("Senha incorreta!");
    return;
  }

  const urlInput = prompt("Cole ou digite o link (URL) que deseja compartilhar com os estudantes:");
  if (!urlInput) return;

  const urlValida = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
  
  const linkData = {
    url: urlValida,
    timestamp: new Date().getTime()
  };

  try {
    // Usando método PUT para substituir sempre o registro antigo
    await fetch(FIREBASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData)
    });
    alert("Link compartilhado! Ele ficará disponível por 30 minutos.");
    carregarLinkCompartilhado();
  } catch (e) {
    alert("Ocorreu um erro ao salvar o link.");
    console.error(e);
  }
}

if (btnCompartilharLink) {
  btnCompartilharLink.addEventListener("click", compartilharLink);
}

// --- Inicialização ---

carregarBancoDeDados();
carregarLinkCompartilhado();

// Verificar a expiração do link periodicamente (a cada 1 minuto)
setInterval(carregarLinkCompartilhado, 60000);