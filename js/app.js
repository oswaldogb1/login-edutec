// db
let DB = {};

// gerar url login google com email preenchido
function loginUrl(email) {
  const base = "https://accounts.google.com/signin/v2/identifier";
  const params = new URLSearchParams({
    continue: "https://mail.google.com",
    service: "mail",
    Email: email
  });
  return `${base}?${params.toString()}`;
}

// elementos
const serieSelect = document.getElementById("serie");
const countPill = document.getElementById("countPill");
const studentsView = document.getElementById("studentsView");
const studentsPlaceholder = document.getElementById("studentsPlaceholder");
const seriePill = document.getElementById("seriePill");
const shownPill = document.getElementById("shownPill");
const searchInput = document.getElementById("search");
const list = document.getElementById("list");

// carregar banco
async function carregarBancoDeDados() {
  try {
    const response = await fetch("data/banco_dados.txt");
    if (!response.ok) throw new Error("Erro na rede");

    const texto = await response.text();

    processarTexto(texto);
    configurarSelectTurmas();

  } catch (erro) {
    console.error("Falha ao carregar:", erro);
    alert("Erro ao carregar banco_dados.txt.");
  }
}

// processar txt
function processarTexto(texto) {
  const linhas = texto.split("\n");

  for (let linha of linhas) {

    linha = linha.trim();

    if (!linha) continue;
    if (linha.toLowerCase().startsWith("turma")) continue;

    const colunas = linha.split(";");

    if (colunas.length >= 3) {

      const turma = colunas[0].trim();
      const nome = colunas[1].trim();
      const email = colunas[2].trim();

      if (!DB[turma]) DB[turma] = [];

      DB[turma].push({
        name: nome,
        email: email
      });
    }
  }
}

// configurar select
function configurarSelectTurmas() {

  serieSelect.innerHTML =
    '<option value="">-- Selecione a Turma --</option>';

  const turmas = Object.keys(DB)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  for (const t of turmas) {

    const opt = document.createElement("option");

    opt.value = t;
    opt.textContent = t;

    serieSelect.appendChild(opt);
  }
}

// estudantes atuais
function obterEstudantesAtuais() {

  const turmaSelecionada = serieSelect.value;

  return (DB[turmaSelecionada] || []).slice();
}

// mostrar estudantes
function mostrarEstudantes() {

  if (!serieSelect.value) {
    esconderEstudantes();
    return;
  }

  studentsPlaceholder.classList.add("hidden");
  studentsView.classList.remove("hidden");

  const qtd = obterEstudantesAtuais().length;

  countPill.textContent =
    qtd + (qtd === 1 ? " estudante" : " estudantes");

  renderizarLista();

  searchInput.focus();
}

// esconder
function esconderEstudantes() {

  studentsView.classList.add("hidden");
  studentsPlaceholder.classList.remove("hidden");

  countPill.textContent = "0 estudantes";

  searchInput.value = "";

  list.innerHTML = "";
}

// copiar
async function copiarParaAreaDeTransferencia(texto) {

  try {

    await navigator.clipboard.writeText(texto);

  } catch {

    const ta = document.createElement("textarea");

    ta.value = texto;

    document.body.appendChild(ta);

    ta.select();

    document.execCommand("copy");

    document.body.removeChild(ta);
  }
}

// render lista
function renderizarLista() {

  const turma = serieSelect.value;

  const estudantes = obterEstudantesAtuais();

  const termoBusca =
    (searchInput.value || "")
      .trim()
      .toLowerCase();

  seriePill.textContent =
    "Turma: " + turma;

  const filtrados =
    !termoBusca
      ? estudantes
      : estudantes.filter(st =>
          (st.name || "")
            .toLowerCase()
            .includes(termoBusca) ||
          (st.email || "")
            .toLowerCase()
            .includes(termoBusca)
        );

  shownPill.textContent =
    "Mostrando: " +
    filtrados.length +
    " de " +
    estudantes.length;

  list.innerHTML = "";

  for (const st of filtrados) {

    const row = document.createElement("div");
    row.className = "student";

    const meta = document.createElement("div");
    meta.className = "meta";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent =
      st.name || "(sem nome)";

    const email = document.createElement("div");
    email.className = "email";
    email.textContent =
      st.email || "(sem e-mail)";

    meta.appendChild(name);
    meta.appendChild(email);

    const actions = document.createElement("div");
    actions.className = "actions";

    // copiar email
    const btnCopiar = document.createElement("button");

    btnCopiar.textContent =
      "Copiar E-mail";

    btnCopiar.className =
      "btn-secondary";

    btnCopiar.addEventListener(
      "click",
      async () => {

        await copiarParaAreaDeTransferencia(
          st.email
        );

        btnCopiar.textContent = "Copiado!";

        setTimeout(() => {
          btnCopiar.textContent =
            "Copiar E-mail";
        }, 1500);
      }
    );

    // iniciar sessão
    const btnEntrar =
      document.createElement("button");

    btnEntrar.textContent =
      "Iniciar sessão";

    btnEntrar.className =
      "btn-primary";

    btnEntrar.addEventListener(
      "click",
      () => {

        window.open(
          loginUrl(st.email),
          "_blank",
          "noopener"
        );
      }
    );

    actions.appendChild(btnCopiar);
    actions.appendChild(btnEntrar);

    row.appendChild(meta);
    row.appendChild(actions);

    list.appendChild(row);
  }
}

// eventos
serieSelect.addEventListener(
  "change",
  mostrarEstudantes
);

searchInput.addEventListener(
  "input",
  renderizarLista
);

// iniciar
carregarBancoDeDados();
