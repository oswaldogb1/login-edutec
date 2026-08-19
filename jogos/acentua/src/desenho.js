/* =====================================================================
   EXPRESSO TÔNICO — desenho em visão aérea

   Cinco paisagens (cidade, vilarejo, serra, deserto, floresta), trilhos
   curvos com túneis e ladeiras, obstáculos, trem e minimapa. O cenário é
   gerado uma vez com semente fixa e recortado pela área visível.
   ===================================================================== */

var PALETA = {
  planicie: '#3f6b3a',
  planicieClara: '#4a7c42',
  cidade: '#41454e',
  vilarejo: '#7b6a3f',
  deserto: '#d9c184',
  desertoClaro: '#e6d2a0',
  duna: '#c9ad70',
  floresta: '#255c33',
  florestaEscura: '#1b4526',
  arvore: '#17381f',
  arvoreClara: '#2c6b39',
  serra: '#6b6a66',
  serraAlta: '#8d8c88',
  neve: '#e7ecef',
  rocha: '#57565a',
  quadra: '#292d34',
  patio: '#343941',
  agua: '#1f57d0',
  aguaRasa: '#3f86e0',
  areia: '#ded2a2',
  piscina: '#2ab6d8',
  borda: '#e9e6dd'
};

var CORES_PREDIO = [
  '#e8e5dc', '#e8e5dc', '#e8e5dc',
  '#d3d6db', '#d3d6db',
  '#bcc1c9', '#bcc1c9',
  '#949aa5',
  '#e2701f', '#b8391f', '#2f8f8a', '#3560ad', '#4a7a35', '#c9a227'
];
var TELHADOS = {
  '#e8e5dc': '#b9b5a8', '#d3d6db': '#a7abb3', '#bcc1c9': '#9398a2',
  '#949aa5': '#6f7681', '#e2701f': '#b0520e', '#b8391f': '#8a2614',
  '#2f8f8a': '#1f6b67', '#3560ad': '#264782', '#4a7a35': '#365c26',
  '#c9a227': '#9c7c19'
};

var ESCALA_TREM = 1.45;
var cv, ctx, larg = 0, alt = 0, dpr = 1;
var camera = { x: 2800, y: 2100, zoom: 0.72 };
var cenario = null;
var vis = { x0: 0, y0: 0, x1: 0, y1: 0 };

function semente(s) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    var t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function iniciarDesenho(canvas) {
  cv = canvas;
  ctx = cv.getContext('2d');
  cenario = gerarCenario();
  redimensionar();
  window.addEventListener('resize', redimensionar);
}

function redimensionar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  larg = cv.clientWidth;
  alt = cv.clientHeight;
  cv.width = Math.floor(larg * dpr);
  cv.height = Math.floor(alt * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** O mapa é grande: só desenhamos o que cabe na tela. */
function visivel(x, y, folga) {
  var f = folga || 90;
  return x > vis.x0 - f && x < vis.x1 + f && y > vis.y0 - f && y < vis.y1 + f;
}

/* ========================================================= cenário ==== */

function gerarCenario() {
  var rnd = semente(20260819);
  var itens = [];

  REGIOES.forEach(function (r) {
    if (r.tipo === 'cidade') gerarCidade(r, rnd, itens);
    else if (r.tipo === 'vilarejo') gerarVilarejo(r, rnd, itens);
    else if (r.tipo === 'deserto') gerarDeserto(r, rnd, itens);
    else if (r.tipo === 'floresta') gerarFloresta(r, rnd, itens);
    else if (r.tipo === 'serra') gerarSerra(r, rnd, itens);
  });

  for (var i = 0; i < 420; i++) {
    itens.push({ k: 'mato', x: rnd() * MUNDO.l, y: rnd() * MUNDO.a, r: 6 + rnd() * 9 });
  }

  var campos = [];
  for (var c = 0; c < 190; c++) {
    campos.push({
      x: rnd() * MUNDO.l, y: rnd() * MUNDO.a,
      rx: 110 + rnd() * 240, ry: 80 + rnd() * 170, giro: rnd() * 3.14
    });
  }
  return { itens: itens, campos: campos };
}

function gerarCidade(r, rnd, itens) {
  for (var x = r.x + 40; x < r.x + r.l - 60; x += 58) {
    for (var y = r.y + 40; y < r.y + r.a - 60; y += 58) {
      var sorte = rnd();
      var lx = x + rnd() * 6, ly = y + rnd() * 6;
      if (sorte < 0.13) continue;
      if (sorte < 0.18) { itens.push({ k: 'piscina', x: lx, y: ly, l: 36 + rnd() * 12, a: 26 + rnd() * 8 }); continue; }
      if (sorte < 0.23) { itens.push({ k: 'jardim', x: lx, y: ly, l: 40 + rnd() * 12, a: 34 + rnd() * 8 }); continue; }
      var grande = rnd() < 0.2;
      var cor = CORES_PREDIO[Math.floor(rnd() * CORES_PREDIO.length)];
      itens.push({
        k: 'predio', x: lx, y: ly,
        l: grande ? 40 + rnd() * 14 : 20 + rnd() * 18,
        a: grande ? 38 + rnd() * 12 : 20 + rnd() * 18,
        cor: cor, telhado: TELHADOS[cor] || '#8d939d',
        altura: grande ? 5 + rnd() * 4 : 2 + rnd() * 3,
        patio: rnd() < 0.4
      });
    }
  }
}

function gerarVilarejo(r, rnd, itens) {
  for (var i = 0; i < 46; i++) {
    itens.push({
      k: 'casa',
      x: r.x + 40 + rnd() * (r.l - 110), y: r.y + 40 + rnd() * (r.a - 110),
      l: 34 + rnd() * 22, a: 28 + rnd() * 18,
      cor: rnd() < 0.5 ? '#e8ddc6' : '#ded0b4',
      telhado: ['#a8442c', '#8f3a26', '#7d5638'][Math.floor(rnd() * 3)]
    });
  }
  for (var h = 0; h < 26; h++) {
    itens.push({
      k: 'horta', x: r.x + 30 + rnd() * (r.l - 90), y: r.y + 30 + rnd() * (r.a - 70),
      l: 40 + rnd() * 30, a: 24 + rnd() * 16
    });
  }
  for (var c = 0; c < 70; c++) {
    itens.push({ k: 'arvore', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, r: 9 + rnd() * 7, cor: PALETA.arvoreClara });
  }
}

function gerarDeserto(r, rnd, itens) {
  for (var d = 0; d < 90; d++) {
    itens.push({ k: 'duna', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, l: 120 + rnd() * 220, a: 40 + rnd() * 70 });
  }
  for (var c = 0; c < 110; c++) {
    itens.push({ k: 'cacto', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, h: 16 + rnd() * 16 });
  }
  for (var p = 0; p < 70; p++) {
    itens.push({ k: 'rocha', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, r: 7 + rnd() * 13 });
  }
}

function gerarFloresta(r, rnd, itens) {
  for (var c = 0; c < 26; c++) {
    itens.push({
      k: 'clareira', x: r.x + rnd() * (r.l - 200), y: r.y + rnd() * (r.a - 160),
      l: 110 + rnd() * 130, a: 90 + rnd() * 110
    });
  }
  for (var i = 0; i < 620; i++) {
    itens.push({
      k: 'arvore', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, r: 11 + rnd() * 12,
      cor: rnd() < 0.35 ? PALETA.arvoreClara : PALETA.arvore
    });
  }
}

function gerarSerra(r, rnd, itens) {
  for (var i = 0; i < 34; i++) {
    var raio = 70 + rnd() * 130;
    itens.push({
      k: 'monte', x: r.x + 60 + rnd() * (r.l - 200), y: r.y + 60 + rnd() * (r.a - 200),
      r: raio, neve: raio > 140
    });
  }
  for (var p = 0; p < 90; p++) {
    itens.push({ k: 'rocha', x: r.x + rnd() * r.l, y: r.y + rnd() * r.a, r: 8 + rnd() * 14 });
  }
}

/* ========================================================== quadro ==== */

function desenhar(j) {
  var t = j.trem;
  camera.x += (t.x + Math.cos(t.ang) * t.vel * 0.6 - camera.x) * 0.08;
  camera.y += (t.y + Math.sin(t.ang) * t.vel * 0.6 - camera.y) * 0.08;

  var meiaL = larg / 2 / camera.zoom, meiaA = alt / 2 / camera.zoom;
  vis.x0 = camera.x - meiaL; vis.x1 = camera.x + meiaL;
  vis.y0 = camera.y - meiaA; vis.y1 = camera.y + meiaA;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d1626';
  ctx.fillRect(0, 0, larg, alt);

  ctx.save();
  ctx.translate(larg / 2, alt / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  desenharChao();
  desenharRegioes();
  desenharAgua();
  desenharItens();
  desenharTrilhos(j);
  desenharLadeiras(j);
  desenharObras(j);
  desenharEstacoes(j);
  desenharObstaculos(j);
  desenharSinais(j);
  desenharAgulha(j);
  desenharFumaca(j);
  desenharTrem(j);
  desenharTuneis(j);
  desenharMarcaDeAlerta(j);
  desenharLetreiros();
  desenharBussola(j);

  ctx.restore();

  if (dentroDeTunel(j)) escuridaoDoTunel();
  desenharMinimapa(j);
}

function desenharChao() {
  ctx.fillStyle = PALETA.planicie;
  ctx.fillRect(-500, -500, MUNDO.l + 1000, MUNDO.a + 1000);
  // manchas irregulares: uma grade regular de elipses fica com cara de papel de parede
  ctx.fillStyle = PALETA.planicieClara;
  cenario.campos.forEach(function (c) {
    if (!visivel(c.x, c.y, c.rx + 200)) return;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry, c.giro, 0, 6.283);
    ctx.fill();
  });
}

function desenharRegioes() {
  REGIOES.forEach(function (r) {
    if (r.x > vis.x1 || r.x + r.l < vis.x0 || r.y > vis.y1 || r.y + r.a < vis.y0) return;
    ctx.fillStyle = {
      cidade: PALETA.cidade, vilarejo: PALETA.vilarejo, deserto: PALETA.deserto,
      floresta: PALETA.floresta, serra: PALETA.serra
    }[r.tipo];
    cantoArredondado(r.x, r.y, r.l, r.a, 90);
    ctx.fill();

    if (r.tipo === 'deserto') {
      ctx.fillStyle = PALETA.desertoClaro;
      cantoArredondado(r.x + 60, r.y + 60, r.l - 120, r.a - 120, 70);
      ctx.fill();
    } else if (r.tipo === 'floresta') {
      ctx.fillStyle = PALETA.florestaEscura;
      cantoArredondado(r.x + 70, r.y + 70, r.l - 140, r.a - 140, 60);
      ctx.fill();
    }

    if (r.nome) {
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.font = '800 34px ' + fonte();
      ctx.textAlign = 'center';
      ctx.fillText(r.nome, r.x + r.l / 2, r.y + 66);
      ctx.textAlign = 'left';
    }
  });
}

function desenharAgua() {
  AGUA.forEach(function (a) {
    if (!visivel(a.x + a.l / 2, a.y + a.a / 2, 420)) return;
    ctx.fillStyle = PALETA.areia;
    cantoArredondado(a.x - 18, a.y - 18, a.l + 36, a.a + 36, 40); ctx.fill();
    ctx.fillStyle = PALETA.aguaRasa;
    cantoArredondado(a.x, a.y, a.l, a.a, 30); ctx.fill();
    ctx.fillStyle = PALETA.agua;
    cantoArredondado(a.x + 16, a.y + 16, a.l - 32, a.a - 32, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '700 20px ' + fonte();
    ctx.fillText(a.nome, a.x + 26, a.y + 40);
  });
}

function desenharItens() {
  var itens = cenario.itens;
  for (var i = 0; i < itens.length; i++) {
    var o = itens[i];
    if (!visivel(o.x, o.y, 150)) continue;

    if (o.k === 'predio') {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(o.x + o.altura, o.y + o.altura + 1, o.l, o.a);
      ctx.fillStyle = o.telhado;
      ctx.fillRect(o.x, o.y, o.l, o.a);
      ctx.fillStyle = o.cor;
      ctx.fillRect(o.x, o.y, o.l - 3, o.a - 3);
      if (o.patio && o.l > 30 && o.a > 28) {
        ctx.fillStyle = PALETA.patio;
        ctx.fillRect(o.x + 7, o.y + 7, o.l - 17, o.a - 17);
      }
    } else if (o.k === 'casa') {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(o.x + 4, o.y + 5, o.l, o.a);
      ctx.fillStyle = o.cor;
      ctx.fillRect(o.x, o.y, o.l, o.a);
      ctx.fillStyle = o.telhado;
      ctx.fillRect(o.x, o.y, o.l, o.a * 0.55);
    } else if (o.k === 'horta') {
      ctx.fillStyle = '#6d5a2e';
      ctx.fillRect(o.x, o.y, o.l, o.a);
      ctx.fillStyle = '#4a7a35';
      for (var h = 0; h < 4; h++) ctx.fillRect(o.x + 4, o.y + 4 + h * 6, o.l - 8, 3);
    } else if (o.k === 'arvore') {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.arc(o.x + 3, o.y + 4, o.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = o.cor || PALETA.arvore;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.09)';
      ctx.beginPath(); ctx.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.4, 0, 6.283); ctx.fill();
    } else if (o.k === 'clareira') {
      ctx.fillStyle = PALETA.planicieClara;
      cantoArredondado(o.x, o.y, o.l, o.a, 40); ctx.fill();
    } else if (o.k === 'mato') {
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill();
    } else if (o.k === 'duna') {
      ctx.fillStyle = PALETA.duna;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, o.l / 2, o.a / 2, 0, 0, 6.283); ctx.fill();
    } else if (o.k === 'cacto') {
      ctx.fillStyle = '#2f6b34';
      ctx.fillRect(o.x - 3, o.y - o.h / 2, 6, o.h);
      ctx.fillRect(o.x - 10, o.y - 2, 7, 3);
      ctx.fillRect(o.x + 4, o.y - 6, 7, 3);
    } else if (o.k === 'rocha') {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.arc(o.x + 2, o.y + 3, o.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = PALETA.rocha;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill();
    } else if (o.k === 'monte') {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.arc(o.x + 8, o.y + 10, o.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = PALETA.serraAlta;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.283); ctx.fill();
      if (o.neve) {
        ctx.fillStyle = PALETA.neve;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.42, 0, 6.283); ctx.fill();
      }
    } else if (o.k === 'piscina') {
      ctx.fillStyle = PALETA.borda;
      cantoArredondado(o.x - 4, o.y - 4, o.l + 8, o.a + 8, 5); ctx.fill();
      ctx.fillStyle = PALETA.piscina;
      cantoArredondado(o.x, o.y, o.l, o.a, 3); ctx.fill();
    } else if (o.k === 'jardim') {
      ctx.fillStyle = '#2f6b34';
      cantoArredondado(o.x, o.y, o.l, o.a, 6); ctx.fill();
    }
  }
}

/* ========================================================= trilhos ==== */

function arestaVisivel(e) {
  for (var i = 0; i < e.pontos.length; i += 3) {
    if (visivel(e.pontos[i][0], e.pontos[i][1], 220)) return true;
  }
  return false;
}

function caminhoDaAresta(e) {
  ctx.beginPath();
  ctx.moveTo(e.pontos[0][0], e.pontos[0][1]);
  for (var i = 1; i < e.pontos.length; i++) ctx.lineTo(e.pontos[i][0], e.pontos[i][1]);
}

function desenharTrilhos(j) {
  var arestas = j.malha.arestas.filter(arestaVisivel);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#23262c';
  ctx.lineWidth = 34;
  arestas.forEach(function (e) { caminhoDaAresta(e); ctx.stroke(); });

  ctx.strokeStyle = '#6d675c';
  ctx.lineWidth = 4;
  arestas.forEach(function (e) {
    for (var i = 0; i < e.pontos.length - 1; i++) {
      var p = e.pontos[i], q = e.pontos[i + 1];
      if (!visivel(p[0], p[1], 60)) continue;
      var dx = q[0] - p[0], dy = q[1] - p[1];
      var m = Math.hypot(dx, dy) || 1;
      ctx.beginPath();
      ctx.moveTo(p[0] + dy / m * 12, p[1] - dx / m * 12);
      ctx.lineTo(p[0] - dy / m * 12, p[1] + dx / m * 12);
      ctx.stroke();
    }
  });

  ctx.strokeStyle = '#dfe4ea';
  ctx.lineWidth = 3;
  arestas.forEach(function (e) {
    [8, -8].forEach(function (lado) {
      ctx.beginPath();
      for (var i = 0; i < e.pontos.length; i++) {
        var p = e.pontos[i];
        var q = e.pontos[Math.min(i + 1, e.pontos.length - 1)];
        var dx = q[0] - p[0], dy = q[1] - p[1];
        var m = Math.hypot(dx, dy) || 1;
        var x = p[0] - dy / m * lado, y = p[1] + dx / m * lado;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  });
}

function desenharLadeiras(j) {
  j.malha.arestas.forEach(function (e) {
    if (!e.ladeira || !arestaVisivel(e)) return;
    var sobe = e.ladeira[2] > 0;
    for (var s = e.ladeira[0] * e.comp; s < e.ladeira[1] * e.comp; s += 74) {
      var p = pontoDaAresta(e, s);
      if (!visivel(p.x, p.y, 80)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang + (sobe ? 0 : Math.PI));
      ctx.strokeStyle = 'rgba(159,196,255,.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -13); ctx.lineTo(6, 0); ctx.lineTo(-8, 13);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function desenharTuneis(j) {
  var dentro = dentroDeTunel(j);
  j.malha.arestas.forEach(function (e) {
    if (!e.tunel || !arestaVisivel(e)) return;
    var ini = e.tunel[0] * e.comp, fim = e.tunel[1] * e.comp;

    // Visto de fora, a montanha engole o trem. Mas quando é o trem que está
    // lá dentro, ela fica translúcida: sem isso o aluno perde a referência.
    ctx.save();
    if (dentro && e.id === j.trem.aresta) ctx.globalAlpha = 0.42;

    ctx.strokeStyle = PALETA.serraAlta;
    ctx.lineWidth = 104;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var s = ini; s <= fim; s += 24) {
      var p = pontoDaAresta(e, s);
      if (s === ini) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 104;
    ctx.stroke();

    [ini, fim].forEach(function (s) {
      var p = pontoDaAresta(e, s);
      if (!visivel(p.x, p.y, 140)) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = '#14181f';
      cantoArredondado(-9, -28, 18, 56, 6);
      ctx.fill();
      ctx.fillStyle = '#07090d';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 25, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  });
}

function escuridaoDoTunel() {
  var g = ctx.createRadialGradient(larg / 2, alt / 2, alt * 0.10, larg / 2, alt / 2, alt * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,.15)');
  g.addColorStop(0.45, 'rgba(0,0,0,.72)');
  g.addColorStop(1, 'rgba(0,0,0,.93)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, larg, alt);

  // o farol da locomotiva abrindo caminho no escuro
  var f = ctx.createRadialGradient(larg / 2, alt / 2, 10, larg / 2, alt / 2, alt * 0.3);
  f.addColorStop(0, 'rgba(255,214,120,.30)');
  f.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = f;
  ctx.fillRect(0, 0, larg, alt);
}

function desenharObras(j) {
  j.malha.arestas.forEach(function (e) {
    if (!e.obras || !arestaVisivel(e)) return;
    var ini = e.obras[0] * e.comp, fim = e.obras[1] * e.comp;
    ctx.save();
    ctx.strokeStyle = '#ffb648';
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    [20, -20].forEach(function (lado) {
      ctx.beginPath();
      for (var s = ini; s <= fim; s += 26) {
        var p = pontoDaAresta(e, s);
        var x = p.x - Math.sin(p.ang) * lado, y = p.y + Math.cos(p.ang) * lado;
        if (s === ini) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
    var m = pontoDaAresta(e, (ini + fim) / 2);
    if (visivel(m.x, m.y, 140)) placa(m.x, m.y - 36, '🚧 85', '#ffb648');
  });
}

/* ====================================================== obstáculos ==== */

function desenharObstaculos(j) {
  j.obstaculos.forEach(function (o) {
    var p = posicaoNaAresta(j, o.aresta, o.s);
    if (!visivel(p.x, p.y, 130)) return;
    var off = o.lado * (o.fuga > 0 ? 18 + o.desloc : 0);
    var x = p.x - Math.sin(p.ang) * off;
    var y = p.y + Math.cos(p.ang) * off;
    var regra = OBSTACULOS[o.tipo];

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.arc(3, 4, 18, 0, 6.283); ctx.fill();
    ctx.fillStyle = o.batida ? '#8a3b3b' : '#f0ece2';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.fill();
    ctx.strokeStyle = regra.cor;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.283); ctx.stroke();
    ctx.font = '19px ' + fonte();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#141a24';
    ctx.fillText(regra.icone, 0, 7);
    ctx.textAlign = 'left';
    ctx.restore();
  });
}

function desenharSinais(j) {
  Object.keys(j.sinais).forEach(function (id) {
    var n = NOS[id], s = j.sinais[id];
    if (!visivel(n.x, n.y, 160)) return;
    var x = n.x + 42, y = n.y - 42;
    ctx.fillStyle = '#14203a';
    cantoArredondado(x - 9, y - 22, 18, 38, 6);
    ctx.fill();
    ctx.fillStyle = s.vermelho ? '#ff5f5f' : '#46d98a';
    ctx.beginPath(); ctx.arc(x, y - 9, 6, 0, 6.283); ctx.fill();
    if (s.vermelho) {
      ctx.fillStyle = 'rgba(255,95,95,.2)';
      ctx.beginPath(); ctx.arc(x, y - 9, 18, 0, 6.283); ctx.fill();
    }
  });
}

/* ======================================================== estações ==== */

function desenharEstacoes(j) {
  Object.keys(NOS).forEach(function (id) {
    var n = NOS[id];
    if (!visivel(n.x, n.y, 230)) return;
    if (n.tipo === 'bairro') caixaEstacao(n.x, n.y, CORES[n.bairro], '🏘');
    else if (n.tipo === 'deposito') caixaEstacao(n.x, n.y, CORES.deposito, '⛏');
    else if (n.tipo === 'central') {
      caixaEstacao(n.x, n.y, CORES.central, '🚉');
      j.fila.forEach(function (p, i) {
        bonequinho(n.x - 70 + (i % 3) * 48, n.y + 84 + Math.floor(i / 3) * 34,
          '#cfe0ff', p.paciencia / 100);
      });
    }
  });
}

function caixaEstacao(x, y, cor, icone) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  cantoArredondado(x - 66, y - 34, 148, 92, 12); ctx.fill();
  ctx.fillStyle = cor;
  cantoArredondado(x - 74, y - 44, 148, 96, 12); ctx.fill();
  ctx.fillStyle = '#ece9e0';
  cantoArredondado(x - 68, y - 38, 136, 84, 8); ctx.fill();
  ctx.fillStyle = '#c9c5ba';
  ctx.fillRect(x - 60, y - 30, 26, 68);
  ctx.fillRect(x + 34, y - 30, 26, 68);
  ctx.font = '700 20px ' + fonte();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#141a24';
  ctx.fillText(icone, x, y + 52);
  ctx.textAlign = 'left';
  ctx.restore();
}

function bonequinho(x, y, cor, paciencia) {
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.arc(x + 1, y - 7, 6, 0, 6.283); ctx.fill();
  ctx.fillRect(x - 6, y - 2, 12, 15);
  ctx.fillStyle = cor;
  ctx.beginPath(); ctx.arc(x, y - 8, 5, 0, 6.283); ctx.fill();
  cantoArredondado(x - 5, y - 2, 10, 13, 4);
  ctx.fill();
  ctx.fillStyle = paciencia > 0.5 ? '#46d98a' : paciencia > 0.25 ? '#ffb648' : '#ff5f5f';
  ctx.fillRect(x - 7, y + 14, 14 * Math.max(0, paciencia), 3);
}

/* Os letreiros vão por cima de tudo: um vagão parado nunca pode esconder
   o nome do lugar em que o aluno acabou de encostar. */
function desenharLetreiros() {
  Object.keys(NOS).forEach(function (id) {
    var n = NOS[id];
    if (!visivel(n.x, n.y, 250)) return;
    var cor, nome;
    if (n.tipo === 'bairro') { cor = CORES[n.bairro]; nome = ROTULOS[n.bairro]; }
    else if (n.tipo === 'deposito') { cor = CORES.deposito; nome = n.nome; }
    else if (n.tipo === 'central') { cor = CORES.central; nome = 'ESTAÇÃO CENTRAL'; }
    else return;

    ctx.font = '800 13px ' + fonte();
    ctx.textAlign = 'center';
    var l = ctx.measureText(nome).width + 22;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    cantoArredondado(n.x - l / 2 + 2, n.y - 76, l, 24, 7); ctx.fill();
    ctx.fillStyle = cor;
    cantoArredondado(n.x - l / 2, n.y - 78, l, 24, 7); ctx.fill();
    ctx.fillStyle = '#141a24';
    ctx.fillText(nome, n.x, n.y - 61);
    ctx.textAlign = 'left';
  });
}

/* =========================================================== rumos ==== */

function desenharAgulha(j) {
  if (!j.escolha.opcoes.length) return;
  var n = NOS[j.escolha.no];
  j.escolha.opcoes.forEach(function (o, i) {
    var d = NOS[o.destino];
    var ang = Math.atan2(d.y - n.y, d.x - n.x);
    ctx.save();
    ctx.translate(n.x + Math.cos(ang) * 58, n.y + Math.sin(ang) * 58);
    ctx.rotate(ang);
    ctx.fillStyle = i === j.escolha.indice ? '#46d98a' : 'rgba(220,240,255,.4)';
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(-11, -14); ctx.lineTo(-4, 0); ctx.lineTo(-11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  ctx.strokeStyle = 'rgba(70,217,138,.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(n.x, n.y, 46, 0, 6.283);
  ctx.stroke();
}

function desenharBussola(j) {
  var alvo = alvoSugerido(j);
  var n = NOS[alvo.no];
  var t = j.trem;
  var dx = n.x - t.x, dy = n.y - t.y;
  if (Math.hypot(dx, dy) < 200) return;
  var ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(t.x + Math.cos(ang) * 104, t.y + Math.sin(ang) * 104);
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(255,201,60,.9)';
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* Anel pulsante em cima do obstáculo anunciado, para o aluno achar o perigo
   no mapa e não só ler o aviso. */
function desenharMarcaDeAlerta(j) {
  if (!j.alerta) return;
  var a = j.alerta;
  var perto = 1 - Math.min(1, a.dist / 720);
  var pulso = 28 + Math.sin(Date.now() / 130) * (4 + perto * 6);

  ctx.save();
  ctx.strokeStyle = a.cor;
  ctx.lineWidth = 3 + perto * 2;
  ctx.globalAlpha = 0.5 + perto * 0.45;
  ctx.beginPath();
  ctx.arc(a.x, a.y, pulso, 0, 6.283);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = a.cor;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - pulso - 28);
  ctx.lineTo(a.x - 14, a.y - pulso - 5);
  ctx.lineTo(a.x + 14, a.y - pulso - 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#141a24';
  ctx.font = '900 16px ' + fonte();
  ctx.textAlign = 'center';
  ctx.fillText('!', a.x, a.y - pulso - 9);
  ctx.textAlign = 'left';
  ctx.restore();
}

/* ============================================================ trem ==== */

function desenharFumaca(j) {
  ctx.fillStyle = '#ffffff';
  j.trem.fumaca.forEach(function (f) {
    ctx.globalAlpha = Math.max(0, f.vida) * 0.22;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, 6.283);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function desenharTrem(j) {
  var t = j.trem;
  var rastro = t.rastro || [];

  [[74, '#8f5a3c'], [128, '#7a4c33']].forEach(function (par) {
    var pos = pontoDoRastro(rastro, par[0], t);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pos.ang);
    ctx.scale(ESCALA_TREM, ESCALA_TREM);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    cantoArredondado(-16, -9, 36, 22, 5); ctx.fill();
    ctx.fillStyle = '#14181f';
    cantoArredondado(-20, -13, 38, 24, 6); ctx.fill();
    ctx.fillStyle = par[1];
    cantoArredondado(-19, -12, 36, 22, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(-15, -9, 28, 5);
    ctx.restore();
  });

  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.ang);
  ctx.scale(ESCALA_TREM, ESCALA_TREM);

  ctx.fillStyle = 'rgba(0,0,0,.5)';
  cantoArredondado(-19, -10, 50, 26, 8); ctx.fill();
  ctx.fillStyle = '#14181f';
  cantoArredondado(-23, -14, 50, 28, 8); ctx.fill();
  ctx.fillStyle = '#e03a25';
  cantoArredondado(-22, -13, 48, 26, 7); ctx.fill();
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(-6, -13, 10, 26);
  ctx.fillStyle = '#b02a19';
  cantoArredondado(-22, -13, 18, 26, 7); ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(-18, -8, 9, 16);
  ctx.fillStyle = '#2c3d59';
  ctx.beginPath(); ctx.arc(14, 0, 6.5, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#4a5b78';
  ctx.beginPath(); ctx.arc(14, 0, 3.4, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#ffd36a';
  ctx.beginPath(); ctx.arc(25, 0, 3.6, 0, 6.283); ctx.fill();
  ctx.restore();
}

function pontoDoRastro(rastro, distancia, t) {
  var acumulado = 0;
  for (var i = rastro.length - 1; i > 0; i--) {
    var a = rastro[i], b = rastro[i - 1];
    acumulado += Math.hypot(a.x - b.x, a.y - b.y);
    if (acumulado >= distancia) return { x: b.x, y: b.y, ang: b.ang };
  }
  return { x: t.x - Math.cos(t.ang) * distancia, y: t.y - Math.sin(t.ang) * distancia, ang: t.ang };
}

/* ======================================================== minimapa ==== */

function desenharMinimapa(j) {
  var m = Math.min(220, larg * 0.25);
  var pad = 14;
  var x0 = larg - m - pad, y0 = pad;
  var esc = m / MUNDO.l;
  var altura = MUNDO.a * esc;

  ctx.save();
  ctx.fillStyle = 'rgba(9,17,30,.88)';
  cantoArredondado(x0 - 6, y0 - 6, m + 12, altura + 12, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,200,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 6, y0 - 6, m + 12, altura + 12);
  ctx.clip();
  ctx.translate(x0, y0);
  ctx.scale(esc, esc);

  REGIOES.forEach(function (r) {
    ctx.fillStyle = {
      cidade: 'rgba(120,130,150,.55)', vilarejo: 'rgba(170,145,90,.55)',
      deserto: 'rgba(220,200,140,.5)', floresta: 'rgba(40,110,60,.55)',
      serra: 'rgba(150,150,150,.5)'
    }[r.tipo];
    ctx.fillRect(r.x, r.y, r.l, r.a);
  });

  ctx.strokeStyle = 'rgba(225,238,255,.8)';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  j.malha.arestas.forEach(function (e) {
    ctx.beginPath();
    ctx.moveTo(e.pontos[0][0], e.pontos[0][1]);
    for (var i = 1; i < e.pontos.length; i++) ctx.lineTo(e.pontos[i][0], e.pontos[i][1]);
    ctx.stroke();
  });

  Object.keys(NOS).forEach(function (id) {
    var n = NOS[id];
    var cor = n.tipo === 'bairro' ? CORES[n.bairro]
      : n.tipo === 'deposito' ? CORES.deposito
        : n.tipo === 'central' ? CORES.central : null;
    if (!cor) return;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 82, 0, 6.283);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(j.trem.x, j.trem.y, 74, 0, 6.283);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* =========================================================== utils ==== */

function cantoArredondado(x, y, l, a, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + l, y, x + l, y + a, r);
  ctx.arcTo(x + l, y + a, x, y + a, r);
  ctx.arcTo(x, y + a, x, y, r);
  ctx.arcTo(x, y, x + l, y, r);
  ctx.closePath();
}

function placa(x, y, texto, cor) {
  ctx.font = '700 13px ' + fonte();
  var l = ctx.measureText(texto).width + 16;
  ctx.fillStyle = cor;
  cantoArredondado(x - l / 2, y - 11, l, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#0b1220';
  ctx.textAlign = 'center';
  ctx.fillText(texto, x, y + 4);
  ctx.textAlign = 'left';
}

var _fonte = null;
function fonte() {
  if (!_fonte) _fonte = '"Segoe UI", system-ui, Roboto, Arial, sans-serif';
  return _fonte;
}
