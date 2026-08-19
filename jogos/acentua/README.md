# 🚂 Expresso Tônico

Jogo de **visão aérea** (estilo GTA 1) para ensinar classificação tônica
(oxítona, paroxítona, proparoxítona) e acentuação gráfica do português.

O aluno pilota um trem por uma região de 5,6 × 4,2 km que atravessa **cinco
paisagens** — cidade, vilarejo, serra, deserto e floresta — por 19 km de
trilhos sinuosos, com túneis e ladeiras. Cada passageiro é uma **palavra** e
mora no povoado da sua sílaba tônica: levar a palavra ao lugar certo *é* o
exercício. No caminho há carvão para repor (resolvendo acentuação) e seis
tipos de perigo na linha.

Single-player, sem servidor, sem contas, sem internet.

---

## 1. Como chega ao aluno

O jogo inteiro é **um arquivo só**: `index.html`, 132 KB, sem servidor, sem
dependências e sem internet depois de carregado.

* **Pelo GitHub Pages** (principal) — o aluno abre o endereço no navegador.
  Veja a seção 2.
* **Por cópia** — o mesmo `index.html` num pendrive ou pasta da rede funciona
  com dois cliques, útil se a internet da escola cair.

Roda em Chrome, Edge e Firefox atualizados, e também em Chromebook, tablet e
celular (há controles de toque na tela).

---

## 2. Publicar no GitHub Pages

O `index.html` na raiz é tudo de que o Pages precisa — não há build no
servidor, nem dependências, nem framework.

1. Suba o repositório para o GitHub.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`,
   pasta `/ (root)`.
3. Em um ou dois minutos o jogo estará em
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Os alunos acessam esse endereço direto do navegador, sem instalar nada. Como
tudo roda no próprio aparelho, o placar de recordes é local de cada máquina.

Sempre que mexer em `src/` ou `data/`, rode `node build.js` **antes** de
commitar: o `index.html` é gerado, não editado à mão.

---

## 3. O jogo

### Objetivo
Uma travessia só, de ponta a ponta: **18 entregas** no menor tempo e com o
maior número de pontos. Não há tamanho a escolher.

### Os três povoados
| Povoado | Onde fica | Cor | Sílaba tônica |
|---|---|---|---|
| VILAREJO OXÍTONA | ao norte, subindo a serra | amarelo | última |
| OÁSIS PAROXÍTONA | no deserto, a leste | ciano | penúltima |
| CLAREIRA PROPAROXÍTONA | no fundo da mata, a sudoeste | rosa | antepenúltima |

A Estação Central fica na cidade, no meio do mapa, e há **dois depósitos de
carvão**: o da serra (noroeste) e o do oásis (sudeste).

A ficha do passageiro **não** mostra a classificação — descobrir isso é o
jogo. A cor só aparece no relatório final.

### Mecânicas
* **Embarque** — pare na Estação Central (chegue devagar, senão passa direto)
  e os vagões enchem sozinhos, até 4 lugares.
* **Entrega** — pare no bairro e toque na ficha de quem mora ali. Bairro
  errado: −60 pontos e 2,4 s parado, e a palavra entra no relatório.
* **Carvão** — acaba com o tempo. No Depósito, arraste o acento (´ ou ^) até
  a vogal tônica, ou solte em SEM ACENTO. Acertou, caldeira cheia.
* **Paciência** — passageiro esquecido no vagão desiste da viagem.
* **Obstáculos** — seis tipos, e cada paisagem tem os seus:
  🐄 vaca (campo e mata) e 🚗 carro na passagem (cidade e vilarejo) saem com o
  **apito**; 🌲 árvore caída (mata e serra), 🪨 pedras (serra e deserto) e
  🌪 areia (deserto) exigem **reduzir a velocidade**; além dos sinais fechados
  nos cruzamentos e dos trechos em obras.
* **Relevo** — as ladeiras seguram o trem na subida e empurram na descida (as
  setas azuis no trilho mostram o sentido), e há **túneis** na serra: lá dentro
  só se enxerga o que o farol alcança.
* **Aviso antecipado** — antes de qualquer obstáculo aparece um alerta no alto
  da tela dizendo o que vem pela frente, a que distância e o que fazer, e o
  obstáculo ganha um anel pulsante no mapa. O aluno vê o perigo com folga para
  reagir; bater continua custando tempo e pontos.

### Controles
| Ação | Teclado | Toque |
|---|---|---|
| Acelerar | ↑ ou W | ▲ |
| Frear | ↓ ou S | ▼ |
| Escolher o desvio | ← → ou A D | ↰ ↱ |
| Apito | espaço | 📣 |

Nos cruzamentos aparece uma agulha verde mostrando qual saída está marcada.
Nos terminais o trem para sozinho e sai de ré quando você segue viagem.

### Ao final
Cada aluno recebe um **relatório de viagem**: as palavras que errou, o que
aconteceu com cada uma e a regra correspondente. É o material da discussão
coletiva. O placar das melhores viagens fica salvo naquele computador.

---

## 4. Sugestão de uso na aula de 50 minutos

A travessia de 18 entregas leva de **12 a 20 minutos** para um aluno que está
aprendendo. (Um piloto automático que já sabe todas as respostas e nunca erra
o caminho fecha em 4 minutos — o resto do tempo é pensar a classificação.)

| Momento | Minutos | O quê |
|---|---|---|
| Explicação | 6 | mostrar o mapa, os três povoados e as duas mecânicas |
| Travessia | 20 | a viagem completa, valendo o placar |
| Discussão | 14 | cada aluno lê seu relatório de viagem em voz alta |
| Fechamento | 10 | as palavras que mais derrubaram a turma na lousa |

Quem terminar antes joga de novo: o mapa é o mesmo, mas as palavras e os
obstáculos mudam a cada partida.

Não há painel do professor: o ranking é o placar local de cada máquina, e a
comparação entre alunos é feita olhando a tela ou anotando os pontos.

---

## 5. Banco de palavras

`data/palavras.json` — **189 palavras** classificadas, com a regra que
explica cada uma. Formato:

```json
{ "palavra": "relógio", "tipo": "paroxitona", "nivel": 1, "regra": "Paroxítona terminada em ditongo…" }
```

* `tipo`: `oxitona` | `paroxitona` | `proparoxitona` | `monossilabo`
  (monossílabos só aparecem no Depósito — não existe bairro para eles).
* `nivel`: `1` fácil, `2` médio, `3` pegadinha. A dificuldade sobe conforme
  as entregas avançam.

O jogo deriva sozinho, da grafia correta: a forma sem acento, qual vogal
recebe o acento e se é agudo ou circunflexo. Basta escrever a palavra certa.

**Regras cobertas:** oxítonas em -a(s)/-e(s)/-o(s)/-em/-ens; paroxítonas em
-l, -n, -r, -x, -ps, -i(s), -us, -um/-uns, -ã(s), -ão(s) e ditongo;
proparoxítonas (todas); monossílabos tônicos; hiatos e suas exceções
(rainha, juiz, feiura); e o til, que **não** é acento gráfico (cordão,
amanhã, irmã caem em "SEM ACENTO").

---

## 6. Mexer no código

```
acentua/
├── index.html               O JOGO (gerado por build.js — não edite à mão)
├── build.js                 junta src/ + data/ e escreve o index.html
├── src/
│   ├── dados.js             mapa (nós, trilhos curvos), paisagens e textos
│   ├── motor.js             física do trem, passageiros, carvão, obstáculos
│   ├── desenho.js           render em visão aérea + minimapa
│   ├── interface.js         telas, HUD, painéis das estações
│   ├── estilo.css
│   └── pagina.html          molde onde tudo é embutido
├── data/palavras.json       banco de palavras
└── tools/gerar_palavras.py  gerador/validador opcional do banco (Python 3)
```

Depois de editar qualquer coisa em `src/` ou `data/`:

```bash
node build.js
```

### Ajustes rápidos (`src/motor.js`, objeto `CFG`)

| O quê | Constante |
|---|---|
| Velocidade máxima / aceleração / freio | `VEL_MAX`, `ACEL`, `FREIO` |
| Lugares no trem | `LUGARES` |
| Ritmo do carvão | `CARVAO_GASTO` |
| Paciência dos passageiros | `PACIENCIA_BORDO` |
| Castigo por bairro errado | `TRAVA_ERRO_DESEMBARQUE` |
| Quanto vale cada entrega | `PONTO_ENTREGA` |
| Antecedência do aviso de obstáculo | `DIST_ALERTA` |
| Alcance do apito | `RAIO_APITO` |
| Força das ladeiras | `FORCA_LADEIRA` |

Os tipos de obstáculo (ícone, velocidade segura e em que paisagens aparecem)
estão no objeto `OBSTACULOS`, também em `src/motor.js`.

O mapa está em `src/dados.js`: `NOS` (estações e cruzamentos), `ARESTAS` (os
trilhos, com pontos de controle da curva e marcações de `tunel`, `ladeira` e
`obras`), `REGIOES` (as cinco paisagens) e `AGUA`.
