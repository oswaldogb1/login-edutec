# 🧩 Batalha das Cruzadinhas! — Cidades Inteligentes e Sustentáveis

Cruzadinha animada em ambiente 3D + painel do professor com **ranking ao vivo**
para projetar na sala de aula.

```
index.html       → o jogo (aluno)
professor.html   → painel de ranking ao vivo (senha 54321)
assets/js/       → puzzle, banco de dados, cena 3D, som, lógica
assets/css/      → estilos
```

Não há build nem dependências para instalar: são arquivos estáticos.

---

## Como rodar

O jogo precisa ser servido por HTTP (abrir com duplo clique em `file://`
funciona parcialmente, mas o QR code e alguns recursos ficam limitados).

```bash
cd D:\code\cruza
python -m http.server 8777
```

- Aluno: <http://localhost:8777/index.html>
- Professor: <http://localhost:8777/professor.html>

Nos computadores da turma basta abrir o endereço principal: os alunos caem
direto na tela de entrada do jogo. O professor chega ao painel pelo botão
**👩‍🏫 Tela do professor**, no canto superior direito da tela de entrada (ele
some durante a partida, para não disputar espaço com o placar).

Para a turma acessar pelo celular, publique a pasta em qualquer hospedagem
estática (GitHub Pages, Netlify, Vercel, IIS, Apache…). O painel do professor
mostra o link e o QR code prontos para projetar.

---

## Como o jogo funciona

**Tabuleiro** — 17×17, 15 palavras, **21 cruzamentos**, gerado para que todas
as palavras se conectem em uma peça única. O layout é fixo (definido em
`assets/js/puzzle.js`), então todos os alunos jogam exatamente a mesma grade.

**Ambiente 3D** — uma cidade inteligente low-poly (Three.js) com prédios que
respiram, janelas acendendo, árvores, veículos circulando e confete a cada
acerto. O tabuleiro fica inclinado em perspectiva CSS 3D e cada letra **vira em
3D** quando a palavra é concluída. O botão 🧊 alterna para a visão plana, e se
a máquina não tiver WebGL o jogo continua funcionando normalmente.

**Jogabilidade**
| Ação | Como |
|---|---|
| Escolher palavra | Clicar na dica ou em uma casa do tabuleiro |
| Trocar direção | Clicar de novo numa casa de cruzamento |
| Digitar | Teclado normal — acentos são aceitos (`Ç` vale `C`, `Á` vale `A`) |
| Letras já cruzadas | Podem ser digitadas normalmente: o cursor passa por cima delas sem desalinhar a palavra |
| Apagar | `Backspace` |
| Pular palavra | `Tab` ou `Enter` |
| Dica da pergunta | Botão **💡 Dica** ao lado de cada pergunta — texto de apoio, **sem custo** |
| Dica (revela 1 letra) | Botão 💡 do topo — custa 40 pontos, máximo de 5 por partida |

Em celular e tablet, tocar numa casa abre o teclado do aparelho.

**As duas dicas** — cada pergunta tem uma dica de apoio própria (a letra inicial
mais uma pista de contexto), aberta pelo botão 💡 na lista de perguntas ou na
faixa do topo. Ela é gratuita e serve para destravar quem empacou. Já o 💡 da
barra superior é outra coisa: revela uma letra no tabuleiro e custa 40 pontos.

Para mudar os textos, edite o campo `hint` de cada palavra em
`assets/js/puzzle.js`. Se quiser cobrar pontos também pela dica da pergunta,
basta descontar em `abrirAjuda()` no `assets/js/game.js`.

**Pontuação**

| Item | Pontos |
|---|---|
| Palavra correta | 100 + 5 por letra |
| Sequência de acertos sem erro | +20 por acerto (até +100) |
| Dica usada | −40 |
| Conclusão da cruzadinha | +300 |
| Bônus de tempo | até +300 (quanto mais rápido, maior) |

Uma palavra só é conferida quando todas as suas casas estão preenchidas: se
estiver errada, ela treme em vermelho e o aluno pode corrigir sem perder
pontos — só a sequência é zerada.

---

## Painel do professor

Senha: **54321** (definida em `assets/js/teacher.js`, constante `SENHA`).

O painel mostra, atualizando sozinho conforme os alunos jogam:

- **Pódio ao vivo** com os 3 primeiros — quando alguém assume a liderança, o
  card comemora com animação, som e confete na cidade 3D;
- **Classificação completa** com barra de progresso, tempo correndo, quantas
  letras cada aluno revelou, quantas dicas de pergunta abriu e destaque em quem
  acabou de subir de posição;
- **Estatísticas** da turma: quantos estão jogando, quantos concluíram, média
  de pontos e total de palavras acertadas;
- **Desempenho por palavra** — quantos alunos acertaram cada uma; as que poucos
  acertaram ficam marcadas em vermelho, mostrando o que vale retomar na aula;
- **QR code e link** para os alunos entrarem;
- **📺 Projeção** aumenta tudo para leitura à distância, **⛶ Tela cheia** e
  **⬇ CSV** exporta a classificação para planilha.

### Salas

Cada turma usa um **código de sala** (padrão `GERAL`). O aluno digita o código
na entrada, ou entra por um link já preparado: `index.html?sala=8B-TARDE`.

Para começar uma rodada limpa, o professor cria um **código novo** em
🏫 *Trocar sala* — nada precisa ser apagado.

---

## Dados no Firebase

Tudo fica sob um único ramo, sem tocar no resto do banco:

```
cruzada_cidades/
└── salas/
    └── {CODIGO}/
        ├── codigo, criadaEm, jogo
        └── jogadores/
            └── {idDoAluno}/
                ├── nome, turma, pontos, acertos, total,
                ├── dicas (letras reveladas), ajudas (dicas de pergunta),
                ├── tempoMs, inicioEm, atualizadoEm, finalizado
                └── palavras/{PALAVRA}/{emMs, comDica}
```

**O app nunca apaga nada.** Toda escrita é `PATCH` (merge), que só cria ou
atualiza as chaves enviadas e jamais remove as vizinhas. Não existe `DELETE`
nem `PUT` em lugar nenhum do código — veja `assets/js/db.js`.

O progresso é salvo a cada palavra acertada, a cada 20 segundos e ao fechar a
aba. O mesmo aluno mantém o mesmo registro se recarregar a página (o id fica no
`localStorage`), então recarregar não cria entradas duplicadas no ranking.

O ranking ao vivo usa o **streaming REST do Firebase** (`EventSource`); se a
conexão não permitir streaming, cai sozinho para atualização a cada 4 segundos.
O indicador ao lado do logo mostra qual modo está ativo.

---

## Palavras e dicas

| # | Palavra | Pergunta | Dica de apoio |
|---|---|---|---|
| 1 | SUSTENTABILIDADE | Princípio de utilizar os recursos naturais sem prejudicar as futuras gerações | Começa com S e é a palavra mais longa da grade. Lema: usar hoje sem faltar amanhã. |
| 2 | TECNOLOGIA | Ferramentas e conhecimentos para melhorar os serviços de uma cidade | Começa com T. Sensores, aplicativos e internet fazem parte dela. |
| 3 | RECICLAGEM | Reaproveitamento de materiais que seriam descartados | Começa com R. É o destino da lata, do papel e da garrafa depois da coleta seletiva. |
| 4 | ENERGIA | Recurso para iluminação, aparelhos e atividades urbanas | Começa com E. É medida em quilowatt-hora e vem cobrada na conta de luz. |
| 5 | ÁGUA | Recurso natural essencial à vida que deve ser preservado | Começa com A e tem só 4 letras. Sua fórmula química é H₂O. |
| 6 | MOBILIDADE | Como pessoas e veículos se deslocam pela cidade | Começa com M. Quando o trânsito melhora e o ônibus passa mais, dizemos que ela melhorou. |
| 7 | INOVAÇÃO | Novas ideias e soluções para melhorar a vida das pessoas | Começa com I. É o que uma startup faz quando cria algo que ainda não existia. |
| 8 | CIDADANIA | Participação das pessoas na construção de uma cidade melhor | Começa com C. Tem a ver com direitos, deveres, votar e participar. |
| 9 | TRANSPORTE | Meios para deslocar pessoas e mercadorias | Começa com T. Ônibus, metrô e bicicleta são meios de… |
| 10 | ARBORIZAÇÃO | Plantio e cuidado de árvores em áreas urbanas | Começa com A. É o que deixa a rua mais sombreada e fresca no verão. |
| 11 | SOLAR | Energia obtida a partir da luz do Sol | Começa com S e tem 5 letras. Vem das placas instaladas no telhado. |
| 12 | DIGITAL | Aquilo que usa recursos tecnológicos e sistemas informatizados | Começa com D. É o oposto de analógico. |
| 13 | LIXO | Material descartado que precisa de destinação correta | Começa com L e tem 4 letras. Vai para a lixeira e depois para o aterro. |
| 14 | ECONOMIA | Organização dos recursos para evitar desperdícios | Começa com E. Também é o nome do ato de gastar menos do que se tem. |
| 15 | PLANEJAMENTO | Organização antecipada das ações para melhorar uma cidade | Começa com P. É o que se faz no papel antes de começar a obra. |

Para trocar as palavras, edite `LAYOUT` em `assets/js/puzzle.js` (posição
`r`/`c`, direção `H`/`V`, `clue` e `hint` de cada palavra). A numeração, os
cruzamentos e o painel de perguntas se ajustam sozinhos.

---

## Dependências externas

Carregadas de CDN, portanto a máquina precisa de internet (que já é necessária
para o Firebase):

- Three.js r128 — cena 3D
- qrcodejs — QR code do painel do professor
- Google Fonts (Fredoka + Inter)

Todas têm degradação suave: sem elas, o jogo continua jogável.
