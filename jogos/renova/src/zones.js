/**
 * zones.js
 * -----------------------------------------------------------------------------
 * Conteúdo educacional da cidade: 5 zonas temáticas, cada uma com 2–3 pontos
 * de interação. Cada ponto reúne:
 *   - o construtor 3D (de models.js)
 *   - a explicação didática do conceito
 *   - uma pergunta de múltipla escolha
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
  buildCiclovia,
  buildCarroEletrico,
  buildPontoOnibus,
  buildParqueUrbano,
  buildCaptacaoChuva,
  buildTotemCidadao,
  buildDadosAbertos
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
        pergunta: {
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
        }
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
