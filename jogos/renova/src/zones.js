/**
 * zones.js
 * -----------------------------------------------------------------------------
 * Conteúdo educacional da cidade: 5 zonas temáticas, cada uma com 3 pontos
 * de interação. Cada ponto reúne:
 *   - o construtor 3D (de models.js)
 *   - a explicação didática do conceito
 *   - uma SÉRIE de perguntas de múltipla escolha (`perguntas`)
 *
 * Cada ponto só é dado por descoberto quando o aluno responde TODAS as suas
 * perguntas. É isso que alonga a partida: mexer no tamanho dos arrays
 * `perguntas` muda automaticamente a duração do jogo, a barra de progresso e
 * o total mostrado no resultado.
 *
 * Para adaptar o jogo a outro conteúdo, basta editar este arquivo.
 * -----------------------------------------------------------------------------
 */
import {
  buildPaineisSolares,
  buildTurbinaEolica,
  buildPosteInteligente,
  buildLixeiraInteligente,
  buildComposteira,
  buildColetaSeletiva,
  buildCiclovia,
  buildCarroEletrico,
  buildPontoOnibus,
  buildParqueUrbano,
  buildCaptacaoChuva,
  buildHortaComunitaria,
  buildTotemCidadao,
  buildDadosAbertos,
  buildWifiPublico
} from './models.js';

export const ZONAS = [
  /* ======================================================================
   * ZONA 1 — ENERGIA LIMPA
   * ==================================================================== */
  {
    id: 'energia',
    numero: 1,
    nome: 'Energia Limpa',
    icone: '⚡',
    cor: 0xffc93c,
    corCss: '#ffc93c',
    corChao: 0xe8d9a0,
    centro: { x: -72, z: -72 },
    raio: 30,
    pontos: [
      {
        id: 'solar',
        nome: 'Painéis Solares',
        icone: '☀️',
        offset: { x: -9, z: 7 },
        rotY: 0.4,
        build: buildPaineisSolares,
        explicacao:
          'Os painéis solares (fotovoltaicos) transformam a luz do Sol diretamente em eletricidade. ' +
          'Como o Sol é uma fonte renovável, essa energia não emite gases poluentes enquanto é gerada e ' +
          'ainda reduz a conta de luz de casas, escolas e prédios públicos.',
        curiosidade: 'Painéis solares geram energia mesmo em dias nublados — só que em menor quantidade.',
        perguntas: [
          {
            enunciado: 'Qual é a principal vantagem ambiental de gerar eletricidade com painéis solares?',
            opcoes: [
              'Gera eletricidade sem queimar combustível e sem emitir gases poluentes',
              'Funciona apenas à noite, quando a cidade gasta menos energia',
              'Elimina a necessidade de qualquer tipo de fiação elétrica',
              'Deixa a água da chuva mais limpa'
            ],
            correta: 0,
            explicacaoResposta:
              'A geração solar não queima combustível: a luz do Sol vira eletricidade direto, sem emitir gases de efeito estufa nesse processo.'
          },
          {
            enunciado: 'O painel solar transforma o quê em eletricidade?',
            opcoes: [
              'O calor do vento que passa entre os painéis',
              'A água da chuva que escorre pelo vidro',
              'A luz do Sol que atinge as células fotovoltaicas',
              'O movimento das nuvens no céu'
            ],
            correta: 2,
            explicacaoResposta:
              'São as células fotovoltaicas que reagem à LUZ do Sol e geram corrente elétrica — não é o calor que faz o trabalho.'
          },
          {
            enunciado: 'Por que tantas escolas estão instalando painéis solares no telhado?',
            opcoes: [
              'Porque assim a escola gera parte da própria energia e reduz a conta de luz',
              'Porque os painéis impedem a chuva de molhar o telhado',
              'Porque o telhado é o lugar mais barato para guardar baterias',
              'Porque os painéis aquecem as salas de aula no inverno'
            ],
            correta: 0,
            explicacaoResposta:
              'O telhado recebe sol o dia inteiro e não atrapalha ninguém: a escola passa a produzir parte da energia que consome.'
          }
        ]
      },
      {
        id: 'eolica',
        nome: 'Turbina Eólica',
        icone: '🌬️',
        offset: { x: 11, z: -9 },
        rotY: -0.3,
        build: buildTurbinaEolica,
        explicacao:
          'A turbina eólica usa a força do vento para girar suas pás. Esse giro movimenta um gerador que ' +
          'produz eletricidade. É outra fonte renovável: o vento não acaba e não polui o ar.',
        curiosidade: 'Um único aerogerador de grande porte pode abastecer centenas de casas durante um ano.',
        perguntas: [
          {
            enunciado: 'O que faz a turbina eólica produzir eletricidade?',
            opcoes: [
              'O calor do Sol aquecendo a torre metálica',
              'O vento girando as pás, que movimentam um gerador',
              'A chuva caindo sobre as pás da turbina',
              'A queima de gás dentro da torre'
            ],
            correta: 1,
            explicacaoResposta:
              'O vento gira as pás; esse movimento faz o gerador transformar energia mecânica em energia elétrica.'
          },
          {
            enunciado: 'Por que os parques eólicos costumam ficar em serras e no litoral?',
            opcoes: [
              'Porque nesses lugares o vento é mais forte e mais constante',
              'Porque lá as torres ficam escondidas das pessoas',
              'Porque o ar do litoral é mais pesado e gira melhor as pás',
              'Porque perto do mar as torres não precisam de manutenção'
            ],
            correta: 0,
            explicacaoResposta:
              'A turbina depende do vento: quanto mais forte e regular ele for, mais energia ela consegue gerar ao longo do ano.'
          },
          {
            enunciado: 'A energia eólica é chamada de renovável porque…',
            opcoes: [
              'as turbinas podem ser usadas várias vezes antes de estragar',
              'o vento se renova naturalmente e não se esgota com o uso',
              'as pás são feitas de material reciclado',
              'a energia gerada pode ser guardada para sempre'
            ],
            correta: 1,
            explicacaoResposta:
              'Renovável é a fonte que a natureza repõe continuamente. O vento sempre volta — diferente do petróleo e do carvão.'
          }
        ]
      },
      {
        id: 'poste',
        nome: 'Poste Inteligente',
        icone: '💡',
        offset: { x: 3, z: 13 },
        rotY: 1.2,
        build: buildPosteInteligente,
        explicacao:
          'O poste inteligente tem sensores que percebem a claridade do ambiente e o movimento das pessoas. ' +
          'Ele acende sozinho ao escurecer e diminui a intensidade quando a rua está vazia, economizando energia. ' +
          'Muitos usam lâmpadas de LED e ainda avisam a prefeitura quando queimam.',
        curiosidade: 'Trocar as lâmpadas comuns por LED na iluminação pública pode cortar mais da metade do consumo.',
        perguntas: [
          {
            enunciado: 'Como o poste inteligente ajuda a economizar energia na cidade?',
            opcoes: [
              'Fica sempre aceso na intensidade máxima para dar mais segurança',
              'Só funciona quando alguém aperta um botão na base do poste',
              'Ajusta a intensidade da luz conforme a claridade e o movimento na rua',
              'Desliga toda a iluminação da rua durante a madrugada'
            ],
            correta: 2,
            explicacaoResposta:
              'Sensores medem claridade e movimento: a luz acende só quando é necessária e na intensidade certa.'
          },
          {
            enunciado: 'Que tipo de lâmpada é usada nesses postes por gastar bem menos energia?',
            opcoes: [
              'Lâmpada incandescente comum',
              'Lâmpada de LED',
              'Lâmpada a gás',
              'Lâmpada de vela'
            ],
            correta: 1,
            explicacaoResposta:
              'O LED produz a mesma luz gastando uma fração da energia e ainda dura muito mais tempo.'
          },
          {
            enunciado: 'Além de economizar energia, o que o poste conectado avisa à prefeitura?',
            opcoes: [
              'Quantas pessoas passaram por ali no ano',
              'A previsão do tempo para o dia seguinte',
              'Quando a própria lâmpada queima ou apresenta defeito',
              'O nome de quem estacionou embaixo dele'
            ],
            correta: 2,
            explicacaoResposta:
              'O poste avisa sozinho que está com defeito — a equipe de manutenção já sai de casa sabendo onde consertar.'
          }
        ]
      }
    ]
  },

  /* ======================================================================
   * ZONA 2 — LIXO E RECICLAGEM
   * ==================================================================== */
  {
    id: 'reciclagem',
    numero: 2,
    nome: 'Lixo e Reciclagem',
    icone: '♻️',
    cor: 0x4ade80,
    corCss: '#4ade80',
    corChao: 0xa7e8bd,
    centro: { x: 72, z: -72 },
    raio: 28,
    pontos: [
      {
        id: 'lixeira',
        nome: 'Lixeira Inteligente',
        icone: '🗑️',
        offset: { x: -7, z: 5 },
        rotY: 0.2,
        build: buildLixeiraInteligente,
        explicacao:
          'A lixeira inteligente tem um sensor que mede o quanto ela está cheia e envia essa informação pela ' +
          'internet para a central de limpeza urbana. Assim o caminhão só passa onde realmente precisa: ' +
          'gasta menos combustível, evita lixeiras transbordando e ocupa menos as ruas.',
        curiosidade: 'As cores da coleta seletiva: azul = papel, vermelho = plástico, verde = vidro, amarelo = metal, marrom = orgânico.',
        perguntas: [
          {
            enunciado: 'Por que a lixeira inteligente avisa a central quando está cheia?',
            opcoes: [
              'Para que o caminhão faça só os trajetos necessários, gastando menos combustível',
              'Para aumentar o número de viagens do caminhão de lixo todos os dias',
              'Para separar sozinha o lixo reciclável do orgânico',
              'Para cobrar uma taxa de quem joga lixo nela'
            ],
            correta: 0,
            explicacaoResposta:
              'Com os dados dos sensores a coleta é planejada: menos viagens desnecessárias, menos poluição e menos custo.'
          },
          {
            enunciado: 'O que permite à lixeira "conversar" com a central de limpeza?',
            opcoes: [
              'Um alto-falante que grita quando ela enche',
              'Um sensor ligado à internet, que envia o nível de enchimento',
              'Um funcionário que fica ao lado dela o dia inteiro',
              'Uma câmera que fotografa quem joga lixo'
            ],
            correta: 1,
            explicacaoResposta:
              'É a Internet das Coisas: um sensor simples conectado à rede transforma um objeto comum em fonte de dados úteis.'
          },
          {
            enunciado: 'Que problema das ruas essa tecnologia ajuda a evitar?',
            opcoes: [
              'Lixeiras transbordando, com lixo espalhado pela calçada',
              'O barulho dos carros nos horários de pico',
              'A falta de vagas de estacionamento no centro',
              'A poeira levantada pelo vento nas praças'
            ],
            correta: 0,
            explicacaoResposta:
              'Lixeira cheia demais atrai bichos, entope bueiros e suja a calçada. Sabendo a hora certa, a coleta chega antes disso.'
          }
        ]
      },
      {
        id: 'composteira',
        nome: 'Composteira',
        icone: '🌱',
        offset: { x: 9, z: -7 },
        rotY: -0.5,
        build: buildComposteira,
        explicacao:
          'A composteira recebe restos de alimentos: cascas, folhas, borra de café. Micro-organismos e minhocas ' +
          'decompõem esse material e o transformam em adubo natural, o composto. Assim o lixo orgânico deixa de ' +
          'ir para o aterro e vira alimento para hortas e jardins.',
        curiosidade: 'Cerca de metade do lixo de uma casa brasileira é orgânico — e quase tudo isso poderia ser compostado.',
        perguntas: [
          {
            enunciado: 'O que a composteira produz a partir dos restos de alimentos?',
            opcoes: [
              'Plástico reciclado para novas embalagens',
              'Adubo natural, usado em plantas e hortas',
              'Água potável, pronta para beber',
              'Gás de cozinha para uso doméstico'
            ],
            correta: 1,
            explicacaoResposta:
              'A decomposição dos restos orgânicos gera composto: um adubo rico em nutrientes que devolve vida ao solo.'
          },
          {
            enunciado: 'Quem faz o trabalho de decompor os restos dentro da composteira?',
            opcoes: [
              'Um motor elétrico que tritura tudo',
              'O calor do Sol, que seca os alimentos',
              'Micro-organismos e minhocas',
              'Produtos químicos despejados por cima'
            ],
            correta: 2,
            explicacaoResposta:
              'Bactérias, fungos e minhocas comem a matéria orgânica e devolvem nutrientes — é a natureza reciclando sozinha.'
          },
          {
            enunciado: 'Qual destes NÃO deve ser colocado numa composteira doméstica?',
            opcoes: [
              'Cascas de frutas e legumes',
              'Folhas secas do quintal',
              'Borra de café e casca de ovo',
              'Sacolas plásticas e cacos de vidro'
            ],
            correta: 3,
            explicacaoResposta:
              'Plástico e vidro não se decompõem: eles vão para a reciclagem. Na composteira entra só matéria orgânica.'
          }
        ]
      },
      {
        id: 'coleta',
        nome: 'Estação de Coleta Seletiva',
        icone: '♻️',
        offset: { x: -1, z: -13 },
        rotY: 2.6,
        build: buildColetaSeletiva,
        explicacao:
          'A estação reúne os cinco contentores da coleta seletiva, cada um com sua cor: azul para papel, ' +
          'vermelho para plástico, verde para vidro, amarelo para metal e marrom para o orgânico. Separar o ' +
          'material logo na origem é o que torna a reciclagem possível — misturado e sujo, quase nada pode ser ' +
          'reaproveitado e tudo acaba no aterro sanitário.',
        curiosidade: 'Reciclar uma lata de alumínio economiza a energia que manteria uma TV ligada por umas três horas.',
        perguntas: [
          {
            enunciado: 'Na coleta seletiva, o contentor VERMELHO recebe qual material?',
            opcoes: ['Papel', 'Plástico', 'Vidro', 'Metal'],
            correta: 1,
            explicacaoResposta:
              'Vermelho é plástico. A sequência mais usada no Brasil é: azul (papel), vermelho (plástico), verde (vidro), amarelo (metal) e marrom (orgânico).'
          },
          {
            enunciado: 'Por que separar o lixo já dentro de casa faz tanta diferença?',
            opcoes: [
              'Porque o caminhão fica mais bonito com sacos coloridos',
              'Porque material limpo e separado pode ser reciclado; misturado, vira rejeito',
              'Porque a prefeitura paga por cada saco entregue separado',
              'Porque o lixo separado pesa menos que o lixo misturado'
            ],
            correta: 1,
            explicacaoResposta:
              'Papel encharcado de restos de comida não se recicla. A separação na origem é o passo que salva o material.'
          },
          {
            enunciado: 'O que acontece com uma garrafa PET separada corretamente?',
            opcoes: [
              'É enterrada no aterro, mas em uma área especial',
              'É queimada para gerar calor nas fábricas',
              'Vira matéria-prima para novos produtos, como tecidos e embalagens',
              'É devolvida ao supermercado onde foi comprada'
            ],
            correta: 2,
            explicacaoResposta:
              'O PET reciclado vira fibra têxtil, cerdas de vassoura e novas embalagens — o material volta a circular em vez de virar lixo.'
          }
        ]
      }
    ]
  },

  /* ======================================================================
   * ZONA 3 — MOBILIDADE
   * ==================================================================== */
  {
    id: 'mobilidade',
    numero: 3,
    nome: 'Mobilidade',
    icone: '🚲',
    cor: 0x38bdf8,
    corCss: '#38bdf8',
    corChao: 0xa8d8ef,
    centro: { x: -72, z: 72 },
    raio: 30,
    pontos: [
      {
        id: 'ciclovia',
        nome: 'Ciclovia',
        icone: '🚴',
        offset: { x: -10, z: 0 },
        rotY: 0,
        build: buildCiclovia,
        explicacao:
          'A ciclovia é um espaço separado do trânsito de carros, feito para bicicletas. Ela dá segurança a quem ' +
          'pedala e incentiva mais pessoas a trocar o carro pela bike em trajetos curtos — o que reduz ' +
          'congestionamento e poluição, e ainda faz bem à saúde.',
        curiosidade: 'Em trajetos de até 5 km dentro da cidade, a bicicleta costuma ser tão rápida quanto o carro.',
        perguntas: [
          {
            enunciado: 'Qual alternativa descreve melhor os benefícios de uma ciclovia?',
            opcoes: [
              'Mais velocidade para os carros e mais vagas de estacionamento',
              'Mais segurança para ciclistas, menos poluição e menos congestionamento',
              'Menos gasto da prefeitura com iluminação pública',
              'Aumento do consumo de combustível da cidade'
            ],
            correta: 1,
            explicacaoResposta:
              'A ciclovia protege quem pedala e, ao substituir viagens de carro, reduz emissões e trânsito.'
          },
          {
            enunciado: 'Qual é a diferença entre uma ciclovia e uma ciclofaixa?',
            opcoes: [
              'A ciclovia é separada fisicamente do trânsito; a ciclofaixa é só pintada na pista',
              'A ciclovia é feita de asfalto e a ciclofaixa, de terra',
              'A ciclovia só pode ser usada de dia',
              'Não existe diferença: são dois nomes para a mesma coisa'
            ],
            correta: 0,
            explicacaoResposta:
              'A separação física (blocos, meio-fio, canteiro) é o que dá à ciclovia um nível de segurança muito maior.'
          },
          {
            enunciado: 'Trocar o carro pela bicicleta em trajetos curtos reduz principalmente…',
            opcoes: [
              'o número de semáforos necessários na cidade',
              'a emissão de gases poluentes e o congestionamento',
              'o gasto da prefeitura com escolas',
              'a quantidade de chuva que cai na cidade'
            ],
            correta: 1,
            explicacaoResposta:
              'Cada carro a menos na rua significa menos gás poluente no ar e mais espaço para todo mundo circular.'
          }
        ]
      },
      {
        id: 'carro-eletrico',
        nome: 'Carro Elétrico e Eletroposto',
        icone: '🔌',
        offset: { x: 7, z: -10 },
        rotY: 0.6,
        build: buildCarroEletrico,
        explicacao:
          'O carro elétrico usa um motor movido a bateria, em vez de queimar gasolina ou diesel. Por isso não solta ' +
          'fumaça pelo escapamento, reduzindo a poluição do ar da cidade. Quando a eletricidade que carrega a bateria ' +
          'vem de fontes limpas, o ganho ambiental é ainda maior.',
        curiosidade: 'Carros elétricos também são bem mais silenciosos — reduzem a poluição sonora das ruas.',
        perguntas: [
          {
            enunciado: 'Por que o carro elétrico ajuda a melhorar a qualidade do ar na cidade?',
            opcoes: [
              'Porque não queima combustível e não emite gases pelo escapamento',
              'Porque filtra a poeira das ruas enquanto anda',
              'Porque anda sempre em velocidade muito baixa',
              'Porque precisa de menos ruas asfaltadas'
            ],
            correta: 0,
            explicacaoResposta:
              'Sem combustão não há emissão de poluentes pelo escapamento — o ar do centro da cidade melhora.'
          },
          {
            enunciado: 'Para que serve o eletroposto instalado ao lado do carro?',
            opcoes: [
              'Para encher o tanque de gasolina mais rápido',
              'Para medir a poluição que o carro produz',
              'Para recarregar a bateria do carro elétrico',
              'Para calibrar os pneus automaticamente'
            ],
            correta: 2,
            explicacaoResposta:
              'O eletroposto é o "posto de combustível" do carro elétrico: ele repõe a energia da bateria.'
          },
          {
            enunciado: 'O ganho ambiental do carro elétrico é ainda maior quando…',
            opcoes: [
              'a bateria é carregada com energia de fontes limpas, como sol e vento',
              'o carro anda apenas nos fins de semana',
              'o carro é pintado com cores claras',
              'o motorista dirige com as janelas abertas'
            ],
            correta: 0,
            explicacaoResposta:
              'Se a eletricidade vier de uma usina poluente, parte do ganho se perde. Com fontes limpas, o ciclo inteiro fica limpo.'
          }
        ]
      },
      {
        id: 'onibus',
        nome: 'Ponto de Ônibus Conectado',
        icone: '🚌',
        offset: { x: 9, z: 11 },
        rotY: -1.1,
        build: buildPontoOnibus,
        explicacao:
          'O ponto de ônibus conectado mostra num painel digital quanto tempo falta para o próximo ônibus, usando a ' +
          'localização em tempo real dos veículos por GPS. Saber o horário certo reduz a espera, torna o transporte ' +
          'público mais confiável e convence mais gente a deixar o carro em casa.',
        curiosidade: 'Um ônibus lotado pode tirar mais de 40 carros das ruas ao mesmo tempo.',
        perguntas: [
          {
            enunciado: 'De onde vem a informação de horário mostrada no painel do ponto conectado?',
            opcoes: [
              'De uma tabela fixa, impressa uma vez por ano',
              'Da localização dos ônibus em tempo real, enviada por GPS',
              'Da previsão do tempo da cidade',
              'Da quantidade de pessoas esperando no ponto'
            ],
            correta: 1,
            explicacaoResposta:
              'Cada ônibus envia sua posição por GPS; o sistema calcula e mostra a previsão de chegada em tempo real.'
          },
          {
            enunciado: 'Por que um transporte público confiável ajuda o meio ambiente?',
            opcoes: [
              'Porque os ônibus são movidos a energia solar',
              'Porque um ônibus cheio substitui dezenas de carros nas ruas',
              'Porque o ônibus anda mais devagar que o carro',
              'Porque os pontos de ônibus têm árvores em volta'
            ],
            correta: 1,
            explicacaoResposta:
              'Transporte coletivo bom convence quem tem carro a deixá-lo em casa — e cada carro a menos é menos poluição.'
          },
          {
            enunciado: 'Se o painel mostra "próximo ônibus: 3 min", essa informação veio de…',
            opcoes: [
              'um palpite do funcionário da empresa',
              'dados enviados em tempo real pelo ônibus que está a caminho',
              'uma pesquisa feita com os passageiros do ponto',
              'um sorteio automático do sistema'
            ],
            correta: 1,
            explicacaoResposta:
              'É o dado do próprio veículo em movimento que alimenta a previsão — por isso ela muda de minuto a minuto.'
          }
        ]
      }
    ]
  },

  /* ======================================================================
   * ZONA 4 — ÁGUA E VERDE
   * ==================================================================== */
  {
    id: 'agua',
    numero: 4,
    nome: 'Água e Verde',
    icone: '💧',
    cor: 0x2dd4bf,
    corCss: '#2dd4bf',
    corChao: 0x9de6d8,
    centro: { x: 72, z: 72 },
    raio: 30,
    pontos: [
      {
        id: 'parque',
        nome: 'Parque Urbano',
        icone: '🌳',
        offset: { x: -9, z: 5 },
        rotY: 0,
        build: buildParqueUrbano,
        explicacao:
          'Áreas verdes fazem muito mais do que embelezar: as árvores dão sombra, liberam vapor de água e deixam o ' +
          'bairro vários graus mais fresco do que uma área só de asfalto e concreto. O solo do parque também absorve ' +
          'a água da chuva, ajudando a evitar enchentes, além de ser espaço de lazer e convivência.',
        curiosidade: 'Asfalto e concreto acumulam calor e criam as "ilhas de calor": o centro pode ficar até 5 °C mais quente que um bairro arborizado.',
        perguntas: [
          {
            enunciado: 'Por que um bairro com muitas árvores costuma ser mais fresco que um só de asfalto?',
            opcoes: [
              'Porque as árvores fazem vento forte o dia inteiro',
              'Porque o asfalto reflete toda a luz do Sol de volta',
              'Porque as árvores dão sombra e liberam vapor de água, enquanto o asfalto acumula calor',
              'Porque as árvores impedem a chuva de cair'
            ],
            correta: 2,
            explicacaoResposta:
              'Sombra e evapotranspiração das plantas resfriam o ar; asfalto e concreto absorvem e devolvem calor, criando ilhas de calor.'
          },
          {
            enunciado: 'O que é uma "ilha de calor" urbana?',
            opcoes: [
              'Uma ilha artificial construída dentro de um lago da cidade',
              'Uma região da cidade mais quente que as vizinhas, por causa do excesso de asfalto e concreto',
              'Um bairro onde só se usa ar-condicionado',
              'O calor que sai dos escapamentos dos carros parados'
            ],
            correta: 1,
            explicacaoResposta:
              'Superfícies escuras e impermeáveis guardam calor o dia todo e o devolvem à noite: o termômetro do centro fica bem acima do das áreas verdes.'
          },
          {
            enunciado: 'Como o solo do parque ajuda a cidade quando chove muito?',
            opcoes: [
              'Ele absorve parte da água, que no asfalto correria direto para os bueiros',
              'Ele esquenta a água da chuva antes de ela chegar ao rio',
              'Ele impede totalmente que a chuva chegue ao chão',
              'Ele transforma a água da chuva em água potável'
            ],
            correta: 0,
            explicacaoResposta:
              'Solo permeável funciona como esponja: a água infiltra devagar em vez de escorrer toda de uma vez e alagar as ruas.'
          }
        ]
      },
      {
        id: 'chuva',
        nome: 'Captação de Água da Chuva',
        icone: '🌧️',
        offset: { x: 10, z: -10 },
        rotY: -0.4,
        build: buildCaptacaoChuva,
        explicacao:
          'O telhado recolhe a água da chuva, que desce pela calha e pelo tubo até uma cisterna. Essa água não é para ' +
          'beber, mas serve muito bem para regar plantas, lavar calçadas e até para a descarga do banheiro — ' +
          'economizando a água tratada, que é mais cara e mais escassa.',
        curiosidade: 'Um telhado de 100 m² capta cerca de 1.500 litros de água numa chuva de apenas 15 mm.',
        perguntas: [
          {
            enunciado: 'Qual é o uso mais adequado para a água da chuva guardada na cisterna?',
            opcoes: [
              'Beber diretamente, sem nenhum tratamento',
              'Regar plantas, lavar calçadas e usar na descarga',
              'Substituir a água tratada em todos os usos da casa',
              'Encher piscinas de banho sem nenhum tratamento'
            ],
            correta: 1,
            explicacaoResposta:
              'A água de chuva é ideal para usos não potáveis. Isso poupa a água tratada para beber e cozinhar.'
          },
          {
            enunciado: 'Qual é o caminho da água nesse sistema de captação?',
            opcoes: [
              'Cisterna → tubo → calha → telhado',
              'Telhado → calha → tubo → cisterna',
              'Rua → bueiro → cisterna → telhado',
              'Torneira → calha → telhado → cisterna'
            ],
            correta: 1,
            explicacaoResposta:
              'A chuva cai no telhado, é recolhida pela calha, desce pelo tubo e fica armazenada na cisterna até ser usada.'
          },
          {
            enunciado: 'Por que a água da cisterna não deve ser bebida sem tratamento?',
            opcoes: [
              'Porque ela carrega sujeira do telhado e não passou por tratamento',
              'Porque ela é ácida demais para o corpo humano',
              'Porque ela congela dentro da cisterna',
              'Porque a lei proíbe qualquer uso da água da chuva'
            ],
            correta: 0,
            explicacaoResposta:
              'Poeira, folhas e fezes de aves ficam no telhado e descem junto com a chuva — por isso essa água serve para usos não potáveis.'
          }
        ]
      },
      {
        id: 'horta',
        nome: 'Horta Comunitária',
        icone: '🥬',
        offset: { x: 2, z: 13 },
        rotY: -0.2,
        build: buildHortaComunitaria,
        explicacao:
          'A horta comunitária ocupa um terreno do bairro que antes estava abandonado. Os moradores plantam, cuidam ' +
          'e colhem juntos, usando o adubo produzido na composteira da própria cidade. O alimento sai do canteiro ' +
          'direto para a mesa, sem embalagem e quase sem transporte — e o espaço vira ponto de encontro da vizinhança.',
        curiosidade: 'Boa parte do impacto ambiental de um alimento vem do transporte e da embalagem, não do cultivo.',
        perguntas: [
          {
            enunciado: 'Qual é a grande vantagem de a horta ficar dentro do próprio bairro?',
            opcoes: [
              'O alimento é colhido perto de quem vai comer, gastando pouco transporte',
              'As plantas crescem mais rápido no meio da cidade',
              'A prefeitura passa a pagar pela comida dos moradores',
              'A horta substitui completamente os supermercados'
            ],
            correta: 0,
            explicacaoResposta:
              'Menos quilômetros entre o canteiro e a mesa significam menos combustível, menos embalagem e alimento mais fresco.'
          },
          {
            enunciado: 'Que material produzido na própria cidade pode adubar essa horta?',
            opcoes: [
              'O plástico triturado da coleta seletiva',
              'A água da chuva captada nos telhados',
              'O composto feito na composteira, a partir de restos de alimentos',
              'A cinza das lâmpadas queimadas dos postes'
            ],
            correta: 2,
            explicacaoResposta:
              'É o ciclo se fechando: o resto de comida vira composto, o composto alimenta a horta e a horta produz comida de novo.'
          },
          {
            enunciado: 'Além de alimento, o que a horta comunitária traz para o bairro?',
            opcoes: [
              'Mais vagas de estacionamento',
              'Convivência entre vizinhos e área verde no lugar de um terreno abandonado',
              'Redução da conta de luz das casas vizinhas',
              'Internet gratuita para quem mora em volta'
            ],
            correta: 1,
            explicacaoResposta:
              'Sustentabilidade também é social: o terreno vira espaço de encontro, aprendizado e cuidado coletivo.'
          }
        ]
      }
    ]
  },

  /* ======================================================================
   * ZONA 5 — TECNOLOGIA SOCIAL
   * ==================================================================== */
  {
    id: 'tecnologia',
    numero: 5,
    nome: 'Tecnologia Social',
    icone: '📱',
    cor: 0xa78bfa,
    corCss: '#a78bfa',
    corChao: 0xcfc2f5,
    centro: { x: 0, z: 0 },
    raio: 24,
    pontos: [
      {
        id: 'totem',
        nome: 'Totem do App Cidadão',
        icone: '📲',
        offset: { x: -7, z: 6 },
        rotY: 0.5,
        build: buildTotemCidadao,
        explicacao:
          'O totem digital dá acesso ao aplicativo do cidadão. Por ele qualquer pessoa pode registrar um problema da ' +
          'rua — um buraco no asfalto, uma lâmpada queimada, um vazamento —, tirar foto e enviar direto para a ' +
          'prefeitura, acompanhando depois se o reparo foi feito.',
        curiosidade: 'Esse tipo de participação se chama "governo aberto": a população passa a fazer parte da manutenção da cidade.',
        perguntas: [
          {
            enunciado: 'Para que serve o aplicativo do cidadão disponível no totem?',
            opcoes: [
              'Para jogar jogos online enquanto se espera o ônibus',
              'Para comprar produtos das lojas do bairro',
              'Para registrar problemas da rua e pedir reparos à prefeitura',
              'Para controlar os semáforos da avenida'
            ],
            correta: 2,
            explicacaoResposta:
              'O app é um canal direto entre morador e prefeitura: relatar o problema, acompanhar e cobrar a solução.'
          },
          {
            enunciado: 'Depois de enviar um problema pelo app, o que o cidadão consegue fazer?',
            opcoes: [
              'Nada: o pedido some assim que é enviado',
              'Acompanhar o andamento e ver se o reparo foi feito',
              'Escolher o funcionário que vai fazer o conserto',
              'Receber um desconto no imposto do mês seguinte'
            ],
            correta: 1,
            explicacaoResposta:
              'Poder acompanhar o chamado é o que transforma a reclamação em cobrança: o pedido tem número, prazo e resposta.'
          },
          {
            enunciado: 'O que significa "governo aberto"?',
            opcoes: [
              'Prefeitura que funciona 24 horas por dia',
              'Prefeitura que compartilha informações e deixa a população participar das decisões',
              'Prefeitura sem portas nem grades no prédio',
              'Prefeitura que só usa computadores para trabalhar'
            ],
            correta: 1,
            explicacaoResposta:
              'Governo aberto é transparência mais participação: a informação circula e o morador entra na conversa.'
          }
        ]
      },
      {
        id: 'dados',
        nome: 'Painel de Dados Abertos',
        icone: '📊',
        offset: { x: 9, z: -8 },
        rotY: -0.6,
        build: buildDadosAbertos,
        explicacao:
          'Os sensores espalhados pela cidade (energia, lixo, trânsito, qualidade do ar) geram dados o tempo todo. ' +
          'Quando a prefeitura publica esses dados de forma aberta, qualquer pessoa — estudantes, pesquisadores, ' +
          'jornalistas — pode analisá-los, criar aplicativos e cobrar melhorias. É a informação transformando a cidade.',
        curiosidade: 'Muitos aplicativos de transporte que você usa nasceram de dados abertos publicados por prefeituras.',
        perguntas: [
          {
            enunciado: 'O que caracteriza os "dados abertos" de uma cidade inteligente?',
            opcoes: [
              'São dados secretos, acessíveis apenas a funcionários da prefeitura',
              'São dados publicados livremente, que qualquer pessoa pode consultar e usar',
              'São os dados pessoais dos moradores colocados na internet',
              'São dados que só podem ser vistos mediante pagamento de uma taxa'
            ],
            correta: 1,
            explicacaoResposta:
              'Dado aberto é dado público e reutilizável — sem informações pessoais — que amplia a transparência e permite novas soluções.'
          },
          {
            enunciado: 'De onde vêm os números que aparecem neste painel?',
            opcoes: [
              'De pesquisas feitas de porta em porta uma vez por ano',
              'Dos sensores espalhados pela cidade: energia, lixo, trânsito e qualidade do ar',
              'De estimativas feitas por computador, sem medir nada',
              'Das notas dos alunos das escolas da cidade'
            ],
            correta: 1,
            explicacaoResposta:
              'É a cidade se medindo em tempo real: cada sensor instalado vira uma linha de dado que pode virar decisão.'
          },
          {
            enunciado: 'Um conjunto de dados abertos pode incluir o nome e o endereço dos moradores?',
            opcoes: [
              'Sim, tudo o que a prefeitura tem precisa ser publicado',
              'Não: dados abertos são públicos, mas dados pessoais precisam ser protegidos',
              'Sim, desde que os moradores não reclamem',
              'Não, porque esses dados não interessam a ninguém'
            ],
            correta: 1,
            explicacaoResposta:
              'Transparência não é devassa: publica-se o dado da cidade (consumo, coleta, trânsito), nunca a identidade das pessoas.'
          }
        ]
      },
      {
        id: 'wifi',
        nome: 'Praça Conectada',
        icone: '📶',
        offset: { x: -2, z: -13 },
        rotY: 0.9,
        build: buildWifiPublico,
        explicacao:
          'A praça oferece Wi-Fi público gratuito, e a antena é alimentada por um painel solar instalado no próprio ' +
          'mastro. Espaços assim são uma ferramenta de inclusão digital: quem não tem internet em casa consegue ' +
          'estudar, procurar emprego e acessar os serviços da prefeitura. Cidade inteligente não é só ter tecnologia ' +
          '— é fazer com que ela chegue a todo mundo.',
        curiosidade: 'Milhões de estudantes brasileiros dependem de redes públicas ou compartilhadas para fazer trabalhos escolares.',
        perguntas: [
          {
            enunciado: 'O que é inclusão digital?',
            opcoes: [
              'Garantir que todas as pessoas tenham acesso à internet e saibam usá-la',
              'Obrigar todo mundo a ter um celular novo',
              'Colocar computadores apenas nas escolas particulares',
              'Criar sites que só funcionam em aparelhos modernos'
            ],
            correta: 0,
            explicacaoResposta:
              'Não basta a tecnologia existir: inclusão digital é acesso mais capacidade de usar a rede para estudar, trabalhar e exercer direitos.'
          },
          {
            enunciado: 'Por que a antena da praça é alimentada por um painel solar?',
            opcoes: [
              'Para o sinal de internet ficar mais rápido no calor',
              'Para funcionar com energia limpa, sem aumentar o consumo da rede elétrica',
              'Porque antenas não podem ser ligadas na tomada',
              'Para desligar automaticamente à noite'
            ],
            correta: 1,
            explicacaoResposta:
              'A própria praça produz a energia que consome — é a soma de duas soluções: energia limpa e acesso à informação.'
          },
          {
            enunciado: 'Qual destes é um uso da praça conectada que realmente ajuda a cidade?',
            opcoes: [
              'Estudantes pesquisarem para a escola e moradores acessarem serviços da prefeitura',
              'Deixar aparelhos baixando arquivos a noite inteira',
              'Impedir que as pessoas usem a internet de casa',
              'Vender o sinal de internet para os vizinhos'
            ],
            correta: 0,
            explicacaoResposta:
              'O Wi-Fi público existe como serviço: pesquisa escolar, currículo, agendamento de consulta, segunda via de conta.'
          }
        ]
      }
    ]
  }
];

/** Lista plana de todos os pontos, já com a posição absoluta no mundo. */
export const TODOS_OS_PONTOS = ZONAS.flatMap((zona) =>
  zona.pontos.map((p) => ({
    ...p,
    zonaId: zona.id,
    zonaNome: zona.nome,
    zonaNumero: zona.numero,
    zonaIcone: zona.icone,
    cor: zona.cor,
    corCss: zona.corCss,
    posicao: { x: zona.centro.x + p.offset.x, z: zona.centro.z + p.offset.z }
  }))
);

export const TOTAL_PONTOS = TODOS_OS_PONTOS.length;

/** Quantas perguntas a partida inteira tem (soma das séries de cada ponto). */
export const TOTAL_PERGUNTAS = TODOS_OS_PONTOS.reduce(
  (soma, p) => soma + p.perguntas.length,
  0
);
