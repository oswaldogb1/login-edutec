# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

"Cidade Inteligente": jogo educacional multiplayer competitivo (6º/7º ano, aula de 50 min) sobre
tecnologia, trabalho e sociedade. Alunos constroem uma cidade em pixel art; o professor projeta um
painel com gráfico e ranking ao vivo. Roda 100% no navegador.

O público-alvo do **código** é um professor não-programador que vai fazer manutenção: comentários e
identificadores são em **português**, e o balanceamento do jogo mora todo em um arquivo só
(`js/dados.js`). Mantenha esse estilo ao editar.

## Rodar e testar

Não há build, não há gerenciador de pacotes, não há suíte de testes automatizados.

```powershell
python -m http.server 8765 --directory D:\code\cidade
# depois abra http://localhost:8765/index.html
```

- **Sempre teste por HTTP, não por `file://`.** Alguns navegadores recusam o `fetch` ao Firebase a
  partir de `file://` (o jogo cai no modo offline e o painel não recebe pontos). A automação do
  Chrome também bloqueia `file://`.
- O navegador **cacheia os `.js` agressivamente** neste setup. Ao verificar uma alteração, navegue
  para `index.html?v=N` com um `N` novo, ou o teste vai rodar código velho.
- Senha do painel do professor: `54321` (`SENHA_PROFESSOR`, em `js/app.js`).
- Fluxo mínimo de verificação: aba 1 → "Sou Professor" → senha (cria sala e mostra o código);
  aba 2 → "Sou Aluno" → código + nome → tutorial → jogo.
- A verificação de segurança do banco roda sozinha ao carregar a página e loga
  `Proteção do banco OK` no console. Um erro vermelho ali significa que a trava foi quebrada.
- **Limpe os dados de teste depois**: `await CI.firebase.apagarSala('CODIGO')` no console, e confirme
  com `await CI.firebase.ler('salas')`. O banco é compartilhado com outros projetos da escola.

## Regra inegociável: isolamento do banco de dados

O Realtime Database (`edutec-arnaldo`) é **compartilhado com outros jogos e sites**. Todo dado deste
jogo vive sob `/cidade_inteligente/`. A trava está inteira em `js/firebase.js`:

- Existe **uma única** função que monta URL (`montarCaminho`). Não escreva `fetch()` para o Firebase
  em nenhum outro lugar — nem em outro arquivo, nem "só para testar".
- Ela prefixa `cidade_inteligente/`, rejeita `..`, barra inicial, `.#$[]` e qualquer caractere fora
  de `[A-Za-z0-9_-/]`, e **reconfere o resultado** antes de devolver a URL.
- Gravação é sempre `PATCH` (parcial). **Não existe `PUT`** neste projeto — ele substituiria o nó.
- O único `DELETE` é `apagarSala(codigo)`, que exige código de 4 caracteres `[A-Z0-9]` e só alcança
  `cidade_inteligente/salas/{CODIGO}`.
- O autoteste no fim de `firebase.js` tenta caminhos proibidos e grita no console se algum passar.
  Se você mexer em `montarCaminho`, mantenha esse autoteste válido.

Formato dos dados:

```
cidade_inteligente/salas/{CODIGO}/
  status                      "aguardando" | "jogando" | "encerrada"
  config/                     { criadaEm, jogo, versao }
  jogadores/{idJogador}/      { nome, pontuacao, solucoes, indicadores{...}, perfil, atualizadoEm }
```

Não há WebSocket/SDK: a sincronização é **polling REST**. Aluno envia a cada 3s (só se mudou) e lê
`status` a cada 5s; painel lê `jogadores` a cada 3s.

## Arquitetura

Scripts clássicos (sem `type="module"`, para funcionar em rede escolar restrita e até em `file://`),
carregados **nesta ordem** em `index.html`; todos penduram coisas no namespace global `window.CI`:

| Arquivo | Papel | Expõe |
|---|---|---|
| `js/firebase.js` | REST + trava de segurança + estado de conexão | `CI.firebase` |
| `js/dados.js` | Indicadores, soluções, custos, fórmula da nota, perfis, tutorial | `CI.SOLUCOES`, `CI.calcularPontuacao`, … |
| `js/mapa.js` | Geração e desenho da cidade no canvas, trânsito, partículas | `CI.mapa` |
| `js/jogo.js` | Partida do aluno: estado, colocação, indicadores, persistência, sync | `CI.jogo` |
| `js/professor.js` | Painel: sala, polling, gráfico de barras, ranking, vencedor | `CI.professor` |
| `js/app.js` | Navegação entre telas + `CI.ui` (modal, aviso, mostrarTela) | `CI.ui` |

`app.js` carrega por último mas define `CI.ui`, que `jogo.js` e `professor.js` usam — a dependência
só é resolvida em tempo de execução, então **nunca chame `CI.ui` no corpo de um IIFE**, só dentro de
funções.

Navegação: `index.html` tem sete `<section class="tela">`; só a que tem `.ativa` aparece.
`CI.ui.mostrarTela(id)` faz a troca e **também liga/desliga o loop de animação do mapa** — passe por
ela sempre, nunca mexa em `.ativa` na mão.

### Estado do aluno

`CI.jogo.estado` é o objeto único da partida (`indicadores`, `orcamento`, `colocacoes`, `contagem`,
`pontos`, `selecionada`, `encerrada`). Duas coisas fáceis de quebrar:

- Cada `colocacao` guarda o **delta real aplicado** (já com clamp 0–100), e é isso que faz o
  "Desfazer" ser exato. Se mudar a aplicação de efeitos, preserve esse registro.
- `localStorage['ci_v1_{SALA}_{nome}']` guarda a cidade **e o `idJogador`**, salvo já na entrada.
  Isso é o que impede o aluno de virar um jogador duplicado no ranking ao recarregar a página.
  Já foi bug uma vez; não remova o `salvarLocal()` de `iniciar()`.

### Balanceamento (é aqui que se mexe no jogo)

Tudo em `js/dados.js`, comentado para leigo:

- Nota = `0.65 × média dos 5 indicadores + 0.35 × pior indicador`, vezes um fator de participação
  (0.85 sem construir nada → 1.00 com 8+ construções), escala 0–1000. O peso do "pior" é o que faz o
  jogo premiar equilíbrio em vez de quantidade de tecnologia — é o coração pedagógico, não mexa sem
  intenção.
- `desigualdade` é o único indicador em que **menor é melhor** (`melhorAlto: false`). Todo cálculo
  novo precisa tratar esse caso; a fórmula converte para "equidade" (`100 - desigualdade`).
- Repetir a mesma solução encolhe **só o lado bom** (`1/(1+0.4×n)`); os efeitos negativos entram
  sempre inteiros, e o custo sobe 15% a cada repetição.
- Referência de balanceamento medida: equilibrada ≈760, não fazer nada 425, só câmeras ≈250,
  automatizar tudo ≈210. Se uma mudança inverter essa ordem, o jogo perdeu o sentido.

## Restrições que valem para qualquer alteração

- **Zero dependências externas**: nada de npm, nada de CDN, nada de `<link>`/`<script>` remoto,
  nenhuma fonte web. Gráficos são desenhados à mão no canvas (não use Chart.js).
- **Máquinas escolares antigas**: o cenário parado do mapa é rasterizado uma vez num canvas
  offscreen (`mapa.base`) e só os carros/pedestres são redesenhados, com o desenho limitado a ~30 fps.
  Mantenha esse orçamento.
- **Falha de rede nunca trava o jogo**: `CI.firebase` nunca propaga erro — devolve `{ok:false}`. O
  aluno continua jogando local e reenvia quando a conexão volta.
- Identificadores em JavaScript só com ASCII (strings e comentários acentuados são fine); os arquivos
  são UTF-8 e o `<meta charset>` do HTML é quem define a codificação dos scripts.
- Nomes de aluno vindos do banco são conteúdo não confiável: escape ao injetar em HTML
  (`escapar()` em `professor.js`) ou use `textContent`.
- Toque e clique: o canvas do mapa escuta `pointerdown` e usa `click`/`touchstart` apenas como
  reserva para navegadores sem eventos de ponteiro (flag `jaUsaPonteiro`). Não troque isso por um
  debounce por tempo — descarta toques rápidos legítimos.

## Documentação

`GUIA-PROFESSOR.md` é entregável para o professor (como hospedar, cronograma dos 50 minutos, tabela
das 12 soluções, perguntas de discussão, solução de problemas). Se você mudar custos, efeitos,
fórmula, senha ou o fluxo do painel, **atualize o guia junto** — ele documenta esses números.
