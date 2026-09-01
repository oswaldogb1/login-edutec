# 🌱 Cidade Inteligente e Sustentável

Jogo educacional **3D em primeira pessoa** para navegador. O aluno explora uma cidade
low-poly e descobre **15 tecnologias e práticas sustentáveis reais**, distribuídas em
**5 zonas temáticas**. Cada descoberta traz uma explicação curta e uma **série de 3 perguntas**
de múltipla escolha — **45 perguntas** na partida inteira. Ao final, a pontuação vai
automaticamente para um **ranking da turma em tempo real**, que o professor projeta na TV ou
no telão.

A cidade é **compartilhada**: todos os alunos da escola entram na mesma sala, se veem andando
pelo mapa e conversam pelo teclado enquanto exploram.

Feito para sala de aula (ensino fundamental II / médio). **100% estático** — roda no GitHub
Pages sem backend próprio.

---

## 📚 Sumário

- [O que tem no jogo](#-o-que-tem-no-jogo)
- [Como rodar localmente](#-como-rodar-localmente)
- [Como publicar no GitHub Pages](#-como-publicar-no-github-pages)
- [Firebase: configuração e segurança](#-firebase-configuração-e-segurança)
- [Tela do professor](#-tela-do-professor)
- [Como personalizar](#-como-personalizar)
- [Estrutura de arquivos](#-estrutura-de-arquivos)
- [O que já foi testado](#-o-que-já-foi-testado)
- [Problemas comuns](#-problemas-comuns)

---

## 🎮 O que tem no jogo

### Controles

| Tecla | Ação |
|---|---|
| `W` `A` `S` `D` (ou setas) | Andar |
| Mouse | Olhar em volta |
| `Shift` | Correr — essencial para escapar dos animais |
| `E` | Interagir com o ponto brilhante mais próximo |
| `F` (ou clique) | Revidar a pauladas durante uma perseguição |
| `T` | Abrir o bate-papo da turma (`Enter` envia; `Enter` vazio fecha) |
| `Esc` | Pausar / liberar o mouse |

### As 5 zonas e os 15 pontos de descoberta

Cada ponto tem **3 perguntas em sequência** — o local só é dado por descoberto quando o aluno
responde todas.

| Zona | Cor | Pontos |
|---|---|---|
| 1. ⚡ Energia Limpa | amarelo | Painéis solares · Turbina eólica · Poste inteligente |
| 2. ♻️ Lixo e Reciclagem | verde | Lixeira inteligente · Composteira · **Estação de coleta seletiva** |
| 3. 🚲 Mobilidade | azul | Ciclovia · Carro elétrico e eletroposto · Ponto de ônibus conectado |
| 4. 💧 Água e Verde | turquesa | Parque urbano · Captação de água da chuva · **Horta comunitária** |
| 5. 📱 Tecnologia Social | roxo | Totem do app cidadão · Painel de dados abertos · **Praça conectada (Wi-Fi público)** |

Cada zona tem chão colorido, iluminação e placa próprios, para o aluno se orientar.
A zona 5 fica na praça central (onde o jogo começa) e as outras quatro nos quatro cantos
da cidade, ligadas por avenidas.

### Pontuação (configurável)

- Acerto na 1ª tentativa: **100 pontos**
- Cada erro tira **30 pontos** do valor daquela pergunta (mínimo garantido: **20**)
- Errar **não bloqueia**: o aluno tenta de novo até acertar — o objetivo é aprender
- Descobrir os **15 pontos** rende um bônus de **200 pontos**
- Cada paulada certeira no animal vale **5 pontos** (coragem conta)
- Uma partida completa leva bem mais tempo que a versão anterior: são 45 perguntas

### 🐕 Fuga do animal (consequência de errar)

Errar não custa só pontos: **a cada resposta errada um animal aparece e sai atrás do
aluno**. Ele precisa segurar `Shift` e correr até uma das quatro **Áreas Seguras** —
abrigos com telhado verde e um facho de luz visível de longe.

| | |
|---|---|
| Perseguidores | 🐕 cachorro bravo · 🐝 enxame de abelhas · 🦢 ganso furioso (sorteado a cada erro) |
| Velocidade do animal | 6,5 m/s — **alcança quem anda** (4,4 m/s), **não alcança quem corre** (8 m/s) |
| Áreas Seguras | 4 abrigos, nas diagonais entre as zonas; toda zona tem um a ~51 m |
| Chegou no abrigo | a pergunta reabre para nova tentativa, sem punição extra |
| Foi alcançado | **não acaba a fuga**: leva uma mordida, perde 20 de vida e 8 pontos, e continua correndo |
| Ficou sem vida | desmaia, perde 25 pontos e acorda no abrigo com 60 de vida; a pergunta reabre |

Durante a fuga o HUD mostra o animal, a distância dele, uma seta apontando para o abrigo,
o contador de pauladas e uma vinheta vermelha que fica mais forte conforme o bicho chega
perto. Não dá para interagir com pontos de descoberta enquanto se foge.

### 🩸 Barra de vida e mordidas

O aluno tem **100 de vida**. Cada mordida tira **20** e espirra sangue na tela — ou seja,
ele aguenta **cinco** antes de desmaiar, e mesmo desmaiar não custa a pergunta: ele acorda
no abrigo e tenta de novo. Parado, a vida volta devagar; **dentro de uma Área Segura, bem
mais rápido**, o que dá aos abrigos uma segunda utilidade.

O sangue é estilizado (manchas translúcidas no vidro da tela, no mesmo traço low-poly do
resto do jogo). Se preferir uma versão sem isso para a sua turma, `PERSEGUICAO.ativa: false`
desliga perseguição, mordidas e sangue de uma vez só.

### 🪵 Revidar a pauladas

O aluno não está desarmado: ele carrega um porrete. Com `F` (ou clique) ele acerta o animal
que estiver **à frente e a até 3,6 m**. Cada acerto empurra o bicho e o deixa **tonto por
2 segundos** — é a janela para correr até o abrigo. Depois de **3 pauladas** o animal
desiste e vai embora, e a pergunta reabre como se ele tivesse chegado ao abrigo.

São, portanto, três saídas para cada erro: **correr**, **revidar** ou **aguentar as
mordidas** — e cada uma delas devolve o aluno à mesma pergunta.

### 👥 Cidade compartilhada e bate-papo

Todos os alunos entram na **mesma sala** automaticamente — não há código de sala para
digitar. Cada um vê os colegas andando pelo mapa, com nome e turma sobre a cabeça, e
também como pontinhos no minimapa. O contador no canto direito mostra quantos estão online.

Chegando perto de alguém, o rodapé mostra *"T conversar com Fulano"*. `T` abre a caixa de
texto, `Enter` envia (e a mensagem aparece como um balão de fala sobre a cabeça de quem
falou, além do histórico no canto), `Enter` vazio fecha sem enviar. Enquanto se digita, o
personagem não anda.

> Se o bate-papo atrapalhar a aula, `MULTIJOGADOR.ativo: false` em `src/config.js` desliga
> a parte compartilhada por completo — o jogo volta a ser individual.

Duas regras existem para a mecânica ser justa:

- **O animal nunca nasce entre o aluno e o abrigo** — ele surge do lado oposto, para
  ninguém correr direto para dentro do bicho.
- **O abrigo onde o aluno já está não vale para a fuga seguinte.** Sem isso, errar de novo
  logo depois de escapar não teria consequência nenhuma: a fuga acabaria no mesmo quadro.
  O abrigo usado aparece apagado no minimapa e a seta aponta para outro.

A mecânica inteira pode ser desligada em `src/config.js` (`PERSEGUICAO.ativa = false`),
caso o professor prefira uma aula sem essa pressão.

### HUD

Nome e turma, pontuação, barra de progresso (`6/12 descobertos`), zona atual,
**minimapa** com as zonas, os pontos (verde = já descoberto) e as Áreas Seguras (`S`),
**bússola** e cronômetro (quando há tempo limite configurado). Durante uma fuga entram
o alerta do animal, a seta para o abrigo e a vinheta de perigo.

---

## 💻 Como rodar localmente

O projeto usa **módulos ES (`import`)**, então **não funciona abrindo o `index.html`
com dois cliques** (o navegador bloqueia por CORS em `file://`). É preciso um servidor
local — qualquer um serve. Escolha uma opção:

### Opção A — Python (já vem instalado no Windows/macOS/Linux na maioria dos casos)

```bash
cd caminho/para/o/projeto
python -m http.server 5173
```

### Opção B — Node.js

```bash
cd caminho/para/o/projeto
npm run dev
```

(equivale a `npx serve . --listen 5173`)

### Opção C — VS Code

Instale a extensão **Live Server** e clique em *Go Live*.

Depois abra no navegador:

- Jogo: <http://localhost:5173/index.html>
- Professor: <http://localhost:5173/professor.html>

> Não é preciso `npm install`: o Three.js e o Firebase são carregados por CDN.
> Só é necessária conexão com a internet na primeira carga (e para gravar o ranking).

### Modo de depuração

Abra o jogo com `?debug=1` (ex.: `index.html?debug=1`) para expor `window.jogo` no console:

```js
jogo.irPara('parque')   // teleporta até um ponto de interação
jogo.estado             // pontuação, descobertas etc.
jogo.perseguicao        // estado da fuga (animal, abrigo bloqueado…)
jogo.simular(3)         // roda 3 segundos de jogo sem depender do quadro do navegador
jogo.finalizar('fim')   // encerra e grava no Firebase
```

Útil para o professor demonstrar rapidamente uma zona específica sem precisar caminhar até lá.

---

## 🚀 Como publicar no GitHub Pages

O projeto já está pronto para o Pages: `index.html` está na **raiz** e há um arquivo
`.nojekyll` (que impede o Jekyll de ignorar pastas).

### Passo a passo

1. **Crie o repositório no GitHub** (pode ser público ou privado com Pages habilitado).

2. **Envie os arquivos** a partir da pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Jogo Cidade Inteligente e Sustentável"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

3. **Ative o GitHub Pages**: no repositório, vá em
   **Settings → Pages → Build and deployment**
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` e pasta **`/ (root)`**
   - Clique em **Save**

4. **Aguarde 1–2 minutos.** O site ficará em:

   ```
   https://SEU-USUARIO.github.io/SEU-REPOSITORIO/
   ```

   E a tela do professor em:

   ```
   https://SEU-USUARIO.github.io/SEU-REPOSITORIO/professor.html
   ```

### Se preferir publicar a partir da pasta `/docs`

O GitHub Pages também aceita servir de `/docs`. Nesse caso:

```bash
mkdir docs
cp -r index.html professor.html src assets .nojekyll docs/
git add docs && git commit -m "Publica em /docs" && git push
```

E em **Settings → Pages**, escolha a pasta **`/docs`**.

> ⚠️ Atenção: mantenha `index.html`, `professor.html`, `src/` e `assets/` sempre juntos —
> os caminhos no HTML são relativos.

### Dica para a sala de aula

Depois de publicar, gere um QR Code da URL e projete no quadro: os alunos abrem o jogo
direto no celular ou no Chromebook, sem instalar nada. (O jogo pede teclado — em tablets
sem teclado a experiência fica limitada.)

---

## 🔥 Firebase: configuração e segurança

### Banco usado

O projeto já aponta para o Realtime Database informado:

```
https://edutec-arnaldo-default-rtdb.firebaseio.com/
```

A configuração fica em [`src/config.js`](src/config.js):

```js
export const FIREBASE_CONFIG = {
  databaseURL: 'https://edutec-arnaldo-default-rtdb.firebaseio.com/',
  projectId: 'edutec-arnaldo'
};
```

Para usar **outro** banco, basta trocar a `databaseURL` aí. Para o Realtime Database,
esse campo já é suficiente — não é preciso `apiKey` nem autenticação.

### Estrutura dos dados gravados

```
resultados/
  └── 9ºA/                      ← turma (chave gerada a partir do que o aluno digitou)
        └── -NxYz123abc/        ← ID automático gerado pelo push()
              nome: "Ana Souza"
              turma: "9ºA"
              pontuacao: 940
              pontosDescobertos: 11
              totalPontos: 12
              acertosPrimeira: 9
              duracaoSegundos: 512
              timestamp: 1756312800000
              dataLocal: "27/08/2026 14:20:00"
```

### 🔒 Garantia de que nada é apagado

Esta é a regra crítica do projeto, e ela é garantida **pelo próprio código**, não por
disciplina de quem programa:

- [`src/firebase.js`](src/firebase.js) (usado pelo jogo) importa do SDK **apenas**
  `getDatabase`, `ref` e **`push`**.
- [`src/professor.js`](src/professor.js) (usado pelo painel) importa **apenas**
  `getDatabase`, `ref`, **`onValue`** e **`get`** — funções de leitura.
- **`set()`, `update()` e `remove()` não são importados em lugar nenhum do projeto.**
  Como não existem no escopo, é impossível chamá-las por acidente.
- `push()` sempre cria um **filho novo** com ID automático; ele nunca sobrescreve
  um nó existente.

Para conferir você mesmo:

```bash
grep -rn "remove(\|update(\|firebase-database" src/
```

Você verá apenas os dois `import` de leitura/escrita descritos acima.

### Regras do banco

Como não há autenticação, o banco pode ficar com regras públicas. No console do Firebase
(**Realtime Database → Regras**):

```json
{
  "rules": {
    "resultados": {
      ".read": true,
      ".write": true
    },
    "renova_cidade": {
      ".read": true,
      ".write": true
    }
  }
}
```

> `renova_cidade` é o nó da **cidade compartilhada** (posições dos alunos e bate-papo).
> Ele é separado de `resultados` de propósito: o jogo nunca escreve fora dele, e a única
> exclusão que o código sabe fazer é a do próprio avatar do aluno ao sair da partida.
> Se quiser limpar o histórico do bate-papo, apague `renova_cidade` no console —
> ele se recria sozinho na próxima partida.

Se quiser um passo a mais de proteção **no lado do servidor** (recomendado), estas regras
permitem criar registros novos mas **proíbem alterar ou apagar** os já existentes:

```json
{
  "rules": {
    "resultados": {
      ".read": true,
      "$turma": {
        "$id": {
          ".write": "!data.exists() && newData.exists()",
          ".validate": "newData.hasChildren(['nome','turma','pontuacao','timestamp'])"
        }
      }
    }
  }
}
```

Com essa versão, mesmo que alguém tente apagar dados pelo console do navegador, o
Firebase recusa.

### Testando a conexão

1. Abra o jogo, jogue (ou use `?debug=1` e `jogo.finalizar('teste')`).
2. Na tela de resultado, veja a mensagem:
   - ✅ *"Pontuação registrada no ranking da turma!"* → gravou;
   - ⚠️ aviso amarelo → sem internet ou regras bloqueando. Nesse caso a pontuação
     fica salva no `localStorage` do navegador do aluno como plano B.
3. Confira no console do Firebase, em `resultados/SUA-TURMA`.

---

## 👩‍🏫 Tela do professor

Arquivo: **`professor.html`**

- **Senha: `54321`** (definida em [`src/config.js`](src/config.js), constante `SENHA_PROFESSOR`).
  A verificação é no navegador — como o painel é só de leitura de dados não sensíveis,
  isso é suficiente. Para trocar a senha, edite essa constante.
- **Somente leitura**: usa `onValue` (tempo real) e `get` (botão *Atualizar*). Nunca escreve.
- **Atualização automática**: assim que um aluno termina, a linha dele aparece sozinha,
  com um destaque verde momentâneo. Não é preciso recarregar a página.
- **Filtro por turma** e opção *Mostrar todas as tentativas* (por padrão o painel mostra
  a **melhor** tentativa de cada aluno, o que evita que quem jogou 3 vezes ocupe o pódio inteiro).
- **Cartões de resumo**: nº de alunos, partidas jogadas, média e maior pontuação.
- **Botão ⛶ Tela cheia** e tipografia grande com alto contraste — pensado para projeção.

Depois de entrar uma vez, o painel se lembra da sessão naquela aba (`sessionStorage`),
então recarregar a página não pede a senha de novo. Fechar a aba encerra a sessão.

---

## 🛠 Como personalizar

Quase tudo se ajusta em dois arquivos, sem mexer no código 3D:

### `src/config.js` — regras do jogo

```js
export const REGRAS = {
  tempoLimiteSegundos: 0,      // 0 = sem limite. Ex.: 900 = 15 minutos de aula
  pontosAcertoPrimeira: 100,
  penalidadePorErro: 30,
  pontosMinimos: 20,
  bonusExploradorCompleto: 200,
  distanciaInteracao: 5.5
};

export const JOGADOR = {
  velocidade: 40,        // andando: ~4,4 m/s
  velocidadeCorrida: 72  // correndo (Shift): ~8 m/s
};

export const PERSEGUICAO = {
  ativa: true,               // false desliga a fuga do animal por completo
  velocidadeAnimal: 6.5,     // entre o andar e o correr do jogador
  distanciaSurgimento: 16,   // a que distância o animal aparece
  raioAreaSegura: 7,
  penalidadeMordida: 8,      // 0 = ser mordido não custa pontos, só vida
  golpesParaEspantar: 3,     // pauladas para o animal desistir e ir embora
  penalidadeDesmaio: 25,     // custo de ficar sem vida
  tempoAvisoMs: 2200
};

export const VIDA = {
  maxima: 100,
  danoMordida: 20,           // 20 = o aluno aguenta 5 mordidas
  invulneravelMs: 1400,      // respiro entre uma mordida e outra
  regeneracaoPorSegundo: 3,          // andando pela cidade
  regeneracaoAbrigoPorSegundo: 14,   // dentro de uma Área Segura
  vidaAoAcordar: 60          // com quanto ele volta depois de desmaiar
};

export const PORRETE = {
  alcance: 3.6,              // metros
  anguloGraus: 75,           // abertura da mira
  recargaMs: 650,            // intervalo entre pauladas
  atordoamentoMs: 2000,      // 2 s de bicho tonto = janela para fugir
  empurrao: 4.5,
  pontosPorGolpe: 5
};

export const MULTIJOGADOR = {
  ativo: true,               // false = cada aluno joga sozinho
  sala: 'geral',             // todo mundo na mesma cidade
  intervaloEnvioMs: 260,     // de quanto em quanto tempo a posição é publicada
  distanciaConversa: 14      // distância para o colega aparecer como "por perto"
};
```

> Para uma turma que se dispersa com o bate-papo, basta `MULTIJOGADOR.ativo: false` —
> o jogo volta a ser individual e nada mais muda.

> A velocidade final do jogador é `velocidade / atrito`. Se mudar `atrito`, reveja
> `velocidadeAnimal`: o animal precisa continuar **mais rápido que o passo e mais lento
> que a corrida**, senão a fuga fica impossível ou trivial.

As posições dos quatro abrigos (`AREAS_SEGURAS`), a senha do professor e a URL do
Firebase também ficam nesse arquivo.

### `src/zones.js` — conteúdo pedagógico

É onde ficam as zonas, as explicações, as curiosidades e as perguntas. Para trocar uma
pergunta, edite o objeto `pergunta` do ponto (`opcoes` é a lista de alternativas e
`correta` é o índice da certa, começando em 0):

```js
pergunta: {
  enunciado: 'Sua pergunta aqui?',
  opcoes: ['Alternativa A', 'Alternativa B', 'Alternativa C'],
  correta: 1,                       // "Alternativa B"
  explicacaoResposta: 'Por que essa é a resposta certa.'
}
```

Para **adicionar um novo ponto**, copie um bloco existente, dê um `id` único, escolha um
`offset` (posição relativa ao centro da zona) e aponte `build` para um construtor 3D de
[`src/models.js`](src/models.js). O total (`12`) é calculado sozinho — o HUD, o minimapa e
o bônus se ajustam automaticamente.

### `src/models.js` — objetos 3D

Todos os modelos são feitos com caixas, cilindros e esferas do Three.js, usando os
ajudantes `box()`, `cyl()`, `sph()` e `arvore()`. Nenhum arquivo `.glb`/`.obj` é
necessário, o que mantém o projeto leve.

Os perseguidores ficam na lista `ANIMAIS` no fim do arquivo. Para acrescentar outro bicho,
escreva um `build...()` que devolva um grupo com a origem no chão e o focinho apontando
para `+Z` (o módulo de fuga gira o grupo com `atan2`), e adicione uma entrada à lista.

---

## 📁 Estrutura de arquivos

```
.
├── index.html            # jogo (tela inicial, tutorial, HUD, painel de quiz, resultado)
├── professor.html        # painel de ranking (protegido por senha)
├── package.json          # scripts opcionais de servidor local
├── .nojekyll             # necessário para o GitHub Pages servir as pastas
├── assets/
│   └── css/style.css     # estilos do jogo e do painel do professor
└── src/
    ├── config.js         # ⚙️ regras, senha, Firebase, velocidade
    ├── zones.js          # 📚 conteúdo: 5 zonas, 15 pontos, 45 perguntas
    ├── models.js         # 🧱 modelagem 3D low-poly de cada objeto
    ├── world.js          # 🏙️ cidade: chão, ruas, prédios, zonas, abrigos, colisores
    ├── player.js         # 🚶 câmera em 1ª pessoa, WASD e colisão
    ├── perseguicao.js    # 🐕 fuga: animal perseguidor e Áreas Seguras
    ├── hud.js            # 🖥️ HUD, minimapa e bússola
    ├── main.js           # 🎮 fluxo do jogo, pontuação, laço de renderização
    ├── firebase.js       # 💾 gravação (SOMENTE push)
    └── professor.js      # 🏆 ranking em tempo real (SOMENTE leitura)
```

---

## ✅ O que já foi testado

Verificado em Chrome, com servidor local e o banco real:

- [x] Tela inicial valida nome e turma; tutorial e entrada no jogo
- [x] Cidade 3D carrega com as 5 zonas, ruas, prédios, sombras e nuvens
- [x] Movimento WASD e colisão contra prédios, placas e limites do mapa
- [x] Aproximação de um ponto mostra o aviso `E descobrir …`
- [x] Painel de interação abre com explicação, pergunta e alternativas
- [x] Resposta errada: alternativa fica vermelha, valor cai (100 → 70) e a fuga começa
- [x] **Fuga andando** (sem Shift): mordido em ~7 s; cinco mordidas → desmaio, −25 pontos, acorda no abrigo
- [x] **Fuga correndo** (com Shift): escapa em ~4–6 s, sem perder pontos
- [x] **Revide**: 3 pauladas espantam o animal; cada acerto atordoa por 2 s e vale 5 pontos
- [x] Golpe fora do alcance/da mira erra (só o som do vento) e respeita a recarga de 650 ms
- [x] Barra de vida cai a cada mordida, muda de cor e regenera (rápido dentro do abrigo)
- [x] Ao voltar do abrigo a pergunta reabre com as alternativas já erradas marcadas e o valor preservado
- [x] Abrigo já usado fica bloqueado na fuga seguinte (aparece apagado no minimapa)
- [x] O animal nasce do lado oposto ao abrigo de destino
- [x] Durante a fuga não dá para interagir com pontos nem fechar o painel para escapar
- [x] Os três animais (cachorro, ganso, enxame) aparecem e animam corretamente
- [x] Resposta certa: soma pontos, revela a curiosidade, trava as alternativas
- [x] Série de perguntas: acertar emenda a próxima (`Pergunta 2 de 3`) e o ponto só fecha na última
- [x] Ponto descoberto fica **verde** no mundo 3D e no minimapa; HUD atualiza (`1/15 locais · 3/45 perguntas`)
- [x] **Multijogador com duas abas**: cada uma vê o avatar da outra, com nome, turma e posição corretos
- [x] **Bate-papo**: mensagem enviada numa aba chega na outra, com balão de fala sobre o avatar
- [x] Colega parado continua com nome e posição certos (o `patch` do Firebase traz só o que mudou)
- [x] Ao fechar a aba, o avatar some da cidade dos outros
- [x] Tela de resultado com pontuação, descobertas, perguntas, acertos, tempo e enfrentamentos
- [x] **Gravação no Firebase** confirmada no banco real (`resultados/TESTE/...`)
- [x] Fallback: sem internet, o resultado é salvo no `localStorage` e o jogo avisa
- [x] **Professor com senha errada (`12345`) → acesso negado**
- [x] **Professor com senha `54321` → entra e carrega o ranking**
- [x] **Ranking em tempo real**: resultado gravado em outra aba apareceu sozinho, sem recarregar
- [x] Ordenação, medalhas, filtro de turma e cartões de estatística
- [x] Auditoria de código: nenhum `set()`, `update()` ou `remove()` do SDK do Firebase no projeto
- [x] Autoteste do multijogador recusa caminhos como `../resultados` e exclusões fora de `jogadores/`
- [x] Dados de teste da cidade compartilhada apagados do banco depois dos testes
- [x] Validação do conteúdo: 15 pontos (3 por zona), 45 perguntas, todas com índice correto válido
- [x] Nomes de turma normalizados: `9ºA → 9ºA`, `7.C → 7-C`, `Turma/X → TURMA-X`, vazio → `SEM-TURMA`

> Durante os testes foram gravados dois registros na turma **`TESTE`**
> (*Teste Automatizado* e *Bruno Tempo Real*). Eles ficam num nó separado e não
> interferem nas turmas reais; se quiser removê-los, apague o nó `resultados/TESTE`
> pelo console do Firebase — o aplicativo, por decisão de projeto, não apaga nada.

---

## ❓ Problemas comuns

**A tela fica preta / erro `CORS` no console**
Você abriu o `index.html` direto do disco. Use um servidor local (veja
[Como rodar localmente](#-como-rodar-localmente)).

**"Clique na tela para o jogo capturar o mouse"**
O navegador só entrega o mouse ao jogo depois de um clique na página (ou recusa o pedido
se a janela não estiver em foco). Clique na cena e a mensagem some. O jogo continua
jogável pelo teclado enquanto isso.

**Não consigo escapar do animal de jeito nenhum**
Segure `Shift` — andando, o animal é mais rápido que você, e isso é proposital. Ou vire e
aperte `F`: cada paulada deixa o bicho tonto por 2 segundos, e três o espantam de vez. Se
ainda assim estiver difícil na sua turma, baixe `PERSEGUICAO.velocidadeAnimal`, aumente
`PORRETE.atordoamentoMs` ou zere `PERSEGUICAO.penalidadeMordida` em `src/config.js`.

**Não vejo nenhum colega na cidade**
Confira se `MULTIJOGADOR.ativo` está `true` e se as regras do banco liberam `.read`/`.write`
em `renova_cidade`. Sem internet o jogo avisa no bate-papo (*"você está explorando sozinho"*)
e continua funcionando normalmente — só sem os colegas.

**Apertei `Esc` para fechar o bate-papo e o jogo pausou**
É o navegador: `Esc` sempre devolve o mouse à página, e isso pausa o jogo. Clique em
"Continuar explorando". Para fechar a caixa de texto sem pausar, dê `Enter` com ela vazia.

**O jogo "congela" quando eu troco de aba**
É o navegador economizando recursos: ele pausa a animação de abas ocultas. Ao voltar
para a aba, o jogo continua de onde parou.

**O ranking não aparece para o professor**
Confira: (1) a internet; (2) se as regras do banco permitem `.read` em `resultados`;
(3) o console do navegador (F12) — mensagens do Firebase aparecem com o prefixo `[Firebase]`.

**Está lento em computadores antigos**
Reduza a resolução da janela ou, em `src/main.js`, troque
`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` por `1`, e desative as
sombras com `renderer.shadowMap.enabled = false`.

---

## 📄 Licença

MIT — use, adapte e compartilhe livremente em sala de aula.
