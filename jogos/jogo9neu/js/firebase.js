/* ============================================================
   Firebase Realtime Database via REST (sem SDK)
   Base: https://edutec-arnaldo-default-rtdb.firebaseio.com
   Nó:   /ranking
   ============================================================ */
const FIREBASE_URL = "https://edutec-arnaldo-default-rtdb.firebaseio.com";
const RANKING_PATH = "/ranking.json";

/**
 * Salva a pontuação de uma partida (usa push() via POST para não sobrescrever).
 * @returns {Promise<boolean>} true se salvou com sucesso.
 */
async function saveScore(nome, pontuacao, data) {
  try {
    const res = await fetch(FIREBASE_URL + RANKING_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, pontuacao, data })
    });
    return res.ok;
  } catch (err) {
    console.error("Erro ao salvar no Firebase:", err);
    return false;
  }
}

/**
 * Busca todos os registros do ranking, já ordenados por pontuação decrescente.
 * @returns {Promise<Array<{key,nome,pontuacao,data}>>}
 */
async function loadRanking() {
  const res = await fetch(FIREBASE_URL + RANKING_PATH);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data) return [];

  return Object.entries(data)
    .map(([key, v]) => ({
      key,
      nome: v.nome || "—",
      pontuacao: Number(v.pontuacao) || 0,
      data: v.data || ""
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao);
}
