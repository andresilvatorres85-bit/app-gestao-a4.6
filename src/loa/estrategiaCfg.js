// Persistência local das listas de mandato editáveis da Estratégia (ESPEC §4/§13).
// Editadas em CONFIGURAÇÕES › LOA e lidas pela aba Estratégia.
import {
  REMOVIDOS_MANDATO, WHITELIST_SEN_ATIVOS, NAO_REELEITOS, CARGOS_2027,
} from './estrategiaConfig.js'

export const LS_KEY = 'estrategia.config.v1'

export const carregarConfigLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export const salvarConfigLocal = (novo) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(novo)) } catch { /* modo privado */ }
}

export const removerConfigLocal = () => {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// Sobrescritas salvas → montarConfig. Listas ausentes (config salva antes de
// existirem) ficam com o padrão.
export const overDe = (c) => (c ? {
  removidos: c.removidos, whitelist: c.whitelist, naoReeleitos: c.naoReeleitos, cargos2027: c.cargos2027,
} : {})

// "NOME = CARGO" por linha ⇄ objeto { NOME: CARGO }.
export const cargosParaTexto = (o) => Object.entries(o).map(([n, c]) => `${n} = ${c}`).join('\n')
export const cargosDeTexto = (t) => Object.fromEntries(t.split('\n').map((l) => l.split('='))
  .filter((p) => p.length === 2 && p[0].trim() && p[1].trim())
  .map(([n, c]) => [n.trim().toUpperCase(), c.trim().toUpperCase()]))
export const listaDeTexto = (t) =>
  t.split('\n').map((s) => s.trim().toUpperCase()).filter(Boolean)

// Textos dos campos a partir da config salva (ou do padrão).
export const textosDe = (c) => ({
  removidos: (c?.removidos ?? REMOVIDOS_MANDATO).join('\n'),
  whitelist: (c?.whitelist ?? WHITELIST_SEN_ATIVOS).join('\n'),
  naoReeleitos: (c?.naoReeleitos ?? NAO_REELEITOS).join('\n'),
  cargos2027: cargosParaTexto(c?.cargos2027 ?? CARGOS_2027),
})
