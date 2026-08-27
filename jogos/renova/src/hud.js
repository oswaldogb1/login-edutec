/**
 * hud.js
 * -----------------------------------------------------------------------------
 * Interface do jogador durante a exploração:
 *   - nome, pontuação e contador de descobertas
 *   - zona em que o jogador está
 *   - cronômetro (quando há tempo limite)
 *   - minimapa 2D desenhado em canvas + bússola
 * -----------------------------------------------------------------------------
 */
import { ZONAS } from './zones.js';
import { LIMITE_MUNDO } from './config.js';

const DIRECOES = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];

export class HUD {
  constructor() {
    this.elNome = document.getElementById('hud-nome');
    this.elTurma = document.getElementById('hud-turma');
    this.elPontos = document.getElementById('hud-pontos');
    this.elContador = document.getElementById('hud-contador');
    this.elBarra = document.getElementById('hud-barra-progresso');
    this.elZona = document.getElementById('hud-zona');
    this.elTempo = document.getElementById('hud-tempo');
    this.elBussola = document.getElementById('bussola-valor');
    this.elAgulha = document.getElementById('bussola-agulha');

    this.canvas = document.getElementById('minimapa');
    this.ctx = this.canvas.getContext('2d');
    this.tamanho = this.canvas.width;
    this.escala = this.tamanho / (LIMITE_MUNDO * 2 + 30);
  }

  definirJogador(nome, turma) {
    this.elNome.textContent = nome;
    this.elTurma.textContent = turma;
  }

  atualizarPontuacao(pontos, descobertos, total) {
    this.elPontos.textContent = pontos;
    this.elContador.textContent = `${descobertos}/${total} descobertos`;
    this.elBarra.style.width = `${(descobertos / total) * 100}%`;
  }

  atualizarTempo(segundosRestantes) {
    if (segundosRestantes === null) {
      this.elTempo.hidden = true;
      return;
    }
    this.elTempo.hidden = false;
    const m = Math.floor(segundosRestantes / 60);
    const s = Math.floor(segundosRestantes % 60);
    this.elTempo.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    this.elTempo.classList.toggle('urgente', segundosRestantes <= 60);
  }

  /** Converte coordenada do mundo para pixel do minimapa (norte para cima). */
  _paraMapa(x, z) {
    const c = this.tamanho / 2;
    return [c + x * this.escala, c + z * this.escala];
  }

  /**
   * Redesenha minimapa + bússola.
   * @param {{x:number,z:number}} posicao posição do jogador
   * @param {{x:number,z:number}} direcao vetor (horizontal) para onde ele olha
   * @param {Array} pontos lista de pontos do mundo (com .descoberto)
   */
  atualizarMapa(posicao, direcao, pontos) {
    const ctx = this.ctx;
    const T = this.tamanho;

    ctx.clearRect(0, 0, T, T);

    // fundo
    ctx.fillStyle = '#12261a';
    ctx.fillRect(0, 0, T, T);

    // ruas
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 3;
    [-72, 0, 72].forEach((r) => {
      const [, py] = this._paraMapa(0, r);
      const [px] = this._paraMapa(r, 0);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(T, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, T); ctx.stroke();
    });

    // zonas
    ZONAS.forEach((zona) => {
      const [zx, zy] = this._paraMapa(zona.centro.x, zona.centro.z);
      ctx.beginPath();
      ctx.arc(zx, zy, zona.raio * this.escala, 0, Math.PI * 2);
      ctx.fillStyle = `${zona.corCss}22`;
      ctx.fill();
      ctx.strokeStyle = zona.corCss;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = zona.corCss;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(zona.numero), zx, zy - zona.raio * this.escala - 4);
    });

    // pontos de interação
    pontos.forEach((p) => {
      const [px, py] = this._paraMapa(p.posicao.x, p.posicao.z);
      ctx.beginPath();
      ctx.arc(px, py, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = p.descoberto ? '#22c55e' : p.dados.corCss;
      ctx.fill();
      ctx.strokeStyle = p.descoberto ? '#052e16' : 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // jogador (triângulo apontando para onde ele olha)
    const [jx, jy] = this._paraMapa(posicao.x, posicao.z);
    const angulo = Math.atan2(direcao.x, -direcao.z);
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(angulo);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // moldura + norte
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, T - 2, T - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', T / 2, 14);

    // bússola: 0° = Norte (−Z), crescendo no sentido horário
    let graus = (Math.atan2(direcao.x, -direcao.z) * 180) / Math.PI;
    if (graus < 0) graus += 360;
    const idx = Math.round(graus / 45) % 8;
    this.elBussola.textContent = `${DIRECOES[idx]} ${Math.round(graus)}°`;
    this.elAgulha.style.transform = `rotate(${-graus}deg)`;

    // zona atual
    const zonaAtual = ZONAS.find(
      (z) => Math.hypot(posicao.x - z.centro.x, posicao.z - z.centro.z) < z.raio
    );
    if (zonaAtual) {
      this.elZona.textContent = `${zonaAtual.icone} ${zonaAtual.nome}`;
      this.elZona.style.color = zonaAtual.corCss;
      this.elZona.style.borderColor = zonaAtual.corCss;
    } else {
      this.elZona.textContent = '🏙️ Ruas da cidade';
      this.elZona.style.color = '#e2e8f0';
      this.elZona.style.borderColor = 'rgba(226,232,240,0.45)';
    }
  }
}
