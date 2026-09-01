/**
 * porrete.js
 * -----------------------------------------------------------------------------
 * O porrete que o jogador carrega para revidar as investidas do animal.
 *
 * O modelo é filho da CÂMERA, então ele acompanha o olhar como uma arma de
 * jogo em primeira pessoa. Toda a animação é feita com o `dt` recebido em
 * `update()`, e não com o relógio do navegador, para que `jogo.simular()`
 * continue reproduzindo o jogo inteiro fora do laço de renderização.
 *
 * O golpe em si (alcance, ângulo, dano) é resolvido por `perseguicao.js`;
 * aqui só existe a apresentação e a recarga entre uma pancada e outra.
 * -----------------------------------------------------------------------------
 */
import { buildPorrete } from './models.js';
import { PORRETE } from './config.js';

/** Duração da animação de uma pancada, em segundos. */
const DURACAO_GOLPE = 0.34;

/**
 * Pose de descanso, em coordenadas da câmera (+X direita, −Z frente).
 * O porrete fica MUITO perto da câmera, então poucos centímetros mudam
 * bastante o tamanho na tela: com `ESCALA` 0.32 ele ocupa o cantinho
 * inferior direito, sem tapar a mira nem a cidade.
 */
const ESCALA = 0.32;
const REPOUSO = {
  x: 0.4, y: -0.46, z: -0.58,
  rotX: 0.42, rotY: -0.3, rotZ: 0.5
};

export class Porrete {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.grupo = buildPorrete();
    this.grupo.scale.setScalar(ESCALA);
    this.grupo.visible = false;
    camera.add(this.grupo);

    /** Progresso da animação de golpe (0 = parado, 1 = acabou de começar). */
    this._golpe = 0;
    /** Tempo que ainda falta para poder bater de novo. */
    this._recarga = 0;
    /** Relógio próprio, só para o balanço de descanso. */
    this._tempo = 0;

    this._aplicarPose(0);
  }

  /** Mostra ou esconde o porrete (some nas telas de menu e no painel). */
  mostrar(visivel) {
    this.grupo.visible = visivel;
  }

  /** Já é possível dar outra pancada? */
  get pronto() {
    return this._recarga <= 0;
  }

  /** Fração da recarga já cumprida (0 a 1) — usada pela barrinha do HUD. */
  get recargaProgresso() {
    if (this._recarga <= 0) return 1;
    return 1 - this._recarga / (PORRETE.recargaMs / 1000);
  }

  /**
   * Dispara a animação de pancada.
   * @returns {boolean} false se ainda está recarregando (o golpe não sai)
   */
  golpear() {
    if (!this.pronto) return false;
    this._golpe = 1;
    this._recarga = PORRETE.recargaMs / 1000;
    return true;
  }

  /** Chamada a cada quadro. */
  update(dt, andando = 0) {
    this._tempo += dt;
    if (this._recarga > 0) this._recarga = Math.max(0, this._recarga - dt);
    if (this._golpe > 0) {
      this._golpe = Math.max(0, this._golpe - dt / DURACAO_GOLPE);
    }
    this._aplicarPose(andando);
  }

  /* ---------------------------------------------------------------------
   * Internos
   * ------------------------------------------------------------------- */

  /**
   * Monta a pose do quadro: descanso + balanço de caminhada + arco do golpe.
   * `_golpe` vai de 1 a 0, então `1 - _golpe` é o avanço da animação.
   */
  _aplicarPose(andando) {
    const g = this.grupo;

    // balanço suave de quem anda com o porrete na mão
    const balancoX = Math.sin(this._tempo * 2.1) * 0.012 + Math.sin(this._tempo * 7) * 0.02 * andando;
    const balancoY = Math.cos(this._tempo * 4.2) * 0.01 + Math.abs(Math.sin(this._tempo * 7)) * 0.03 * andando;

    // arco da pancada: sobe rápido, desce devagar (curva em sino)
    const avanco = 1 - this._golpe;
    const arco = this._golpe > 0 ? Math.sin(avanco * Math.PI) : 0;
    const subida = this._golpe > 0 ? Math.sin(Math.min(1, avanco * 1.6) * Math.PI) : 0;

    g.position.set(
      REPOUSO.x + balancoX - arco * 0.3,
      REPOUSO.y + balancoY + subida * 0.22,
      REPOUSO.z + arco * 0.16
    );
    g.rotation.set(
      REPOUSO.rotX - arco * 2.0,
      REPOUSO.rotY + arco * 0.5,
      REPOUSO.rotZ - arco * 0.9
    );
  }
}
