"""Relatório diário de Conjuntura (aba CONHECIMENTO › Conjuntura).

Roda no GitHub Actions (conjuntura.yml), de segunda a sexta às 08:00 de
Brasília:

  1. busca no Tavily as notícias do dia sobre o Orçamento Federal, só nos
     portais da lista FONTES;
  2. extrai o texto das matérias encontradas;
  3. pede ao Claude o relatório no padrão do analista (panorama, bloqueios,
     Executivo x Congresso, análise crítica e fontes), descartando o que não
     foi publicado hoje;
  4. grava o resultado na tabela `conjuntura_relatorios` do Supabase
     (uma linha por dia; rodar de novo no mesmo dia substitui o relatório).

Variáveis de ambiente (Secrets do repositório):
  TAVILY_API_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Opcional: DATA_RELATORIO=AAAA-MM-DD (gera o relatório de outro dia).
Sem as chaves do Supabase, imprime o JSON em vez de gravar (teste local).
"""

import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import anthropic
import requests

TZ = ZoneInfo("America/Sao_Paulo")
MODELO = "claude-opus-5-5"
TAVILY = "https://api.tavily.com"

# Portais permitidos (domínio para o filtro do Tavily → nome exibido).
FONTES = {
    "g1.globo.com": "G1",
    "oglobo.globo.com": "O Globo",
    "cnnbrasil.com.br": "CNN Brasil",
    "poder360.com.br": "Poder360",
    "metropoles.com": "Metrópoles",
    "valor.globo.com": "Valor Econômico",
    "infomoney.com.br": "InfoMoney",
    "gazetadopovo.com.br": "Gazeta do Povo",
    "estadao.com.br": "Estadão",
    "folha.uol.com.br": "Folha de S.Paulo",
    "veja.abril.com.br": "Veja",
    "jovempan.com.br": "Jovem Pan",
    "revistaoeste.com": "Revista Oeste",
    "congressonacional.leg.br": "Congresso Nacional",
}

# Eixos temáticos do relatório. Cada consulta faz uma busca de notícias
# "advanced" (2 créditos do Tavily) e uma busca geral "basic" (1 crédito); com
# a extração, ~34 créditos por dia útil, ~750 por mês (o plano gratuito tem
# 1.000).
CONSULTAS = [
    "orçamento federal meta fiscal resultado primário",
    "arcabouço fiscal dívida pública contas públicas",
    "bloqueio contingenciamento verbas ministérios orçamento",
    "ajuste fiscal corte de gastos governo Lula Flávio Bolsonaro",
    "despesas obrigatórias Previdência BPC pessoal investimentos",
    "emendas parlamentares liberação pagamento STF Congresso",
    "Comissão Mista de Orçamento CMO LDO LOA PLOA",
    "crédito suplementar PLN veto Congresso orçamento",
    "Tesouro Nacional Fazenda Planejamento estatais repasses saúde educação",
]

MAX_MATERIAS = 35        # matérias extraídas e enviadas ao Claude
MAX_CHARS_MATERIA = 7000  # texto de cada matéria (após limpeza)

ANALISTA = """Você é um Analista de Economia e Política Fiscal especializado em finanças públicas brasileiras. \
Sua tarefa é montar o relatório diário com as notícias e atualizações sobre o Orçamento Público Federal do Brasil, \
focando única e exclusivamente em publicações do dia {data_br}.

Eixos temáticos:
- Execução Orçamentária e Cumprimento da Meta Fiscal (Regime Fiscal Sustentável / Novo Arcabouço).
- Bloqueios, contingenciamentos ou repasses orçamentários (ex.: Saúde, Educação, Transportes).
- Evolução das despesas obrigatórias (Previdência, BPC, pessoal) e o espaço para investimentos.
- Movimentações de Emendas Parlamentares na CMO ou plenário e vetos/negociações fiscais.

Você recebe as matérias já coletadas nos portais permitidos, numeradas por id. Regras:
- Use SOMENTE as matérias fornecidas; não invente fatos, números nem fontes.
- Descarte qualquer matéria que não tenha sido publicada em {data_br}. Confira a data no texto \
(linha de data/hora, "nesta sexta-feira (9)", data na URL). Os textos trazem menus e chamadas de outras \
matérias: datas desses trechos não valem. Na dúvida, descarte.
- Descarte matérias fora do tema (orçamento e política fiscal federal).
- Cite as matérias pelo id entre colchetes, ex.: "[3]" ou "[3][7]", ao fim de cada item.
- Escreva em português, frases diretas, com números e nomes quando a matéria trouxer.
- Se não houver notícia do dia para uma seção, diga isso em um item (ex.: "Nenhuma notícia de bloqueio \
ou contingenciamento foi publicada hoje nos portais consultados.").
- Em `fontes`, liste só os ids efetivamente citados, com título, veículo e a data de publicação \
que você confirmou (AAAA-MM-DD). Em `observacoes`, registre ressalvas (ex.: data não confirmada, \
matéria lida só em parte por paywall)."""

ITENS = {"type": "array", "items": {"type": "string"}}
SCHEMA = {
    "type": "object",
    "properties": {
        "resumo": {"type": "string", "description": "Uma ou duas frases com o quadro geral do dia."},
        "panorama": ITENS,
        "bloqueios": ITENS,
        "congresso": ITENS,
        "atencao": ITENS,
        "proximos_passos": ITENS,
        "fontes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "titulo": {"type": "string"},
                    "veiculo": {"type": "string"},
                    "data": {"type": "string"},
                },
                "required": ["id", "titulo", "veiculo", "data"],
                "additionalProperties": False,
            },
        },
        "observacoes": ITENS,
    },
    "required": ["resumo", "panorama", "bloqueios", "congresso", "atencao", "proximos_passos", "fontes", "observacoes"],
    "additionalProperties": False,
}

SECOES_TEXTO = ["resumo", "panorama", "bloqueios", "congresso", "atencao", "proximos_passos", "observacoes"]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def tavily(endpoint, payload):
    r = requests.post(f"{TAVILY}/{endpoint}", json=payload, timeout=120,
                      headers={"Authorization": f"Bearer {os.environ['TAVILY_API_KEY']}"})
    r.raise_for_status()
    return r.json()


def veiculo(url):
    host = re.sub(r"^https?://", "", url).split("/")[0].lower()
    for dom, nome in FONTES.items():
        if host == dom or host.endswith("." + dom):
            return nome
    return None


# Páginas de autor, tag, capa de editoria, boletins "Hoje" e anexos não são matérias.
NAO_MATERIA = re.compile(r"/(autores|tudo-sobre|tag|tags|categoria|colunistas?)/|/[\w-]*-hoje/?$|\.pdf$|/apuracao", re.I)


def eh_materia(url):
    ultimo = url.rstrip("/").rsplit("/", 1)[-1]
    return not NAO_MATERIA.search(url) and len(ultimo) >= 25


def normalizar_url(url):
    # Versões AMP do Globo/Valor apontam para a mesma matéria.
    return url.replace("/google/amp/", "/").split("#")[0].rstrip("/")


def data_na_url(url):
    m = re.search(r"/(20\d{2})/(\d{2})/(\d{2})/", url)
    return f"{m[1]}-{m[2]}-{m[3]}" if m else None


def data_publicada(r):
    try:
        return datetime.strptime(r["published_date"][:25], "%a, %d %b %Y %H:%M:%S").date().isoformat()
    except (KeyError, TypeError, ValueError):
        return None


def buscar(dia):
    """Consultas no Tavily → candidatos únicos, só dos portais permitidos."""
    # Cada consulta roda em duas variantes, que se complementam: a busca de
    # notícias (traz a data de publicação) e a busca geral das últimas 24 h
    # (cobre mais páginas, inclusive as do Congresso).
    variantes = [
        {"topic": "news", "search_depth": "advanced", "start_date": (dia - timedelta(days=1)).isoformat()},
        {"topic": "general", "search_depth": "basic", "time_range": "day"},
    ]

    def uma(args):
        q, extra = args
        try:
            return tavily("search", {
                "query": q, "max_results": 20,
                "include_domains": list(FONTES), **extra,
            }).get("results", [])
        except requests.RequestException as e:
            log(f"busca falhou ({q}): {e}")
            return []

    with ThreadPoolExecutor(6) as ex:
        listas = list(ex.map(uma, [(q, v) for q in CONSULTAS for v in variantes]))

    vistos = {}
    for lista in listas:
        for r in lista:
            url = normalizar_url(r.get("url", ""))
            if not veiculo(url) or not eh_materia(url) or url in vistos:
                continue
            datas = {data_publicada(r), data_na_url(url)} - {None}
            # Data conhecida e diferente de hoje → descarta já aqui.
            if datas and dia.isoformat() not in datas:
                continue
            vistos[url] = {"url": url, "titulo": r.get("title", ""), "score": r.get("score", 0),
                           "data_indicada": " / ".join(sorted(datas)) or "não informada"}
    cand = sorted(vistos.values(), key=lambda c: -c["score"])[:MAX_MATERIAS]
    log(f"{len(cand)} candidatas de {sum(map(len, listas))} resultados")
    return cand


def limpar(texto):
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", texto or "")
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"\(data:[^)]*\)|https?://\S+\.(?:jpg|jpeg|png|webp|gif)\S*", "", t)
    linhas = [l.strip() for l in t.split("\n")]
    # Mantém linhas com conteúdo e as curtas que parecem data/hora.
    linhas = [l for l in linhas if len(l) > 40 or re.search(r"\d{1,2}[/.]\d{1,2}[/.]20\d{2}|\d{1,2}h\d{2}|out\.?|outubro", l, re.I)]
    return "\n".join(linhas)[:MAX_CHARS_MATERIA]


def extrair(cand):
    """Texto das matérias (lotes de 20 URLs por chamada)."""
    textos = {}
    for i in range(0, len(cand), 20):
        lote = [c["url"] for c in cand[i:i + 20]]
        try:
            res = tavily("extract", {"urls": lote, "extract_depth": "basic", "format": "markdown"})
        except requests.RequestException as e:
            log(f"extração falhou: {e}")
            continue
        for r in res.get("results", []):
            textos[normalizar_url(r["url"])] = limpar(r.get("raw_content", ""))
    for c in cand:
        c["texto"] = textos.get(c["url"], "")
    return cand


def redigir(dia, materias):
    data_br = dia.strftime("%d/%m/%Y")
    blocos = []
    for i, m in enumerate(materias, 1):
        blocos.append(
            f'<materia id="{i}">\nVeículo: {m["veiculo"]}\nTítulo: {m["titulo"]}\nURL: {m["url"]}\n'
            f'Data indicada pela busca: {m["data_indicada"]}\nTexto:\n{m["texto"] or "(não foi possível extrair o texto)"}\n</materia>'
        )
    prompt = (f"Hoje é {data_br}. Matérias coletadas:\n\n" + "\n\n".join(blocos) +
              "\n\nMonte o relatório do dia seguindo as regras.")

    client = anthropic.Anthropic()
    resp = client.beta.messages.create(
        model=MODELO,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        extra_body={"fallbacks": "default"},
        system=ANALISTA.format(data_br=data_br),
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": prompt}],
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError(f"O modelo recusou a solicitação: {getattr(resp, 'stop_details', None)}")
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("Resposta cortada (max_tokens).")
    texto = next(b.text for b in resp.content if b.type == "text")
    return json.loads(texto)


def renumerar(rel, materias, dia):
    """Mantém só as fontes de hoje, numera 1..n na ordem de citação e reescreve
    as referências [id] do texto. URL e veículo vêm da coleta (nunca do modelo)."""
    validas = {f["id"]: f for f in rel["fontes"]
               if 1 <= f["id"] <= len(materias) and f["data"] == dia.isoformat()}
    ordem = []
    for chave in SECOES_TEXTO:
        partes = rel[chave] if isinstance(rel[chave], list) else [rel[chave]]
        for p in partes:
            for n in re.findall(r"\[(\d+)\]", p):
                n = int(n)
                if n in validas and n not in ordem:
                    ordem.append(n)
    novo = {old: i for i, old in enumerate(ordem, 1)}

    def troca(txt):
        txt = re.sub(r"\[(\d+)\]", lambda m: f"[{novo[int(m[1])]}]" if int(m[1]) in novo else "", txt)
        return re.sub(r"\s+([.,;])", r"\1", txt).strip()

    def sustentado(txt):
        # Item que só cita fontes descartadas (de outro dia ou inexistentes) sai.
        refs = [int(n) for n in re.findall(r"\[(\d+)\]", txt)]
        return not refs or any(n in novo for n in refs)

    for chave in SECOES_TEXTO:
        if isinstance(rel[chave], list):
            rel[chave] = [troca(p) for p in rel[chave] if sustentado(p)]
        else:
            rel[chave] = troca(rel[chave])
    rel["fontes"] = [{
        "n": novo[old], "titulo": validas[old]["titulo"] or materias[old - 1]["titulo"],
        "url": materias[old - 1]["url"], "veiculo": materias[old - 1]["veiculo"], "data": dia.isoformat(),
    } for old in ordem]
    return rel


def gravar(linha):
    url, chave = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and chave):
        print(json.dumps(linha, ensure_ascii=False, indent=2))
        return
    headers = {"apikey": chave, "Content-Type": "application/json",
               "Prefer": "resolution=merge-duplicates,return=minimal"}
    # A chave service_role antiga é um JWT e vai também no Authorization; a
    # chave secreta nova (sb_secret_...) só pode ir no cabeçalho apikey.
    if chave.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {chave}"
    r = requests.post(
        f"{url.rstrip('/')}/rest/v1/conjuntura_relatorios?on_conflict=data",
        headers=headers,
        data=json.dumps(linha), timeout=60,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase {r.status_code}: {r.text[:500]}")
    log(f"Relatório de {linha['data']} gravado ({linha['status']}).")


def main():
    dia = date.fromisoformat(os.environ["DATA_RELATORIO"]) if os.environ.get("DATA_RELATORIO") else datetime.now(TZ).date()
    linha = {"data": dia.isoformat(), "gerado_em": datetime.now(TZ).isoformat(), "modelo": MODELO}
    try:
        cand = buscar(dia)
        for c in cand:
            c["veiculo"] = veiculo(c["url"])
        materias = [m for m in extrair(cand) if m["texto"]]
        log(f"{len(materias)} matérias com texto")
        if not materias:
            rel = {k: [] for k in SECOES_TEXTO} | {"fontes": [], "resumo":
                   "Nenhuma matéria sobre o Orçamento Federal publicada hoje foi encontrada nos portais consultados."}
        else:
            rel = renumerar(redigir(dia, materias), materias, dia)
        linha |= {"status": "ok", "conteudo": rel, "erro": None,
                  "candidatas": len(cand), "usadas": len(rel["fontes"])}
        gravar(linha)
    except Exception as e:  # registra a falha para a aba mostrar o motivo
        log(f"ERRO: {e}")
        linha |= {"status": "erro", "erro": str(e)[:2000]}
        try:
            gravar(linha)
        finally:
            sys.exit(1)


if __name__ == "__main__":
    main()
