/* ============================================================
   Orquestração do jogo — estado, fluxo de rodadas, telas.
   ============================================================ */
(() => {
  const TOTAL_ROUNDS = 10;   // 5 tabuleiro + 5 quiz
  const POINTS = 10;

  const gameState = {
    playerName: "",
    round: 0,          // 1..10
    mode: "board",     // "board" | "quiz"
    score: 0,
    answered: false,
    boardQueue: [],
    quizQueue: [],
    current: null
  };

  // ---------- utilidades ----------
  const $ = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr, n) => shuffle(arr).slice(0, n);

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
  }

  // ---------- ciclo de vida ----------
  function initGame(name) {
    gameState.playerName = name;
    gameState.round = 0;
    gameState.score = 0;
    // 5 situações e 5 perguntas sorteadas e embaralhadas -> replays variados
    gameState.boardQueue = pick(BOARD_SITUATIONS, 5);
    gameState.quizQueue = pick(QUIZ_QUESTIONS, 5);
    $("hud-name").textContent = name;
    updateHud();
    showScreen("screen-game");
    nextRound();
  }

  function nextRound() {
    if (gameState.round >= TOTAL_ROUNDS) return endGame();
    gameState.round++;
    gameState.answered = false;
    gameState.mode = gameState.round % 2 === 1 ? "board" : "quiz";
    $("feedback").hidden = true;
    $("feedback").className = "feedback";
    $("btn-next").disabled = true;
    updateHud();

    if (gameState.mode === "board") showTabuleiro();
    else showQuiz();
  }

  function updateHud() {
    $("hud-score").textContent = gameState.score;
    $("hud-round").textContent = `${Math.max(gameState.round, 1)}/${TOTAL_ROUNDS}`;
    $("hud-mode").textContent = gameState.mode === "board" ? "🗺️ Tabuleiro" : "❓ Quiz";
    $("progress-fill").style.width = `${((gameState.round - 1) / TOTAL_ROUNDS) * 100}%`;
  }

  // ---------- MODO TABULEIRO ----------
  function showTabuleiro() {
    const item = gameState.boardQueue[Math.floor((gameState.round - 1) / 2)];
    gameState.current = item;
    $("mode-board").hidden = false;
    $("mode-quiz").hidden = true;
    $("board-situation").textContent = item.text;
    Board.render($("court-wrap"));
    Board.onClick(onZoneClick);
  }

  function onZoneClick(zone) {
    if (gameState.answered) return;
    gameState.answered = true;
    const item = gameState.current;
    const correct = zone === item.answer;
    if (correct) gameState.score += POINTS;
    Board.reveal(item.answer, zone);
    updateHud();
    showFeedback(correct, item.explanation);
  }

  // ---------- MODO QUIZ ----------
  function showQuiz() {
    const item = gameState.quizQueue[Math.floor((gameState.round - 1) / 2)];
    gameState.current = item;
    $("mode-board").hidden = true;
    $("mode-quiz").hidden = false;
    $("quiz-question").textContent = item.q;

    const box = $("quiz-options");
    box.innerHTML = "";
    // embaralha alternativas mantendo referência da correta
    const order = shuffle(item.options.map((text, i) => ({ text, i })));
    order.forEach(({ text, i }) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt";
      btn.textContent = text;
      btn.addEventListener("click", () => onQuizAnswer(btn, i, item));
      box.appendChild(btn);
    });
  }

  function onQuizAnswer(btn, chosenIndex, item) {
    if (gameState.answered) return;
    gameState.answered = true;
    const correct = chosenIndex === item.answer;
    if (correct) gameState.score += POINTS;

    const buttons = $("quiz-options").querySelectorAll(".quiz-opt");
    buttons.forEach((b) => (b.disabled = true));
    buttons.forEach((b) => {
      if (b.textContent === item.options[item.answer]) b.classList.add("correct");
    });
    if (!correct) btn.classList.add("wrong");

    updateHud();
    showFeedback(correct, item.explanation);
  }

  // ---------- feedback compartilhado ----------
  function showFeedback(correct, explanation) {
    const fb = $("feedback");
    fb.hidden = false;
    fb.className = "feedback " + (correct ? "ok" : "err");
    $("feedback-icon").textContent = correct ? "✅" : "❌";
    $("feedback-text").textContent =
      (correct ? "Acertou! " : "Não foi dessa vez. ") + explanation;
    $("btn-next").disabled = false;
    $("btn-next").textContent =
      gameState.round >= TOTAL_ROUNDS ? "Ver resultado 🏁" : "Próximo →";
  }

  // ---------- fim de jogo ----------
  async function endGame() {
    const data = new Date().toISOString().slice(0, 10);
    showScreen("screen-result");
    $("result-summary").innerHTML =
      `${gameState.playerName}, você fez <strong>${gameState.score}</strong> de ${TOTAL_ROUNDS * POINTS} pontos!`;

    // grava a pontuação e recarrega o ranking
    $("ranking-status").textContent = "Enviando pontuação...";
    await saveScore(gameState.playerName, gameState.score, data);
    renderRanking(gameState.playerName, gameState.score);
  }

  async function renderRanking(highlightName, highlightScore) {
    const statusEl = $("ranking-status");
    const table = $("ranking-table");
    const body = $("ranking-body");
    statusEl.textContent = "Carregando ranking...";
    table.hidden = true;
    body.innerHTML = "";
    try {
      const rows = await loadRanking();
      if (!rows.length) {
        statusEl.textContent = "Ainda não há registros no ranking.";
        return;
      }
      let highlighted = false;
      rows.slice(0, 20).forEach((r, idx) => {
        const tr = document.createElement("tr");
        // destaca a linha da partida recém-jogada (primeira correspondência)
        if (!highlighted && r.nome === highlightName && r.pontuacao === highlightScore) {
          tr.classList.add("me");
          highlighted = true;
        }
        tr.innerHTML =
          `<td>${idx + 1}</td><td>${escapeHtml(r.nome)}</td>` +
          `<td>${r.pontuacao}</td><td>${r.data || "—"}</td>`;
        body.appendChild(tr);
      });
      statusEl.textContent = "";
      table.hidden = false;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Não foi possível carregar o ranking (verifique a conexão).";
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- eventos de UI ----------
  $("form-start").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("input-name").value.trim();
    if (name) initGame(name);
  });

  $("btn-next").addEventListener("click", nextRound);

  $("btn-restart").addEventListener("click", () => {
    if (gameState.playerName) initGame(gameState.playerName);
  });

  $("btn-play-again").addEventListener("click", () => {
    if (gameState.playerName) initGame(gameState.playerName);
    else showScreen("screen-welcome");
  });

  $("btn-back-home").addEventListener("click", () => showScreen("screen-welcome"));

  $("btn-see-ranking").addEventListener("click", () => {
    showScreen("screen-result");
    $("result-summary").textContent = "Confira as melhores pontuações:";
    renderRanking(null, null);
  });
})();
