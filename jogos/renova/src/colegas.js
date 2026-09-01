/**
 * colegas.js
 * -----------------------------------------------------------------------------
 * Desenha na cidade os outros alunos que estão jogando ao mesmo tempo.
 *
 * `multijogador.js` cuida da rede; aqui só existe o lado visual: um avatar por
 * colega, o balão com o nome e a turma, e o balão de fala do bate-papo.
 *
 * As posições chegam a cada ~260 ms, o que daria um andar aos trancos. Por
 * isso cada avatar guarda um ALVO e caminha suavemente até ele a cada quadro
 * (interpolação), e a velocidade dessa aproximação também alimenta a animação
 * de caminhada do modelo.
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { buildAvatarColega } from './models.js';
import { criarLabel } from './world.js';
import { MULTIJOGADOR } from './config.js';
import { corDoJogador } from './multijogador.js';

/** Quanto tempo (s) um balão de fala fica sobre a cabeça do colega. */
const DURACAO_BALAO = 6;

export class Colegas {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** id → { grupo, rotulo, balao, alvo, rapidez, ... } */
    this.avatares = new Map();
    /** Colega mais perto do jogador no último quadro (ou null). */
    this.maisProximo = null;
  }

  /* ---------------------------------------------------------------------
   * Sincronização com a rede
   * ------------------------------------------------------------------- */

  /**
   * Ajusta os avatares em cena à lista vinda do servidor.
   * @param {Array<{id:string,nome:string,turma:string,x:number,z:number,angulo:number,vida:number,emFuga:boolean}>} lista
   */
  sincronizar(lista) {
    const presentes = new Set();

    for (const colega of lista) {
      presentes.add(colega.id);
      let avatar = this.avatares.get(colega.id);

      if (!avatar) {
        avatar = this._criar(colega);
        this.avatares.set(colega.id, avatar);
      }

      // o nome pode chegar depois da primeira posição (patch antes do put):
      // quando mudar, o rótulo é refeito, senão o colega ficaria "Colega"
      if (avatar.nome !== colega.nome) this._trocarRotulo(avatar, colega);

      avatar.alvo.set(colega.x, 0, colega.z);
      avatar.anguloAlvo = colega.angulo;
      avatar.vida = colega.vida;
      avatar.emFuga = colega.emFuga;
    }

    // quem saiu da lista sai da cidade
    for (const [id, avatar] of this.avatares) {
      if (presentes.has(id)) continue;
      this._descartar(avatar);
      this.avatares.delete(id);
    }
  }

  /** Mostra um balão de fala sobre a cabeça de um colega. */
  falar(id, texto) {
    const avatar = this.avatares.get(id);
    if (!avatar) return;

    if (avatar.balao) {
      avatar.grupo.remove(avatar.balao);
      this._liberarSprite(avatar.balao);
    }
    const curto = texto.length > 44 ? `${texto.slice(0, 43)}…` : texto;
    const balao = criarLabel(`💬 ${curto}`, '#ffffff', Math.min(9, 2.6 + curto.length * 0.16),
      44, 'rgba(12,22,40,0.92)');
    balao.position.y = 2.85;
    avatar.grupo.add(balao);
    avatar.balao = balao;
    avatar.balaoRestante = DURACAO_BALAO;
  }

  /** Quantos colegas estão desenhados agora. */
  get quantidade() {
    return this.avatares.size;
  }

  /* ---------------------------------------------------------------------
   * Quadro a quadro
   * ------------------------------------------------------------------- */

  /**
   * @param {number} dt segundos desde o último quadro
   * @param {number} t tempo acumulado (para as animações)
   * @param {THREE.Vector3} posJogador
   */
  update(dt, t, posJogador) {
    let perto = null;
    let menorDist = Infinity;

    for (const [id, avatar] of this.avatares) {
      const g = avatar.grupo;

      // caminha suavemente até a última posição recebida
      const fator = Math.min(1, dt * 7);
      const antes = avatar._ultimoX;
      g.position.x += (avatar.alvo.x - g.position.x) * fator;
      g.position.z += (avatar.alvo.z - g.position.z) * fator;

      const andou = Math.hypot(g.position.x - antes.x, g.position.z - antes.z);
      antes.set(g.position.x, 0, g.position.z);
      avatar.rapidez = Math.min(1, avatar.rapidez * 0.85 + (andou / Math.max(dt, 0.001)) * 0.03);

      // gira para a direção em que o colega está olhando
      let giro = avatar.anguloAlvo - g.rotation.y;
      while (giro > Math.PI) giro -= Math.PI * 2;
      while (giro < -Math.PI) giro += Math.PI * 2;
      g.rotation.y += giro * Math.min(1, dt * 8);

      if (g.userData.animarColega) g.userData.animarColega(t, avatar.rapidez);

      // balão de fala expira sozinho
      if (avatar.balao) {
        avatar.balaoRestante -= dt;
        if (avatar.balaoRestante <= 0) {
          g.remove(avatar.balao);
          this._liberarSprite(avatar.balao);
          avatar.balao = null;
        }
      }

      // rótulo só aparece de perto, como o dos pontos de interação
      const dist = Math.hypot(posJogador.x - g.position.x, posJogador.z - g.position.z);
      avatar.rotulo.visible = dist < 45;
      if (avatar.balao) avatar.balao.visible = dist < 60;

      if (dist < menorDist) {
        menorDist = dist;
        perto = { id, nome: avatar.nome, distancia: dist, emFuga: avatar.emFuga };
      }
    }

    this.maisProximo = perto && perto.distancia <= MULTIJOGADOR.distanciaConversa ? perto : null;
  }

  /** Tira todos os avatares da cena (fim de partida). */
  limpar() {
    for (const avatar of this.avatares.values()) this._descartar(avatar);
    this.avatares.clear();
    this.maisProximo = null;
  }

  /* ---------------------------------------------------------------------
   * Internos
   * ------------------------------------------------------------------- */

  _criar(colega) {
    const grupo = buildAvatarColega(corDoJogador(colega.id));
    grupo.position.set(colega.x, 0, colega.z);
    grupo.rotation.y = colega.angulo || 0;

    this.scene.add(grupo);

    const avatar = {
      grupo,
      rotulo: null,
      balao: null,
      balaoRestante: 0,
      alvo: new THREE.Vector3(colega.x, 0, colega.z),
      anguloAlvo: colega.angulo || 0,
      rapidez: 0,
      vida: colega.vida,
      emFuga: colega.emFuga,
      nome: null,
      _ultimoX: new THREE.Vector3(colega.x, 0, colega.z)
    };
    this._trocarRotulo(avatar, colega);
    return avatar;
  }

  /** Refaz a plaquinha com o nome (e a turma) do colega. */
  _trocarRotulo(avatar, colega) {
    if (avatar.rotulo) {
      avatar.grupo.remove(avatar.rotulo);
      this._liberarSprite(avatar.rotulo);
    }
    const etiqueta = colega.turma ? `${colega.nome} · ${colega.turma}` : colega.nome;
    const rotulo = criarLabel(`🧑‍🎓 ${etiqueta}`, '#e8eefc', 3.4, 44, 'rgba(8,15,30,0.8)');
    rotulo.position.y = 2.35;
    avatar.grupo.add(rotulo);
    avatar.rotulo = rotulo;
    avatar.nome = colega.nome;
  }

  _descartar(avatar) {
    this.scene.remove(avatar.grupo);
    this._liberarSprite(avatar.rotulo);
    if (avatar.balao) this._liberarSprite(avatar.balao);
    avatar.grupo.traverse((filho) => {
      if (filho.isMesh) {
        filho.geometry?.dispose?.();
        if (Array.isArray(filho.material)) filho.material.forEach((m) => m.dispose?.());
        else filho.material?.dispose?.();
      }
    });
  }

  /** Rótulos criam uma textura de canvas por vez — precisam ser liberados. */
  _liberarSprite(sprite) {
    if (!sprite) return;
    sprite.material?.map?.dispose?.();
    sprite.material?.dispose?.();
    sprite.geometry?.dispose?.();
  }
}
