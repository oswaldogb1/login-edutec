/* ==========================================================================
   mapa.js — a cidade desenhada no <canvas>
   --------------------------------------------------------------------------
   Visual: vista de cima (top-down), pixel art retrô (estilo GTA 1 / SimCity).
   Tudo é desenhado por código: NENHUMA imagem externa é usada.

   Como funciona, resumido:
   - A cidade é uma grade de 16 x 16 quadradinhos ("tiles") de 24 pixels.
   - Onde a linha ou a coluna é múltiplo de 5, existe RUA.
   - O que sobra são 9 quarteirões 4x4, sorteados entre: residencial,
     comercial, industrial e área verde.
   - O cenário parado (ruas, casas, prédios) é desenhado UMA VEZ em um canvas
     escondido ("base"). A cada quadro só copiamos essa imagem e desenhamos por
     cima o que se mexe (carros, pessoas) — assim roda leve em PC antigo.
   ========================================================================== */

window.CI = window.CI || {};

(function () {
  'use strict';

  var TAM  = 16;   // quantidade de quadradinhos por lado
  var TILE = 24;   // tamanho de cada quadradinho em pixels
  var LARGURA = TAM * TILE;   // 384 pixels

  /* ------------------------------------------------------------------
     Sorteio "com semente": o mesmo número de semente gera sempre a
     mesma cidade. Serve para o aluno recuperar a cidade dele ao
     atualizar a página.
     ------------------------------------------------------------------ */
  function aleatorio(x, y, semente, n) {
    var h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^
            Math.imul(semente + 1, 1442695041) ^ Math.imul(n + 1, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }

  function geradorSimples(semente) {
    var s = semente >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ------------------------------------------------------------------
     criar(semente) — monta a grade da cidade
     ------------------------------------------------------------------ */
  function criar(semente) {
    semente = semente || Math.floor(Math.random() * 100000);
    var sorteia = geradorSimples(semente);

    // 9 quarteirões: 3 residenciais, 2 comerciais, 2 industriais, 2 verdes
    var tipos = ['residencial', 'residencial', 'residencial',
                 'comercial', 'comercial',
                 'industrial', 'industrial',
                 'verde', 'verde'];

    // embaralha (Fisher-Yates) usando o gerador com semente
    for (var i = tipos.length - 1; i > 0; i--) {
      var j = Math.floor(sorteia() * (i + 1));
      var tmp = tipos[i]; tipos[i] = tipos[j]; tipos[j] = tmp;
    }

    var grid = [];
    for (var y = 0; y < TAM; y++) {
      grid[y] = [];
      for (var x = 0; x < TAM; x++) {
        if (x % 5 === 0 || y % 5 === 0) {
          grid[y][x] = 'rua';
        } else {
          var bx = Math.floor(x / 5);   // 0, 1 ou 2
          var by = Math.floor(y / 5);
          grid[y][x] = tipos[by * 3 + bx];
        }
      }
    }

    var mapa = {
      semente: semente,
      grid: grid,
      veiculos: [],
      pedestres: [],
      particulas: [],
      base: null
    };

    mapa.base = desenharBase(mapa);
    mapa.veiculos  = criarAndarilhos(mapa, 14, 'carro');
    mapa.pedestres = criarAndarilhos(mapa, 16, 'pessoa');
    return mapa;
  }

  function ehRua(mapa, x, y) {
    return x >= 0 && y >= 0 && x < TAM && y < TAM && mapa.grid[y][x] === 'rua';
  }

  /* ==================================================================
     DESENHO DO CENÁRIO PARADO
     ================================================================== */
  function desenharBase(mapa) {
    var c = document.createElement('canvas');
    c.width = LARGURA; c.height = LARGURA;
    var ctx = c.getContext('2d');

    for (var y = 0; y < TAM; y++) {
      for (var x = 0; x < TAM; x++) {
        var tipo = mapa.grid[y][x];
        var px = x * TILE, py = y * TILE;

        if (tipo === 'rua')              desenharRua(ctx, mapa, x, y, px, py);
        else if (tipo === 'residencial') desenharCasa(ctx, mapa, x, y, px, py);
        else if (tipo === 'comercial')   desenharLoja(ctx, mapa, x, y, px, py);
        else if (tipo === 'industrial')  desenharFabrica(ctx, mapa, x, y, px, py);
        else                             desenharParque(ctx, mapa, x, y, px, py);

        // linha fininha separando os quadradinhos (ajuda a criança a mirar)
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(px, py, TILE, 1);
        ctx.fillRect(px, py, 1, TILE);
      }
    }
    return c;
  }

  function desenharRua(ctx, mapa, x, y, px, py) {
    ctx.fillStyle = '#33333c';
    ctx.fillRect(px, py, TILE, TILE);

    // calçadas: onde o vizinho NÃO é rua
    ctx.fillStyle = '#5c5c56';
    if (!ehRua(mapa, x, y - 1)) ctx.fillRect(px, py, TILE, 3);
    if (!ehRua(mapa, x, y + 1)) ctx.fillRect(px, py + TILE - 3, TILE, 3);
    if (!ehRua(mapa, x - 1, y)) ctx.fillRect(px, py, 3, TILE);
    if (!ehRua(mapa, x + 1, y)) ctx.fillRect(px + TILE - 3, py, 3, TILE);

    // faixa tracejada no meio da pista
    var horizontal = ehRua(mapa, x - 1, y) || ehRua(mapa, x + 1, y);
    var vertical   = ehRua(mapa, x, y - 1) || ehRua(mapa, x, y + 1);
    var cruzamento = horizontal && vertical;
    ctx.fillStyle = '#b9b48a';
    if (!cruzamento && horizontal) {
      ctx.fillRect(px + 4, py + TILE / 2 - 1, 6, 2);
      ctx.fillRect(px + 14, py + TILE / 2 - 1, 6, 2);
    } else if (!cruzamento && vertical) {
      ctx.fillRect(px + TILE / 2 - 1, py + 4, 2, 6);
      ctx.fillRect(px + TILE / 2 - 1, py + 14, 2, 6);
    }
  }

  var CORES_CASA = ['#c96f4a', '#b8574f', '#d09a5a', '#a9714f', '#c2825e'];

  function desenharCasa(ctx, mapa, x, y, px, py) {
    ctx.fillStyle = '#2e5c3a';                 // grama
    ctx.fillRect(px, py, TILE, TILE);

    var r = aleatorio(x, y, mapa.semente, 1);
    var cor = CORES_CASA[Math.floor(r * CORES_CASA.length)];
    var larg = 14 + Math.floor(aleatorio(x, y, mapa.semente, 2) * 5);
    var alt  = 12 + Math.floor(aleatorio(x, y, mapa.semente, 3) * 6);
    var ox = px + Math.floor((TILE - larg) / 2);
    var oy = py + Math.floor((TILE - alt) / 2);

    ctx.fillStyle = '#f0ece0';                 // paredes
    ctx.fillRect(ox, oy, larg, alt);
    ctx.fillStyle = cor;                       // telhado
    ctx.fillRect(ox, oy, larg, Math.floor(alt / 2));
    ctx.fillStyle = '#5aa7d6';                 // janela
    ctx.fillRect(ox + 3, oy + alt - 6, 4, 4);
    ctx.fillStyle = '#6b4a2f';                 // porta
    ctx.fillRect(ox + larg - 7, oy + alt - 6, 4, 6);

    if (aleatorio(x, y, mapa.semente, 4) > 0.6) {   // uma arvorezinha no quintal
      ctx.fillStyle = '#1f4a2a';
      ctx.fillRect(px + 2, py + TILE - 7, 5, 5);
    }
  }

  function desenharLoja(ctx, mapa, x, y, px, py) {
    ctx.fillStyle = '#3e434f';                 // calçadão
    ctx.fillRect(px, py, TILE, TILE);

    var alturas = [16, 18, 20];
    var alt = alturas[Math.floor(aleatorio(x, y, mapa.semente, 5) * alturas.length)];
    var ox = px + 3, oy = py + (TILE - alt) - 2;

    ctx.fillStyle = '#2f5d86';                 // prédio
    ctx.fillRect(ox, oy, TILE - 6, alt);
    ctx.fillStyle = '#1f4260';                 // topo
    ctx.fillRect(ox, oy, TILE - 6, 3);

    // janelinhas (algumas acesas)
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 2; j++) {
        var acesa = aleatorio(x * 7 + i, y * 3 + j, mapa.semente, 6) > 0.45;
        ctx.fillStyle = acesa ? '#f5d76e' : '#7fa8c9';
        ctx.fillRect(ox + 3 + j * 7, oy + 6 + i * 5, 4, 3);
      }
    }
    ctx.fillStyle = '#e08b3a';                 // toldo da loja
    ctx.fillRect(ox, py + TILE - 5, TILE - 6, 3);
  }

  function desenharFabrica(ctx, mapa, x, y, px, py) {
    ctx.fillStyle = '#4a4638';                 // terreno
    ctx.fillRect(px, py, TILE, TILE);

    ctx.fillStyle = '#8a8069';                 // galpão
    ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 9);
    ctx.fillStyle = '#6d6553';                 // telhado ondulado
    for (var i = 0; i < 4; i++) {
      ctx.fillRect(px + 2 + i * 5, py + 6, 3, TILE - 9);
    }
    if (aleatorio(x, y, mapa.semente, 7) > 0.5) {   // chaminé
      ctx.fillStyle = '#585245';
      ctx.fillRect(px + TILE - 8, py + 1, 5, 8);
      ctx.fillStyle = 'rgba(200,200,200,0.35)';
      ctx.fillRect(px + TILE - 8, py, 5, 2);
    }
    ctx.fillStyle = '#39352c';                 // portão
    ctx.fillRect(px + 8, py + TILE - 6, 8, 4);
  }

  function desenharParque(ctx, mapa, x, y, px, py) {
    ctx.fillStyle = '#24512f';                 // gramado
    ctx.fillRect(px, py, TILE, TILE);

    // trilha de terra em algumas partes
    if (aleatorio(x, y, mapa.semente, 8) > 0.65) {
      ctx.fillStyle = '#6b5a3c';
      ctx.fillRect(px, py + 10, TILE, 4);
    }
    // árvores
    var qtd = 2 + Math.floor(aleatorio(x, y, mapa.semente, 9) * 3);
    for (var i = 0; i < qtd; i++) {
      var ax = px + 3 + Math.floor(aleatorio(x * 5 + i, y, mapa.semente, 10) * (TILE - 9));
      var ay = py + 3 + Math.floor(aleatorio(x, y * 5 + i, mapa.semente, 11) * (TILE - 9));
      ctx.fillStyle = '#173a20';
      ctx.fillRect(ax, ay, 6, 6);
      ctx.fillStyle = '#3c8347';
      ctx.fillRect(ax + 1, ay + 1, 4, 4);
    }
    // um laguinho de vez em quando
    if (aleatorio(x, y, mapa.semente, 12) > 0.85) {
      ctx.fillStyle = '#2b6ea8';
      ctx.fillRect(px + 6, py + 6, 10, 8);
    }
  }

  /* ==================================================================
     CARROS E PESSOAS (o que dá "vida" à cidade)
     ================================================================== */
  var CORES_CARRO  = ['#e05a4a', '#4a90e0', '#e0c04a', '#e0e0e0', '#6ac06a', '#c05ac0'];
  var CORES_ROUPA  = ['#f0a0c0', '#90d0f0', '#f0e0a0', '#c0f0b0', '#e0b0f0'];

  function criarAndarilhos(mapa, quantidade, tipo) {
    var lista = [], tentativas = 0;
    while (lista.length < quantidade && tentativas < 500) {
      tentativas++;
      var x = Math.floor(Math.random() * TAM);
      var y = Math.floor(Math.random() * TAM);
      if (!ehRua(mapa, x, y)) continue;

      var dir = escolherDirecao(mapa, x, y, 0, 0);
      if (!dir) continue;

      lista.push({
        tx: x, ty: y, dx: dir[0], dy: dir[1],
        prog: Math.random(),
        vel: tipo === 'carro' ? (2.2 + Math.random() * 1.6) : (0.8 + Math.random() * 0.5),
        cor: tipo === 'carro'
              ? CORES_CARRO[Math.floor(Math.random() * CORES_CARRO.length)]
              : CORES_ROUPA[Math.floor(Math.random() * CORES_ROUPA.length)],
        tipo: tipo
      });
    }
    return lista;
  }

  /* Escolhe para onde seguir: prefere ir reto, senão vira; só dá meia-volta
     se for rua sem saída. */
  function escolherDirecao(mapa, x, y, dx, dy) {
    var opcoes = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var possiveis = [];
    for (var i = 0; i < opcoes.length; i++) {
      var o = opcoes[i];
      if (o[0] === -dx && o[1] === -dy) continue;      // não voltar
      if (ehRua(mapa, x + o[0], y + o[1])) possiveis.push(o);
    }
    if (possiveis.length === 0) {
      return ehRua(mapa, x - dx, y - dy) ? [-dx, -dy] : null;
    }
    // 65% de chance de continuar reto, se der
    for (var k = 0; k < possiveis.length; k++) {
      if (possiveis[k][0] === dx && possiveis[k][1] === dy && Math.random() < 0.65) {
        return possiveis[k];
      }
    }
    return possiveis[Math.floor(Math.random() * possiveis.length)];
  }

  function moverLista(mapa, lista, dt) {
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i];
      a.prog += a.vel * dt;
      while (a.prog >= 1) {
        a.prog -= 1;
        a.tx += a.dx; a.ty += a.dy;
        var dir = escolherDirecao(mapa, a.tx, a.ty, a.dx, a.dy);
        if (dir) { a.dx = dir[0]; a.dy = dir[1]; }
        else { a.prog = 0; }
      }
    }
  }

  function atualizarTransito(mapa, dt) {
    if (dt > 0.2) dt = 0.2;                 // evita "teleporte" se a aba ficou parada
    moverLista(mapa, mapa.veiculos, dt);
    moverLista(mapa, mapa.pedestres, dt);

    // partículas da comemoração ao construir
    for (var i = mapa.particulas.length - 1; i >= 0; i--) {
      var p = mapa.particulas[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.vida -= dt;
      if (p.vida <= 0) mapa.particulas.splice(i, 1);
    }
  }

  function soltarParticulas(mapa, tx, ty, cor) {
    var cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
    for (var i = 0; i < 14; i++) {
      var ang = Math.random() * Math.PI * 2;
      var forca = 20 + Math.random() * 45;
      mapa.particulas.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * forca,
        vy: Math.sin(ang) * forca - 25,
        vida: 0.5 + Math.random() * 0.5,
        cor: cor || '#ffd873'
      });
    }
  }

  /* ==================================================================
     DESENHO DE CADA QUADRO
     opcoes = { colocacoes: [...], zonasValidas: ['rua', ...], tempo: segundos }
     ================================================================== */
  function desenhar(ctx, mapa, opcoes) {
    opcoes = opcoes || {};
    ctx.clearRect(0, 0, LARGURA, LARGURA);
    ctx.drawImage(mapa.base, 0, 0);

    // 1) brilho nos lugares onde a solução escolhida PODE ser colocada
    if (opcoes.zonasValidas && opcoes.zonasValidas.length) {
      var pulso = 0.10 + 0.09 * Math.sin((opcoes.tempo || 0) * 5);
      var ocupados = opcoes.ocupados || {};
      for (var y = 0; y < TAM; y++) {
        for (var x = 0; x < TAM; x++) {
          if (ocupados[x + ',' + y]) continue;
          if (opcoes.zonasValidas.indexOf(mapa.grid[y][x]) === -1) continue;
          ctx.fillStyle = 'rgba(255,255,255,' + pulso.toFixed(3) + ')';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.strokeStyle = 'rgba(120,255,190,0.75)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
        }
      }
    }

    // 2) pessoas (embaixo dos carros)
    var i, a, pos;
    for (i = 0; i < mapa.pedestres.length; i++) {
      a = mapa.pedestres[i];
      pos = posicaoNaTela(a, 8);
      ctx.fillStyle = a.cor;
      ctx.fillRect(Math.round(pos.x) - 1, Math.round(pos.y) - 1, 2, 3);
    }

    // 3) carros
    for (i = 0; i < mapa.veiculos.length; i++) {
      a = mapa.veiculos[i];
      pos = posicaoNaTela(a, 4);
      var horizontal = a.dx !== 0;
      var w = horizontal ? 7 : 4, h = horizontal ? 4 : 7;
      var cx = Math.round(pos.x - w / 2), cy = Math.round(pos.y - h / 2);
      ctx.fillStyle = a.cor;
      ctx.fillRect(cx, cy, w, h);
      ctx.fillStyle = 'rgba(20,20,30,0.55)';    // vidro
      if (horizontal) ctx.fillRect(cx + 2, cy, 3, h);
      else            ctx.fillRect(cx, cy + 2, w, 3);
    }

    // 4) soluções já construídas
    var lista = opcoes.colocacoes || [];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif';
    for (i = 0; i < lista.length; i++) {
      var c = lista[i];
      var bx = c.x * TILE, by = c.y * TILE;
      ctx.fillStyle = 'rgba(12,12,14,0.72)';
      ctx.fillRect(bx + 2, by + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = '#7de0b0';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 2.5, by + 2.5, TILE - 5, TILE - 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.icone, bx + TILE / 2, by + TILE / 2 + 1);
    }

    // 5) partículas de comemoração
    for (i = 0; i < mapa.particulas.length; i++) {
      var p = mapa.particulas[i];
      ctx.fillStyle = p.cor;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 2));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  /* Converte a posição do carro/pessoa (em quadradinhos) para pixels,
     jogando ele um pouco para o lado direito da via (mão inglesa não: aqui
     seguimos a mão da direita, como no Brasil). */
  function posicaoNaTela(a, desvio) {
    var fx = a.tx + a.dx * a.prog + 0.5;
    var fy = a.ty + a.dy * a.prog + 0.5;
    var px = fx * TILE + (-a.dy) * desvio;
    var py = fy * TILE + (a.dx) * desvio;
    return { x: px, y: py };
  }

  /* Descobre em qual quadradinho o aluno clicou/tocou */
  function tileDoEvento(canvas, evento) {
    var r = canvas.getBoundingClientRect();
    var px = (evento.clientX - r.left) * (LARGURA / r.width);
    var py = (evento.clientY - r.top)  * (LARGURA / r.height);
    var x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= TAM || y >= TAM) return null;
    return { x: x, y: y };
  }

  CI.mapa = {
    TAM: TAM, TILE: TILE, LARGURA: LARGURA,
    criar: criar,
    desenhar: desenhar,
    atualizarTransito: atualizarTransito,
    soltarParticulas: soltarParticulas,
    tileDoEvento: tileDoEvento,
    ehRua: ehRua
  };

})();
