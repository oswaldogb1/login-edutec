/* =====================================================================
   Monta index.html — um arquivo único, sem dependências, que roda offline
   com dois cliques e serve direto como GitHub Pages.

   Uso:  node build.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

/* banco de palavras -> array JS enxuto */
const banco = JSON.parse(ler('data/palavras.json')).palavras.map((p) => ({
  palavra: p.palavra,
  tipo: p.tipo,
  nivel: p.nivel,
  regra: p.regra
}));

const palavrasJs =
  '/* Banco de palavras (' + banco.length + '). Para editar, mexa em data/palavras.json\n' +
  '   e rode "node build.js" de novo. */\n' +
  'var PALAVRAS = ' + JSON.stringify(banco, null, 0) + ';';

/* o dados.js exporta para o Node quando usado em teste; no HTML isso sai */
const dados = ler('src/dados.js').replace(/if \(typeof module[\s\S]*$/m, '');

const partes = {
  '/*{CSS}*/': ler('src/estilo.css'),
  '/*{PALAVRAS}*/': palavrasJs,
  '/*{DADOS}*/': dados,
  '/*{MOTOR}*/': ler('src/motor.js'),
  '/*{DESENHO}*/': ler('src/desenho.js'),
  '/*{INTERFACE}*/': ler('src/interface.js')
};

let html = ler('src/pagina.html');
Object.keys(partes).forEach((marca) => {
  if (html.indexOf(marca) < 0) throw new Error('Marcador ausente no template: ' + marca);
  html = html.replace(marca, () => partes[marca]);
});

const destino = path.join(raiz, 'index.html');
fs.writeFileSync(destino, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('OK -> ' + destino);
console.log('     ' + kb + ' KB · ' + banco.length + ' palavras · nenhuma dependência externa');
