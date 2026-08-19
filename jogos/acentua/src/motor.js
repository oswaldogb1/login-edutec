/* =====================================================================
   EXPRESSO TÔNICO — motor do jogo
   Física do trem sobre o grafo de trilhos, passageiros, carvão,
   obstáculos e pontuação. Não desenha nada: só o estado.
   ===================================================================== */

var CFG = {
  VEL_MAX: 250,
  ACEL: 130,
  FORCA_LADEIRA: 105,    // quanto a rampa puxa (ou empurra) o trem
  FREIO: 250,
  ATRITO: 40,
  VEL_PARADA: 55,        // até esta velocidade o trem consegue parar na estação
  VEL_OBRAS: 85,         // acima disso, o trecho em obras castiga
  LUGARES: 4,
  CARVAO_MAX: 100,
  CARVAO_GASTO: 0.62,    // por segundo em movimento (mapa grande)
  PACIENCIA_MAX: 100,
  PACIENCIA_BORDO: 0.62, // por segundo (as viagens ficaram longas)
  PACIENCIA_FILA: 0.3,
  PONTO_ENTREGA: 100,
  PONTO_ERRO: -60,
  PONTO_ACENTO: 70,
  PONTO_BATIDA: -25,
  TRAVA_BATIDA: 2.6,     // segundos parado
  TRAVA_SINAL: 2.6,
  TRAVA_ERRO_DESEMBARQUE: 2.4,
  TRAVA_ERRO_ACENTO: 3.5,
  RAIO_APITO: 360,
  DIST_ESCOLHA: 300,     // a que distância do cruzamento a agulha aparece
  DIST_ALERTA: 720       // a que distância o obstáculo é anunciado na tela
};

/* ---------------------------------------------------------- acentos --- */

var AGUDO = '́', GRAVE = '̀', CIRCUNFLEXO = '̂';

/** Separa a palavra em forma sem acento gráfico + posição do acento.
 *  Til e cedilha ficam: fazem parte da grafia, não são acento gráfico. */
function analisarPalavra(palavra) {
  var d = palavra.normalize('NFD');
  var letras = [], indice = -1, tipo = null;
  for (var i = 0; i < d.length; i++) {
    var ch = d[i], cp = d.charCodeAt(i);
    if (cp >= 0x0300 && cp <= 0x036f) {
      if (ch === AGUDO || ch === GRAVE) { indice = letras.length - 1; tipo = 'agudo'; }
      else if (ch === CIRCUNFLEXO) { indice = letras.length - 1; tipo = 'circunflexo'; }
      else letras[letras.length - 1] += ch;
    } else {
      letras.push(ch);
    }
  }
  var sem = letras.join('').normalize('NFC');
  var alvos = [];
  for (var k = 0; k < sem.length; k++) {
    if ('aeiou'.indexOf(sem[k]) >= 0) alvos.push(k);
  }
  return { semAcento: sem, indice: indice, tipoAcento: tipo, alvos: alvos, temAcento: indice >= 0 };
}

/* Cada tipo de obstáculo tem uma reação própria: 'apito' sai de cena com o
   apito; 'lento' exige chegar abaixo da velocidade segura. */
var OBSTACULOS = {
  vaca: {
    icone: '🐄', titulo: 'VACA NA LINHA', reage: 'apito', velSegura: 45,
    cor: '#ff5f5f', onde: ['planicie', 'vilarejo', 'floresta']
  },
  carro: {
    icone: '🚗', titulo: 'CARRO NA PASSAGEM', reage: 'apito', velSegura: 45,
    cor: '#ff5f5f', onde: ['cidade', 'vilarejo']
  },
  arvore: {
    icone: '🌲', titulo: 'ÁRVORE CAÍDA', reage: 'lento', velSegura: 60,
    cor: '#46d98a', onde: ['floresta', 'serra']
  },
  pedras: {
    icone: '🪨', titulo: 'PEDRAS NA VIA', reage: 'lento', velSegura: 110,
    cor: '#ffb648', onde: ['serra', 'deserto']
  },
  areia: {
    icone: '🌪', titulo: 'AREIA SOBRE OS TRILHOS', reage: 'lento', velSegura: 90,
    cor: '#ded2a2', onde: ['deserto']
  }
};

/** Em que paisagem cai um ponto do mapa (a última pintada vence). */
function biomaEm(x, y) {
  var achado = 'planicie';
  REGIOES.forEach(function (r) {
    if (x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.a) achado = r.tipo;
  });
  return achado;
}

/* ------------------------------------------------------------ malha --- */

/* Catmull-Rom: faz a linha passar por todos os pontos de controle com
   curvatura suave, sem os bicos de uma polilinha reta. */
function pontoCatmull(p0, p1, p2, p3, t) {
  var t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  ];
}

function amostrarCurva(controle, passo) {
  var ext = [controle[0]].concat(controle).concat([controle[controle.length - 1]]);
  var saida = [];
  for (var i = 0; i < controle.length - 1; i++) {
    var p0 = ext[i], p1 = ext[i + 1], p2 = ext[i + 2], p3 = ext[i + 3];
    var bruto = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    var n = Math.max(2, Math.round(bruto / passo));
    for (var k = 0; k < n; k++) saida.push(pontoCatmull(p0, p1, p2, p3, k / n));
  }
  saida.push(controle[controle.length - 1].slice());
  return saida;
}

function construirMalha() {
  var arestas = [];
  var vizinhos = {};
  Object.keys(NOS).forEach(function (id) { vizinhos[id] = []; });

  ARESTAS.forEach(function (def, i) {
    var A = NOS[def.a], B = NOS[def.b];
    var controle = [[A.x, A.y]].concat(def.curva || []).concat([[B.x, B.y]]);
    var pontos = amostrarCurva(controle, 26);

    // distância acumulada ponto a ponto: é o "s" que o trem percorre
    var acum = [0];
    for (var k = 1; k < pontos.length; k++) {
      acum.push(acum[k - 1] + Math.hypot(pontos[k][0] - pontos[k - 1][0],
                                         pontos[k][1] - pontos[k - 1][1]));
    }
    var comp = acum[acum.length - 1];

    arestas.push({
      id: i, a: def.a, b: def.b, comp: comp,
      pontos: pontos, acum: acum,
      obras: def.obras || null,
      tunel: def.tunel || null,
      ladeira: def.ladeira || null
    });

    var angA = Math.atan2(pontos[1][1] - pontos[0][1], pontos[1][0] - pontos[0][0]);
    var u = pontos.length - 1;
    var angB = Math.atan2(pontos[u - 1][1] - pontos[u][1], pontos[u - 1][0] - pontos[u][0]);
    vizinhos[def.a].push({ aresta: i, destino: def.b, ang: angA });
    vizinhos[def.b].push({ aresta: i, destino: def.a, ang: angB });
  });

  return { arestas: arestas, vizinhos: vizinhos };
}

function normalizarAngulo(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/* ------------------------------------------------------------- jogo --- */

function novoJogo(opcoes) {
  var malha = construirMalha();
  var meta = opcoes.meta || 18;

  var j = {
    apelido: opcoes.apelido || 'Maquinista',
    meta: meta,
    malha: malha,
    tempo: 0,
    estado: 'correndo',        // correndo | parado | fim
    pontos: 0,
    entregues: 0,
    errosEntrega: 0,
    batidas: 0,
    carvao: CFG.CARVAO_MAX,
    travadoPor: 0,             // segundos restantes de castigo
    aviso: null,               // { texto, cor, t }
    alerta: null,              // obstáculo anunciado à frente
    relatorio: [],

    trem: {
      de: 'c_n', para: 'central', aresta: 0, s: 0,
      vel: 0, ang: 0, x: NOS.central.x, y: NOS.central.y,
      fumaca: []
    },

    escolha: { opcoes: [], indice: 0, no: null },
    passageiros: [],           // a bordo
    fila: [],                  // esperando na central
    obstaculos: [],
    sinais: {},
    painel: null,              // { tipo, ... } quando o trem para numa estação
    proximoSpawn: 6,
    banco: opcoes.banco.slice(),
    usadas: {},
    idPassageiro: 1
  };

  // A viagem começa parada na Estação Central, pronta para embarcar.
  j.trem.aresta = acharAresta(malha, 'central', 'c_n');
  j.trem.s = malha.arestas[j.trem.aresta].comp;

  Object.keys(NOS).forEach(function (id) {
    if (NOS[id].sinal) j.sinais[id] = { vermelho: false, t: 6 + Math.random() * 10 };
  });

  for (var i = 0; i < 4; i++) chegarPassageiro(j);
  posicionarTrem(j);
  abrirPainel(j, 'central');
  return j;
}

function acharAresta(malha, a, b) {
  for (var i = 0; i < malha.arestas.length; i++) {
    var e = malha.arestas[i];
    if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return i;
  }
  return 0;
}

/* --------------------------------------------------------- palavras --- */

function sortearPalavra(j, apenasBairros) {
  var nivelMax = j.entregues < j.meta * 0.35 ? 1 : (j.entregues < j.meta * 0.7 ? 2 : 3);
  var pool = j.banco.filter(function (p) {
    if (apenasBairros && p.tipo === 'monossilabo') return false;
    if (p.nivel > nivelMax) return false;
    return !j.usadas[p.palavra];
  });
  if (pool.length === 0) {
    pool = j.banco.filter(function (p) { return !apenasBairros || p.tipo !== 'monossilabo'; });
    j.usadas = {};
  }
  var escolhida = pool[Math.floor(Math.random() * pool.length)];
  j.usadas[escolhida.palavra] = true;
  return escolhida;
}

function chegarPassageiro(j) {
  if (j.fila.length >= 6) return;
  var p = sortearPalavra(j, true);
  j.fila.push({
    id: j.idPassageiro++,
    palavra: p.palavra,
    tipo: p.tipo,
    regra: p.regra,
    paciencia: CFG.PACIENCIA_MAX
  });
}

/* ------------------------------------------------------------ passo --- */

function atualizar(j, dt, entradas) {
  if (j.estado === 'fim') return;
  j.tempo += dt;

  if (j.aviso) {
    j.aviso.t -= dt;
    if (j.aviso.t <= 0) j.aviso = null;
  }

  // fila da estação central
  j.proximoSpawn -= dt;
  if (j.proximoSpawn <= 0) {
    chegarPassageiro(j);
    j.proximoSpawn = 7 + Math.random() * 6;
  }

  atualizarSinais(j, dt);
  atualizarObstaculos(j, dt);
  atualizarPaciencia(j, dt);

  if (j.travadoPor > 0) {
    j.travadoPor -= dt;
    j.trem.vel = 0;
    j.alerta = null;
    atualizarFumaca(j, dt);
    return;
  }

  if (j.painel) {          // trem parado numa estação: o mundo espera
    j.trem.vel = 0;
    j.alerta = null;
    atualizarFumaca(j, dt);
    return;
  }

  moverTrem(j, dt, entradas);
  atualizarFumaca(j, dt);
  j.alerta = obstaculoAdiante(j);
}

function atualizarSinais(j, dt) {
  Object.keys(j.sinais).forEach(function (id) {
    var s = j.sinais[id];
    s.t -= dt;
    if (s.t <= 0) {
      s.vermelho = !s.vermelho;
      s.t = s.vermelho ? 4.5 : 14 + Math.random() * 8;
    }
  });
}

function atualizarObstaculos(j, dt) {
  for (var i = j.obstaculos.length - 1; i >= 0; i--) {
    var o = j.obstaculos[i];
    o.vida -= dt;
    if (o.fuga > 0) { o.fuga -= dt; o.desloc += dt * 110; }
    if (o.vida <= 0) j.obstaculos.splice(i, 1);
  }

  j.proximoObstaculo = (j.proximoObstaculo === undefined ? 7 : j.proximoObstaculo) - dt;
  if (j.proximoObstaculo > 0 || j.obstaculos.length >= 6) return;
  j.proximoObstaculo = 6 + Math.random() * 7;

  // sorteia um ponto do mapa e escolhe um perigo que combine com a paisagem
  var id = Math.floor(Math.random() * j.malha.arestas.length);
  var e = j.malha.arestas[id];
  var pos = 120 + Math.random() * Math.max(80, e.comp - 240);
  var p = pontoDaAresta(e, pos);
  var bioma = biomaEm(p.x, p.y);

  var possiveis = Object.keys(OBSTACULOS).filter(function (k) {
    return OBSTACULOS[k].onde.indexOf(bioma) >= 0;
  });
  if (possiveis.length === 0) possiveis = ['vaca'];
  var tipo = possiveis[Math.floor(Math.random() * possiveis.length)];

  j.obstaculos.push({
    tipo: tipo, aresta: id, s: pos,
    vida: 26 + Math.random() * 16,
    fuga: 0, desloc: 0,
    lado: Math.random() < 0.5 ? -1 : 1
  });
}

function atualizarPaciencia(j, dt) {
  var i;
  for (i = j.passageiros.length - 1; i >= 0; i--) {
    var p = j.passageiros[i];
    p.paciencia -= CFG.PACIENCIA_BORDO * dt;
    if (p.paciencia <= 0) {
      j.passageiros.splice(i, 1);
      somarPontos(j, CFG.PONTO_ERRO);
      j.errosEntrega++;
      registrarErro(j, p, 'desistiu da viagem antes de chegar ao bairro certo');
      avisar(j, '😤 ' + p.palavra + ' desistiu da viagem!', '#ff5f5f');
    }
  }
  for (i = j.fila.length - 1; i >= 0; i--) {
    j.fila[i].paciencia -= CFG.PACIENCIA_FILA * dt;
    if (j.fila[i].paciencia <= 0) j.fila.splice(i, 1);
  }
}

function somarPontos(j, quanto) {
  j.pontos = Math.max(0, j.pontos + quanto);
}

function avisar(j, texto, cor) {
  j.aviso = { texto: texto, cor: cor || '#eaf1ff', t: 2.6 };
}

function registrarErro(j, passageiro, oQueAconteceu) {
  var achou = null;
  for (var i = 0; i < j.relatorio.length; i++) {
    if (j.relatorio[i].palavra === passageiro.palavra) achou = j.relatorio[i];
  }
  if (achou) { achou.vezes++; return; }
  j.relatorio.push({
    palavra: passageiro.palavra,
    tipo: passageiro.tipo,
    rotulo: ROTULOS[passageiro.tipo],
    regra: passageiro.regra,
    oQue: oQueAconteceu,
    vezes: 1
  });
}

/* ------------------------------------------------------- movimento --- */

function moverTrem(j, dt, ent) {
  var t = j.trem;
  var aresta = j.malha.arestas[t.aresta];

  // aceleração / freio
  var semCarvao = j.carvao <= 0;
  var potencia = semCarvao ? 0.28 : 1;
  if (ent.acelerar) t.vel += CFG.ACEL * potencia * dt;
  else if (ent.frear) t.vel -= CFG.FREIO * dt;
  else t.vel -= CFG.ATRITO * dt;

  t.vel = Math.max(0, Math.min(CFG.VEL_MAX * potencia, t.vel));

  if (t.vel > 0) j.carvao = Math.max(0, j.carvao - CFG.CARVAO_GASTO * dt * (t.vel / CFG.VEL_MAX));

  // ladeira: a rampa puxa o trem para trás na subida e empurra na descida
  var rampa = ladeiraAtual(j);
  if (rampa !== 0) {
    t.vel = Math.max(0, Math.min(CFG.VEL_MAX * 1.18, t.vel - rampa * CFG.FORCA_LADEIRA * dt));
  }

  // trecho em obras: passar rápido dá solavanco
  if (dentroDeObras(j, t.s) && t.vel > CFG.VEL_OBRAS) {
    j.solavanco = (j.solavanco || 0) + dt;
    if (j.solavanco > 0.45) {
      j.solavanco = 0;
      t.vel *= 0.45;
      somarPontos(j, CFG.PONTO_BATIDA);
      j.batidas++;
      sacudirPassageiros(j, 10);
      avisar(j, '🚧 Solavanco nas obras! Reduza para 85 km/h', '#ffb648');
    }
  }

  // obstáculos na linha
  for (var i = 0; i < j.obstaculos.length; i++) {
    var o = j.obstaculos[i];
    if (o.aresta !== t.aresta || o.fuga > 0 || o.batida) continue;
    if (Math.abs(noQuadroDoTrem(j, o.s) - t.s) > 28) continue;

    var regra = OBSTACULOS[o.tipo];
    if (t.vel <= regra.velSegura) {          // passou com cuidado
      o.fuga = 3.2;
      avisar(j, regra.icone + ' Passou devagar e livrou o trecho.', '#46d98a');
      continue;
    }
    o.batida = true;
    o.vida = Math.min(o.vida, 1.4);
    j.travadoPor = CFG.TRAVA_BATIDA;
    somarPontos(j, CFG.PONTO_BATIDA);
    j.batidas++;
    t.vel = 0;
    sacudirPassageiros(j, 14);
    avisar(j, regra.icone + ' Bateu! ' + regra.titulo.toLowerCase() + '.', '#ff5f5f');
    return;
  }

  t.s += t.vel * dt;

  if (t.s >= aresta.comp) {
    chegarAoNo(j, ent);
  }

  posicionarTrem(j);
}

/* O trem mede s a partir de t.de; vacas e obras são medidas a partir de
   aresta.a. Quando o trem volta pelo mesmo trilho os dois referenciais se
   invertem, então tudo passa por aqui antes de ser comparado. */
function noQuadroDoTrem(j, sDaAresta) {
  var e = j.malha.arestas[j.trem.aresta];
  return j.trem.de === e.a ? sDaAresta : e.comp - sDaAresta;
}

/** +1 quando o trem está subindo, -1 descendo, 0 no plano. */
function ladeiraAtual(j) {
  var e = j.malha.arestas[j.trem.aresta];
  if (!e.ladeira) return 0;
  var f = noQuadroDoTrem(j, j.trem.s) / e.comp;
  if (f < e.ladeira[0] || f > e.ladeira[1]) return 0;
  return j.trem.de === e.a ? e.ladeira[2] : -e.ladeira[2];
}

/** O trem está dentro de um túnel? (só muda o desenho) */
function dentroDeTunel(j) {
  var e = j.malha.arestas[j.trem.aresta];
  if (!e.tunel) return false;
  var f = noQuadroDoTrem(j, j.trem.s) / e.comp;
  return f >= e.tunel[0] && f <= e.tunel[1];
}

function dentroDeObras(j, sDoTrem) {
  var e = j.malha.arestas[j.trem.aresta];
  if (!e.obras) return false;
  var f = noQuadroDoTrem(j, sDoTrem) / e.comp;
  return f >= e.obras[0] && f <= e.obras[1];
}

function sacudirPassageiros(j, quanto) {
  j.passageiros.forEach(function (p) { p.paciencia = Math.max(1, p.paciencia - quanto); });
}

function posicionarTrem(j) {
  var t = j.trem;
  if (!t.rastro) t.rastro = [];
  var e = j.malha.arestas[t.aresta];
  var p = pontoDaAresta(e, noQuadroDoTrem(j, t.s));
  t.x = p.x;
  t.y = p.y;
  t.ang = t.de === e.a ? p.ang : p.ang + Math.PI;

  var ult = t.rastro[t.rastro.length - 1];
  if (!ult || Math.hypot(t.x - ult.x, t.y - ult.y) > 7) {
    t.rastro.push({ x: t.x, y: t.y, ang: t.ang });
    if (t.rastro.length > 120) t.rastro.shift();
  }
}

/** Lista as saídas possíveis de um nó, da esquerda para a direita em
 *  relação ao sentido de chegada. */
function opcoesDeSaida(j, no, veioDe) {
  var ref = veioDe || j.trem.de;
  var entrada = Math.atan2(NOS[no].y - NOS[ref].y, NOS[no].x - NOS[ref].x);
  var lista = j.malha.vizinhos[no]
    .filter(function (v) { return veioDe === null || v.destino !== veioDe; })
    .map(function (v) {
      return { aresta: v.aresta, destino: v.destino, rel: normalizarAngulo(v.ang - entrada) };
    });
  lista.sort(function (a, b) { return a.rel - b.rel; });
  return lista;
}

function indiceMaisReto(opcoes) {
  var melhor = 0;
  for (var i = 1; i < opcoes.length; i++) {
    if (Math.abs(opcoes[i].rel) < Math.abs(opcoes[melhor].rel)) melhor = i;
  }
  return melhor;
}

/** Chamado a cada quadro para manter a agulha (escolha de rota) atualizada. */
function atualizarEscolha(j) {
  var t = j.trem;
  var aresta = j.malha.arestas[t.aresta];
  var falta = aresta.comp - t.s;
  var noFrente = t.para;

  if (falta > CFG.DIST_ESCOLHA || NOS[noFrente].tipo === 'bairro' || NOS[noFrente].tipo === 'deposito') {
    if (j.escolha.no !== null) j.escolha = { opcoes: [], indice: 0, no: null };
    return;
  }
  if (j.escolha.no !== noFrente) {
    var ops = opcoesDeSaida(j, noFrente, t.de);
    j.escolha = { opcoes: ops, indice: indiceMaisReto(ops), no: noFrente };
  }
}

function girarEscolha(j, direcao) {
  if (!j.escolha.opcoes.length) return;
  var n = j.escolha.opcoes.length;
  j.escolha.indice = (j.escolha.indice + direcao + n) % n;
}

function chegarAoNo(j, ent) {
  var t = j.trem;
  var no = t.para;
  var info = NOS[no];
  var sobra = t.s - j.malha.arestas[t.aresta].comp;

  // sinal fechado
  if (j.sinais[no] && j.sinais[no].vermelho && t.vel > 60) {
    j.travadoPor = CFG.TRAVA_SINAL;
    somarPontos(j, CFG.PONTO_BATIDA);
    t.vel = 0;
    sacudirPassageiros(j, 8);
    avisar(j, '🚦 Passou no sinal fechado! Freie nos cruzamentos.', '#ff5f5f');
  }

  // terminais: o trem sempre para
  if (info.tipo === 'bairro' || info.tipo === 'deposito') {
    t.s = j.malha.arestas[t.aresta].comp;
    t.vel = 0;
    abrirPainel(j, no);
    return;
  }

  // estação central: só para se vier devagar
  if (info.tipo === 'central' && t.vel <= CFG.VEL_PARADA) {
    t.s = j.malha.arestas[t.aresta].comp;
    t.vel = 0;
    abrirPainel(j, no);
    return;
  }
  if (info.tipo === 'central' && t.vel > CFG.VEL_PARADA) {
    avisar(j, '💨 Passou direto pela Central — freie para embarcar.', '#ffb648');
  }

  var ops = opcoesDeSaida(j, no, t.de);
  if (ops.length === 0) {                    // beco: inverte a marcha
    inverterMarcha(j);
    return;
  }
  var escolhida = ops[Math.min(j.escolha.indice, ops.length - 1)];
  if (j.escolha.no !== no) escolhida = ops[indiceMaisReto(ops)];

  t.de = no;
  t.para = escolhida.destino;
  t.aresta = escolhida.aresta;
  t.s = Math.max(0, sobra);
  j.escolha = { opcoes: [], indice: 0, no: null };
}

function inverterMarcha(j) {
  var t = j.trem;
  var aresta = j.malha.arestas[t.aresta];
  var antigo = t.de;
  t.de = t.para;
  t.para = antigo;
  t.s = Math.max(0, aresta.comp - t.s);
  t.vel = 0;
}

/* ---------------------------------------------------------- painéis --- */

function abrirPainel(j, no) {
  var info = NOS[no];

  if (info.tipo === 'central') {
    var embarcados = [];
    while (j.passageiros.length < CFG.LUGARES && j.fila.length > 0) {
      var p = j.fila.shift();
      p.paciencia = CFG.PACIENCIA_MAX;
      j.passageiros.push(p);
      embarcados.push(p);
    }
    j.painel = { tipo: 'central', no: no, embarcados: embarcados };
    var ops = opcoesDeSaida(j, no, null);
    j.escolha = { opcoes: ops, indice: indiceMaisReto(ops), no: no };
    return;
  }

  if (info.tipo === 'bairro') {
    j.painel = { tipo: 'bairro', no: no, bairro: info.bairro, resolvidos: [] };
    return;
  }

  if (info.tipo === 'deposito') {
    j.painel = { tipo: 'deposito', no: no, desafio: novoDesafioAcento(j), tentativas: 0 };
    return;
  }
}

function novoDesafioAcento(j) {
  var p = sortearPalavra(j, false);
  var a = analisarPalavra(p.palavra);
  return {
    palavra: p.palavra,
    tipo: p.tipo,
    rotulo: ROTULOS[p.tipo],
    regra: p.regra,
    semAcento: a.semAcento,
    alvos: a.alvos,
    indice: a.indice,
    tipoAcento: a.tipoAcento,
    temAcento: a.temAcento
  };
}

/** O aluno clicou/arrastou a ficha de um passageiro para a plataforma. */
function desembarcar(j, idPassageiro) {
  if (!j.painel || j.painel.tipo !== 'bairro') return null;
  var idx = -1;
  for (var i = 0; i < j.passageiros.length; i++) {
    if (j.passageiros[i].id === idPassageiro) idx = i;
  }
  if (idx < 0) return null;

  var p = j.passageiros[idx];
  var bairro = j.painel.bairro;

  if (p.tipo === bairro) {
    j.passageiros.splice(idx, 1);
    var bonus = Math.round(p.paciencia * 0.5);
    somarPontos(j, CFG.PONTO_ENTREGA + bonus);
    j.entregues++;
    j.painel.resolvidos.push({ palavra: p.palavra, ok: true, bonus: bonus });
    if (j.entregues >= j.meta) terminar(j);
    return { ok: true, palavra: p.palavra, bonus: bonus };
  }

  // desembarque errado: o passageiro volta para o trem irritado
  p.paciencia = Math.max(6, p.paciencia - 22);
  somarPontos(j, CFG.PONTO_ERRO);
  j.errosEntrega++;
  j.travadoPor = CFG.TRAVA_ERRO_DESEMBARQUE;
  registrarErro(j, p, 'foi deixado no bairro ' + ROTULOS[bairro] + ', mas mora no ' + ROTULOS[p.tipo]);
  j.painel.resolvidos.push({ palavra: p.palavra, ok: false, certo: ROTULOS[p.tipo] });
  return { ok: false, palavra: p.palavra, certo: ROTULOS[p.tipo], regra: p.regra };
}

/** Resposta do desafio do depósito. */
function responderAcento(j, resposta) {
  if (!j.painel || j.painel.tipo !== 'deposito') return null;
  var d = j.painel.desafio;
  var certo;
  if (d.temAcento) {
    certo = resposta.semAcento !== true && resposta.indice === d.indice && resposta.acento === d.tipoAcento;
  } else {
    certo = resposta.semAcento === true;
  }
  j.painel.tentativas++;

  if (certo) {
    j.carvao = CFG.CARVAO_MAX;
    somarPontos(j, Math.max(20, CFG.PONTO_ACENTO - (j.painel.tentativas - 1) * 25));
    return { ok: true, palavra: d.palavra, rotulo: d.rotulo, regra: d.regra };
  }

  j.carvao = Math.min(CFG.CARVAO_MAX, j.carvao + 8);
  j.travadoPor = CFG.TRAVA_ERRO_ACENTO;
  if (j.painel.tentativas === 1) {
    registrarErro(j, { palavra: d.palavra, tipo: d.tipo, regra: d.regra },
      'foi carimbada com o acento no lugar errado no depósito');
  }
  return { ok: false, tentativas: j.painel.tentativas, rotulo: d.rotulo, regra: d.regra, palavra: d.palavra };
}

function fecharPainel(j) {
  var p = j.painel;
  j.painel = null;
  if (!p) return;
  var info = NOS[p.no];
  if (info.tipo === 'bairro' || info.tipo === 'deposito') inverterMarcha(j);
  else if (info.tipo === 'central') sairDoNo(j);
}

/** Sai de um nó de passagem usando a agulha que o jogador deixou marcada. */
function sairDoNo(j) {
  var t = j.trem;
  var no = t.para;
  var ops = (j.escolha.no === no && j.escolha.opcoes.length)
    ? j.escolha.opcoes
    : opcoesDeSaida(j, no, null);
  var e = ops[Math.min(j.escolha.indice, ops.length - 1)];
  t.de = no;
  t.para = e.destino;
  t.aresta = e.aresta;
  t.s = 0;
  t.vel = 0;
  j.escolha = { opcoes: [], indice: 0, no: null };
  posicionarTrem(j);
}

/* Procura o obstáculo mais próximo à frente, no trilho em que o trem está.
   Devolve o que mostrar na tela — ou null quando o caminho está livre. */
function obstaculoAdiante(j) {
  var t = j.trem;
  var e = j.malha.arestas[t.aresta];
  var melhor = null;

  function considerar(dist, dados) {
    if (dist < -20 || dist > CFG.DIST_ALERTA) return;
    if (melhor && melhor.dist <= dist) return;
    dados.dist = Math.max(0, dist);
    melhor = dados;
  }

  j.obstaculos.forEach(function (o) {
    if (o.aresta !== t.aresta || o.fuga > 0 || o.batida) return;
    var regra = OBSTACULOS[o.tipo];
    var pos = pontoDaAresta(e, o.s);
    var d = noQuadroDoTrem(j, o.s) - t.s;
    var dica;
    if (regra.reage === 'apito') {
      // o apito tem alcance curto: a dica precisa dizer se já vale apitar,
      // senão o aluno apita cedo e acha que o botão não funciona
      dica = d <= CFG.RAIO_APITO ? 'APITE AGORA (espaço) para afastar'
        : 'Chegue mais perto e apite (espaço)';
    } else {
      dica = 'Reduza para menos de ' + regra.velSegura + ' km/h';
    }
    considerar(d, {
      tipo: o.tipo, icone: regra.icone, titulo: regra.titulo, dica: dica,
      cor: regra.reage === 'apito' && d > CFG.RAIO_APITO ? '#ffb648' : regra.cor,
      x: pos.x, y: pos.y
    });
  });

  if (e.obras) {
    var entrada = noQuadroDoTrem(j, e.obras[0] * e.comp);
    var saida = noQuadroDoTrem(j, e.obras[1] * e.comp);
    var comeco = Math.min(entrada, saida);
    var pos = posicaoNaAresta(j, t.aresta, (e.obras[0] + e.obras[1]) / 2 * e.comp);
    considerar(comeco - t.s, {
      tipo: 'obras', icone: '🚧', titulo: 'TRECHO EM OBRAS',
      dica: 'Reduza para 85 km/h ou o trem vai sacudir',
      cor: '#ffb648', x: pos.x, y: pos.y
    });
  }

  if (e.ladeira) {
    var fIni = e.ladeira[0] * e.comp, fFim = e.ladeira[1] * e.comp;
    var entrada = noQuadroDoTrem(j, j.trem.de === e.a ? fIni : fFim);
    var sobe = (j.trem.de === e.a ? e.ladeira[2] : -e.ladeira[2]) > 0;
    var meio = pontoDaAresta(e, (fIni + fFim) / 2);
    considerar(entrada - t.s, {
      tipo: sobe ? 'subida' : 'descida',
      icone: sobe ? '⛰' : '🛝',
      titulo: sobe ? 'LADEIRA — SUBIDA' : 'LADEIRA — DESCIDA',
      dica: sobe ? 'Acelere antes: a rampa segura o trem'
        : 'O trem ganha velocidade sozinho — segure o freio',
      cor: '#9fc4ff', x: meio.x, y: meio.y
    });
  }

  if (e.tunel) {
    var tIni = e.tunel[0] * e.comp, tFim = e.tunel[1] * e.comp;
    var boca = noQuadroDoTrem(j, j.trem.de === e.a ? tIni : tFim);
    var mt = pontoDaAresta(e, (tIni + tFim) / 2);
    considerar(boca - t.s, {
      tipo: 'tunel', icone: '🕳', titulo: 'TÚNEL À FRENTE',
      dica: 'Escuro lá dentro: siga o trilho com calma',
      cor: '#c9a227', x: mt.x, y: mt.y
    });
  }

  var sinal = j.sinais[t.para];
  if (sinal && sinal.vermelho) {
    considerar(e.comp - t.s, {
      tipo: 'sinal', icone: '🚦', titulo: 'SINAL FECHADO',
      dica: 'Chegue devagar ao cruzamento',
      cor: '#ff5f5f', x: NOS[t.para].x, y: NOS[t.para].y
    });
  }

  return melhor;
}

function apitar(j) {
  var t = j.trem;
  var espantou = 0;
  j.obstaculos.forEach(function (o) {
    if (o.fuga > 0 || o.batida) return;
    if (OBSTACULOS[o.tipo].reage !== 'apito') return;
    var pos = posicaoNaAresta(j, o.aresta, o.s);
    if (Math.hypot(pos.x - t.x, pos.y - t.y) < CFG.RAIO_APITO) { o.fuga = 3.5; espantou++; }
  });
  return espantou;
}

/** Ponto e inclinação a `s` metros do início da aresta (sentido a → b). */
function pontoDaAresta(e, s) {
  var alvo = Math.max(0, Math.min(e.comp, s));
  var i = 1;
  while (i < e.acum.length - 1 && e.acum[i] < alvo) i++;
  var s0 = e.acum[i - 1], s1 = e.acum[i];
  var f = s1 > s0 ? (alvo - s0) / (s1 - s0) : 0;
  var p0 = e.pontos[i - 1], p1 = e.pontos[i];
  return {
    x: p0[0] + (p1[0] - p0[0]) * f,
    y: p0[1] + (p1[1] - p0[1]) * f,
    ang: Math.atan2(p1[1] - p0[1], p1[0] - p0[0])
  };
}

function posicaoNaAresta(j, idAresta, s) {
  return pontoDaAresta(j.malha.arestas[idAresta], s);
}

function terminar(j) {
  j.estado = 'fim';
  j.painel = null;
}

/** Bússola: para onde fica o bairro do passageiro mais impaciente. */
/** Bússola: o depósito mais perto quando falta carvão, senão o bairro do
 *  passageiro mais impaciente. */
function alvoSugerido(j) {
  if (j.carvao < 30) {
    var d1 = Math.hypot(NOS.dep1.x - j.trem.x, NOS.dep1.y - j.trem.y);
    var d2 = Math.hypot(NOS.dep2.x - j.trem.x, NOS.dep2.y - j.trem.y);
    return { no: d1 < d2 ? 'dep1' : 'dep2', texto: 'CARVÃO ACABANDO' };
  }
  if (j.passageiros.length === 0) return { no: 'central', texto: 'BUSCAR PASSAGEIROS' };
  var pior = j.passageiros[0];
  j.passageiros.forEach(function (p) { if (p.paciencia < pior.paciencia) pior = p; });
  var no = pior.tipo === 'oxitona' ? 'ox' : pior.tipo === 'paroxitona' ? 'par' : 'pro';
  return { no: no, texto: pior.palavra };
}

function atualizarFumaca(j, dt) {
  var t = j.trem;
  j.acumFumaca = (j.acumFumaca || 0) + dt;
  if (t.vel > 25 && j.acumFumaca > 0.11) {
    j.acumFumaca = 0;
    t.fumaca.push({
      x: t.x - Math.cos(t.ang) * 6,
      y: t.y - Math.sin(t.ang) * 6,
      r: 5 + Math.random() * 4, vida: 1,
      vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18
    });
  }
  for (var i = t.fumaca.length - 1; i >= 0; i--) {
    var f = t.fumaca[i];
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.r += dt * 11; f.vida -= dt * 0.55;
    if (f.vida <= 0) t.fumaca.splice(i, 1);
  }
}
