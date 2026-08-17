# Guia rápido — Cidade Inteligente

Jogo educacional de **50 minutos** sobre tecnologia, trabalho e sociedade.
Cada aluno vira prefeito de uma cidade e decide quais tecnologias instalar.
Ganha **não quem usa mais tecnologia, mas quem consegue mais equilíbrio**.

Indicado para **6º e 7º ano**. Funciona em computador, celular e tablet.

---

## 1. Antes da aula: como colocar o jogo no ar

O jogo é feito só de arquivos `.html`, `.css` e `.js` — não precisa instalar nada
nem tem "programa para rodar". Escolha **uma** das opções abaixo.

### Opção A — Hospedar a pasta (recomendada)

É a mais confiável: todo mundo acessa o **mesmo link**, de qualquer aparelho.

1. Suba a pasta inteira (`index.html`, `css/`, `js/`) em um serviço gratuito de
   sites estáticos — por exemplo **GitHub Pages** ou **Netlify Drop**
   (arrasta a pasta na página e ele devolve um link).
2. Anote o link. Ex.: `https://suaescola.github.io/cidade-inteligente/`
3. Esse link serve tanto para o professor quanto para os alunos.

### Opção B — Servidor na própria máquina do professor

Se a escola tem Python instalado e todos estão na **mesma rede Wi-Fi**:

1. Abra o Prompt de Comando na pasta do jogo e digite:
   ```
   python -m http.server 8000
   ```
2. Descubra o IP do computador (`ipconfig`) — algo como `192.168.0.15`.
3. Os alunos acessam: `http://192.168.0.15:8000`

### Opção C — Copiar a pasta em cada computador

Funciona, mas com uma ressalva: abrindo o arquivo com duplo clique (endereço
começando com `file://`), **alguns navegadores bloqueiam o envio das pontuações**
para a internet. O aluno continua jogando normalmente, só que o painel do
professor pode não receber os pontos dele.

> Se aparecer "sem internet" no canto da tela do aluno mesmo com internet
> funcionando, é este o motivo — use a Opção A ou B.

---

## 2. Passo a passo da aula

### Antes de os alunos chegarem
1. Abra o jogo no computador ligado ao projetor.
2. Clique em **"Sou Professor"** e digite a senha **`54321`**.
3. O painel abre e **já cria uma sala**, com um código de 4 caracteres
   (ex.: `KE97`) em letras enormes no alto da tela.
4. **Escreva esse código na lousa** e deixe a tela projetada.

### Quando os alunos entrarem
5. Cada aluno abre o mesmo link, clica em **"Sou Aluno"**, digita o **código da
   sala** e o **nome/apelido**.
6. Eles veem um tutorial de 3 telas e já começam a construir.
7. Quando quiser marcar o início oficial, clique em **"Iniciar partida"**.
8. O gráfico e o ranking do painel se atualizam **sozinhos a cada 3 segundos**.

### Para terminar
9. Clique em **"Encerrar partida"** e confirme.
10. O placar congela, aparece o **vencedor com animação de comemoração**, e na
    tela de cada aluno aparece o **relatório da cidade dele** com as perguntas
    de reflexão.

---

## 3. Tempo sugerido (aula de 50 minutos)

| Tempo | O que acontece |
|---|---|
| 0–5 min | Professor abre o painel, projeta e escreve o código na lousa |
| 5–10 min | Alunos entram na sala e fazem o tutorial |
| 10–15 min | Primeiras construções — o professor mostra o gráfico ao vivo no projetor |
| 15–33 min | Partida principal. O professor circula e provoca ("por que sua desigualdade subiu?") |
| 33–36 min | "Faltam 3 minutos!" — momento de ajustar o indicador mais fraco |
| 36–38 min | Encerrar partida e comemorar o vencedor |
| 38–50 min | **Discussão em roda** com as perguntas do relatório |

> Dica: guarde os últimos 12 minutos para a conversa. É aí que o jogo vira aula.

---

## 4. Como a pontuação é calculada

A fórmula está no arquivo `js/dados.js`, comentada linha por linha
(procure por "A FÓRMULA DA PONTUAÇÃO").

São 5 indicadores, todos de 0 a 100, começando em 50:

| Indicador | Como ler |
|---|---|
| 💼 Empregos | quanto maior, melhor |
| 🌱 Meio Ambiente | quanto maior, melhor |
| 😊 Qualidade de Vida | quanto maior, melhor |
| 🛡️ Privacidade e Direitos | quanto maior, melhor |
| ⚖️ Desigualdade Social | **quanto MENOR, melhor** |

A nota final é:

```
nota = 65% da MÉDIA dos indicadores + 35% do PIOR indicador
```

É esse "pior indicador" que faz o jogo ensinar o que a gente quer: quem
automatiza tudo e derruba os empregos **perde pontos**, mesmo que a cidade
esteja produzindo muito. A pontuação vai de 0 a 1000.

Duas regras completam a ideia:

- **Repetir a mesma solução rende cada vez menos** (1ª vez = 100% do benefício,
  2ª = 71%, 3ª = 56%…), **mas os problemas continuam se somando por inteiro**.
  Encher a cidade de robôs quase não melhora mais nada e o desemprego só cresce.
- **Cada solução repetida fica 15% mais cara.** A verba é limitada (1000),
  então é preciso escolher.

Para você ter uma ideia dos resultados típicos (testado):

| Estratégia do aluno | Pontuação |
|---|---|
| Cidade equilibrada (energia solar, wi-fi, formação, semáforos, hortas…) | ~760 |
| Não construir nada | 425 |
| Só câmeras de reconhecimento facial | ~250 |
| Automatizar tudo (robôs, drones, totens) | ~210 |

### Quer deixar mais rígido ou mais fácil?
No `js/dados.js`:
- Aumente `CI.PESO_PIOR` (e diminua `CI.PESO_MEDIA` na mesma medida) para
  castigar mais o desequilíbrio.
- Mude `CI.ORCAMENTO_INICIAL` para dar mais ou menos verba.
- Mude os números em `efeitos` de cada solução, ou reescreva os textos `bom` e
  `ruim` com a linguagem da sua turma.

---

## 5. As 12 soluções e seus dois lados

| Solução | Melhora | Piora |
|---|---|---|
| 🚦 Semáforos inteligentes | trânsito, acidentes | custa caro |
| 🤖 Robôs nas fábricas | produção | desemprego, desigualdade |
| 🗑️ Coleta com sensores | limpeza | empregos de garis |
| ☀️ Energia solar | poluição, conta de luz | custo alto |
| 📷 Câmeras com reconhecimento facial | sensação de segurança | privacidade, erros recaem sobre os pobres |
| 🚗 Transporte por aplicativo | mobilidade | trabalho sem direitos |
| 🛸 Entregas por drones | rapidez | desemprego de entregadores |
| 📶 Wi-Fi público e telecentros | inclusão digital, **reduz desigualdade** | custo público mensal |
| 🥬 Hortas urbanas automatizadas | sustentabilidade | só quem fez curso pega as vagas |
| 🖥️ Totens de autoatendimento | filas menores | demissões, idosos excluídos |
| 🎓 Escola de formação em tecnologia | **empregos, reduz desigualdade** | demora e custa caro |
| 🛡️ Conselho de proteção de dados | **recupera direitos** | empresas reclamam |

As três últimas são as **soluções de conserto**: é com elas que o aluno percebe
que dá para usar tecnologia *e* cuidar das pessoas. Não conte isso de cara —
deixe a turma descobrir.

---

## 6. Perguntas para a discussão final

Cada aluno recebe 3 perguntas no relatório, escolhidas conforme o perfil da
cidade dele. Para a roda de conversa com a turma inteira:

**Sobre trabalho**
1. Quando uma máquina faz o trabalho de uma pessoa, para onde vai o dinheiro que
   era o salário dela?
2. Quem perdeu o emprego para a tecnologia na sua cidade? Alguém na vida real que
   vocês conhecem já passou por isso?
3. De quem é a responsabilidade de dar um novo trabalho a essa pessoa: da
   empresa, do governo, ou dela mesma?

**Sobre direitos e privacidade**
4. Você trocaria a sua privacidade por mais segurança? Até que ponto?
5. Quem fica com as imagens das câmeras e com os nossos dados?
6. Se o computador errar e acusar a pessoa errada, quem paga essa conta?

**Sobre desigualdade**
7. As tecnologias da nossa cidade chegam igual para todos os bairros?
8. Por que o wi-fi público e a escola de formação *diminuíram* a desigualdade,
   enquanto os robôs a *aumentaram*?
9. Quem decide, na vida real, quais tecnologias entram numa cidade?

**Fechamento**
10. Depois de jogar: "tecnologia é boa ou ruim" é uma boa pergunta? Que pergunta
    seria melhor?

> Sugestão: peça para o vencedor **explicar a estratégia** dele antes de você
> mostrar a fórmula. Quase sempre ele descobre sozinho a regra do equilíbrio.

---

## 7. Botões do painel do professor

| Botão | O que faz |
|---|---|
| **Iniciar partida** | Marca o começo oficial e avisa os alunos |
| **Encerrar partida** | Congela o placar, mostra o vencedor e libera o relatório dos alunos |
| **Nova sala** | Sorteia outro código (para a próxima turma). A sala antiga continua existindo |
| **Limpar sala** | Apaga do banco de dados os jogadores **desta sala** e cria uma nova |
| **Sair** | Volta para a tela inicial |

---

## 8. Se algo der errado

| Problema | O que fazer |
|---|---|
| Aluno diz "Sala não encontrada" | Confira o código na lousa. Para evitar confusão, o sorteio **nunca usa** as letras **O** e **I** nem os números **0** e **1** — então o que parece um "O" é sempre a letra **Q** ou **D**, e o que parece "1" é sempre a letra **L** ou **J** |
| Aparece "sem internet" na tela do aluno | Ele **continua jogando normalmente**. A pontuação é enviada sozinha quando a conexão voltar |
| O painel mostra "sem internet — tentando de novo" | O painel tenta de novo a cada 3 segundos, sozinho. Não precisa recarregar |
| Um aluno aparece duas vezes no ranking | Ele entrou com dois nomes diferentes (ex.: "Ana" e "ana c"). Use **Limpar sala** e recomece, ou ignore |
| O aluno recarregou a página sem querer | A cidade dele volta automaticamente, com a mesma pontuação |
| O jogo está lento no computador antigo | Feche outras abas. O mapa já desenha em ritmo reduzido de propósito |

---

## 9. Sobre o banco de dados (importante para a escola)

O jogo usa um banco de dados **compartilhado com outros projetos da escola**.
Por isso ele foi construído com uma trava:

- **Tudo é gravado dentro de um único endereço: `/cidade_inteligente/`.**
  Nenhum outro jogo ou site é lido ou alterado.
- Toda gravação passa por uma única função (`montarCaminho`, em
  `js/firebase.js`) que **confere o endereço antes de enviar** e recusa
  qualquer caminho fora desse nó.
- As gravações usam `PATCH` (atualização parcial): elas nunca substituem nem
  apagam o que já existe ao lado.
- A **única** operação que apaga alguma coisa é o botão "Limpar sala", e ela só
  consegue apagar o endereço `cidade_inteligente/salas/CÓDIGO-DA-SALA`.
- Ao abrir o jogo, um autoteste roda sozinho e escreve no console do navegador
  (tecla F12): *"Proteção do banco OK"*. Se alguém mexer no código e quebrar a
  trava, aparece um erro vermelho ali.

---

## 10. Onde mexer em cada coisa

| Quero mudar… | Arquivo |
|---|---|
| Textos das soluções, custos, efeitos, fórmula da nota, perfis e perguntas | `js/dados.js` |
| Senha do professor (`54321`) e textos do tutorial | `js/app.js` (linha `SENHA_PROFESSOR`) e `js/dados.js` |
| Cores, tamanhos de letra, layout | `css/estilo.css` |
| Desenho da cidade (casas, ruas, carros) | `js/mapa.js` |
| Gráfico e ranking do painel | `js/professor.js` |
| Endereço do banco de dados | `js/firebase.js` (linha `URL_BASE`) |

Bom jogo!
