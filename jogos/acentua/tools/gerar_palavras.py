# -*- coding: utf-8 -*-
"""
Gerador do banco de palavras do EXPRESSO TONICO.

Edite os GRUPOS abaixo e rode:   py tools/gerar_palavras.py
Ele reescreve data/palavras.json e roda validacoes automaticas.

Cada grupo define: tipo tonico, nivel de dificuldade (1 facil, 2 medio,
3 pegadinha) e a regra que explica a acentuacao daquelas palavras.

Este script e opcional: depois de gerado, data/palavras.json pode ser
editado a mao normalmente.
"""
import json
import os
import sys
import unicodedata
from collections import Counter

AGUDO = "́"
GRAVE = "̀"
CIRC = "̂"

GRUPOS = [
    # ---------------- PROPAROXITONAS ----------------
    dict(tipo="proparoxitona", nivel=1,
         regra="Toda proparoxítona é acentuada, sem exceção.",
         palavras="medico sabado musica numero rapido publico ultimo epoca arvore xicara fabrica maquina lampada camera".split()),
    dict(tipo="proparoxitona", nivel=2,
         regra="Toda proparoxítona é acentuada, sem exceção.",
         palavras="hipotese matematica semaforo abobora quilometro estomago relampago simpatico politico dinamico liquido calculo decada transito".split()),
    dict(tipo="proparoxitona", nivel=3,
         regra="Toda proparoxítona é acentuada, sem exceção — inclusive as palavras que dão nome às próprias regras.",
         palavras="oxitona paroxitona proparoxitona integro impeto exodo".split()),

    # ---------------- PAROXITONAS ACENTUADAS ----------------
    dict(tipo="paroxitona", nivel=1,
         regra="Paroxítona terminada em -L é acentuada.",
         palavras="facil util nivel agil fragil".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -L é acentuada.",
         palavras="fossil habil reptil".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -N é acentuada.",
         palavras="hifen polen abdomen".split()),
    dict(tipo="paroxitona", nivel=1,
         regra="Paroxítona terminada em -R é acentuada.",
         palavras="acucar carater cancer".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -R é acentuada.",
         palavras="revolver martir impar".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -X é acentuada.",
         palavras="torax fenix latex".split()),
    dict(tipo="paroxitona", nivel=3,
         regra="Paroxítona terminada em -PS é acentuada.",
         palavras="biceps forceps".split()),
    dict(tipo="paroxitona", nivel=1,
         regra="Paroxítona terminada em -I ou -IS é acentuada.",
         palavras="juri taxi lapis".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -I ou -IS é acentuada.",
         palavras="tenis iris gratis".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -US é acentuada.",
         palavras="virus bonus onus".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em -UM ou -UNS é acentuada.",
         palavras="album forum albuns".split()),
    dict(tipo="paroxitona", nivel=3,
         regra="Paroxítona terminada em -Ã(S) ou -ÃO(S) é acentuada. Atenção: o til marca nasalidade e NÃO conta como acento gráfico.",
         palavras="ima orfa orgao sotao bencao".split()),
    dict(tipo="paroxitona", nivel=1,
         regra="Paroxítona terminada em ditongo (duas vogais na mesma sílaba final) é acentuada.",
         palavras="historia memoria gloria relogio colegio".split()),
    dict(tipo="paroxitona", nivel=2,
         regra="Paroxítona terminada em ditongo (duas vogais na mesma sílaba final) é acentuada.",
         palavras="serie especie armario silencio ciencia agua magoa".split()),

    # ---------------- PAROXITONAS SEM ACENTO ----------------
    dict(tipo="paroxitona", nivel=1,
         regra="Paroxítona terminada em -A, -E ou -O (com ou sem -S) não leva acento: essas são as terminações mais comuns do português.",
         palavras="casa mesa livro escola janela cadeira caneta cachorro amigo cabelo garrafa brinquedo floresta montanha".split()),
    dict(tipo="paroxitona", nivel=3,
         regra="Pegadinha de sílaba tônica: a tônica cai na penúltima sílaba e a terminação é -A/-E/-O, então não há acento.",
         palavras="atmosfera recorde gratuito fluido rubrica".split()),

    # ---------------- OXITONAS ACENTUADAS ----------------
    dict(tipo="oxitona", nivel=1,
         regra="Oxítona terminada em -A ou -AS é acentuada.",
         palavras="sofa maracuja guarana alvara vatapa".split()),
    dict(tipo="oxitona", nivel=1,
         regra="Oxítona terminada em -E ou -ES é acentuada.",
         palavras="cafe jacare voce pontape".split()),
    dict(tipo="oxitona", nivel=2,
         regra="Oxítona terminada em -E ou -ES é acentuada.",
         palavras="pure bebe portugues atraves".split()),
    dict(tipo="oxitona", nivel=1,
         regra="Oxítona terminada em -O ou -OS é acentuada.",
         palavras="cipo avo paleto domino".split()),
    dict(tipo="oxitona", nivel=2,
         regra="Oxítona terminada em -O ou -OS é acentuada.",
         palavras="robo vovo jilo".split()),
    dict(tipo="oxitona", nivel=2,
         regra="Oxítona terminada em -EM ou -ENS é acentuada.",
         palavras="tambem ninguem alguem armazem refem parabens porem".split()),

    # ---------------- OXITONAS SEM ACENTO ----------------
    dict(tipo="oxitona", nivel=1,
         regra="Oxítona só é acentuada quando termina em -a(s), -e(s), -o(s), -em ou -ens. Terminando em outra letra, não leva acento.",
         palavras="computador feliz capaz jornal papel animal professor cantar comer ator hotel cartaz rapaz tambor".split()),
    dict(tipo="oxitona", nivel=2,
         regra="Oxítona terminada em -I ou -U não entra na lista de terminações acentuadas, portanto não leva acento.",
         palavras="urubu caju abacaxi colibri javali".split()),
    dict(tipo="oxitona", nivel=3,
         regra="O til marca nasalidade e NÃO é acento gráfico. Oxítona terminada em -ã ou -ão não recebe acento.",
         palavras="cordao amanha irma".split()),

    # ---------------- MONOSSILABOS ----------------
    dict(tipo="monossilabo", nivel=1,
         regra="Monossílabo tônico terminado em -a(s), -e(s) ou -o(s) é acentuado.",
         palavras="pa pe po no cha fe da".split()),
    dict(tipo="monossilabo", nivel=2,
         regra="Monossílabo tônico terminado em -a(s), -e(s) ou -o(s) é acentuado.",
         palavras="mes tres".split()),
    dict(tipo="monossilabo", nivel=3,
         regra="Ditongo aberto -éu, -éi e -ói é acentuado em monossílabos e em oxítonas.",
         palavras="reu ceu doi".split()),
    dict(tipo="monossilabo", nivel=1,
         regra="Monossílabo tônico terminado em outra letra (-r, -l, -z, -m...) não recebe acento.",
         palavras="mar sol luz paz giz flor".split()),

    # ---------------- HIATOS ----------------
    dict(tipo="paroxitona", nivel=3,
         regra="Regra do hiato: o I ou o U tônico sozinho na sílaba recebe acento, mesmo que a regra geral não pedisse.",
         palavras="saida egoista saude ruido viuva faisca heroina cafeina".split()),
    dict(tipo="oxitona", nivel=3,
         regra="Regra do hiato: o I ou o U tônico sozinho na sílaba recebe acento, mesmo que a regra geral não pedisse.",
         palavras="bau pais ai".split()),
    dict(tipo="oxitona", nivel=3,
         regra="Exceção do hiato: o I/U tônico NÃO é acentuado quando forma sílaba com S, Z, R, L, M ou N (ju-IZ, ra-IZ, ca-IR).",
         palavras="juiz raiz cair".split()),
    dict(tipo="paroxitona", nivel=3,
         regra="Exceção do hiato: o I/U tônico NÃO é acentuado quando vem seguido de NH (ra-I-nha) nem quando vem depois de ditongo (fei-U-ra).",
         palavras="rainha bainha moinho feiura".split()),
]

# As palavras dos grupos acima foram digitadas sem acento por praticidade.
# O mapa abaixo devolve a grafia CORRETA de cada uma.
ACENTUADAS = {
    "medico": "médico", "sabado": "sábado", "musica": "música",
    "numero": "número", "rapido": "rápido", "publico": "público",
    "ultimo": "último", "epoca": "época", "arvore": "árvore",
    "xicara": "xícara", "fabrica": "fábrica", "maquina": "máquina",
    "lampada": "lâmpada", "camera": "câmera",
    "hipotese": "hipótese", "matematica": "matemática", "semaforo": "semáforo",
    "abobora": "abóbora", "quilometro": "quilômetro", "estomago": "estômago",
    "relampago": "relâmpago", "simpatico": "simpático", "politico": "político",
    "dinamico": "dinâmico", "liquido": "líquido", "calculo": "cálculo",
    "decada": "década", "transito": "trânsito",
    "oxitona": "oxítona", "paroxitona": "paroxítona",
    "proparoxitona": "proparoxítona", "integro": "íntegro",
    "impeto": "ímpeto", "exodo": "êxodo",
    "facil": "fácil", "util": "útil", "nivel": "nível", "agil": "ágil",
    "fragil": "frágil", "fossil": "fóssil", "habil": "hábil",
    "reptil": "réptil",
    "hifen": "hífen", "polen": "pólen", "abdomen": "abdômen",
    "acucar": "açúcar", "carater": "caráter", "cancer": "câncer",
    "revolver": "revólver", "martir": "mártir", "impar": "ímpar",
    "torax": "tórax", "fenix": "fênix", "latex": "látex",
    "biceps": "bíceps", "forceps": "fórceps",
    "juri": "júri", "taxi": "táxi", "lapis": "lápis", "tenis": "tênis",
    "iris": "íris", "gratis": "grátis",
    "virus": "vírus", "bonus": "bônus", "onus": "ônus",
    "album": "álbum", "forum": "fórum", "albuns": "álbuns",
    "ima": "ímã", "orfa": "órfã", "orgao": "órgão",
    "sotao": "sótão", "bencao": "bênção",
    "historia": "história", "memoria": "memória", "gloria": "glória",
    "relogio": "relógio", "colegio": "colégio", "serie": "série",
    "especie": "espécie", "armario": "armário", "silencio": "silêncio",
    "ciencia": "ciência", "agua": "água", "magoa": "mágoa",
    "casa": "casa", "mesa": "mesa", "livro": "livro", "escola": "escola",
    "janela": "janela", "cadeira": "cadeira", "caneta": "caneta",
    "cachorro": "cachorro", "amigo": "amigo", "cabelo": "cabelo",
    "garrafa": "garrafa", "brinquedo": "brinquedo", "floresta": "floresta",
    "montanha": "montanha",
    "atmosfera": "atmosfera", "recorde": "recorde", "gratuito": "gratuito",
    "fluido": "fluido", "rubrica": "rubrica",
    "sofa": "sofá", "maracuja": "maracujá", "guarana": "guaraná",
    "alvara": "alvará", "vatapa": "vatapá",
    "cafe": "café", "jacare": "jacaré", "voce": "você",
    "pontape": "pontapé", "pure": "purê", "bebe": "bebê",
    "portugues": "português", "atraves": "através",
    "cipo": "cipó", "avo": "avó", "paleto": "paletó",
    "domino": "dominó", "robo": "robô", "vovo": "vovô", "jilo": "jiló",
    "tambem": "também", "ninguem": "ninguém", "alguem": "alguém",
    "armazem": "armazém", "refem": "refém", "parabens": "parabéns",
    "porem": "porém",
    "computador": "computador", "feliz": "feliz", "capaz": "capaz",
    "jornal": "jornal", "papel": "papel", "animal": "animal",
    "professor": "professor", "cantar": "cantar", "comer": "comer",
    "ator": "ator", "hotel": "hotel", "cartaz": "cartaz", "rapaz": "rapaz",
    "tambor": "tambor",
    "urubu": "urubu", "caju": "caju", "abacaxi": "abacaxi",
    "colibri": "colibri", "javali": "javali",
    "cordao": "cordão", "amanha": "amanhã", "irma": "irmã",
    "pa": "pá", "pe": "pé", "po": "pó", "no": "nó",
    "cha": "chá", "fe": "fé", "da": "dá",
    "mes": "mês", "tres": "três",
    "reu": "réu", "ceu": "céu", "doi": "dói",
    "mar": "mar", "sol": "sol", "luz": "luz", "paz": "paz", "giz": "giz",
    "flor": "flor",
    "saida": "saída", "egoista": "egoísta", "saude": "saúde",
    "ruido": "ruído", "viuva": "viúva", "faisca": "faísca",
    "heroina": "heroína", "cafeina": "cafeína",
    "bau": "baú", "pais": "país", "ai": "aí",
    "juiz": "juiz", "raiz": "raiz", "cair": "cair",
    "rainha": "rainha", "bainha": "bainha", "moinho": "moinho",
    "feiura": "feiura",
}


def analisar(palavra):
    """Separa a palavra em: forma sem acento grafico, indice da vogal que
    recebe o acento, tipo de acento e indices das vogais candidatas.

    Til e cedilha sao preservados: eles fazem parte da grafia da palavra e
    nao sao acento grafico."""
    decomposta = unicodedata.normalize("NFD", palavra)
    clusters = []
    idx = -1
    tipo_ac = None
    for ch in decomposta:
        if unicodedata.combining(ch):
            if not clusters:
                raise ValueError("marca sem letra base em " + palavra)
            if ch in (AGUDO, GRAVE):
                idx, tipo_ac = len(clusters) - 1, "agudo"
            elif ch == CIRC:
                idx, tipo_ac = len(clusters) - 1, "circunflexo"
            else:
                clusters[-1] += ch
        else:
            clusters.append(ch)
    sem = unicodedata.normalize("NFC", "".join(clusters))
    if len(sem) != len(clusters):
        raise ValueError("cluster nao compoe em um caractere: " + palavra)
    alvos = [i for i, c in enumerate(sem) if c in "aeiou"]
    return sem, idx, tipo_ac, alvos


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    saida = os.path.join(raiz, "data", "palavras.json")
    vistas = set()
    itens = []
    erros = []

    for grupo in GRUPOS:
        for chave in grupo["palavras"]:
            if chave not in ACENTUADAS:
                erros.append("sem grafia no mapa ACENTUADAS: " + chave)
                continue
            palavra = ACENTUADAS[chave]
            if palavra in vistas:
                erros.append("palavra duplicada: " + palavra)
                continue
            vistas.add(palavra)
            _sem, idx, _tipo_ac, alvos = analisar(palavra)
            if grupo["tipo"] == "proparoxitona" and idx < 0:
                erros.append("proparoxitona sem acento: " + palavra)
            if idx >= 0 and idx not in alvos:
                erros.append("acento fora de vogal: " + palavra)
            if not alvos:
                erros.append("nenhuma vogal alvo: " + palavra)
            itens.append({
                "palavra": palavra,
                "tipo": grupo["tipo"],
                "nivel": grupo["nivel"],
                "regra": grupo["regra"],
            })

    if erros:
        print("FALHOU:")
        for e in erros:
            print("  - " + e)
        return 1

    doc = {
        "_leiame": (
            "Banco de palavras do Expresso Tônico. Para incluir palavras novas, "
            "acrescente um objeto com: palavra (grafia correta, já com acento se "
            "houver), tipo (oxitona | paroxitona | proparoxitona | monossilabo), "
            "nivel (1 fácil, 2 médio, 3 pegadinha) e regra (texto mostrado no "
            "relatório de viagem). O servidor deriva sozinho a forma sem acento, "
            "a vogal que recebe o acento e o tipo de acento (agudo/circunflexo)."
        ),
        "palavras": itens,
    }
    with open(saida, "w", encoding="utf-8") as arquivo:
        json.dump(doc, arquivo, ensure_ascii=False, indent=2)
        arquivo.write("\n")

    com_acento = sum(1 for i in itens if analisar(i["palavra"])[1] >= 0)
    print("OK -> " + saida)
    print("total: %d palavras" % len(itens))
    print("por tipo : %s" % dict(Counter(i["tipo"] for i in itens)))
    print("por nivel: %s" % dict(Counter(i["nivel"] for i in itens)))
    print("com acento grafico: %d | sem acento grafico: %d"
          % (com_acento, len(itens) - com_acento))
    return 0


if __name__ == "__main__":
    sys.exit(main())
