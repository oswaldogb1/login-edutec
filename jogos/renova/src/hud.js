/**
 * hud.js
 * -----------------------------------------------------------------------------
 * Interface do jogador durante a exploração:
 *   - nome, pontuação, barra de vida e contador de descobertas
 *   - zona em que o jogador está
 *   - cronômetro (quando há tempo limite)
 *   - minimapa 2D desenhado em canvas + bússola
 *   - alerta da fuga (animal, abrigo, pauladas) e respingos de sangue
 *   - bate-papo com os colegas que estão na mesma cidade
 * -----------------------------------------------------------------------------
 */
import { ZONAS } from './zones.js';
import { LIMITE_MUNDO, AREAS_SEGURAS, PERSEGUICAO, MULTIJOGADOR, VIDA } from './config.js';

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

    // vida
    this.elBarraVida = document.getElementById('hud-barra-vida');
    this.elVidaValor = document.getElementById('hud-vida-valor');
    this.elSangue = document.getElementById('sangue-tela');

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
    this.elAlertaGolpes = document.getElementById('alerta-golpes');
    this.elAlertaRevide = document.getElementById('alerta-revide');
    this.elPerigo = document.getElementById('vinheta-perigo');

    // multijogador
    this.elOnline = document.getElementById('hud-online');
    this.elOnlineNum = document.getElementById('hud-online-num');
    this.elChat = document.getElementById('chat');
    this.elChatLista = document.getElementById('chat-lista');
    this.elChatForm = document.getElementById('chat-form');
    this.elChatEntrada = document.getElementById('chat-entrada');
    this.elChatDica = document.getElementById('chat-dica');

    /** Estado atual da fuga, usado também no desenho do minimapa. */
    this.fuga = null;
    /** Últimos valores escritos no DOM, para não reescrevê-los a cada quadro. */
    this._vidaMostrada = null;
    this._colegaPerto = null;
    /** Posições dos colegas, desenhadas no minimapa. */
    this.colegasNoMapa = [];
  }

  /* =====================================================================
   * Vida e sangue
   * =================================================================== */

  /** Atualiza a barra de vida (verde → amarelo → vermelho). */
  atualizarVida(vida) {
    // a vida regenera a cada quadro; só mexemos no DOM quando o número muda
    const arredondada = Math.max(0, Math.round(vida));
    if (arredondada === this._vidaMostrada) return;
    this._vidaMostrada = arredondada;

    const proporcao = Math.max(0, Math.min(1, vida / VIDA.maxima));
    this.elBarraVida.style.width = `${proporcao * 100}%`;
    this.elVidaValor.textContent = arredondada;

    const cor = proporcao > 0.6 ? '#4ade80' : proporcao > 0.3 ? '#fbbf24' : '#f87171';
    this.elBarraVida.style.background = cor;
    this.elBarraVida.parentElement.classList.toggle('critica', proporcao <= 0.3);
    // com pouca vida a tela fica permanentemente avermelhada
    this.elSangue.classList.toggle('ferido', proporcao <= 0.35);
  }

  /**
   * Respinga sangue na tela. Cada gota é um elemento posicionado ao acaso,
   * que se apaga sozinho quando a animação do CSS termina.
   */
  respingarSangue(quantidade = 7) {
    for (let i = 0; i < quantidade; i++) {
      const gota = document.createElement('span');
      gota.className = 'gota';
      // metade sao manchas grandes, metade sao borrifos pequenos
      const grande = i % 2 === 0;
      const tamanho = grande ? 55 + Math.random() * 95 : 12 + Math.random() * 34;
      gota.style.width = `${tamanho}px`;
      gota.style.height = `${tamanho * (0.55 + Math.random() * 0.8)}px`;
      gota.style.left = `${Math.random() * 100}%`;
      gota.style.top = `${Math.random() * 100}%`;
      gota.style.setProperty('--giro', `${Math.random() * 360}deg`);
      gota.style.animationDelay = `${Math.random() * 0.12}s`;
      gota.addEventListener('animationend', () => gota.remove());
      this.elSangue.appendChild(gota);
    }
    this.elSangue.classList.remove('bateu');
    // reinicia a animação do flash vermelho
    void this.elSangue.offsetWidth;
    this.elSangue.classList.add('bateu');
  }

  /** Limpa os respingos (fim de partida, ou ao acordar depois de desmaiar). */
  limparSangue() {
    this.elSangue.innerHTML = '';
    this.elSangue.classList.remove('bateu', 'ferido');
  }

  /* =====================================================================
   * Fuga
   * =================================================================== */

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
      this.elAlertaGolpes.textContent = `0 / ${PERSEGUICAO.golpesParaEspantar}`;
      this.elAlertaRevide.classList.remove('atordoado');
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
   * @param {{golpes:number, atordoado:boolean, segundos:number}} revide
   */
  atualizarFuga(posJogador, direcao, posAnimal, distanciaAnimal, abrigo, revide) {
    if (!this.fuga) return;
    this.fuga.posicaoAnimal = posAnimal;
    this.fuga.atordoado = revide?.atordoado;

    this.elAlertaDistancia.textContent = `${Math.round(distanciaAnimal)} m atrás de você`;
    this.elAlertaAbrigo.textContent = `Área Segura a ${Math.round(abrigo.distancia)} m`;

    if (revide) {
      this.elAlertaGolpes.textContent = revide.atordoado
        ? `atordoado por ${revide.segundos.toFixed(1)} s — corra!`
        : `${revide.golpes} / ${PERSEGUICAO.golpesParaEspantar} pauladas`;
      this.elAlertaRevide.classList.toggle('atordoado', !!revide.atordoado);
      this.elAlertaRevide.classList.toggle('no-alcance', !!revide.noAlcance);
    }

    // seta apontando para o abrigo, relativa a para onde o jogador olha
    const anguloAbrigo = Math.atan2(abrigo.x - posJogador.x, abrigo.z - posJogador.z);
    const anguloOlhar = Math.atan2(direcao.x, direcao.z);
    let relativo = anguloAbrigo - anguloOlhar;
    while (relativo > Math.PI) relativo -= Math.PI * 2;
    while (relativo < -Math.PI) relativo += Math.PI * 2;
    this.elAlertaSeta.style.transform = `rotate(${(relativo * 180) / Math.PI}deg)`;

    // vinheta vermelha: quanto mais perto o animal, mais forte
    const perigo = revide?.atordoado
      ? 0
      : Math.max(0, Math.min(1, 1 - (distanciaAnimal - 3) / 18));
    this.elPerigo.style.opacity = (perigo * 0.85).toFixed(2);
    this.elAlerta.classList.toggle('critico', distanciaAnimal < 8 && !revide?.atordoado);
  }

  /* =====================================================================
   * Multijogador e bate-papo
   * =================================================================== */

  /** Mostra quantos colegas estão na cidade agora. */
  atualizarColegas(quantidade, conectado) {
    this.elOnline.hidden = !MULTIJOGADOR.ativo;
    this.elOnlineNum.textContent = quantidade;
    this.elOnline.classList.toggle('offline', !conectado);
    this.elOnline.title = conectado
      ? 'Colegas explorando a mesma cidade agora'
      : 'Sem conexão com a sala da turma — você está jogando sozinho';
  }

  /** Guarda as posições dos colegas para o próximo desenho do minimapa. */
  definirColegasNoMapa(lista) {
    this.colegasNoMapa = lista;
  }

  /** Escreve uma linha no bate-papo. */
  adicionarMensagem({ de, texto, propria }) {
    const linha = document.createElement('div');
    linha.className = `chat-linha${propria ? ' propria' : ''}`;
    const autor = document.createElement('strong');
    autor.textContent = `${de}: `;
    linha.appendChild(autor);
    linha.appendChild(document.createTextNode(texto));

    this.elChatLista.appendChild(linha);
    while (this.elChatLista.children.length > MULTIJOGADOR.mensagensVisiveis) {
      this.elChatLista.firstChild.remove();
    }
    this.elChatLista.scrollTop = this.elChatLista.scrollHeight;
    this.elChat.classList.add('ativo');
    clearTimeout(this._timerChat);
    this._timerChat = setTimeout(() => this.elChat.classList.remove('ativo'), 9000);
  }

  /** Aviso de sistema no bate-papo (entrou na sala, sem conexão…). */
  avisoNoChat(texto) {
    const linha = document.createElement('div');
    linha.className = 'chat-linha aviso';
    linha.textContent = texto;
    this.elChatLista.appendChild(linha);
    while (this.elChatLista.children.length > MULTIJOGADOR.mensagensVisiveis) {
      this.elChatLista.firstChild.remove();
    }
    this.elChatLista.scrollTop = this.elChatLista.scrollHeight;
  }

  /** Abre a caixa de digitação do bate-papo. */
  abrirChat() {
    this.elChatForm.hidden = false;
    this.elChatDica.hidden = true;
    this.elChat.classList.add('ativo', 'digitando');
    this.elChatEntrada.value = '';
    this.elChatEntrada.focus();
  }

  fecharChat() {
    this.elChatForm.hidden = true;
    this.elChatDica.hidden = false;
    this.elChat.classList.remove('digitando');
    this.elChatEntrada.blur();
    this.elChatEntrada.value = '';
  }

  get chatAberto() {
    return !this.elChatForm.hidden;
  }

  /** Atualiza a dica de conversa conforme há (ou não) alguém por perto. */
  definirColegaPerto(colega) {
    // chamada a cada quadro: sem esta guarda, o innerHTML seria refeito 60x/s
    const chave = colega ? colega.id : '';
    if (chave === this._colegaPerto) return;
    this._colegaPerto = chave;

    this.elChatDica.innerHTML = colega
      ? `<kbd>T</kbd> conversar com <strong>${colega.nome}</strong>`
      : '<kbd>T</kbd> conversar com a turma';
    this.elChatDica.classList.toggle('perto', !!colega);
  }

  /* =====================================================================
   * Placar e telas
   * =================================================================== */

  definirJogador(nome, turma) {
    this.elNome.textContent = nome;
    this.elTurma.textContent = turma;
  }

  /**
   * @param {number} pontos
   * @param {number} descobertos pontos de interação concluídos
   * @param {number} total total de pontos de interação
   * @param {number} respondidas perguntas já respondidas
   * @param {number} totalPerguntas perguntas da partida inteira
   */
  atualizarPontuacao(pontos, descobertos, total, respondidas = 0, totalPerguntas = 0) {
    this.elPontos.textContent = pontos;
    this.elContador.textContent = totalPerguntas
      ? `${descobertos}/${total} locais · ${respondidas}/${totalPerguntas} perguntas`
      : `${descobertos}/${total} descobertos`;
    // a barra segue as PERGUNTAS: é o que realmente mede o avanço da partida
    const avanco = totalPerguntas ? respondidas / totalPerguntas : descobertos / total;
    this.elBarra.style.width = `${avanco * 100}%`;
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

    // colegas na mesma cidade
    this.colegasNoMapa.forEach((c) => {
      const [px, py] = this._paraMapa(c.x, c.z);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    // animal perseguidor
    if (this.fuga && this.fuga.posicaoAnimal) {
      const [px, py] = this._paraMapa(this.fuga.posicaoAnimal.x, this.fuga.posicaoAnimal.z);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = this.fuga.atordoado ? '#a3a3a3' : '#ef4444';
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
