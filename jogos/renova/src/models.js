/**
 * models.js
 * -----------------------------------------------------------------------------
 * Modelagem 3D low-poly: helpers de geometria + construtores de cada
 * ponto de interação da cidade.
 *
 * Tudo é feito com geometrias primitivas do Three.js (caixas, cilindros,
 * esferas), sem nenhum modelo externo — o projeto continua leve e roda
 * direto no navegador, sem downloads pesados.
 * -----------------------------------------------------------------------------
 */
import * as THREE from 'three';

/* =========================================================================
 * Helpers
 * ======================================================================= */

/** Material padrão low-poly (flatShading dá o visual "facetado"). */
export function mat(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: cor,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.05,
    ...extra
  });
}

/** Caixa posicionada. */
export function box(w, h, d, cor, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(cor, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Cilindro / cone / tronco de cone posicionado. */
export function cyl(rTopo, rBase, h, seg, cor, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTopo, rBase, h, seg), mat(cor, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Esfera facetada (icosaedro) — copas de árvore, detalhes. */
export function sph(r, cor, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(cor, extra));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Arvorezinha low-poly reaproveitada em várias zonas. */
export function arvore(x, z, escala = 1, corCopa = 0x3fa34d) {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.26, 2.2, 6, 0x7a5230, 0, 1.1, 0));
  g.add(sph(1.15, corCopa, 0, 2.6, 0));
  g.add(sph(0.8, corCopa, 0.5, 3.3, 0.3));
  g.position.set(x, 0, z);
  g.scale.setScalar(escala);
  return g;
}

/* =========================================================================
 * ZONA 1 — ENERGIA LIMPA
 * ======================================================================= */

export function buildPaineisSolares() {
  const g = new THREE.Group();
  g.add(box(9.5, 0.4, 7, 0x6b7a8f, 0, 0.2, 0)); // base de concreto

  for (let i = -1; i <= 1; i++) {
    const suporte = new THREE.Group();
    suporte.add(cyl(0.12, 0.12, 1.6, 6, 0x9aa5b1, -1.3, 0.8, 0.4));
    suporte.add(cyl(0.12, 0.12, 1.6, 6, 0x9aa5b1, 1.3, 0.8, 0.4));

    const painel = box(3.4, 0.18, 2.6, 0x14336b, 0, 1.75, 0, {
      metalness: 0.4,
      roughness: 0.3
    });
    painel.rotation.x = -0.5;
    suporte.add(painel);

    // grade das células fotovoltaicas (detalhe visual)
    for (let c = -1; c <= 1; c++) {
      const celula = box(1.0, 0.04, 2.3, 0x2f6fbf, c * 1.1, 1.79, 0, { roughness: 0.25 });
      celula.rotation.x = -0.5;
      suporte.add(celula);
    }

    suporte.position.set(i * 3.1, 0.4, 0);
    g.add(suporte);
  }

  // pequeno inversor / caixa de energia ao lado
  g.add(box(0.9, 1.4, 0.6, 0xe2e8f0, 5.2, 0.7, 0));
  g.add(box(0.5, 0.4, 0.06, 0x0f172a, 5.2, 1.0, 0.33, {
    emissive: 0x22c55e,
    emissiveIntensity: 0.9
  }));
  return g;
}

export function buildTurbinaEolica() {
  const g = new THREE.Group();
  g.add(cyl(2.2, 2.8, 0.6, 8, 0x8d99ae, 0, 0.3, 0)); // base
  g.add(cyl(0.35, 0.8, 16, 8, 0xf1f5f9, 0, 8.3, 0)); // torre

  const cabeca = new THREE.Group();
  cabeca.add(box(1.8, 1.0, 1.0, 0xe2e8f0, 0, 0, 0));

  const rotor = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const pivo = new THREE.Group();
    pivo.add(box(0.28, 7.5, 0.6, 0xffffff, 0, 3.9, 0));
    pivo.rotation.z = (i * Math.PI * 2) / 3;
    rotor.add(pivo);
  }
  const cubo = cyl(0.4, 0.4, 0.5, 8, 0xffc93c, 0, 0, 0);
  cubo.rotation.x = Math.PI / 2;
  rotor.add(cubo);
  rotor.position.set(0, 0, 0.9);
  cabeca.add(rotor);

  cabeca.position.set(0, 16.3, 0);
  g.add(cabeca);

  // animação: as pás giram com o vento
  g.userData.animar = (t) => {
    rotor.rotation.z = t * 1.1;
  };
  return g;
}

export function buildPosteInteligente() {
  const g = new THREE.Group();
  g.add(cyl(0.6, 0.85, 0.4, 8, 0x6b7280, 0, 0.2, 0));
  g.add(cyl(0.16, 0.24, 6.4, 8, 0x475569, 0, 3.2, 0));
  g.add(box(2.6, 0.18, 0.18, 0x475569, 1.2, 6.3, 0));            // braço
  g.add(box(1.4, 0.35, 0.7, 0x94a3b8, 2.2, 6.05, 0));            // luminária

  const luz = box(1.2, 0.14, 0.55, 0xfff3c4, 2.2, 5.86, 0, {
    emissive: 0xffe066,
    emissiveIntensity: 1.4,
    roughness: 1
  });
  g.add(luz);

  // sensor de presença/luminosidade + antena
  g.add(box(0.5, 0.5, 0.32, 0x22d3ee, 0, 5.3, 0, {
    emissive: 0x0891b2,
    emissiveIntensity: 0.7
  }));
  g.add(cyl(0.04, 0.04, 1.1, 5, 0xcbd5e1, 0, 6.95, 0));

  // mini painel solar no topo
  const mini = box(1.2, 0.1, 0.9, 0x14336b, 0, 6.55, 0, { metalness: 0.35 });
  mini.rotation.x = -0.4;
  g.add(mini);

  g.userData.animar = (t) => {
    luz.material.emissiveIntensity = 1.0 + Math.sin(t * 2) * 0.5;
  };
  return g;
}

/* =========================================================================
 * ZONA 2 — LIXO E RECICLAGEM
 * ======================================================================= */

export function buildLixeiraInteligente() {
  const g = new THREE.Group();
  // cores da coleta seletiva: azul=papel, vermelho=plástico, verde=vidro, amarelo=metal
  const cores = [0x1565c0, 0xd32f2f, 0x2e7d32, 0xf9a825];

  cores.forEach((cor, i) => {
    const x = (i - 1.5) * 1.7;
    g.add(box(1.35, 2.0, 1.35, cor, x, 1.0, 0));
    g.add(box(1.5, 0.18, 1.5, 0x334155, x, 2.05, 0));      // tampa
    g.add(box(0.9, 0.25, 0.06, 0x0f172a, x, 1.75, 0.7));   // boca
    g.add(box(0.5, 0.35, 0.08, 0x0f172a, x, 1.2, 0.7, {    // display de nível
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9
    }));
  });

  // antena que comunica com a central de limpeza
  g.add(cyl(0.05, 0.05, 1.7, 5, 0xcbd5e1, 2.55, 2.9, 0));
  const sinal = sph(0.24, 0x22d3ee, 2.55, 3.85, 0, {
    emissive: 0x06b6d4,
    emissiveIntensity: 1.2
  });
  g.add(sinal);

  g.userData.animar = (t) => {
    sinal.position.y = 3.85 + Math.sin(t * 3) * 0.15;
    sinal.material.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.5;
  };
  return g;
}

export function buildComposteira() {
  const g = new THREE.Group();
  g.add(box(4.8, 0.25, 3.4, 0x8d6e63, 0, 0.12, 0));

  // três caixas em cascata (sistema de compostagem doméstica)
  for (let i = 0; i < 3; i++) {
    const alt = 1.25 - i * 0.15;
    const caixa = new THREE.Group();
    caixa.add(box(1.3, alt, 1.3, 0x9c6b3f, 0, alt / 2, 0));
    caixa.add(box(1.42, 0.12, 1.42, 0x7a5230, 0, alt + 0.05, 0));
    caixa.position.set((i - 1) * 1.5, 0.25, 0);
    g.add(caixa);
  }

  // adubo produzido + canteiro
  g.add(box(2.0, 0.28, 1.3, 0x4e342e, 0, 0.36, 2.1));
  for (let i = 0; i < 5; i++) {
    g.add(sph(0.22, 0x66bb6a, -0.8 + i * 0.4, 0.62, 2.1 + (i % 2) * 0.3));
  }
  g.add(arvore(3.2, 1.8, 0.6, 0x66bb6a));
  return g;
}

/** Estacao de coleta seletiva: os cinco contentores coloridos lado a lado. */
export function buildColetaSeletiva() {
  const g = new THREE.Group();
  g.add(box(7.6, 0.28, 2.8, 0x94a3b8, 0, 0.14, 0));   // piso da estação

  // azul = papel, vermelho = plástico, verde = vidro, amarelo = metal,
  // marrom = orgânico — a mesma ordem das placas da coleta seletiva.
  const cores = [0x2563eb, 0xdc2626, 0x16a34a, 0xeab308, 0x78350f];
  const tampas = [];
  cores.forEach((cor, i) => {
    const x = -3.0 + i * 1.5;
    g.add(box(1.15, 1.5, 1.15, cor, x, 1.0, 0));
    g.add(box(1.0, 0.6, 0.06, 0xffffff, x, 1.2, 0.6, { transparent: true, opacity: 0.85 }));
    const tampa = box(1.3, 0.16, 1.3, 0x1f2937, x, 1.83, 0);
    tampas.push(tampa);
    g.add(tampa);
  });

  // placa da estação, com o símbolo da reciclagem montado em três barras
  [-3.4, 3.4].forEach((x) => g.add(cyl(0.12, 0.14, 3.4, 6, 0x64748b, x, 1.7, -1.2)));
  const placa = box(7.4, 1.3, 0.16, 0x0f766e, 0, 3.2, -1.2, {
    emissive: 0x0d9488, emissiveIntensity: 0.35
  });
  g.add(placa);
  [0, 2.09, 4.19].forEach((ang) => {
    const barra = box(1.0, 0.18, 0.1, 0xbbf7d0, 0, 0, -1.05, {
      emissive: 0x4ade80, emissiveIntensity: 0.7
    });
    barra.position.x = Math.cos(ang) * 0.55;
    barra.position.y = 3.2 + Math.sin(ang) * 0.55;
    barra.rotation.z = ang + Math.PI / 2;
    g.add(barra);
  });

  g.userData.animar = (t) => {
    // as tampas "respiram" uma depois da outra, chamando atenção de longe
    tampas.forEach((tp, i) => {
      tp.position.y = 1.83 + Math.max(0, Math.sin(t * 1.4 + i * 0.9)) * 0.18;
    });
    placa.material.emissiveIntensity = 0.25 + Math.sin(t * 2) * 0.15;
  };
  return g;
}

/* =========================================================================
 * ZONA 3 — MOBILIDADE
 * ======================================================================= */

export function buildCiclovia() {
  const g = new THREE.Group();

  // faixa vermelha com marcações centrais
  g.add(box(5, 0.1, 26, 0xb63f31, 0, 0.06, 0));
  for (let i = -5; i <= 5; i++) {
    g.add(box(0.2, 0.12, 1.6, 0xffffff, 0, 0.12, i * 2.4));
  }

  // bicicletário
  for (let i = -1; i <= 1; i++) {
    const arco = new THREE.Group();
    arco.add(cyl(0.07, 0.07, 1.1, 6, 0x94a3b8, -0.45, 0.55, 0));
    arco.add(cyl(0.07, 0.07, 1.1, 6, 0x94a3b8, 0.45, 0.55, 0));
    arco.add(box(1.0, 0.14, 0.14, 0x94a3b8, 0, 1.1, 0));
    arco.position.set(4.2, 0, i * 1.8);
    g.add(arco);
  }

  // uma bicicleta estilizada estacionada
  const bike = new THREE.Group();
  [-0.9, 0.9].forEach((x) => {
    const r = cyl(0.55, 0.55, 0.12, 12, 0x1f2937, x, 0.55, 0);
    r.rotation.x = Math.PI / 2;
    bike.add(r);
  });
  bike.add(box(1.9, 0.12, 0.1, 0x16a34a, 0, 0.95, 0));
  bike.add(box(0.1, 0.75, 0.1, 0x16a34a, -0.3, 1.2, 0));
  bike.add(box(0.55, 0.12, 0.12, 0x16a34a, 0.85, 1.35, 0));
  bike.add(box(0.5, 0.15, 0.2, 0x111827, -0.4, 1.58, 0));
  bike.position.set(4.9, 0, 0);
  bike.rotation.y = Math.PI / 2;
  g.add(bike);

  // placa de sinalização de ciclovia
  g.add(cyl(0.08, 0.08, 2.6, 6, 0x64748b, -3.6, 1.3, 0));
  g.add(box(1.3, 1.3, 0.12, 0x1d4ed8, -3.6, 2.8, 0));
  g.add(box(0.9, 0.9, 0.05, 0xffffff, -3.6, 2.8, 0.09));
  return g;
}

export function buildCarroEletrico() {
  const g = new THREE.Group();

  const carro = new THREE.Group();
  carro.add(box(4.2, 0.9, 1.9, 0x22c55e, 0, 0.85, 0));
  carro.add(box(2.4, 0.8, 1.75, 0x86efac, -0.2, 1.65, 0, {
    roughness: 0.15,
    transparent: true,
    opacity: 0.85
  }));
  [-1.35, 1.35].forEach((x) => {
    [-1.0, 1.0].forEach((z) => {
      const r = cyl(0.45, 0.45, 0.3, 10, 0x1f2937, x, 0.45, z);
      r.rotation.x = Math.PI / 2;
      carro.add(r);
    });
  });
  carro.add(box(0.15, 0.25, 1.2, 0xfff7cc, 2.12, 0.9, 0, {
    emissive: 0xfde68a,
    emissiveIntensity: 0.8
  }));
  carro.position.set(-1.8, 0, 0);
  g.add(carro);

  // eletroposto de recarga
  g.add(box(2.2, 0.3, 2.2, 0x64748b, 2.8, 0.15, 0));
  g.add(box(0.95, 2.2, 0.75, 0x0f766e, 2.8, 1.4, 0));
  const tela = box(0.65, 0.6, 0.08, 0x0f172a, 2.8, 2.0, 0.4, {
    emissive: 0x22d3ee,
    emissiveIntensity: 1.0
  });
  g.add(tela);

  const cabo = cyl(0.07, 0.07, 1.7, 6, 0x111827, 2.15, 1.25, 0.5);
  cabo.rotation.z = 0.95;
  g.add(cabo);

  const raio = box(0.2, 0.95, 0.1, 0xfacc15, 2.8, 2.95, 0.2, {
    emissive: 0xfacc15,
    emissiveIntensity: 1.2
  });
  raio.rotation.z = 0.35;
  g.add(raio);

  g.userData.animar = (t) => {
    tela.material.emissiveIntensity = 0.7 + Math.sin(t * 3) * 0.4;
    raio.material.emissiveIntensity = 0.9 + Math.abs(Math.sin(t * 2)) * 0.6;
  };
  return g;
}

export function buildPontoOnibus() {
  const g = new THREE.Group();
  g.add(box(7.4, 0.2, 3.4, 0x94a3b8, 0, 0.1, 0));
  g.add(box(7.6, 0.25, 3.6, 0x0ea5e9, 0, 3.0, 0)); // cobertura

  [-3.4, 3.4].forEach((x) => {
    g.add(cyl(0.12, 0.12, 3.0, 6, 0x475569, x, 1.5, -1.5));
    g.add(cyl(0.12, 0.12, 3.0, 6, 0x475569, x, 1.5, 1.5));
  });

  g.add(box(7.2, 2.4, 0.1, 0xbae6fd, 0, 1.4, -1.6, {
    transparent: true,
    opacity: 0.45,
    roughness: 0.1
  }));

  // banco
  g.add(box(5.4, 0.18, 0.75, 0x8d6e63, 0, 0.75, -1.05));
  g.add(box(5.4, 0.7, 0.14, 0x8d6e63, 0, 1.18, -1.42));

  // painel digital com previsão de chegada em tempo real
  const painel = box(2.6, 1.35, 0.14, 0x0f172a, 0, 2.1, 1.6, {
    emissive: 0x22c55e,
    emissiveIntensity: 0.9
  });
  g.add(painel);
  for (let i = 0; i < 3; i++) {
    g.add(box(2.0, 0.16, 0.05, 0x86efac, 0, 2.5 - i * 0.4, 1.68, {
      emissive: 0x4ade80,
      emissiveIntensity: 0.9
    }));
  }

  // placa de parada
  g.add(cyl(0.09, 0.09, 3.6, 6, 0x64748b, 4.6, 1.8, 0));
  g.add(box(1.2, 1.2, 0.12, 0x1d4ed8, 4.6, 3.6, 0));

  g.userData.animar = (t) => {
    painel.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(t * 1.5)) * 0.6;
  };
  return g;
}

/* =========================================================================
 * ZONA 4 — ÁGUA E VERDE
 * ======================================================================= */

export function buildParqueUrbano() {
  const g = new THREE.Group();
  g.add(cyl(11, 11, 0.3, 14, 0x4ade80, 0, 0.15, 0)); // gramado elevado

  // caminho de pedras
  for (let i = -4; i <= 4; i++) {
    g.add(cyl(0.9, 0.9, 0.1, 6, 0xd6d3d1, i * 2.1, 0.34, Math.sin(i * 0.6) * 2.6));
  }

  // arborização
  [[-6, -5], [-7, 3], [6, -6], [7, 4], [0, -7], [3, 6], [-3, 7]].forEach(([x, z], i) => {
    g.add(arvore(x, z, 1 + (i % 3) * 0.12));
  });

  // bancos
  [[-4.5, 4.5], [4.5, -4.5]].forEach(([x, z]) => {
    const b = new THREE.Group();
    b.add(box(2.2, 0.16, 0.6, 0x8d6e63, 0, 0.75, 0));
    b.add(box(2.2, 0.6, 0.12, 0x8d6e63, 0, 1.05, -0.28));
    b.add(box(0.14, 0.6, 0.5, 0x475569, -0.95, 0.45, 0));
    b.add(box(0.14, 0.6, 0.5, 0x475569, 0.95, 0.45, 0));
    b.position.set(x, 0.3, z);
    g.add(b);
  });

  // fonte central
  g.add(cyl(2.0, 2.2, 0.7, 12, 0xcbd5e1, 0, 0.65, 0));
  const agua = cyl(1.75, 1.75, 0.18, 12, 0x38bdf8, 0, 0.98, 0, {
    transparent: true,
    opacity: 0.8,
    roughness: 0.05
  });
  g.add(agua);

  g.userData.animar = (t) => {
    agua.position.y = 0.98 + Math.sin(t * 2) * 0.05;
  };
  return g;
}

export function buildCaptacaoChuva() {
  const g = new THREE.Group();

  // estrutura com telhado inclinado
  g.add(box(0.35, 3.4, 0.35, 0x8d99ae, -2.6, 1.7, -1.6));
  g.add(box(0.35, 3.4, 0.35, 0x8d99ae, -2.6, 1.7, 1.6));
  g.add(box(0.35, 2.4, 0.35, 0x8d99ae, 2.2, 1.2, -1.6));
  g.add(box(0.35, 2.4, 0.35, 0x8d99ae, 2.2, 1.2, 1.6));

  const telhado = box(6.4, 0.24, 4.2, 0x3f6212, -0.2, 3.05, 0);
  telhado.rotation.z = -0.18;
  g.add(telhado);

  // calha + tubo de descida
  g.add(box(0.45, 0.35, 4.2, 0xa3a3a3, 2.7, 2.2, 0));
  g.add(cyl(0.18, 0.18, 2.3, 8, 0xa3a3a3, 2.7, 1.15, 1.95));

  // cisterna
  g.add(cyl(1.5, 1.5, 3.0, 12, 0x0284c7, 4.8, 1.5, 1.95));
  g.add(cyl(1.6, 1.6, 0.22, 12, 0x0369a1, 4.8, 3.1, 1.95));
  const nivel = box(0.28, 2.2, 0.1, 0x7dd3fc, 4.8, 1.4, 3.45, {
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8
  });
  g.add(nivel);

  // torneira + canteiro regado com a água captada
  const torneira = cyl(0.09, 0.09, 0.6, 6, 0x64748b, 6.1, 0.55, 1.95);
  torneira.rotation.z = Math.PI / 2;
  g.add(torneira);
  g.add(box(3.4, 0.42, 1.7, 0x6b4f3a, 0, 0.21, 3.6));
  for (let i = 0; i < 5; i++) {
    g.add(sph(0.3, 0x22c55e, -1.3 + i * 0.65, 0.58, 3.6));
  }

  g.userData.animar = (t) => {
    nivel.material.emissiveIntensity = 0.6 + Math.sin(t * 1.8) * 0.35;
  };
  return g;
}

/** Horta comunitária: canteiros de madeira, hortaliças e um regador. */
export function buildHortaComunitaria() {
  const g = new THREE.Group();

  const folhas = [];
  for (let c = 0; c < 3; c++) {
    const canteiro = new THREE.Group();
    canteiro.add(box(5.4, 0.7, 1.8, 0x8d6e63, 0, 0.35, 0));
    canteiro.add(box(5.0, 0.2, 1.5, 0x4e342e, 0, 0.75, 0));      // terra
    for (let i = 0; i < 6; i++) {
      const pe = new THREE.Group();
      const cor = c === 1 ? 0x84cc16 : 0x22c55e;
      pe.add(cyl(0.05, 0.07, 0.35, 5, 0x4d7c0f, 0, 0.17, 0));
      pe.add(sph(0.3, cor, 0, 0.5, 0));
      pe.add(sph(0.2, cor, 0.2, 0.62, 0.15));
      pe.position.set(-2.1 + i * 0.84, 0.85, 0);
      folhas.push(pe);
      canteiro.add(pe);
    }
    canteiro.position.z = (c - 1) * 2.6;
    g.add(canteiro);
  }

  // regador apoiado no canto
  const bico = cyl(0.07, 0.1, 0.7, 6, 0x0ea5e9, 0.42, 0.5, 0.1);
  bico.rotation.z = -0.9;
  const regador = new THREE.Group();
  regador.add(cyl(0.3, 0.34, 0.6, 8, 0x38bdf8, 0, 0.3, 0));
  regador.add(bico);
  regador.position.set(3.4, 0, 2.2);
  g.add(regador);

  // placa da horta
  g.add(cyl(0.12, 0.14, 2.2, 6, 0x7a5230, -3.4, 1.1, 2.4));
  g.add(box(2.4, 0.9, 0.14, 0x15803d, -3.4, 2.2, 2.4, {
    emissive: 0x16a34a, emissiveIntensity: 0.3
  }));
  g.add(arvore(4.2, -3.4, 0.7, 0x4ade80));

  g.userData.animar = (t) => {
    folhas.forEach((f, i) => { f.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.13; });
  };
  return g;
}

/* =========================================================================
 * ZONA 5 — TECNOLOGIA SOCIAL
 * ======================================================================= */

export function buildTotemCidadao() {
  const g = new THREE.Group();
  g.add(cyl(1.3, 1.5, 0.3, 8, 0x475569, 0, 0.15, 0));
  g.add(box(1.9, 3.4, 0.65, 0x312e81, 0, 1.9, 0));

  const tela = box(1.5, 2.3, 0.12, 0x0f172a, 0, 2.2, 0.35, {
    emissive: 0x818cf8,
    emissiveIntensity: 1.1
  });
  g.add(tela);

  // ícones do app na tela
  for (let i = 0; i < 4; i++) {
    g.add(box(0.44, 0.44, 0.05, 0xa5b4fc, -0.35 + (i % 2) * 0.7, 2.7 - Math.floor(i / 2) * 0.72, 0.42, {
      emissive: 0xc7d2fe,
      emissiveIntensity: 0.9
    }));
  }
  g.add(box(2.1, 0.28, 0.95, 0x1e1b4b, 0, 3.72, 0)); // "chapéu" do totem

  // ondas de conectividade flutuando
  const ondas = new THREE.Group();
  for (let i = 1; i <= 3; i++) {
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(0.3 * i, 0.05, 6, 16, Math.PI),
      mat(0x818cf8, { emissive: 0x6366f1, emissiveIntensity: 1.2 })
    );
    anel.position.y = 4.25;
    ondas.add(anel);
  }
  g.add(ondas);

  g.userData.animar = (t) => {
    tela.material.emissiveIntensity = 0.9 + Math.sin(t * 2.5) * 0.35;
    ondas.children.forEach((a, i) => {
      a.scale.setScalar(1 + Math.sin(t * 2 + i * 0.7) * 0.12);
    });
  };
  return g;
}

export function buildDadosAbertos() {
  const g = new THREE.Group();
  g.add(box(6.8, 0.3, 3.0, 0x334155, 0, 0.15, 0));
  [-2.8, 2.8].forEach((x) => g.add(cyl(0.18, 0.24, 3.2, 8, 0x64748b, x, 1.6, 0)));

  g.add(box(6.4, 3.3, 0.38, 0x1e293b, 0, 3.5, 0));    // moldura
  const tela = box(5.9, 2.75, 0.14, 0x020617, 0, 3.5, 0.26, {
    emissive: 0x22d3ee,
    emissiveIntensity: 0.5
  });
  g.add(tela);

  // gráfico de barras "em tempo real"
  const barras = [];
  for (let i = 0; i < 7; i++) {
    const b = box(0.52, 1.0, 0.08, 0x4ade80, -2.1 + i * 0.7, 3.0, 0.35, {
      emissive: 0x22c55e,
      emissiveIntensity: 0.9
    });
    barras.push(b);
    g.add(b);
  }

  g.userData.animar = (t) => {
    barras.forEach((b, i) => {
      const h = 0.5 + (Math.sin(t * 1.2 + i * 0.8) * 0.5 + 0.5) * 1.9;
      b.scale.y = h;
      b.position.y = 2.4 + h / 2;
    });
  };
  return g;
}

/** Praça com Wi-Fi público: antena solar com ondas pulsando e um banco. */
export function buildWifiPublico() {
  const g = new THREE.Group();

  g.add(cyl(3.2, 3.4, 0.3, 12, 0xcbd5e1, 0, 0.15, 0));    // piso circular
  g.add(cyl(0.22, 0.3, 5.2, 8, 0x475569, 0, 2.6, 0));      // mastro
  g.add(box(1.0, 0.5, 1.0, 0x1e293b, 0, 5.3, 0));          // caixa da antena
  g.add(cyl(0.06, 0.06, 1.1, 6, 0x94a3b8, 0, 6.1, 0));     // haste

  // painel solar: a praça não gasta energia da rede para ficar conectada
  const painel = box(1.8, 0.1, 1.2, 0x1d4ed8, 0, 4.5, 0.9, {
    emissive: 0x1e40af, emissiveIntensity: 0.3
  });
  painel.rotation.x = -0.5;
  g.add(painel);

  // ondas de Wi-Fi: três arcos que crescem e somem, um atrás do outro
  const ondas = [];
  for (let i = 0; i < 3; i++) {
    const onda = new THREE.Mesh(
      new THREE.TorusGeometry(0.55 + i * 0.45, 0.07, 6, 20, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
    );
    onda.position.y = 6.2;
    onda.rotation.x = Math.PI;
    ondas.push(onda);
    g.add(onda);
  }

  // banco para quem para para usar a rede
  const banco = new THREE.Group();
  banco.add(box(2.6, 0.16, 0.6, 0x8d6e63, 0, 0.75, 0));
  banco.add(box(0.16, 0.6, 0.5, 0x475569, -1.1, 0.45, 0));
  banco.add(box(0.16, 0.6, 0.5, 0x475569, 1.1, 0.45, 0));
  banco.position.set(0, 0, 2.4);
  g.add(banco);
  g.add(arvore(-3.6, 2.6, 0.7, 0x60a5fa));

  g.userData.animar = (t) => {
    ondas.forEach((onda, i) => {
      const fase = (t * 0.9 + i * 0.33) % 1;
      onda.scale.setScalar(0.6 + fase * 1.5);
      onda.material.opacity = 0.85 * (1 - fase);
    });
  };
  return g;
}

/* =========================================================================
 * FUGA DO ANIMAL — perseguidores e abrigos
 * ======================================================================= */

/**
 * Cachorro bravo low-poly. A origem fica no chão (y = 0) e o focinho aponta
 * para +Z, para o grupo poder ser girado com lookAt/atan2.
 */
export function buildCachorro() {
  const g = new THREE.Group();
  const pelo = 0x8a5a2b;
  const peloEscuro = 0x6b431f;

  g.add(box(0.7, 0.62, 1.5, pelo, 0, 0.85, 0));            // tronco
  g.add(box(0.72, 0.3, 0.9, peloEscuro, 0, 1.05, -0.1));   // dorso mais escuro

  // cabeca
  const cabeca = new THREE.Group();
  cabeca.add(box(0.55, 0.5, 0.5, pelo, 0, 0, 0));
  cabeca.add(box(0.3, 0.26, 0.4, peloEscuro, 0, -0.09, 0.4));   // focinho
  cabeca.add(sph(0.07, 0x111111, 0, -0.06, 0.6));              // nariz
  cabeca.add(sph(0.06, 0xfff2c4, -0.16, 0.1, 0.26, {           // olhos "bravos"
    emissive: 0xffd166, emissiveIntensity: 0.7
  }));
  cabeca.add(sph(0.06, 0xfff2c4, 0.16, 0.1, 0.26, {
    emissive: 0xffd166, emissiveIntensity: 0.7
  }));
  cabeca.add(box(0.16, 0.3, 0.1, peloEscuro, -0.24, 0.3, -0.05)); // orelhas
  cabeca.add(box(0.16, 0.3, 0.1, peloEscuro, 0.24, 0.3, -0.05));
  cabeca.position.set(0, 1.15, 0.85);
  g.add(cabeca);

  // patas (guardadas para animar a corrida)
  const patas = [];
  [[-0.26, 0.5], [0.26, 0.5], [-0.26, -0.5], [0.26, -0.5]].forEach(([x, z]) => {
    const p = box(0.2, 0.85, 0.22, peloEscuro, x, 0.42, z);
    patas.push(p);
    g.add(p);
  });

  const rabo = box(0.14, 0.14, 0.6, pelo, 0, 1.1, -0.85);
  rabo.rotation.x = -0.6;
  g.add(rabo);

  g.userData.animar = (t) => {
    // trote: patas cruzadas em oposicao de fase
    patas.forEach((p, i) => {
      const fase = i === 0 || i === 3 ? 0 : Math.PI;
      p.rotation.x = Math.sin(t * 11 + fase) * 0.7;
    });
    rabo.rotation.y = Math.sin(t * 9) * 0.5;
    g.position.y = Math.abs(Math.sin(t * 11)) * 0.09;
  };
  return g;
}

/** Enxame de abelhas: um punhado de corpinhos orbitando um centro. */
export function buildEnxameAbelhas() {
  const g = new THREE.Group();
  const nucleo = new THREE.Group();
  nucleo.position.y = 1.5;
  g.add(nucleo);

  // nuvem escura no meio: faz o enxame ser lido como UM bicho, nao como
  // varias caixinhas soltas no ar
  const nuvem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 0),
    new THREE.MeshBasicMaterial({ color: 0x3f3a1a, transparent: true, opacity: 0.4 })
  );
  nucleo.add(nuvem);

  const abelhas = [];
  for (let i = 0; i < 20; i++) {
    const a = new THREE.Group();
    a.add(box(0.13, 0.11, 0.2, 0xf7c948, 0, 0, 0, {
      emissive: 0xb08800, emissiveIntensity: 0.35
    }));
    a.add(box(0.14, 0.12, 0.06, 0x1a1a1a, 0, 0, 0.02));
    a.add(box(0.26, 0.02, 0.14, 0xffffff, 0, 0.08, -0.02, {
      transparent: true, opacity: 0.65
    }));
    a.userData.raio = 0.35 + Math.random() * 0.8;
    a.userData.fase = Math.random() * Math.PI * 2;
    a.userData.altura = (Math.random() - 0.5) * 0.85;
    a.userData.giro = 2.0 + Math.random() * 2.0;
    abelhas.push(a);
    nucleo.add(a);
  }

  g.userData.animar = (t) => {
    abelhas.forEach((a) => {
      const ang = t * a.userData.giro + a.userData.fase;
      a.position.set(
        Math.cos(ang) * a.userData.raio,
        a.userData.altura + Math.sin(t * 3 + a.userData.fase) * 0.25,
        Math.sin(ang) * a.userData.raio
      );
      a.rotation.y = -ang;
    });
    nucleo.position.y = 1.5 + Math.sin(t * 2.2) * 0.25;
    nuvem.scale.setScalar(1 + Math.sin(t * 3.5) * 0.09);
  };
  return g;
}

/** Ganso furioso: bicho pequeno, rapido e absurdamente irritado. */
export function buildGanso() {
  const g = new THREE.Group();
  const branco = 0xf3f4f6;

  g.add(box(0.6, 0.65, 1.1, branco, 0, 0.95, 0));           // corpo
  g.add(box(0.62, 0.25, 0.5, 0xe5e7eb, 0, 1.0, -0.4));      // cauda

  const pescoco = box(0.26, 0.9, 0.26, branco, 0, 1.6, 0.35);
  pescoco.rotation.x = 0.35;
  g.add(pescoco);

  const cabeca = new THREE.Group();
  cabeca.add(box(0.32, 0.32, 0.4, branco, 0, 0, 0));
  cabeca.add(box(0.16, 0.14, 0.42, 0xf59e0b, 0, -0.03, 0.36)); // bico
  cabeca.add(sph(0.06, 0x111111, -0.13, 0.08, 0.1));
  cabeca.add(sph(0.06, 0x111111, 0.13, 0.08, 0.1));
  cabeca.position.set(0, 2.15, 0.65);
  g.add(cabeca);

  const asas = [
    box(0.12, 0.42, 0.8, 0xe5e7eb, -0.34, 1.05, 0),
    box(0.12, 0.42, 0.8, 0xe5e7eb, 0.34, 1.05, 0)
  ];
  asas.forEach((a) => g.add(a));

  const pernas = [
    box(0.12, 0.6, 0.14, 0xf59e0b, -0.16, 0.3, 0),
    box(0.12, 0.6, 0.14, 0xf59e0b, 0.16, 0.3, 0)
  ];
  pernas.forEach((p) => g.add(p));

  g.userData.animar = (t) => {
    pernas.forEach((p, i) => { p.rotation.x = Math.sin(t * 13 + i * Math.PI) * 0.8; });
    asas[0].rotation.z = -0.4 - Math.abs(Math.sin(t * 8)) * 0.6;
    asas[1].rotation.z = 0.4 + Math.abs(Math.sin(t * 8)) * 0.6;
    cabeca.position.z = 0.65 + Math.sin(t * 6) * 0.08;
    g.position.y = Math.abs(Math.sin(t * 13)) * 0.07;
  };
  return g;
}

/**
 * Catalogo de perseguidores. A cada erro é sorteado um deles.
 * `escala` ajusta o tamanho e `altura` diz a que altura fica o balão do nome.
 */
export const ANIMAIS = [
  { id: 'cachorro', nome: 'Cachorro bravo', icone: '🐕', build: buildCachorro, altura: 2.4, cor: '#f87171' },
  { id: 'abelhas', nome: 'Enxame de abelhas', icone: '🐝', build: buildEnxameAbelhas, altura: 3.2, cor: '#facc15' },
  { id: 'ganso', nome: 'Ganso furioso', icone: '🦢', build: buildGanso, altura: 3.0, cor: '#fb923c' }
];

/**
 * Abrigo da Área Segura: plataforma, telhado verde, escudo e um facho de luz
 * bem alto, para o jogador conseguir localizar o abrigo de longe enquanto foge.
 */
export function buildAreaSegura() {
  const g = new THREE.Group();

  // plataforma octogonal
  const base = cyl(6.2, 6.6, 0.45, 8, 0xd6d3d1, 0, 0.22, 0);
  g.add(base);
  g.add(cyl(5.4, 5.4, 0.12, 8, 0x22c55e, 0, 0.5, 0, {
    emissive: 0x16a34a, emissiveIntensity: 0.45
  }));

  // pilares + telhado
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    g.add(cyl(0.22, 0.26, 3.6, 6, 0xf1f5f9, Math.cos(ang) * 4.2, 2.25, Math.sin(ang) * 4.2));
  }
  g.add(cyl(0.4, 6.4, 1.6, 8, 0x15803d, 0, 4.85, 0));      // telhado piramidal
  g.add(cyl(6.6, 6.6, 0.22, 8, 0x166534, 0, 4.1, 0));      // beiral

  // escudo no topo
  const escudo = box(1.5, 1.7, 0.22, 0x22c55e, 0, 6.1, 0, {
    emissive: 0x22c55e, emissiveIntensity: 0.7
  });
  g.add(escudo);
  g.add(box(0.9, 0.22, 0.06, 0xffffff, 0, 6.2, 0.15));
  g.add(box(0.22, 0.9, 0.06, 0xffffff, 0, 6.2, 0.15));

  // facho de luz visivel de longe
  const facho = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 4.5, 42, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  facho.position.y = 21;
  g.add(facho);

  // anel pulsante no chao marcando o raio seguro
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 7, 40),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e, transparent: true, opacity: 0.85, side: THREE.DoubleSide
    })
  );
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.08;
  g.add(anel);

  // bancos, para o abrigo parecer um ponto de encontro de verdade
  [0, Math.PI].forEach((ang) => {
    const b = new THREE.Group();
    b.add(box(2.6, 0.16, 0.6, 0x8d6e63, 0, 0.75, 0));
    b.add(box(0.16, 0.6, 0.5, 0x475569, -1.1, 0.45, 0));
    b.add(box(0.16, 0.6, 0.5, 0x475569, 1.1, 0.45, 0));
    b.position.set(Math.cos(ang) * 3, 0.45, Math.sin(ang) * 3);
    b.rotation.y = -ang;
    g.add(b);
  });

  g.userData.animar = (t) => {
    anel.scale.setScalar(1 + Math.sin(t * 2.4) * 0.05);
    anel.material.opacity = 0.6 + Math.sin(t * 2.4) * 0.25;
    escudo.material.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.3;
    facho.material.opacity = 0.1 + Math.sin(t * 1.5) * 0.04;
  };
  return g;
}

/* =========================================================================
 * PORRETE — a defesa do jogador, vista em primeira pessoa
 * ======================================================================= */

/**
 * Pedaço de madeira que o jogador carrega para revidar as investidas.
 * O grupo fica pendurado na câmera, então é modelado em coordenadas de
 * câmera (+X à direita, −Z para a frente) com a origem no punho.
 */
export function buildPorrete() {
  const g = new THREE.Group();

  g.add(cyl(0.045, 0.055, 0.5, 7, 0x8d6e63, 0, 0.25, 0));   // cabo
  g.add(cyl(0.06, 0.06, 0.14, 7, 0x334155, 0, 0.08, 0));    // fita do punho
  g.add(cyl(0.115, 0.065, 0.62, 7, 0xa05a2c, 0, 0.8, 0));   // corpo
  g.add(sph(0.055, 0x7a4520, 0.09, 0.72, 0.03));            // nós da madeira
  g.add(sph(0.045, 0x7a4520, -0.08, 0.95, -0.02));
  g.add(cyl(0.12, 0.115, 0.08, 7, 0x6b3f1d, 0, 1.09, 0));   // ponta reforçada

  return g;
}

/* =========================================================================
 * COLEGAS — avatares dos outros alunos na mesma cidade
 * ======================================================================= */

/**
 * Avatar low-poly de um colega de turma. A origem fica no chão e o rosto
 * aponta para +Z, como os animais, para poder ser girado com atan2.
 * @param {number} cor cor da camiseta (uma por aluno, sorteada pelo id)
 */
export function buildAvatarColega(cor = 0x38bdf8) {
  const g = new THREE.Group();
  const pele = 0xd9a066;

  const pernas = [
    box(0.22, 0.8, 0.24, 0x334155, -0.15, 0.4, 0),
    box(0.22, 0.8, 0.24, 0x334155, 0.15, 0.4, 0)
  ];
  pernas.forEach((p) => g.add(p));

  g.add(box(0.6, 0.75, 0.36, cor, 0, 1.17, 0));            // camiseta da turma
  g.add(box(0.62, 0.16, 0.38, 0x1e293b, 0, 0.83, 0));      // cintura

  const bracos = [
    box(0.16, 0.66, 0.18, cor, -0.38, 1.2, 0),
    box(0.16, 0.66, 0.18, cor, 0.38, 1.2, 0)
  ];
  bracos.forEach((b) => g.add(b));
  g.add(box(0.15, 0.16, 0.17, pele, -0.38, 0.83, 0));      // mãos
  g.add(box(0.15, 0.16, 0.17, pele, 0.38, 0.83, 0));

  const cabeca = new THREE.Group();
  cabeca.add(box(0.42, 0.44, 0.4, pele, 0, 0, 0));
  cabeca.add(box(0.44, 0.16, 0.42, 0x3f2a1d, 0, 0.19, 0));   // cabelo
  cabeca.add(sph(0.045, 0x111111, -0.1, 0.02, 0.21));
  cabeca.add(sph(0.045, 0x111111, 0.1, 0.02, 0.21));
  cabeca.position.set(0, 1.78, 0);
  g.add(cabeca);

  // mochila: ajuda a reconhecer o colega mesmo de costas
  g.add(box(0.42, 0.5, 0.18, 0x1d4ed8, 0, 1.2, -0.27));

  /**
   * Animação de caminhada. `rapidez` (0–1) vem da distância que o colega
   * percorreu entre duas atualizações de rede: parado, ele só respira.
   */
  g.userData.animarColega = (t, rapidez = 0) => {
    const balanco = Math.sin(t * 9) * 0.7 * rapidez;
    pernas[0].rotation.x = balanco;
    pernas[1].rotation.x = -balanco;
    bracos[0].rotation.x = -balanco;
    bracos[1].rotation.x = balanco;
    g.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * rapidez;
    cabeca.position.y = 1.78 + Math.sin(t * 1.8) * 0.012;
  };
  return g;
}

/* =========================================================================
 * SANGUE — partículas mostradas quando o animal morde o jogador
 * ======================================================================= */

/**
 * Gotas de sangue reaproveitadas num pool: `explodir()` reposiciona todas
 * num ponto e `atualizar(dt)` faz cada uma cair até sumir. O visual é
 * cartoon, no mesmo estilo low-poly do resto da cidade.
 */
export function criarSangue(scene, quantidade = 26) {
  // pequenas de proposito: as gotas nascem a pouco mais de um metro da
  // camera, e qualquer coisa maior que isso vira um borrao vermelho na tela
  const geometria = new THREE.TetrahedronGeometry(0.07, 0);

  const gotas = [];
  for (let i = 0; i < quantidade; i++) {
    const malha = new THREE.Mesh(
      geometria,
      new THREE.MeshBasicMaterial({ color: 0xc81e2b, transparent: true, opacity: 1 })
    );
    malha.visible = false;
    scene.add(malha);
    gotas.push({ malha, vel: new THREE.Vector3(), vida: 0 });
  }

  return {
    /** Espirra sangue a partir de um ponto do mundo. */
    explodir(posicao, forca = 1) {
      gotas.forEach((gota) => {
        const ang = Math.random() * Math.PI * 2;
        const alcance = (1.6 + Math.random() * 3.2) * forca;
        gota.vel.set(
          Math.cos(ang) * alcance,
          2.2 + Math.random() * 3.4,
          Math.sin(ang) * alcance
        );
        gota.malha.position.set(
          posicao.x + (Math.random() - 0.5) * 0.5,
          Math.max(0.4, posicao.y - 0.4) + Math.random() * 0.5,
          posicao.z + (Math.random() - 0.5) * 0.5
        );
        gota.malha.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        gota.malha.scale.setScalar(0.7 + Math.random() * 0.9);
        gota.malha.material.opacity = 1;
        gota.malha.visible = true;
        gota.vida = 1.5 + Math.random() * 0.7;
      });
    },

    /** Faz as gotas caírem e desbotarem. Chamada a cada quadro. */
    atualizar(dt) {
      for (const gota of gotas) {
        if (gota.vida <= 0) continue;
        gota.vida -= dt;
        if (gota.vida <= 0) { gota.malha.visible = false; continue; }
        gota.vel.y -= 9.8 * dt;
        gota.malha.position.addScaledVector(gota.vel, dt);
        if (gota.malha.position.y < 0.06) {
          // chegou ao chão: para de quicar e vira uma mancha que desbota
          gota.malha.position.y = 0.06;
          gota.vel.set(0, 0, 0);
          gota.malha.scale.y = 0.25;
        } else {
          gota.malha.rotation.x += dt * 6;
          gota.malha.rotation.z += dt * 4;
        }
        gota.malha.material.opacity = Math.min(1, gota.vida);
      }
    }
  };
}
