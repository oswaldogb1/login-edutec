/**
 * perseguicao.js
 * -----------------------------------------------------------------------------
 * Mecânica de fuga: a cada resposta errada um animal aparece atrás do jogador
 * e o persegue. O jogador tem TRÊS saídas — e é isso que dá fôlego à fuga:
 *
 *   1. correr (Shift) até uma Área Segura;
 *   2. revidar a pauladas até o bicho desistir (`levarPancada`);
 *   3. aguentar as mordidas — cada uma tira vida, mas não encerra a fuga.
 *
 * Ser alcançado NÃO termina mais a perseguição: o animal morde, recua um
 * pouco e volta à carga. Quem decide o que fazer com o dano é o `main.js`.
 *
 * O animal é mais rápido que o passo normal e mais lento que a corrida —
 * ou seja, dá para escapar, mas só correndo.
 *
 * Todos os prazos são contados em `tempoDecorrido`, que anda com o `dt`
 * recebido, e não no relógio do navegador: assim `jogo.simular()` reproduz
 * atordoamentos e mordidas exatamente como o laço de renderização.
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { ANIMAIS } from './models.js';
import { PERSEGUICAO, PORRETE, LIMITE_MUNDO } from './config.js';

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

    /** Quantas pauladas o animal já levou nesta fuga. */
    this.golpes = 0;
    /** Até quando (em tempoDecorrido) o animal fica parado depois de apanhar. */
    this.atordoadoAte = 0;
    /** Antes disso o animal não morde de novo: é o recuo pós-mordida. */
    this.proximaMordidaEm = 0;
    /** Quantas vezes ele já mordeu nesta fuga (só para o resumo final). */
    this.mordidas = 0;

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
    this.grupo.rotation.z = 0;

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
    this.golpes = 0;
    this.mordidas = 0;
    this.atordoadoAte = 0;
    this.proximaMordidaEm = 0;
    return this.animal;
  }

  encerrar() {
    if (this.grupo) {
      this.grupo.visible = false;
      this.grupo.rotation.z = 0;
    }
    this.ativa = false;
    this.grupo = null;
    this.animal = null;
    this.abrigoBloqueado = null;
  }

  /** O animal está tonto de tanto apanhar (parado, sem morder)? */
  get atordoado() {
    return this.ativa && this.tempoDecorrido < this.atordoadoAte;
  }

  /** Segundos que ainda faltam para o animal se recuperar da paulada. */
  get segundosDeAtordoamento() {
    return Math.max(0, this.atordoadoAte - this.tempoDecorrido);
  }

  /* ---------------------------------------------------------------------
   * Atualização por quadro
   * ------------------------------------------------------------------- */

  /**
   * @param {number} dt segundos desde o último quadro
   * @param {THREE.Vector3} posJogador
   * @returns {'nada'|'salvo'|'mordida'}
   */
  update(dt, posJogador) {
    if (!this.ativa || !this.grupo) return 'nada';

    this.tempoDecorrido += dt;

    // chegou numa Área Segura?
    const abrigo = this.areaMaisProxima(posJogador);
    if (abrigo && abrigo.distancia <= PERSEGUICAO.raioAreaSegura) return 'salvo';

    const pos = this.grupo.position;
    let dx = posJogador.x - pos.x;
    let dz = posJogador.z - pos.z;
    const dist = Math.hypot(dx, dz);

    // atordoado: fica no lugar cambaleando e não morde ninguém
    if (this.atordoado) {
      this.grupo.rotation.y += dt * 5.5;
      this.grupo.rotation.z = Math.sin(this.tempoDecorrido * 12) * 0.22;
      return 'nada';
    }
    this.grupo.rotation.z *= Math.max(0, 1 - dt * 6);

    // alcançou o jogador: morde, recua e volta à carga (a fuga continua)
    if (dist <= PERSEGUICAO.distanciaCaptura &&
        this.tempoDecorrido >= this.proximaMordidaEm) {
      this.mordidas++;
      this.proximaMordidaEm = this.tempoDecorrido + PERSEGUICAO.recuoAposMordidaMs / 1000;
      this._afastar(posJogador, PERSEGUICAO.empurraoMordida);
      return 'mordida';
    }

    // durante o recuo o animal se mantém a alguma distância antes de atacar de novo
    const recuando = this.tempoDecorrido < this.proximaMordidaEm;

    if (dist > 0.001 && !(recuando && dist < PERSEGUICAO.distanciaCaptura * 1.6)) {
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
   * Revide do jogador
   * ------------------------------------------------------------------- */

  /**
   * O jogador acertou uma paulada. O animal é empurrado e fica atordoado
   * por alguns segundos — é a janela para escapar.
   *
   * @param {THREE.Vector3} posJogador
   * @returns {{golpes:number, espantou:boolean}}
   */
  levarPancada(posJogador) {
    if (!this.ativa || !this.grupo) return { golpes: 0, espantou: false };

    this.golpes++;
    this._afastar(posJogador, PORRETE.empurrao);
    this.atordoadoAte = this.tempoDecorrido + PORRETE.atordoamentoMs / 1000;
    // apanhou: perde a vontade de morder de imediato
    this.proximaMordidaEm = Math.max(this.proximaMordidaEm, this.atordoadoAte);

    return {
      golpes: this.golpes,
      espantou: this.golpes >= PERSEGUICAO.golpesParaEspantar
    };
  }

  /**
   * O animal está no alcance do porrete e à frente do jogador?
   * @param {THREE.Vector3} posJogador
   * @param {{x:number,z:number}} direcaoOlhar
   */
  estaNoAlcance(posJogador, direcaoOlhar) {
    if (!this.ativa || !this.grupo) return false;

    const dx = this.grupo.position.x - posJogador.x;
    const dz = this.grupo.position.z - posJogador.z;
    const dist = Math.hypot(dx, dz);
    if (dist > PORRETE.alcance) return false;

    // ângulo entre "para onde olho" e "onde está o bicho"
    const normaOlhar = Math.hypot(direcaoOlhar.x, direcaoOlhar.z) || 1;
    const cos = (dx * direcaoOlhar.x + dz * direcaoOlhar.z) / (dist * normaOlhar);
    return cos >= Math.cos((PORRETE.anguloGraus * Math.PI) / 180);
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

  /** Empurra o animal para longe do jogador, respeitando os prédios. */
  _afastar(posJogador, distancia) {
    const pos = this.grupo.position;
    let dx = pos.x - posJogador.x;
    let dz = pos.z - posJogador.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.001) return;
    dx /= d;
    dz /= d;

    const novoX = THREE.MathUtils.clamp(pos.x + dx * distancia, -LIMITE_MUNDO, LIMITE_MUNDO);
    const novoZ = THREE.MathUtils.clamp(pos.z + dz * distancia, -LIMITE_MUNDO, LIMITE_MUNDO);
    if (!this._colide(novoX, pos.z)) pos.x = novoX;
    if (!this._colide(pos.x, novoZ)) pos.z = novoZ;
  }

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
