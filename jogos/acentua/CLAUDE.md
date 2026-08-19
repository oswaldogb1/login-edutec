# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Jogo educacional em português sobre classificação tônica e acentuação gráfica.
Comentários, nomes de variáveis e textos de interface são em português — mantenha
isso ao escrever código novo.

## Comandos

```bash
node build.js                      # obrigatório após QUALQUER mudança em src/ ou data/
py tools/gerar_palavras.py         # regera data/palavras.json e valida o banco (opcional)
```

`build.js` escreve `index.html` **na raiz** — é o arquivo que o GitHub Pages
publica e o que se distribui para os alunos. Ele é gerado: nunca edite à mão,
e sempre rode o build antes de commitar mudanças de `src/` ou `data/`.

`build.js` é o único passo de build. Não há bundler, linter, nem framework de
teste configurado. O jogo é publicado exclusivamente pelo GitHub Pages: não há
executável, instalador nem servidor.

Se `node` não for encontrado no Git Bash, use o PowerShell (o Node foi instalado
via winget e às vezes só aparece em shells novos).

## Arquitetura

### O build por concatenação define as regras do código

`build.js` lê `src/pagina.html` e substitui marcadores (`/*{CSS}*/`,
`/*{PALAVRAS}*/`, `/*{DADOS}*/`, `/*{MOTOR}*/`, `/*{DESENHO}*/`,
`/*{INTERFACE}*/`) pelo conteúdo dos arquivos, gerando `index.html` — um único
arquivo autocontido que roda offline. Consequências:

- **Nunca edite `index.html`**: é sobrescrito pelo build.
- **Não há módulos**. Todos os `src/*.js` compartilham um escopo global único.
  Não use `import`/`export`/`require`; declare com `var`/`function`. Nomes
  duplicados entre arquivos se sobrescrevem silenciosamente.
- **A ordem de concatenação importa**: palavras → dados → motor → desenho →
  interface. Um arquivo só pode usar o que vem antes dele em tempo de execução.
- Remover um marcador do template faz o build lançar erro (proposital).
- `src/dados.js` termina com um `if (typeof module !== 'undefined')` para poder
  ser exigido no Node em testes; `build.js` remove esse trecho por regex. Se
  mexer no final do arquivo, mantenha esse bloco como último elemento.

### Separação de responsabilidades

| Arquivo | Responsabilidade | Restrição |
|---|---|---|
| `src/dados.js` | mapa (grafo `NOS`/`ARESTAS`), cidade, textos didáticos dos bairros | só dados |
| `src/motor.js` | estado do jogo, física, passageiros, carvão, obstáculos, pontuação | **não toca em DOM nem em canvas** |
| `src/desenho.js` | render em visão aérea + minimapa | só lê o estado, nunca o altera |
| `src/interface.js` | telas, HUD, painéis, laço principal, entrada do usuário | única camada com DOM |

O laço vive em `interface.js:laco()` e chama, nesta ordem: `atualizar()` →
`atualizarEscolha()` → `abrirPainelNaTela()` → `desenhar()` → `atualizarHud()`.

### Mapa grande exige recorte

O mundo tem 5600 × 4200. Todo desenho passa por `visivel(x, y, folga)` antes de
sair no canvas, e o cenário (prédios, árvores, dunas, montes) é gerado **uma
vez** com semente fixa em `gerarCenario()`. Se acrescentar decoração nova,
gere-a ali e recorte no laço — desenhar o mapa inteiro a cada quadro derruba o
desempenho em Chromebook.

### Identidade visual do mundo

Cinco paisagens com identidade própria: cidade (asfalto e prédios claros de
telhado colorido, à moda do mapa do GTA 1), vilarejo (terra batida, casas de
telhado vermelho e hortas), serra (montes cinzentos com neve), deserto (areia,
dunas e cactos) e floresta (mata fechada com clareiras). Tudo sai de `PALETA`,
`CORES_PREDIO` e `TELHADOS` no topo de `src/desenho.js` — mexa lá, não em
literais espalhados.

A ordem das camadas em `desenhar()` importa: os **letreiros das estações são
desenhados depois do trem** (`desenharLetreiros()`), senão um vagão parado na
plataforma esconde o nome do bairro. `ESCALA_TREM` existe porque a locomotiva
precisa saltar aos olhos num mundo cheio de cor.

O túnel é desenhado **depois** do trem, para engoli-lo quando visto de fora —
mas fica translúcido quando é o próprio trem que está lá dentro, senão o aluno
perde a referência no escuro.

### O trem anda sobre um grafo de trilhos curvos

O trem é `{de, para, aresta, s}` — dois nós e a distância percorrida na aresta.
As arestas **não são retas**: cada uma nasce de pontos de controle em
`ARESTAS[].curva` e vira uma polilinha suave (Catmull-Rom) em
`construirMalha()`, que guarda `pontos` e `acum` (distância acumulada). Daí em
diante, qualquer posição sai de `pontoDaAresta(aresta, s)` — é ela que traduz
"metro 380 desta aresta" em x, y e inclinação. `posicionarTrem()` usa isso e
alimenta `trem.rastro`, que o `desenho.js` consome para pôr os vagões atrás nas
curvas.

Consequência prática: nada de interpolar entre `NOS[a]` e `NOS[b]` — isso
funcionava quando os trilhos eram retos e agora daria posições fora do trilho.

A escolha de rota nos cruzamentos passa por três funções que trabalham juntas:
`opcoesDeSaida()` (ordena as saídas da esquerda para a direita em relação ao
sentido de chegada; com `veioDe === null` inclui voltar por onde veio),
`indiceMaisReto()` (o padrão quando o jogador não escolhe) e
`atualizarEscolha()` (mostra/limpa a agulha conforme a distância).

**Cuidado com o referencial da aresta**: o trem mede `s` a partir de `t.de`,
enquanto vacas e trechos em obras são medidos a partir de `aresta.a`. Quando o
trem volta pelo mesmo trilho os dois se invertem — por isso toda comparação
passa por `noQuadroDoTrem()`. Comparar `v.s` com `t.s` direto espelha a posição
do obstáculo e já foi bug real.

`ARESTAS` também marca `tunel`, `ladeira` e `obras` como frações da aresta.
A ladeira é a única com efeito físico (`ladeiraAtual()` soma ou subtrai
velocidade); túnel e obras mudam só o desenho e os avisos.

Terminais (bairros e depósitos) param o trem sozinhos. A Estação Central só para
se o trem chegar com `vel <= CFG.VEL_PARADA` — passar rápido é uma falha
deliberada de condução. `fecharPainel()` decide entre `inverterMarcha()` (nos
terminais) e `sairDoNo()` (na Central, usando a agulha marcada).

### Painéis: o motor pede, a interface obedece

O motor sinaliza uma parada preenchendo `j.painel = { tipo: 'central' |
'bairro' | 'deposito', ... }`. A interface detecta isso no laço e monta o DOM.
Nunca abra um painel chamando `montarPainel*` diretamente, e sempre feche por
`fecharPainelNaTela()` (que delega ao motor a decisão de como sair do nó).

### Acentuação é derivada, não catalogada

`data/palavras.json` guarda só quatro campos (`palavra`, `tipo`, `nivel`,
`regra`). Tudo o mais — forma sem acento, qual vogal recebe o acento, se é agudo
ou circunflexo — é derivado em tempo de execução por `analisarPalavra()`
(`src/motor.js`), que decompõe em NFD e remove apenas U+0300/0301/0302.

**Til e cedilha são preservados de propósito**: o til marca nasalidade e não é
acento gráfico. Por isso `cordão`, `amanhã` e `irmã` têm como resposta correta
"SEM ACENTO" no depósito — é pegadinha pedagógica, não bug.

Para adicionar palavras, basta escrever a grafia correta. `tools/gerar_palavras.py`
(Python 3) é o caminho preferido: as palavras são digitadas sem acento nos
`GRUPOS` e mapeadas pela grafia correta em `ACENTUADAS`; o script valida
duplicatas, proparoxítonas sem acento e acento fora de vogal.

`tipo: "monossilabo"` existe no banco mas **não tem bairro** — essas palavras só
aparecem no depósito de carvão. Qualquer código que sorteie passageiros precisa
filtrá-las (ver `sortearPalavra(j, apenasBairros)`).

## Aviso de obstáculo

`obstaculoAdiante()` (motor) devolve, a cada quadro, o perigo mais próximo à
frente **no trilho atual** — obstáculo, sinal fechado, obras, ladeira ou túnel
— dentro de `CFG.DIST_ALERTA`. O resultado vai para `j.alerta` e é consumido em dois
lugares: o popup do HUD (`interface.js`) e o anel pulsante no mapa
(`desenharMarcaDeAlerta`, em `desenho.js`).

Os obstáculos vêm do catálogo `OBSTACULOS`, que diz o ícone, a velocidade
segura, como se reage (`apito` ou `lento`) e em que paisagens cada um aparece.
O sorteio usa `biomaEm(x, y)` para só pôr cacto no deserto e árvore caída na
mata. Para criar um tipo novo, basta acrescentar uma entrada lá — o alerta, o
desenho e a colisão já leem do catálogo.

O aviso é informativo e **não pausa o jogo** — a graça é reagir a tempo. A dica
da vaca muda conforme `CFG.RAIO_APITO`: enquanto o apito não alcança, ela diz
para chegar mais perto. Se mexer no raio, a dica acompanha sozinha; se mudar o
texto, lembre que a interface só redesenha o popup quando `tipo + dica` muda.

## Invariante pedagógico

A ficha do passageiro **não pode revelar a classificação** — descobri-la é o
exercício. Nada de cor por tipo, rótulo ou `data-tipo` no HUD de bordo nem no
painel da Central. A cor do bairro só aparece depois da entrega, no relatório
final. Isso já foi violado uma vez por um seletor CSS `.ficha[data-tipo=...]`.

## Como verificar mudanças

Não há suíte de testes. A verificação é feita dirigindo o jogo pelo console do
navegador — todas as funções e o estado (`jogo`, `entradas`, `atualizar`,
`desenhar`, `comecar`, `desembarcar`, `responderAcento`…) são globais.

Dois obstáculos conhecidos ao automatizar isso:

- `requestAnimationFrame` **congela quando a aba não está visível**, então o laço
  para e `jogo.tempo` não avança. Para avançar o jogo por script, chame
  `atualizar(jogo, dt, entradas)` em laço síncrono em vez de esperar o rAF.
- A extensão do Chrome não abre `file://`. Para testar no navegador, sirva a
  raiz do projeto por HTTP local.
