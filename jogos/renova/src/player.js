/**
 * player.js
 * -----------------------------------------------------------------------------
 * Jogador em primeira pessoa:
 *   - PointerLockControls (mouse look)
 *   - movimentação WASD / setas, Shift para correr
 *   - colisão simples (AABB) contra os colisores da cidade
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { JOGADOR, LIMITE_MUNDO } from './config.js';

export class Jogador {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} elemento elemento que captura o pointer lock
   * @param {THREE.Box3[]} colisores
   */
  constructor(camera, elemento, colisores) {
    this.camera = camera;
    this.colisores = colisores;
    this.controls = new PointerLockControls(camera, elemento);

    // compatibilidade entre versões do Three.js (object vs getObject())
    this.objeto = this.controls.object || this.controls.getObject();

    this.velocidade = new THREE.Vector3();
    this.teclas = { frente: false, tras: false, esq: false, dir: false, correr: false };
    this.ativo = false;      // só anda quando o jogo está rodando
    this.distanciaAndada = 0;

    /**
     * Ignora o teclado sem parar a simulação. É o que permite digitar no
     * bate-papo sem sair andando pela cidade a cada letra do WASD.
     */
    this.bloqueado = false;

    this._frente = new THREE.Vector3();
    this._direita = new THREE.Vector3();
    this._cima = new THREE.Vector3(0, 1, 0);

    this._onKeyDown = (e) => this._tecla(e, true);
    this._onKeyUp = (e) => this._tecla(e, false);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  _tecla(evento, pressionada) {
    if (this.bloqueado) return;
    switch (evento.code) {
      case 'KeyW': case 'ArrowUp':    this.teclas.frente = pressionada; break;
      case 'KeyS': case 'ArrowDown':  this.teclas.tras = pressionada; break;
      case 'KeyA': case 'ArrowLeft':  this.teclas.esq = pressionada; break;
      case 'KeyD': case 'ArrowRight': this.teclas.dir = pressionada; break;
      case 'ShiftLeft': case 'ShiftRight': this.teclas.correr = pressionada; break;
      default: return;
    }
  }

  /** Solta todas as teclas (usado ao pausar / abrir painel). */
  soltarTeclas() {
    for (const k of Object.keys(this.teclas)) this.teclas[k] = false;
    this.velocidade.set(0, 0, 0);
  }

  /** Coloca o jogador numa posição inicial do mundo. */
  posicionar(x, z, olharPara) {
    this.objeto.position.set(x, JOGADOR.altura, z);
    if (olharPara) {
      const alvo = new THREE.Vector3(olharPara.x, JOGADOR.altura, olharPara.z);
      this.camera.lookAt(alvo);
    }
  }

  get posicao() {
    return this.objeto.position;
  }

  /** Rapidez horizontal atual em m/s (0 parado). */
  get rapidez() {
    return Math.hypot(this.velocidade.x, this.velocidade.z);
  }

  /** Direção horizontal para onde o jogador olha (usada pela bússola/minimapa). */
  get anguloOlhar() {
    this.camera.getWorldDirection(this._frente);
    return Math.atan2(this._frente.x, this._frente.z);
  }

  /** Testa se um ponto (x, z) está dentro de algum colisor. */
  _colide(x, z) {
    const r = JOGADOR.raioColisao;
    for (const c of this.colisores) {
      if (x > c.min.x - r && x < c.max.x + r && z > c.min.z - r && z < c.max.z + r) {
        return true;
      }
    }
    return false;
  }

  update(dt) {
    const pos = this.objeto.position;

    if (!this.ativo) {
      this.velocidade.set(0, 0, 0);
      return;
    }

    // atrito
    const atrito = Math.min(1, JOGADOR.atrito * dt);
    this.velocidade.x -= this.velocidade.x * atrito;
    this.velocidade.z -= this.velocidade.z * atrito;

    // aceleração conforme as teclas
    const acel = this.teclas.correr ? JOGADOR.velocidadeCorrida : JOGADOR.velocidade;
    const eixoZ = (this.teclas.frente ? 1 : 0) - (this.teclas.tras ? 1 : 0);
    const eixoX = (this.teclas.dir ? 1 : 0) - (this.teclas.esq ? 1 : 0);

    if (eixoZ !== 0 || eixoX !== 0) {
      const norma = Math.hypot(eixoZ, eixoX) || 1;
      this.velocidade.z += (eixoZ / norma) * acel * dt;
      this.velocidade.x += (eixoX / norma) * acel * dt;
    }

    // vetores frente/direita, sempre no plano do chão
    this.camera.getWorldDirection(this._frente);
    this._frente.y = 0;
    if (this._frente.lengthSq() < 1e-6) this._frente.set(0, 0, -1);
    this._frente.normalize();
    this._direita.crossVectors(this._frente, this._cima).normalize();

    const dx = (this._frente.x * this.velocidade.z + this._direita.x * this.velocidade.x) * dt;
    const dz = (this._frente.z * this.velocidade.z + this._direita.z * this.velocidade.x) * dt;

    // move um eixo por vez, para "deslizar" ao encostar numa parede
    const novoX = THREE.MathUtils.clamp(pos.x + dx, -LIMITE_MUNDO, LIMITE_MUNDO);
    if (!this._colide(novoX, pos.z)) pos.x = novoX;
    else this.velocidade.x *= 0.2;

    const novoZ = THREE.MathUtils.clamp(pos.z + dz, -LIMITE_MUNDO, LIMITE_MUNDO);
    if (!this._colide(pos.x, novoZ)) pos.z = novoZ;
    else this.velocidade.z *= 0.2;

    // balanço sutil da câmera ao caminhar (head bob)
    const rapidez = Math.hypot(this.velocidade.x, this.velocidade.z);
    this.distanciaAndada += rapidez * dt;
    pos.y = JOGADOR.altura + Math.sin(this.distanciaAndada * 2.6) * Math.min(rapidez, 6) * 0.012;
  }

  destruir() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.controls.dispose?.();
  }
}
