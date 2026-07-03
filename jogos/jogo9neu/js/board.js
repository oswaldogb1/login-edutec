/* ============================================================
   Tabuleiro Tático — quadra de handebol em SVG (vista de cima)
   Desenha a quadra e detecta cliques por zona (data-zone).
   API pública: window.Board
   ============================================================ */
const Board = (() => {
  let clickCb = null;
  let locked = false;

  // Quadra 40x20 m -> 800x400 px (20 px/m), margem de 20 px.
  function svgMarkup() {
    return `
    <svg viewBox="0 0 840 440" role="img" aria-label="Quadra de handebol vista de cima">
      <!-- fundo / resto da quadra (clicável) -->
      <rect class="zone" data-zone="court" x="20" y="20" width="800" height="400" rx="6" fill="#1e824c"/>
      <rect x="420" y="20" width="400" height="400" fill="#1a7345" pointer-events="none"/>

      <!-- gols (clicáveis) -->
      <rect class="zone" data-zone="goal" x="6"   y="190" width="14" height="60" fill="#0d3b22" stroke="#fff" stroke-width="2"/>
      <rect class="zone" data-zone="goal" x="820" y="190" width="14" height="60" fill="#0d3b22" stroke="#fff" stroke-width="2"/>

      <!-- áreas do goleiro / 6 m (clicáveis) -->
      <path class="zone" data-zone="goalArea" d="M20,70 A120,120 0 0 1 140,190 L140,250 A120,120 0 0 1 20,370 Z"   fill="#e67e22" fill-opacity="0.85"/>
      <path class="zone" data-zone="goalArea" d="M820,70 A120,120 0 0 0 700,190 L700,250 A120,120 0 0 0 820,370 Z" fill="#e67e22" fill-opacity="0.85"/>

      <!-- linhas de 9 m visíveis (tracejadas, decorativas) -->
      <path d="M20,10  A180,180 0 0 1 200,190 L200,250 A180,180 0 0 1 20,430"  fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="9 9" pointer-events="none"/>
      <path d="M820,10 A180,180 0 0 0 640,190 L640,250 A180,180 0 0 0 820,430" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="9 9" pointer-events="none"/>
      <!-- faixas de 9 m clicáveis (invisíveis, largas) -->
      <path class="zone" data-zone="nineMeter" d="M20,10  A180,180 0 0 1 200,190 L200,250 A180,180 0 0 1 20,430"  fill="none" stroke="#000" stroke-opacity="0" stroke-width="22"/>
      <path class="zone" data-zone="nineMeter" d="M820,10 A180,180 0 0 0 640,190 L640,250 A180,180 0 0 0 820,430" fill="none" stroke="#000" stroke-opacity="0" stroke-width="22"/>

      <!-- linha central visível + clicável -->
      <line x1="420" y1="20" x2="420" y2="420" stroke="#fff" stroke-width="2" pointer-events="none"/>
      <line class="zone" data-zone="centerLine" x1="420" y1="20" x2="420" y2="420" stroke="#000" stroke-opacity="0" stroke-width="24"/>

      <!-- marcas de 7 m visíveis + alvos clicáveis -->
      <line x1="150" y1="220" x2="170" y2="220" stroke="#fff" stroke-width="3" pointer-events="none"/>
      <line x1="670" y1="220" x2="690" y2="220" stroke="#fff" stroke-width="3" pointer-events="none"/>
      <circle class="zone" data-zone="sevenMeter" cx="160" cy="220" r="16" fill="#000" fill-opacity="0"/>
      <circle class="zone" data-zone="sevenMeter" cx="680" cy="220" r="16" fill="#000" fill-opacity="0"/>

      <!-- contorno da quadra (decorativo) -->
      <rect x="20" y="20" width="800" height="400" rx="6" fill="none" stroke="#fff" stroke-width="3" pointer-events="none"/>
    </svg>`;
  }

  function render(container) {
    container.innerHTML = svgMarkup();
    const svg = container.querySelector("svg");
    svg.addEventListener("click", (e) => {
      if (locked) return;
      const el = e.target.closest("[data-zone]");
      if (!el || typeof clickCb !== "function") return;
      clickCb(el.getAttribute("data-zone"));
    });
    reset();
  }

  function onClick(cb) { clickCb = cb; }

  function reset() {
    locked = false;
    document.querySelectorAll("#court-wrap .zone").forEach((z) => {
      z.classList.remove("flash-ok", "flash-err", "locked");
    });
  }

  // Realça a(s) zona(s) corretas em verde e a zona clicada errada em vermelho.
  function reveal(correctZone, clickedZone) {
    locked = true;
    document.querySelectorAll("#court-wrap .zone").forEach((z) => {
      const zone = z.getAttribute("data-zone");
      z.classList.add("locked");
      if (zone === correctZone) z.classList.add("flash-ok");
      else if (zone === clickedZone) z.classList.add("flash-err");
    });
  }

  return { render, onClick, reset, reveal };
})();
