// ---------------------------------------------------------------------------
// Camada de dados da aba EXECUÇÃO LOA — despesa por execução do órgão 52000.
//
// Base própria, separada das emendas e do PLOA: outro arquivo na origem
// (`LOA_despesa_execucao.xlsx`), uma dotação por linha, com três valores por
// dotação — Dotação Inicial, Autorizado e Contingenciamento. A unidade destes
// painéis é o BILHÃO (o MD aparece com o orçamento completo, ~R$ 145 bi).
//
// Para reaproveitar os MESMOS componentes de gráfico do PLOA (barra + traço), as
// agregações devolvem `{ valor, pl }` onde:
//   valor = Autorizado (a BARRA)      pl = Dotação Inicial (o TRAÇO)
// ---------------------------------------------------------------------------
import { FILTROS, RP_LABEL, corDoRP } from './dados.js'
import { AGREGADOS, GND_NOMES, corDoGND, fmtBi, fmtVar, variacao } from './ploa.js'

export { fmtBi, fmtVar, variacao, AGREGADOS }

// Filtros aplicáveis a uma dotação de execução — os mesmos do PLOA (uma dotação
// não tem autor, partido, C Mil A…). O campo de cada filtro casa com a chave do
// registro no dados.json (ano, orgao, uo, uoCod, rp, gnd).
export const FILTROS_EXEC_IDS = ['ano', 'orgao', 'uo', 'uocod', 'rp', 'gnd']
export const FILTROS_EXEC = FILTROS.filter((f) => FILTROS_EXEC_IDS.includes(f.id))

export function filtrarExecucao(registros, filtros, ignorar = null) {
  const fora = new Set(ignorar === null ? [] : [].concat(ignorar))
  return registros.filter((r) =>
    FILTROS_EXEC.every((f) => {
      if (fora.has(f.id)) return true
      const sel = filtros[f.id]
      if (!sel || sel.size === 0) return true
      return sel.has(String(r[f.campo] ?? ''))
    })
  )
}

// Opções de um filtro com facetamento (calculadas sobre quem passa nos demais).
export function opcoesExecucao(registros, filtros, filtro) {
  const base = filtrarExecucao(registros, filtros, filtro.id)
  const cont = new Map()
  for (const r of base) {
    const v = String(r[filtro.campo] ?? '')
    if (v === '') continue
    cont.set(v, (cont.get(v) || 0) + 1)
  }
  for (const v of filtros[filtro.id] ?? []) if (!cont.has(v)) cont.set(v, 0)
  return [...cont.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
    .map(([valor, n]) => ({ valor, n, rotulo: filtro.formatar ? filtro.formatar(valor) : valor }))
}

// Acesso aos três valores da dotação (números sempre presentes no JSON).
export const vAut = (r) => r.aut || 0
export const vIni = (r) => r.ini || 0
export const vCont = (r) => r.cont || 0

// Totais dos cards: Autorizado, Dotação Inicial, Contingenciamento e a variação
// (Autorizado − Inicial).
export function somaTotais(registros) {
  let aut = 0, ini = 0, cont = 0
  for (const r of registros) { aut += vAut(r); ini += vIni(r); cont += vCont(r) }
  return { aut, ini, cont, variacao: aut - ini }
}

// Núcleo: soma Autorizado (valor) e Inicial (pl) por categoria.
function agrupar(registros, chaveDe, base) {
  const mapa = new Map()
  for (const r of registros) {
    const chave = chaveDe(r)
    if (!mapa.has(chave)) mapa.set(chave, { ...base(r, chave), valor: 0, pl: 0 })
    const alvo = mapa.get(chave)
    alvo.valor += vAut(r)
    alvo.pl += vIni(r)
  }
  return mapa
}

const ordNum = (campo) => (a, b) =>
  String(a[campo]).localeCompare(String(b[campo]), 'pt-BR', { numeric: true })
const ordValor = (a, b) => (b.valor - a.valor) || (b.pl - a.pl)

// 1) Por Identificador de Resultado Primário (RP). Ordem numérica do código e
//    cor fixa por RP, como no PLOA.
export function porRP(registros) {
  const mapa = agrupar(registros, (r) => r.rp || '—', (r, k) => ({ rp: k }))
  return [...mapa.values()]
    .filter((d) => d.valor || d.pl)
    .sort(ordNum('rp'))
    .map((d) => ({ ...d, rotulo: RP_LABEL(d.rp), cor: corDoRP(d.rp) }))
}

// 2) Por GND. Poucas categorias, ordem numérica do código.
export function porGND(registros) {
  const mapa = agrupar(registros, (r) => r.gnd || '—', (r, k) => ({ gnd: k }))
  return [...mapa.values()]
    .filter((d) => d.valor || d.pl)
    .sort(ordNum('gnd'))
    .map((d) => ({ ...d, rotulo: `GND ${d.gnd}`, nome: GND_NOMES[d.gnd] || '', cor: corDoGND(d.gnd) }))
}

// 3) Por UO. Ordenada por valor (quem é maior).
export function porUO(registros) {
  const mapa = agrupar(registros, (r) => r.uoCod, (r) => ({ uoCod: r.uoCod, uo: r.uo, orgao: r.orgao }))
  return [...mapa.values()].filter((u) => u.valor || u.pl).sort(ordValor)
}

// 4) Por Ação. Lista completa, ordenada por valor (a paginação fica no gráfico).
export function acoesOrdenadas(registros) {
  const mapa = agrupar(registros, (r) => r.acaoCod || '—', (r) => ({ acaoCod: r.acaoCod || '—', acao: r.acao || '' }))
  return [...mapa.values()].filter((a) => a.valor || a.pl).sort(ordValor)
}

// 5) Total por Força (MD, Exército, Marinha, Aeronáutica), ordem fixa.
export function porForca(registros) {
  const porId = new Map(AGREGADOS.map((a) => [a.id, { ...a, valor: 0, pl: 0 }]))
  for (const r of registros) {
    const alvo = porId.get(r.orgao)
    if (!alvo) continue
    alvo.valor += vAut(r)
    alvo.pl += vIni(r)
  }
  return [...porId.values()].filter((a) => a.valor || a.pl)
}

// 6) Dotação Inicial × Autorizado por Força: o saldo (Autorizado − Inicial).
export function iniVsAutorizado(registros) {
  return porForca(registros).map((a) => ({
    ...a,
    ini: a.pl,
    aut: a.valor,
    delta: a.valor - a.pl,
    pct: variacao(a.pl, a.valor),
  }))
}

// 7) Por Fonte (Cod/Desc). Ordenada por valor decrescente.
export function porFonte(registros) {
  const mapa = agrupar(
    registros,
    (r) => r.fonte || r.fonteCod || '—',
    (r) => ({ fonteCod: r.fonteCod || '', fonte: r.fonte || r.fonteCod || '—' })
  )
  return [...mapa.values()].filter((f) => f.valor || f.pl).sort(ordValor)
}

export const anosExec = (registros) => [...new Set(registros.map((r) => r.ano))].sort()

// ------------------------------------------------- séries por exercício -----
// Usadas pela subaba "Histórico LOA", que ignora o filtro de Ano. Todas
// consolidam o AUTORIZADO (a leitura primária desta base).

// Resumo por exercício: Autorizado, Dotação Inicial, saldo (Aut − Inicial) e a
// variação do Autorizado sobre o exercício anterior.
export function resumoPorAnoExec(registros) {
  const anos = anosExec(registros)
  const porAno = new Map(anos.map((a) => [a, []]))
  for (const r of registros) porAno.get(r.ano)?.push(r)
  const linhas = anos.map((ano) => {
    const itens = porAno.get(ano)
    const aut = itens.reduce((s, r) => s + vAut(r), 0)
    const ini = itens.reduce((s, r) => s + vIni(r), 0)
    return { ano, aut, ini, delta: aut - ini, pctSaldo: variacao(ini, aut), linhas: itens.length }
  })
  return linhas.map((l, i) => ({
    ...l,
    variacao: i === 0 ? null : variacao(linhas[i - 1].aut, l.aut),
  }))
}

// Núcleo genérico "categoria × ano", consolidando o Autorizado.
function serieCatExec(registros, anos, chave, rotulo, extra = null) {
  const mapa = new Map()
  for (const r of registros) {
    const k = chave(r)
    if (k === '' || k == null) continue
    if (!mapa.has(k)) {
      mapa.set(k, { chave: k, rotulo: rotulo(r), valores: anos.map(() => 0), total: 0, ...(extra ? extra(r) : {}) })
    }
    const alvo = mapa.get(k)
    const i = anos.indexOf(r.ano)
    if (i < 0) continue
    const v = vAut(r)
    alvo.valores[i] += v
    alvo.total += v
  }
  return [...mapa.values()].filter((l) => l.total !== 0).sort((a, b) => b.total - a.total)
}

export function forcaPorAnoExec(registros) {
  const anos = anosExec(registros)
  const series = AGREGADOS.map((a) => {
    const valores = anos.map((ano) =>
      registros.filter((r) => r.ano === ano && r.orgao === a.id).reduce((s, r) => s + vAut(r), 0)
    )
    return { ...a, chave: a.id, valores, total: valores.reduce((s, v) => s + v, 0) }
  }).filter((s) => s.total !== 0)
  return { anos, series }
}

export function uoPorAnoExec(registros) {
  const anos = anosExec(registros)
  return { anos, series: serieCatExec(registros, anos, (r) => r.uoCod, (r) => `${r.uoCod} — ${r.uo}`) }
}

export function rpPorAnoExec(registros) {
  const anos = anosExec(registros)
  const series = serieCatExec(registros, anos, (r) => r.rp || '—', (r) => RP_LABEL(r.rp))
    .sort((a, b) => String(a.chave).localeCompare(String(b.chave), 'pt-BR', { numeric: true }))
    .map((s) => ({ ...s, cor: corDoRP(s.chave) }))
  return { anos, series }
}

export function gndPorAnoExec(registros) {
  const anos = anosExec(registros)
  const series = serieCatExec(registros, anos, (r) => r.gnd || '—', (r) => `GND ${r.gnd}`)
    .sort((a, b) => String(a.chave).localeCompare(String(b.chave), 'pt-BR', { numeric: true }))
    .map((s) => ({ ...s, cor: corDoGND(s.chave) }))
  return { anos, series }
}

export function acaoPorAnoExec(registros, n = Infinity) {
  const anos = anosExec(registros)
  const todas = serieCatExec(registros, anos, (r) => r.acaoCod || '—', (r) => `${r.acaoCod} — ${r.acao}`)
  return { anos, series: n === Infinity ? todas : todas.slice(0, n), total: todas.length }
}

// Fonte Grupo (Cod/Desc) por exercício — poucas categorias (Tesouro corrente,
// Tesouro exercícios anteriores, condicionados), boa para colunas empilhadas.
const COR_FGRUPO = {
  1: 'var(--serie-azul)',
  3: 'var(--serie-laranja)',
  9: 'var(--serie-violeta)',
}
export function fonteGrupoPorAno(registros) {
  const anos = anosExec(registros)
  const series = serieCatExec(
    registros, anos,
    (r) => r.fgrupoCod || r.fgrupo || '—',
    (r) => (r.fgrupo || r.fgrupoCod || '—').replace(/^\s*\S+\s*-\s*/, '') || (r.fgrupo || '—')
  )
    .sort((a, b) => String(a.chave).localeCompare(String(b.chave), 'pt-BR', { numeric: true }))
    .map((s) => ({ ...s, cor: COR_FGRUPO[s.chave] || 'var(--serie-aqua)' }))
  return { anos, series }
}
