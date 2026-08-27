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
