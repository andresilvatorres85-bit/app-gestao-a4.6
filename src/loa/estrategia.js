// ---------------------------------------------------------------------------
// Módulo "Captação de Emendas por Estado" — LÓGICA (subaba Estratégia).
// Recebe os mesmos `dados.registros` do RESULTADO LEXOR e produz, por (UF, Casa),
// um "modelo de documento" pronto para renderizar na tela (AbaEstrategia.jsx) e
// exportar em DOCX/PDF (estrategiaDoc.js). Segue modulo-captacao-emendas-ESPEC.md
// (§2 escopo, §3 agregação, §4 mandato, §5 categorias, §6 selos, §7 valores,
// §8 áreas, §9 fichas, §11 objetos).
//
// Mapeamento de campos (base do app → contrato da ESPEC):
//   autorUF   → uf        autorTipo → tipo        orgao → forca
//   subtitulo → objeto    acao/rp/valor/partido/ano/autor → diretos
// A `forca` já vem pronta em `orgao` (EXÉRCITO/MARINHA/AERONÁUTICA/
// MINISTÉRIO DA DEFESA = MD-Conjunto).
// ---------------------------------------------------------------------------
import {
  ANO_CORRENTE, JANELA_MANDATO, REMOVIDOS_MANDATO, WHITELIST_SEN_ATIVOS,
  GEN_QUENTE, MAPA_AREA, CATEGORIA_POR_ID, CASAS, UF_NOME, UFS,
  TITULO, META, ESTADO_VAZIO,
} from './estrategiaConfig.js'

// --- helpers de texto ------------------------------------------------------
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const up = (s) => semAcento(s).toUpperCase()

// Nome próprio em caixa de título, preservando conectores minúsculos.
const CONECTORES = new Set(['de', 'do', 'da', 'dos', 'das', 'e'])
export function tituloBR(s) {
  return String(s || '')
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((w, i) => (i > 0 && CONECTORES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim()
}

// --- §8 ação → área temática (primeira regra que casa vence) ---------------
export function areaDaAcao(acao) {
  const a = up(acao)
  for (const regra of MAPA_AREA) {
    if (regra.precisa && regra.precisa.every((t) => a.includes(t))) return regra.area
    if (regra.qualquer && regra.qualquer.some((t) => a.includes(t))) return regra.area
  }
  // Sem regra: as 46 primeiras letras da ação, capitalizadas.
  return tituloBR(String(acao || '').slice(0, 46))
}

// Força normalizada (contrato da ESPEC) a partir do `orgao` da base.
const FORCA = {
  'EXÉRCITO': 'Exército',
  'MARINHA': 'Marinha',
  'AERONÁUTICA': 'Aeronáutica',
  'MINISTÉRIO DA DEFESA': 'MD-Conjunto',
}
const forcaDe = (r) => FORCA[r.orgao] || 'MD-Conjunto'

// --- §7 formatação de valores (R$ milhares) --------------------------------
export const M = (valor) =>
  `R$ ${(Number(valor || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mil`
// VF: evita "R$ 0,00 mil" de emendas com valor zerado na base.
export const VF = (valor) => (Number(valor || 0) >= 5000 ? M(valor) : 'valor não registrado na base')

// §9 nota de anos: ≤3 lista os anos; >3 usa faixa "min–max (N anos)".
export function anosTxt(set) {
  const anos = [...set].map(Number).sort((a, b) => a - b)
  if (!anos.length) return '—'
  if (anos.length <= 3) return anos.join(', ')
  return `${anos[0]}–${anos[anos.length - 1]} (${anos.length} anos)`
}

// Top-N chaves de um contador (Map chave→n), por frequência desc.
const topChaves = (mapa, n) =>
  [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)

// --- §3 agregação por (UF, autor) numa Casa --------------------------------
// Recebe os registros JÁ no escopo (RP6/7) e da Casa (tipoAutor). Devolve
// Map autor → acumulador.
function agregar(registros) {
  const porAutor = new Map()
  for (const r of registros) {
    const autor = r.autor
    if (!porAutor.has(autor)) {
      porAutor.set(autor, {
        autor,
        uf: r.autorUF,
        anos_all: new Set(),
        valExHist: 0, anosExAll: new Set(), ex_ac: new Map(), ex_obj: new Map(),
        anosMaAe: new Set(), maae_ac: new Map(), ma_by: new Map(), ae_by: new Map(),
        part: new Set(), tipo: new Set(),
      })
    }
    const a = porAutor.get(autor)
    const ano = String(r.ano)
    const forca = forcaDe(r)
    const valor = Number(r.valor || 0)
    a.anos_all.add(ano)
    if (r.partido && r.partido !== 'S/PARTIDO' && r.partido !== '—') a.part.add(r.partido)
    if (r.autorTipo) a.tipo.add(r.autorTipo)

    if (forca === 'Exército') {
      a.valExHist += valor
      a.anosExAll.add(ano)
      if (r.acao) a.ex_ac.set(r.acao, (a.ex_ac.get(r.acao) || 0) + 1)
      const obj = r.subtitulo // "objeto" da ESPEC (§11) → subtítulo da emenda
      if (obj && /[a-zA-ZÀ-ÿ]/.test(obj)) a.ex_obj.set(obj, (a.ex_obj.get(obj) || 0) + 1)
    } else if (forca === 'Marinha' || forca === 'Aeronáutica') {
      a.anosMaAe.add(ano)
      if (r.acao) a.maae_ac.set(r.acao, (a.maae_ac.get(r.acao) || 0) + 1)
      const by = forca === 'Marinha' ? a.ma_by : a.ae_by
      by.set(ano, (by.get(ano) || 0) + valor)
    }
    // MD-Conjunto entra apenas via anos_all (marca presença/mandato no ano).
  }
  return porAutor
}

// --- §4 mandato ativo em 2026 ----------------------------------------------
function ehAtivo(a, config) {
  const nome = a.autor
  if (config.removidos.has(nome)) return false
  for (const ano of config.janela) if (a.anos_all.has(String(ano))) return true
  if (config.whitelist.has(nome)) return true
  return false
}

const somaMap = (mapa) => [...mapa.values()].reduce((s, v) => s + v, 0)

// --- §9 monta a ficha de um autor conforme a categoria ---------------------
function fichaConsolidado(a) {
  const areas = topChaves(a.ex_ac, 3).map(areaDaAcao)
  const areasU = [...new Set(areas)]
  const estreante = a.anosExAll.size === 1 && a.anosExAll.has(String(ANO_CORRENTE))
  const campos = [
    { rotulo: 'Histórico com o Exército', texto: `${VF(a.valExHist)} — ${anosTxt(a.anosExAll)}.` },
    { rotulo: 'Perfil de indicação', texto: areasU.length ? `${areasU.join(', ')}.` : 'não detalhado.' },
  ]
  const objetos = objetosRecentes(a.ex_obj)
  if (objetos) campos.push({ rotulo: 'Objetos recentes', texto: objetos })
  campos.push({
    rotulo: 'Abordagem',
    texto: estreante
      ? 'Novo apoiador — consolidar o vínculo com um segundo projeto, valorizando a estreia.'
      : `Manutenção. Levar projeto novo no formato que já costuma indicar (${areasU[0] || 'perfil da unidade'}).`,
  })
  return { campos, selos: estreante ? ['NOVO'] : [] }
}

function fichaRecuperar(a) {
  const areas = [...new Set(topChaves(a.ex_ac, 2).map(areaDaAcao))]
  const ma2026 = a.ma_by.get(String(ANO_CORRENTE)) || 0
  const ae2026 = a.ae_by.get(String(ANO_CORRENTE)) || 0
  let situacao
  if (ma2026 > 0 || ae2026 > 0) {
    const partes = []
    if (ma2026 > 0) partes.push(`Marinha ${M(ma2026)}`)
    if (ae2026 > 0) partes.push(`Aeronáutica ${M(ae2026)}`)
    situacao = `Apoiou o Exército em ${anosTxt(a.anosExAll)} (${VF(a.valExHist)}); em ${ANO_CORRENTE} migrou para ${partes.join(' + ')}.`
  } else {
    const somaMa = somaMap(a.ma_by)
    const somaAe = somaMap(a.ae_by)
    const forca = somaMa >= somaAe ? 'Marinha' : 'Aeronáutica'
    const by = forca === 'Marinha' ? a.ma_by : a.ae_by
    const ultimoAno = [...by.keys()].map(Number).sort((x, y) => y - x)[0]
    situacao = `Apoiou o Exército em ${anosTxt(a.anosExAll)} (${VF(a.valExHist)}); migrou para ${forca} `
      + `(último apoio em ${ultimoAno ?? '—'}, histórico ${M(somaMa + somaAe)}). Sem emenda ao Exército em ${ANO_CORRENTE}.`
  }
  const campos = [
    { rotulo: 'Situação', texto: situacao },
    { rotulo: 'Perfil (Exército)', texto: areas.length ? `${areas.join(', ')}.` : 'adequação/infraestrutura.' },
  ]
  const objetos = objetosRecentes(a.ex_obj)
  if (objetos) campos.push({ rotulo: 'Objetos recentes', texto: objetos })
  campos.push({
    rotulo: 'Abordagem',
    texto: 'Reengajar lembrando o histórico de parceria e trazendo projeto equivalente no formato que já apoiou.',
  })
  return { campos, selos: [] }
}

function fichaConquistar(a) {
  const acoesTop = topChaves(a.maae_ac, 2)
  const areas = [...new Set(acoesTop.map(areaDaAcao))]
  const quente = areas.some((ar) => GEN_QUENTE.has(ar))
  const ma2026 = a.ma_by.get(String(ANO_CORRENTE)) || 0
  const ae2026 = a.ae_by.get(String(ANO_CORRENTE)) || 0
  let linhaEmendas
  if (ma2026 > 0 || ae2026 > 0) {
    const partes = []
    if (ma2026 > 0) partes.push(`Marinha ${M(ma2026)}`)
    if (ae2026 > 0) partes.push(`Aeronáutica ${M(ae2026)}`)
    linhaEmendas = `${partes.join(' + ')} (${ANO_CORRENTE}).`
  } else {
    const somaMa = somaMap(a.ma_by)
    const somaAe = somaMap(a.ae_by)
    const forca = somaMa >= somaAe ? 'Marinha' : 'Aeronáutica'
    const by = forca === 'Marinha' ? a.ma_by : a.ae_by
    const ultimoAno = [...by.keys()].map(Number).sort((x, y) => y - x)[0]
    linhaEmendas = `Último apoio: ${forca} em ${ultimoAno ?? '—'} (histórico ${M(somaMa + somaAe)}).`
  }
  const campos = [
    { rotulo: 'Emendas Marinha/Aeronáutica', texto: linhaEmendas },
    { rotulo: 'O que banca', texto: areas.length ? `${areas.join(', ')}.` : 'ações de Defesa.' },
    {
      rotulo: 'Abordagem',
      texto: quente
        ? `Oferecer a mesma ação numa OM do Exército no estado (troca direta de UO): ${areas[0]}.`
        : 'Interesse temático específico de outra Força — abordar só se houver projeto do Exército no mesmo nicho (C&T, ensino).',
    },
  ]
  return { campos, selos: [quente ? 'ALTA VIABILIDADE' : 'BAIXA VIABILIDADE'] }
}

// §11 objetos recentes: transcrição literal de todos os objetos ao Exército,
// por frequência desc, juntados por " - ". Ruído já foi filtrado na agregação.
function objetosRecentes(ex_obj) {
  const objs = [...ex_obj.entries()].sort((a, b) => b[1] - a[1]).map(([o]) => o.trim())
  return objs.length ? objs.join(' - ') : ''
}

// Linha de identificação da ficha: "{partidos} · {Cargo}[ · {selo}]".
function identificacao(a, cargo, selos) {
  const partidos = [...a.part].sort().join('/') || 'sem partido'
  const selosTxt = selos.map((s) => `[${s}]`).join(' ')
  return [partidos, cargo, selosTxt].filter(Boolean).join(' · ')
}

// --- §5 classifica os autores ativos de uma Casa em três categorias --------
function classificar(porAutor, config) {
  const ativos = [...porAutor.values()].filter((a) => ehAtivo(a, config))
  const consolidado = []
  const recuperar = []
  const conquistar = []
  for (const a of ativos) {
    const emEx2026 = a.anosExAll.has(String(ANO_CORRENTE))
    if (emEx2026) consolidado.push(a)
    else if (a.anosExAll.size > 0) recuperar.push(a)
    else if (a.anosMaAe.size > 0) conquistar.push(a)
    // sem Exército e sem Marinha/Aero → não vira ficha.
  }
  consolidado.sort((x, y) => y.valExHist - x.valExHist)
  recuperar.sort((x, y) => y.valExHist - x.valExHist)
  conquistar.sort((x, y) => (somaMap(y.ma_by) + somaMap(y.ae_by)) - (somaMap(x.ma_by) + somaMap(x.ae_by)))
  return { consolidado, recuperar, conquistar }
}

// Configuração efetiva (com sobrescritas opcionais vindas da tela).
export function montarConfig(over = {}) {
  return {
    anoCorrente: over.anoCorrente ?? ANO_CORRENTE,
    janela: over.janela ?? JANELA_MANDATO,
    removidos: new Set((over.removidos ?? REMOVIDOS_MANDATO).map((s) => s.trim())),
    whitelist: new Set((over.whitelist ?? WHITELIST_SEN_ATIVOS).map((s) => s.trim())),
  }
}

// Escopo base: RP6/RP7 e autores individuais com UF (§2). Devolve os registros
// já recortados — usado por gerarDocumento e pelos índices de UF/Casa.
export function registrosEscopo(registros) {
  return registros.filter((r) => {
    const rp = String(r.rp)
    if (rp !== '6' && rp !== '7') return false
    const t = r.autorTipo
    if (t !== 'DEPUTADO FEDERAL' && t !== 'SENADOR') return false
    const uf = r.autorUF
    return uf && uf !== 'NA'
  })
}

// --- documento por (UF, Casa) ----------------------------------------------
const FICHA_POR_CAT = { consolidado: fichaConsolidado, recuperar: fichaRecuperar, conquistar: fichaConquistar }

export function gerarDocumento(registros, { uf, casa, config } = {}) {
  const cfg = config || montarConfig()
  const casaDef = CASAS[casa]
  const escopo = registrosEscopo(registros)
    .filter((r) => r.autorUF === uf && r.autorTipo === casaDef.tipoAutor)
  const grupos = classificar(agregar(escopo), cfg)

  const categorias = CATEGORIA_POR_ID
  const secoes = ['consolidado', 'recuperar', 'conquistar'].map((id) => {
    const autores = grupos[id]
    const meta = categorias[id]
    const fichas = autores.map((a) => {
      const { campos, selos } = FICHA_POR_CAT[id](a)
      return {
        autor: a.autor,
        nome: tituloBR(a.autor),
        ident: identificacao(a, casaDef.cargo, selos),
        selos,
        campos,
      }
    })
    return { id, rotulo: meta.rotulo, cor: meta.cor, cabecalho: meta.cabecalho(fichas.length), fichas }
  }).filter((s) => s.fichas.length > 0)

  const total = secoes.reduce((s, sec) => s + sec.fichas.length, 0)
  return {
    uf,
    ufNome: UF_NOME[uf] || uf,
    casa,
    casaRotulo: casaDef.rotulo,
    corSubtitulo: casaDef.corSubtitulo,
    subtitulo: `${casaDef.rotulo} — ${UF_NOME[uf] || uf} (${uf})`,
    titulo: TITULO,
    meta: META,
    secoes,
    vazio: total === 0,
    textoVazio: ESTADO_VAZIO,
    total,
  }
}

// Índice de contagem por (UF, Casa) — alimenta os seletores da tela e diz
// quais das 27×2 combinações têm fichas. Uma passada só sobre a base.
export function indicePorUFCasa(registros, config) {
  const cfg = config || montarConfig()
  const escopo = registrosEscopo(registros)
  const out = {}
  for (const casa of ['camara', 'senado']) {
    const tipoAutor = CASAS[casa].tipoAutor
    const porUf = {}
    for (const uf of UFS) {
      const sub = escopo.filter((r) => r.autorUF === uf && r.autorTipo === tipoAutor)
      const grupos = classificar(agregar(sub), cfg)
      porUf[uf] = {
        consolidado: grupos.consolidado.length,
        recuperar: grupos.recuperar.length,
        conquistar: grupos.conquistar.length,
        total: grupos.consolidado.length + grupos.recuperar.length + grupos.conquistar.length,
      }
    }
    out[casa] = porUf
  }
  return out
}
