/**
 * world.js
 * -----------------------------------------------------------------------------
 * Construção da cidade 3D low-poly:
 *   - céu, iluminação, chão
 *   - malha de ruas e calçadas
 *   - quarteirões de prédios (gerados proceduralmente)
 *   - as 5 zonas temáticas, cada uma com sua cor de chão e sua placa
 *   - os pontos de interação (objetos brilhantes) definidos em zones.js
 *   - a lista de colisores usada pelo jogador
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';
import { ZONAS, TODOS_OS_PONTOS } from './zones.js';
import { box, cyl, arvore, mat } from './models.js';
import { LIMITE_MUNDO } from './config.js';

/** Pontos que o jogador pode atravessar (chão pintado, parque aberto). */
const PONTOS_ATRAVESSAVEIS = new Set(['ciclovia', 'parque']);

/** Posições das ruas principais (formam uma grade ligando as zonas). */
const RUAS = [-72, 0, 72];
const LARGURA_RUA = 11;

/* =========================================================================
 * Rótulos de texto (canvas → textura → sprite)
 * ======================================================================= */

/**
 * Cria um rótulo de texto a partir de um canvas.
 * @param {boolean} plano  true → devolve um plano fixo (usado nas placas das zonas,
 *                         que não devem girar e nem "entrar" na madeira da placa);
 *                         false → devolve um Sprite, que sempre encara o jogador.
 */
function criarLabel(texto, corCss = '#ffffff', larguraMundo = 6, tamanho = 56,
                    corFundo = 'rgba(8,15,30,0.78)', plano = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fonte = `bold ${tamanho}px "Segoe UI", system-ui, sans-serif`;

  ctx.font = fonte;
  const largura = Math.ceil(ctx.measureText(texto).width) + tamanho * 1.2;
  canvas.width = largura;
  canvas.height = Math.ceil(tamanho * 1.9);

  const c = canvas.getContext('2d');
  c.fillStyle = corFundo;
  const r = canvas.height / 2;
  // retângulo com cantos arredondados
  c.beginPath();
  c.moveTo(r, 0);
  c.lineTo(canvas.width - r, 0);
  c.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  c.lineTo(canvas.width, canvas.height - r);
  c.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  c.lineTo(r, canvas.height);
  c.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  c.lineTo(0, r);
  c.quadraticCurveTo(0, 0, r, 0);
  c.closePath();
  c.fill();

  c.strokeStyle = corCss;
  c.lineWidth = 5;
  c.stroke();

  c.font = fonte;
  c.fillStyle = corCss;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, canvas.width / 2, canvas.height / 2 + 2);

  const textura = new THREE.CanvasTexture(canvas);
  textura.anisotropy = 4;

  // o rótulo é dimensionado em METROS do mundo, não em pixels do canvas
  const alturaMundo = (canvas.height * larguraMundo) / canvas.width;

  if (plano) {
    const malha = new THREE.Mesh(
      new THREE.PlaneGeometry(larguraMundo, alturaMundo),
      new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false })
    );
    return malha;
  }

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textura,
      transparent: true,
      depthWrite: false,
      depthTest: false   // o rótulo nunca é "cortado" pelo próprio objeto
    })
  );
  sprite.renderOrder = 5;
  sprite.scale.set(larguraMundo, alturaMundo, 1);
  return sprite;
}

/* =========================================================================
 * Céu e iluminação
 * ======================================================================= */

function criarAmbiente(scene) {
  scene.background = new THREE.Color(0x9ad4f0);
  scene.fog = new THREE.Fog(0x9ad4f0, 90, 280);

  const hemisferica = new THREE.HemisphereLight(0xbfe6ff, 0x6b8f4e, 0.85);
  scene.add(hemisferica);

  const sol = new THREE.DirectionalLight(0xfff4d6, 1.15);
  sol.position.set(70, 110, 50);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.near = 10;
  sol.shadow.camera.far = 330;
  sol.shadow.camera.left = -160;
  sol.shadow.camera.right = 160;
  sol.shadow.camera.top = 160;
  sol.shadow.camera.bottom = -160;
  sol.shadow.bias = -0.0006;
  scene.add(sol);
  scene.add(sol.target);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // algumas nuvens low-poly bem simples, longe do jogador
  const nuvens = new THREE.Group();
  // material sem sombreamento: as nuvens ficam sempre brancas, como no céu
  const materialNuvem = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  for (let i = 0; i < 14; i++) {
    const n = new THREE.Group();
    n.add(box(16, 4.5, 10, 0xffffff, 0, 0, 0));
    n.add(box(10, 4.5, 8, 0xffffff, 9, 1, 2));
    n.add(box(9, 4, 7, 0xffffff, -8, -0.5, -2));
    n.children.forEach((m) => {
      m.material = materialNuvem;
      m.castShadow = false;
      m.receiveShadow = false;
    });
    n.position.set(
      (Math.random() - 0.5) * 400,
      80 + Math.random() * 40,
      (Math.random() - 0.5) * 400
    );
    nuvens.add(n);
  }
  scene.add(nuvens);
  return { nuvens };
}

/* =========================================================================
 * Chão, ruas e calçadas
 * ======================================================================= */

function criarChaoERuas(scene) {
  // gramado geral
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    mat(0x86b562, { flatShading: false, roughness: 1 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  scene.add(chao);

  const asfalto = mat(0x4a4f57, { flatShading: false, roughness: 1 });
  const calcada = mat(0xc9c6bd, { flatShading: false, roughness: 1 });
  const faixa = mat(0xf5f3e7, { flatShading: false, roughness: 1 });

  const comprimento = LIMITE_MUNDO * 2 + 20;

  RUAS.forEach((pos) => {
    // rua no eixo X (varia em X, fixa em Z) e no eixo Z
    [[comprimento, LARGURA_RUA, 0, pos], [LARGURA_RUA, comprimento, pos, 0]].forEach(
      ([largura, profundidade, x, z]) => {
        const calcadaMesh = new THREE.Mesh(
          new THREE.BoxGeometry(largura + 3, 0.16, profundidade + 3),
          calcada
        );
        calcadaMesh.position.set(x, 0.08, z);
        calcadaMesh.receiveShadow = true;
        scene.add(calcadaMesh);

        const ruaMesh = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.2, profundidade), asfalto);
        ruaMesh.position.set(x, 0.14, z);
        ruaMesh.receiveShadow = true;
        scene.add(ruaMesh);
      }
    );
  });

  // faixas tracejadas no meio das ruas
  RUAS.forEach((pos) => {
    for (let d = -LIMITE_MUNDO; d <= LIMITE_MUNDO; d += 9) {
      if (Math.abs(d) < 10 && RUAS.includes(0)) continue; // não pinta sobre cruzamentos
      const fx = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.45), faixa);
      fx.position.set(d, 0.25, pos);
      scene.add(fx);

      const fz = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 3.4), faixa);
      fz.position.set(pos, 0.25, d);
      scene.add(fz);
    }
  });
}

/** Um endereço está sobre alguma rua? */
function sobreRua(x, z, margem = LARGURA_RUA / 2 + 5) {
  return RUAS.some((r) => Math.abs(x - r) < margem || Math.abs(z - r) < margem);
}

/** Um endereço está dentro (ou perto) de alguma zona temática? */
function dentroDeZona(x, z, folga = 6) {
  return ZONAS.some((zona) => {
    const dx = x - zona.centro.x;
    const dz = z - zona.centro.z;
    return Math.hypot(dx, dz) < zona.raio + folga;
  });
}

/* =========================================================================
 * Prédios (quarteirões procedurais)
 * ======================================================================= */

const CORES_PREDIOS = [
  0xe8e2d5, 0xd9c9b0, 0xc9d6df, 0xe6d3c1, 0xcbd5c0,
  0xdcd0e0, 0xf0e0d0, 0xbfcbd6, 0xe3ded1
];

function criarPredios(scene, colisores) {
  // "semente" fixa para o mapa ser sempre igual (o aluno pode se orientar)
  let semente = 20260827;
  const rnd = () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  };

  const passo = 15;
  for (let x = -LIMITE_MUNDO + 8; x <= LIMITE_MUNDO - 8; x += passo) {
    for (let z = -LIMITE_MUNDO + 8; z <= LIMITE_MUNDO - 8; z += passo) {
      const px = x + (rnd() - 0.5) * 4;
      const pz = z + (rnd() - 0.5) * 4;

      if (sobreRua(px, pz)) continue;
      if (dentroDeZona(px, pz)) continue;
      if (rnd() < 0.22) continue; // alguns lotes vazios / praças

      // um pouco de vegetação em vez de prédio
      if (rnd() < 0.18) {
        const arv = arvore(px, pz, 0.9 + rnd() * 0.6);
        scene.add(arv);
        continue;
      }

      const largura = 6 + rnd() * 4;
      const profundidade = 6 + rnd() * 4;
      const altura = 5 + rnd() * rnd() * 26;
      const cor = CORES_PREDIOS[Math.floor(rnd() * CORES_PREDIOS.length)];

      const predio = box(largura, altura, profundidade, cor, px, altura / 2, pz);
      scene.add(predio);

      // telhado / laje mais escura
      scene.add(box(largura + 0.6, 0.5, profundidade + 0.6, 0x8f8a7e, px, altura + 0.2, pz));

      // fileiras de janelas (só faces frente/trás, para manter leve)
      const andares = Math.max(1, Math.floor(altura / 3.4));
      for (let a = 0; a < andares; a++) {
        const y = 2.2 + a * 3.4;
        if (y > altura - 1) break;
        const acesa = rnd() < 0.35;
        const janelas = box(largura * 0.72, 1.1, 0.12, acesa ? 0xfff0c0 : 0x7f98ad,
          px, y, pz + profundidade / 2 + 0.02,
          acesa ? { emissive: 0xffe9a8, emissiveIntensity: 0.6 } : { roughness: 0.3 });
        janelas.castShadow = false;
        scene.add(janelas);

        const janelas2 = janelas.clone();
        janelas2.position.z = pz - profundidade / 2 - 0.02;
        scene.add(janelas2);
      }

      // ocasionalmente, um telhado verde ou painel solar (cidade sustentável!)
      if (rnd() < 0.28) {
        scene.add(box(largura * 0.8, 0.35, profundidade * 0.8, 0x5fa855, px, altura + 0.6, pz));
      } else if (rnd() < 0.25) {
        const p = box(largura * 0.6, 0.14, profundidade * 0.5, 0x14336b,
          px, altura + 0.7, pz, { metalness: 0.35, roughness: 0.3 });
        p.rotation.x = -0.35;
        scene.add(p);
      }

      colisores.push(
        new THREE.Box3(
          new THREE.Vector3(px - largura / 2, 0, pz - profundidade / 2),
          new THREE.Vector3(px + largura / 2, altura, pz + profundidade / 2)
        )
      );
    }
  }
}

/* =========================================================================
 * Zonas temáticas: chão colorido, placa e ambientação
 * ======================================================================= */

function criarZonas(scene, colisores, animaveis) {
  ZONAS.forEach((zona) => {
    const grupo = new THREE.Group();
    grupo.position.set(zona.centro.x, 0, zona.centro.z);

    // chão colorido da zona (identidade visual)
    const piso = new THREE.Mesh(
      new THREE.CircleGeometry(zona.raio, 40),
      mat(zona.corChao, { flatShading: false, roughness: 1 })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0.06;
    piso.receiveShadow = true;
    grupo.add(piso);

    // anel colorido delimitando a zona
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(zona.raio - 1.6, zona.raio, 48),
      new THREE.MeshBasicMaterial({ color: zona.cor, transparent: true, opacity: 0.85 })
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.09;
    grupo.add(anel);

    // luz colorida ambiente da zona
    const luz = new THREE.PointLight(zona.cor, 1.1, zona.raio * 2.1, 1.6);
    luz.position.set(0, 12, 0);
    grupo.add(luz);

    // placa de entrada da zona
    const placa = new THREE.Group();
    placa.add(cyl(0.22, 0.3, 5, 8, 0x4b5563, -3, 2.5, 0));
    placa.add(cyl(0.22, 0.3, 5, 8, 0x4b5563, 3, 2.5, 0));
    placa.add(box(8.4, 2.2, 0.35, zona.cor, 0, 5.2, 0, {
      emissive: zona.cor,
      emissiveIntensity: 0.25
    }));
    const rotulo = criarLabel(`${zona.numero}. ${zona.nome}`, '#ffffff', 7.6, 56,
      'rgba(10,20,35,0.9)', true);
    rotulo.position.set(0, 5.2, 0.22);
    placa.add(rotulo);
    // fica na borda sul da zona, com a face voltada para fora (para quem chega)
    placa.position.set(0, 0, zona.raio - 4);
    grupo.add(placa);

    colisores.push(
      new THREE.Box3(
        new THREE.Vector3(zona.centro.x - 4.5, 0, zona.centro.z + zona.raio - 5),
        new THREE.Vector3(zona.centro.x + 4.5, 6, zona.centro.z + zona.raio - 3)
      )
    );

    // arborização em volta da zona, na cor do tema
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.3;
      const r = zona.raio - 3.5;
      grupo.add(arvore(Math.cos(ang) * r, Math.sin(ang) * r, 0.85 + (i % 3) * 0.15));
    }

    scene.add(grupo);
    animaveis.push({ obj: luz, animar: (t) => { luz.intensity = 0.9 + Math.sin(t * 1.4) * 0.25; } });
  });
}

/* =========================================================================
 * Pontos de interação
 * ======================================================================= */

function criarPontosDeInteracao(scene, colisores, animaveis, camera) {
  const pontos = [];

  TODOS_OS_PONTOS.forEach((dados) => {
    const grupo = new THREE.Group();
    grupo.position.set(dados.posicao.x, 0, dados.posicao.z);
    grupo.rotation.y = dados.rotY || 0;

    // o objeto em si
    const modelo = dados.build();
    grupo.add(modelo);

    // ---- destaque visual: feixe de luz + anel giratório + rótulo ----
    const destaque = new THREE.Group();

    const feixe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.2, 16, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: dados.cor,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    feixe.position.y = 8;
    destaque.add(feixe);

    const anelChao = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 3.0, 32),
      new THREE.MeshBasicMaterial({
        color: dados.cor,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
    );
    anelChao.rotation.x = -Math.PI / 2;
    anelChao.position.y = 0.2;
    destaque.add(anelChao);

    const anelFlutuante = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.12, 8, 24),
      new THREE.MeshBasicMaterial({ color: dados.cor })
    );
    anelFlutuante.position.y = 5.5;
    anelFlutuante.rotation.x = Math.PI / 2;
    destaque.add(anelFlutuante);

    let rotulo = criarLabel(`${dados.icone}  ${dados.nome}`, dados.corCss, 6.4);
    rotulo.position.y = 7.2;
    destaque.add(rotulo);

    grupo.add(destaque);
    scene.add(grupo);

    // colisor (exceto pontos que o jogador pode atravessar)
    if (!PONTOS_ATRAVESSAVEIS.has(dados.id)) {
      const caixa = new THREE.Box3().setFromObject(modelo);
      // encolhe um pouco para o jogador conseguir chegar perto o bastante
      caixa.min.x += 0.6; caixa.max.x -= 0.6;
      caixa.min.z += 0.6; caixa.max.z -= 0.6;
      if (caixa.max.x > caixa.min.x && caixa.max.z > caixa.min.z) colisores.push(caixa);
    }

    // animações do próprio modelo + do destaque
    const animarModelo = modelo.userData.animar;
    const posicaoMundo = new THREE.Vector3(dados.posicao.x, 0, dados.posicao.z);
    animaveis.push({
      animar: (t) => {
        if (animarModelo) animarModelo(t);
        anelFlutuante.rotation.z = t * 0.9;
        anelFlutuante.position.y = 5.5 + Math.sin(t * 1.6) * 0.35;
        anelChao.scale.setScalar(1 + Math.sin(t * 2) * 0.06);

        // o nome só aparece de perto: evita poluir a tela com 12 rótulos ao longe
        if (camera) {
          const dist = Math.hypot(
            camera.position.x - posicaoMundo.x,
            camera.position.z - posicaoMundo.z
          );
          rotulo.visible = dist < 34;
        }
      }
    });

    pontos.push({
      dados,
      grupo,
      destaque,
      posicao: new THREE.Vector3(dados.posicao.x, 0, dados.posicao.z),
      descoberto: false,
      /** Marca o ponto como concluído: o destaque fica verde e mais discreto. */
      marcarDescoberto() {
        this.descoberto = true;
        const verde = new THREE.Color(0x22c55e);
        feixe.material.color.copy(verde);
        feixe.material.opacity = 0.07;
        anelChao.material.color.copy(verde);
        anelFlutuante.material.color.copy(verde);
        const novo = criarLabel(`✔ ${dados.nome}`, '#22c55e', 5.6);
        novo.position.copy(rotulo.position);
        destaque.remove(rotulo);
        destaque.add(novo);
        rotulo = novo; // o controle de visibilidade passa a valer para o novo rótulo
      }
    });
  });

  return pontos;
}

/* =========================================================================
 * Cercas do limite do mundo
 * ======================================================================= */

function criarLimites(scene, colisores) {
  const L = LIMITE_MUNDO + 3;
  const cor = 0x3f6b3a;
  [[0, -L, L * 2, 2], [0, L, L * 2, 2], [-L, 0, 2, L * 2], [L, 0, 2, L * 2]].forEach(
    ([x, z, w, d]) => {
      const cerca = box(w, 2.6, d, cor, x, 1.3, z);
      scene.add(cerca);
      colisores.push(
        new THREE.Box3(
          new THREE.Vector3(x - w / 2, 0, z - d / 2),
          new THREE.Vector3(x + w / 2, 2.6, z + d / 2)
        )
      );
    }
  );
}

/* =========================================================================
 * API principal
 * ======================================================================= */

/**
 * Monta a cidade inteira dentro da cena recebida.
 * @returns {{pontos: Array, colisores: THREE.Box3[], animar: (t:number)=>void}}
 */
export function criarMundo(scene, camera) {
  const colisores = [];
  const animaveis = [];

  const { nuvens } = criarAmbiente(scene);
  criarChaoERuas(scene);
  criarPredios(scene, colisores);
  criarZonas(scene, colisores, animaveis);
  criarLimites(scene, colisores);
  const pontos = criarPontosDeInteracao(scene, colisores, animaveis, camera);

  animaveis.push({
    animar: (t) => {
      nuvens.position.x = Math.sin(t * 0.02) * 12;
    }
  });

  return {
    pontos,
    colisores,
    animar(t) {
      for (const a of animaveis) a.animar(t);
    }
  };
}

export { criarLabel };
