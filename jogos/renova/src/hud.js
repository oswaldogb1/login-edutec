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
import { LIMITE_MUNDO, AREAS_SEGURAS, PERSEGUICAO } from './config.js';

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

    // elementos da fuga
    this.elAlerta = document.getElementById('alerta-fuga');
    this.elAlertaAnimal = document.getElementById('alerta-animal');
    this.elAlertaDistancia = document.getElementById('alerta-distancia');
    this.elAlertaSeta = document.getElementById('alerta-seta');
    this.elAlertaAbrigo = document.getElementById('alerta-abrigo');
    this.elPerigo = document.getElementById('vinheta-perigo');

    /** Estado atual da fuga, usado também no desenho do minimapa. */
    this.fuga = null;
  }

  /**
   * Liga/desliga o alerta de fuga.
   * @param {?{icone:string, nome:string, cor:string}} animal  null encerra a fuga
   * @param {?{x:number,z:number}} abrigoBloqueado  abrigo que nao vale nesta fuga
   */
  definirFuga(animal, abrigoBloqueado = null) {
    this.fuga = animal ? { animal, posicaoAnimal: null, abrigoBloqueado } : null;
    this.elAlerta.hidden = !animal;
    this.elPerigo.hidden = !animal;
    if (animal) {
      this.elAlertaAnimal.textContent = `${animal.icone} ${animal.nome}`;
      this.elAlertaAnimal.style.color = animal.cor;
    } else {
      this.elPerigo.style.opacity = 0;
    }
  }

  /**
   * Atualiza o painel de fuga a cada quadro.
   * @param {{x:number,z:number}} posJogador
   * @param {{x:number,z:number}} direcao      para onde o jogador olha
   * @param {?{x:number,z:number}} posAnimal
   * @param {number} distanciaAnimal
   * @param {{x:number,z:number,distancia:number}} abrigo  Área Segura mais próxima
   */
  atualizarFuga(posJogador, direcao, posAnimal, distanciaAnimal, abrigo) {
    if (!this.fuga) return;
    this.fuga.posicaoAnimal = posAnimal;

    this.elAlertaDistancia.textContent = `${Math.round(distanciaAnimal)} m atrás de você`;
    this.elAlertaAbrigo.textContent = `Área Segura a ${Math.round(abrigo.distancia)} m`;

    // seta apontando para o abrigo, relativa a para onde o jogador olha
    const anguloAbrigo = Math.atan2(abrigo.x - posJogador.x, abrigo.z - posJogador.z);
    const anguloOlhar = Math.atan2(direcao.x, direcao.z);
    let relativo = anguloAbrigo - anguloOlhar;
    while (relativo > Math.PI) relativo -= Math.PI * 2;
    while (relativo < -Math.PI) relativo += Math.PI * 2;
    this.elAlertaSeta.style.transform = `rotate(${(relativo * 180) / Math.PI}deg)`;

    // vinheta vermelha: quanto mais perto o animal, mais forte
    const perigo = Math.max(0, Math.min(1, 1 - (distanciaAnimal - 3) / 18));
    this.elPerigo.style.opacity = (perigo * 0.85).toFixed(2);
    this.elAlerta.classList.toggle('critico', distanciaAnimal < 8);
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

    // Áreas Seguras (abrigos da fuga)
    const bloqueado = this.fuga && this.fuga.abrigoBloqueado;
    AREAS_SEGURAS.forEach((a) => {
      // o abrigo ja usado nesta fuga aparece apagado
      const usado = bloqueado && bloqueado.x === a.x && bloqueado.z === a.z;
      const [ax, ay] = this._paraMapa(a.x, a.z);
      ctx.beginPath();
      ctx.arc(ax, ay, PERSEGUICAO.raioAreaSegura * this.escala, 0, Math.PI * 2);
      ctx.fillStyle = usado ? 'rgba(120,130,145,0.22)' : 'rgba(34,197,94,0.28)';
      ctx.fill();
      ctx.strokeStyle = usado ? '#6b7280' : '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = usado ? '#9ca3af' : '#bbf7d0';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', ax, ay);
      ctx.textBaseline = 'alphabetic';
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

    // animal perseguidor
    if (this.fuga && this.fuga.posicaoAnimal) {
      const [px, py] = this._paraMapa(this.fuga.posicaoAnimal.x, this.fuga.posicaoAnimal.z);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fee2e2';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

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
