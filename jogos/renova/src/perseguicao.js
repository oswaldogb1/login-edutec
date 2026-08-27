/**
 * perseguicao.js
 * -----------------------------------------------------------------------------
 * Mecânica de fuga: a cada resposta errada um animal aparece atrás do jogador
 * e o persegue. O jogador precisa CORRER (Shift) até uma das Áreas Seguras
 * espalhadas pela cidade. Chegando lá, a pergunta reabre para nova tentativa.
 *
 * O animal é mais rápido que o passo normal e mais lento que a corrida —
 * ou seja, dá para escapar, mas só correndo.
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { ANIMAIS } from './models.js';
import { PERSEGUICAO, LIMITE_MUNDO } from './config.js';

export class Perseguicao {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Box3[]} colisores  os mesmos obstáculos do jogador
   * @param {{x:number,z:number}[]} areasSeguras
   */
  constructor(scene, colisores, areasSeguras) {
    this.scene = scene;
    this.colisores = colisores;
    this.areasSeguras = areasSeguras;

    this.ativa = false;
    this.animal = null;          // dados do catálogo (nome, ícone, cor…)
    this.grupo = null;           // THREE.Group do animal em cena
    this.tempoDecorrido = 0;

    /**
     * Abrigo que NAO vale nesta fuga.
     * Sem isso haveria um furo: ao errar de novo logo depois de escapar, o
     * jogador ainda esta dentro do abrigo e a fuga acabaria no mesmo quadro.
     * O abrigo em que ele ja esta "nao conta" — tem de correr ate outro.
     */
    this.abrigoBloqueado = null;

    // um grupo por espécie, construído sob demanda e reaproveitado depois
    this._modelos = new Map();
    this._alvo = new THREE.Vector3();
  }

  /* ---------------------------------------------------------------------
   * Ciclo de vida
   * ------------------------------------------------------------------- */

  /**
   * Começa uma perseguição.
   * @param {THREE.Vector3} posJogador
   * @param {{x:number,z:number}} direcaoOlhar  para onde o jogador olha
   * @returns {{nome:string, icone:string, cor:string}} o animal sorteado
   */
  iniciar(posJogador, direcaoOlhar) {
    this.animal = ANIMAIS[Math.floor(Math.random() * ANIMAIS.length)];

    // constrói (ou reaproveita) o modelo da espécie sorteada
    if (!this._modelos.has(this.animal.id)) {
      const g = this.animal.build();
      g.visible = false;
      this.scene.add(g);
      this._modelos.set(this.animal.id, g);
    }
    this.grupo = this._modelos.get(this.animal.id);
    this.grupo.visible = true;

    // o abrigo onde o jogador ja esta nao vale para esta fuga
    this.abrigoBloqueado = this.areasSeguras.find(
      (a) => Math.hypot(posJogador.x - a.x, posJogador.z - a.z) <= PERSEGUICAO.raioAreaSegura
    ) || null;

    const p = this._pontoDeSurgimento(
      posJogador, direcaoOlhar, this.areaMaisProxima(posJogador)
    );
    this.grupo.position.set(p.x, 0, p.z);

    this.ativa = true;
    this.tempoDecorrido = 0;
    return this.animal;
  }

  encerrar() {
    if (this.grupo) this.grupo.visible = false;
    this.ativa = false;
    this.grupo = null;
    this.animal = null;
    this.abrigoBloqueado = null;
  }

  /* ---------------------------------------------------------------------
   * Atualização por quadro
   * ------------------------------------------------------------------- */

  /**
   * @param {number} dt segundos desde o último quadro
   * @param {THREE.Vector3} posJogador
   * @returns {'nada'|'salvo'|'capturado'}
   */
  update(dt, posJogador) {
    if (!this.ativa || !this.grupo) return 'nada';

    this.tempoDecorrido += dt;

    // chegou numa Área Segura?
    const abrigo = this.areaMaisProxima(posJogador);
    if (abrigo && abrigo.distancia <= PERSEGUICAO.raioAreaSegura) return 'salvo';

    // persegue o jogador
    const pos = this.grupo.position;
    let dx = posJogador.x - pos.x;
    let dz = posJogador.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= PERSEGUICAO.distanciaCaptura) return 'capturado';

    if (dist > 0.001) {
      dx /= dist;
      dz /= dist;
      const passo = PERSEGUICAO.velocidadeAnimal * dt;

      // move um eixo por vez, para contornar prédios em vez de travar neles
      const novoX = THREE.MathUtils.clamp(pos.x + dx * passo, -LIMITE_MUNDO, LIMITE_MUNDO);
      if (!this._colide(novoX, pos.z)) pos.x = novoX;

      const novoZ = THREE.MathUtils.clamp(pos.z + dz * passo, -LIMITE_MUNDO, LIMITE_MUNDO);
      if (!this._colide(pos.x, novoZ)) pos.z = novoZ;

      // vira o focinho para o jogador
      this.grupo.rotation.y = Math.atan2(dx, dz);
    }

    // animação de corrida do próprio modelo
    if (this.grupo.userData.animar) this.grupo.userData.animar(this.tempoDecorrido);

    return 'nada';
  }

  /* ---------------------------------------------------------------------
   * Consultas usadas pelo HUD
   * ------------------------------------------------------------------- */

  /**
   * Área Segura mais próxima de uma posição, com a distância já calculada.
   * O abrigo bloqueado da fuga atual é ignorado.
   */
  areaMaisProxima(pos) {
    let melhor = null;
    for (const a of this.areasSeguras) {
      if (a === this.abrigoBloqueado) continue;
      const d = Math.hypot(pos.x - a.x, pos.z - a.z);
      if (!melhor || d < melhor.distancia) melhor = { x: a.x, z: a.z, distancia: d };
    }
    return melhor;
  }

  /** Distância atual entre o animal e o jogador (Infinity se não há caçada). */
  distanciaDoJogador(posJogador) {
    if (!this.ativa || !this.grupo) return Infinity;
    return Math.hypot(
      posJogador.x - this.grupo.position.x,
      posJogador.z - this.grupo.position.z
    );
  }

  get posicao() {
    return this.grupo ? this.grupo.position : null;
  }

  /* ---------------------------------------------------------------------
   * Internos
   * ------------------------------------------------------------------- */

  /**
   * Escolhe onde o animal aparece.
   *
   * O animal nasce do lado OPOSTO ao abrigo de destino. Se ele nascesse
   * simplesmente "atrás do jogador", poderia cair bem no meio do caminho até a
   * Área Segura — e o aluno correria direto para dentro dele, o que é injusto.
   * Se o ponto escolhido estiver dentro de um prédio, o leque vai se abrindo.
   */
  _pontoDeSurgimento(posJogador, direcaoOlhar, abrigoAlvo) {
    const anguloBase = abrigoAlvo
      ? Math.atan2(posJogador.x - abrigoAlvo.x, posJogador.z - abrigoAlvo.z)
      : Math.atan2(-direcaoOlhar.x, -direcaoOlhar.z); // sem abrigo: nas costas
    const r = PERSEGUICAO.distanciaSurgimento;

    // tenta o ponto atrás e, se estiver bloqueado, vai abrindo o leque
    const desvios = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.2, -2.2, Math.PI];
    for (const desvio of desvios) {
      const ang = anguloBase + desvio;
      const x = THREE.MathUtils.clamp(
        posJogador.x + Math.sin(ang) * r, -LIMITE_MUNDO + 2, LIMITE_MUNDO - 2
      );
      const z = THREE.MathUtils.clamp(
        posJogador.z + Math.cos(ang) * r, -LIMITE_MUNDO + 2, LIMITE_MUNDO - 2
      );
      if (!this._colide(x, z)) return { x, z };
    }

    // último recurso: nasce em cima do jogador mesmo (raro)
    return { x: posJogador.x, z: posJogador.z - r };
  }

  _colide(x, z, raio = 1.0) {
    for (const c of this.colisores) {
      if (x > c.min.x - raio && x < c.max.x + raio &&
          z > c.min.z - raio && z < c.max.z + raio) {
        return true;
      }
    }
    return false;
  }
}
