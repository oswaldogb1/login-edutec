/* ==========================================================================
   Batalha das Cruzadinhas! — Cenario 3D (Three.js r128)
   Cidade inteligente low-poly animada, usada como ambiente das duas telas.
   Degrada com elegancia: se WebGL/Three falhar, a pagina fica so com o
   gradiente do CSS e o jogo continua funcionando normalmente.
   ========================================================================== */
(function (global) {
  'use strict';

  var VAZIO = { ok: false, celebrar: function () {}, pulsar: function () {} };

  function init(canvas, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !canvas) return VAZIO;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { return VAZIO; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b1f, 0.015);

    var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);

    /* ------------------------------------------------------------- luzes */
    scene.add(new THREE.HemisphereLight(0x7fd7ff, 0x0a1030, 0.9));
    var sol = new THREE.DirectionalLight(0xffd88a, 1.1);
    sol.position.set(28, 44, 18);
    scene.add(sol);
    var neon = new THREE.PointLight(0x38f2c4, 1.5, 90);
    neon.position.set(-14, 12, -10);
    scene.add(neon);

    /* -------------------------------------------------------------- chao */
    var chao = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshStandardMaterial({ color: 0x0b1130, roughness: 0.95, metalness: 0.1 })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -0.05;
    scene.add(chao);

    var ruas = new THREE.GridHelper(320, 64, 0x2de0c0, 0x18306b);
    ruas.material.transparent = true;
    ruas.material.opacity = 0.35;
    scene.add(ruas);

    /* ----------------------------------------------------------- predios */
    var PALETA = [0x1e3a8a, 0x155e75, 0x1d4ed8, 0x0f766e, 0x3730a3, 0x0e7490];
    var predios = [];
    var malha = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35 }),
      150
    );
    var TOTAL = 150;
    var dummy = new THREE.Object3D();
    var cor = new THREE.Color();

    for (var i = 0; i < TOTAL; i++) {
      var anel = 10 + Math.random() * 54;
      var ang = Math.random() * Math.PI * 2;
      var x = Math.cos(ang) * anel;
      var z = Math.sin(ang) * anel;
      var alt = 2 + Math.pow(Math.random(), 2.2) * 26;
      var larg = 1.6 + Math.random() * 3.4;
      predios.push({ x: x, z: z, alt: alt, larg: larg, fase: Math.random() * Math.PI * 2, vel: 0.25 + Math.random() * 0.6 });
      dummy.position.set(x, alt / 2, z);
      dummy.scale.set(larg, alt, larg);
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      malha.setMatrixAt(i, dummy.matrix);
      cor.setHex(PALETA[i % PALETA.length]);
      malha.setColorAt(i, cor);
    }
    malha.instanceMatrix.needsUpdate = true;
    scene.add(malha);

    /* ------------------------------------------------------ janelas acesas */
    var pontos = [];
    predios.forEach(function (p) {
      var n = Math.floor(p.alt * 1.6);
      for (var k = 0; k < n; k++) {
        pontos.push(
          p.x + (Math.random() - 0.5) * p.larg,
          0.8 + Math.random() * (p.alt - 1),
          p.z + (Math.random() - 0.5) * p.larg
        );
      }
    });
    var janelasGeo = new THREE.BufferGeometry();
    janelasGeo.setAttribute('position', new THREE.Float32BufferAttribute(pontos, 3));
    var janelas = new THREE.Points(janelasGeo, new THREE.PointsMaterial({
      color: 0xffe8a8, size: 0.38, transparent: true, opacity: 0.9
    }));
    scene.add(janelas);

    /* --------------------------------------------------- arvores urbanas */
    var arvores = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8, flatShading: true }),
      70
    );
    for (var a = 0; a < 70; a++) {
      var ra = 8 + Math.random() * 46;
      var aa = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(aa) * ra, 1.1 + Math.random() * 0.6, Math.sin(aa) * ra);
      var s = 0.7 + Math.random() * 0.8;
      dummy.scale.set(s, s * 1.25, s);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      arvores.setMatrixAt(a, dummy.matrix);
    }
    arvores.instanceMatrix.needsUpdate = true;
    scene.add(arvores);

    /* ------------------------------------------- veiculos (mobilidade urbana) */
    var veiculos = [];
    var vGeo = new THREE.BoxGeometry(0.5, 0.22, 1.5);
    for (var v = 0; v < 26; v++) {
      var m = new THREE.Mesh(vGeo, new THREE.MeshBasicMaterial({ color: v % 2 ? 0x67e8f9 : 0xfbbf24 }));
      var eixo = Math.random() < 0.5;
      var faixa = (Math.floor(Math.random() * 11) - 5) * 10;
      m.position.set(eixo ? faixa : -70 + Math.random() * 140, 0.35, eixo ? -70 + Math.random() * 140 : faixa);
      if (!eixo) m.rotation.y = Math.PI / 2;
      veiculos.push({ mesh: m, eixo: eixo, vel: (0.25 + Math.random() * 0.45) * (Math.random() < 0.5 ? 1 : -1) });
      scene.add(m);
    }

    /* ----------------------------------------------------- confete festivo */
    var CONF = 420;
    var cpos = new Float32Array(CONF * 3);
    var ccor = new Float32Array(CONF * 3);
    var cvel = [];
    for (var f = 0; f < CONF; f++) {
      cpos[f * 3 + 1] = -999;
      cvel.push({ x: 0, y: 0, z: 0, vida: 0 });
      ccor[f * 3] = 1; ccor[f * 3 + 1] = 0.8; ccor[f * 3 + 2] = 0.3;
    }
    var confeteGeo = new THREE.BufferGeometry();
    confeteGeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    confeteGeo.setAttribute('color', new THREE.BufferAttribute(ccor, 3));
    scene.add(new THREE.Points(confeteGeo, new THREE.PointsMaterial({
      size: 0.75, vertexColors: true, transparent: true, opacity: 0.95
    })));

    var CORES_FESTA = [[1, 0.85, 0.25], [0.2, 0.95, 0.75], [0.45, 0.65, 1], [1, 0.45, 0.6], [0.7, 1, 0.4]];
    var proxConf = 0;
    var pulso = 0;

    function celebrar(qtd) {
      qtd = qtd || 160;
      for (var k = 0; k < qtd; k++) {
        var idx = proxConf % CONF;
        proxConf++;
        cpos[idx * 3] = (Math.random() - 0.5) * 16;
        cpos[idx * 3 + 1] = 6 + Math.random() * 6;
        cpos[idx * 3 + 2] = (Math.random() - 0.5) * 16;
        cvel[idx] = {
          x: (Math.random() - 0.5) * 0.35,
          y: 0.25 + Math.random() * 0.35,
          z: (Math.random() - 0.5) * 0.35,
          vida: 1
        };
        var cc = CORES_FESTA[Math.floor(Math.random() * CORES_FESTA.length)];
        ccor[idx * 3] = cc[0]; ccor[idx * 3 + 1] = cc[1]; ccor[idx * 3 + 2] = cc[2];
      }
      confeteGeo.attributes.position.needsUpdate = true;
      confeteGeo.attributes.color.needsUpdate = true;
      pulso = 1;
    }

    /* -------------------------------------------------------------- loop */
    var raioBase = opts.raio || 46;
    var alturaCam = opts.altura || 20;
    var velCam = opts.velocidade || 0.035;
    var t0 = performance.now();
    var rodando = true;

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    function animar(agora) {
      if (!rodando) return;
      requestAnimationFrame(animar);
      var t = (agora - t0) / 1000;

      var raio = raioBase + Math.sin(t * 0.18) * 5 + pulso * 4;
      camera.position.set(Math.cos(t * velCam) * raio, alturaCam + Math.sin(t * 0.22) * 3, Math.sin(t * velCam) * raio);
      camera.lookAt(0, 6 + pulso * 2, 0);

      for (var i = 0; i < TOTAL; i++) {
        var p = predios[i];
        var escala = 1 + Math.sin(t * p.vel + p.fase) * 0.035;
        dummy.position.set(p.x, (p.alt * escala) / 2, p.z);
        dummy.scale.set(p.larg, p.alt * escala, p.larg);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        malha.setMatrixAt(i, dummy.matrix);
      }
      malha.instanceMatrix.needsUpdate = true;

      janelas.material.opacity = 0.65 + Math.sin(t * 1.6) * 0.2 + pulso * 0.3;
      neon.intensity = 1.2 + Math.sin(t * 2.1) * 0.5 + pulso * 2.5;
      ruas.material.opacity = 0.28 + Math.sin(t * 0.9) * 0.08 + pulso * 0.25;

      veiculos.forEach(function (o) {
        if (o.eixo) {
          o.mesh.position.z += o.vel;
          if (o.mesh.position.z > 72) o.mesh.position.z = -72;
          if (o.mesh.position.z < -72) o.mesh.position.z = 72;
        } else {
          o.mesh.position.x += o.vel;
          if (o.mesh.position.x > 72) o.mesh.position.x = -72;
          if (o.mesh.position.x < -72) o.mesh.position.x = 72;
        }
      });

      var mexeu = false;
      for (var k = 0; k < CONF; k++) {
        var vv = cvel[k];
        if (vv.vida <= 0) continue;
        cpos[k * 3] += vv.x;
        cpos[k * 3 + 1] += vv.y;
        cpos[k * 3 + 2] += vv.z;
        vv.y -= 0.012;
        vv.vida -= 0.006;
        if (cpos[k * 3 + 1] < -2) { vv.vida = 0; cpos[k * 3 + 1] = -999; }
        mexeu = true;
      }
      if (mexeu) confeteGeo.attributes.position.needsUpdate = true;

      if (pulso > 0) pulso = Math.max(0, pulso - 0.012);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animar);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        rodando = false;
      } else if (!rodando) {
        rodando = true;
        t0 = performance.now() - 1000;
        requestAnimationFrame(animar);
      }
    });

    return {
      ok: true,
      celebrar: celebrar,
      pulsar: function () { pulso = Math.min(1, pulso + 0.5); }
    };
  }

  global.Scene3D = { init: init };
})(window);
