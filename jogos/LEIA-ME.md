# Pasta de Jogos

Cada jogo educativo fica em uma subpasta própria aqui dentro, com seus arquivos
(`index.html`, scripts, estilos, imagens, sons, etc.).

## Como adicionar um jogo novo

1. Crie uma subpasta com um nome simples, sem espaços nem acentos. Exemplos:
   - `jogos/quiz-matematica/`
   - `jogos/caca-palavras/`

2. Coloque todos os arquivos do jogo dentro dela. **É obrigatório** que exista um
   `index.html` na raiz da subpasta — é ele que abre o jogo. Exemplo:

   ```
   jogos/
     quiz-matematica/
       index.html      <- ponto de entrada do jogo
       jogo.js
       estilo.css
       imagens/...
   ```

3. Envie a pasta para o GitHub (site do GitHub → "Add file" → "Upload files",
   arrastando a pasta).

4. No site, clique em **Adicionar Jogo** e cole o caminho:

   ```
   jogos/quiz-matematica/index.html
   ```

   O jogo passa a aparecer na Pasta de Jogos para todos os estudantes.

## Observações

- Os caminhos dentro do `index.html` do jogo devem ser **relativos**
  (`src="jogo.js"`, `src="imagens/foto.png"`), não absolutos. Assim o jogo funciona
  em qualquer pasta.
- Jogos hospedados em outros sites (ex.: itch.io) também funcionam: basta colar o
  endereço completo começando com `https://` no campo "Adicionar Jogo".
- Para remover um jogo da lista, use o botão **✕** no card dele dentro da Pasta de
  Jogos (pede a senha de administrador). Isso remove o jogo da lista; para apagar os
  arquivos em si, exclua a subpasta no GitHub.
