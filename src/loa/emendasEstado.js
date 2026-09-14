// ---------------------------------------------------------------------------
// "Emendas por estado" — a exportação em TABELAS da subaba "Emendas LOA".
//
// Espelha o modelo do arquivo de referência (A4_Valores_emendas_PLOA_GERAL):
// emendas IMPOSITIVAS do EXÉRCITO (RP 6 individual + RP 7 de bancada),
// agrupadas por Comando Militar de Área (C Mil A) → Estado (UF) → modalidade.
// Cada tabela traz ORD, OM, OBJETO, VALOR (R$) e o PARLAMENTAR (RP 6) ou a
// BANCADA (RP 7), com uma linha de TOTAL. O valor é o AUTORIZADO (base de
// execução), respeitando os filtros da barra.
// ---------------------------------------------------------------------------
import { ehExercito, C_MIL_A_NOME } from './dados.js'

// Ordem dos comandos igual à do arquivo de referência (Amazônia → Sul).
const CMILA_ORDEM = ['CMA', 'CMAO', 'CMNE', 'CMO', 'CMP', 'CML', 'CMSE', 'CMS']

// Nome por extenso das UF (o cabeçalho de cada estado e o rótulo da bancada).
export const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
}

const SIGLA_CASA = { 'DEPUTADO FEDERAL': 'Dep', SENADOR: 'Sen' }

// Nome próprio em caixa de título ("JOÃO CAPIBERIBE" -> "João Capiberibe"),
// preservando conectores em minúsculas.
const CONECTORES = new Set(['de', 'do', 'da', 'dos', 'das', 'e'])
function nomeProprio(s) {
  return String(s || '')
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((w, i) => (i > 0 && CONECTORES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim()
}

// Rótulo do parlamentar como no arquivo: "Dep Fulano de Tal (PL)".
function rotuloParlamentar(r) {
  const sigla = SIGLA_CASA[r.autorTipo] || ''
  const nome = nomeProprio(r.autor)
  const partido = r.partido && r.partido !== '—' ? ` (${r.partido})` : ''
  return `${sigla ? sigla + ' ' : ''}${nome}${partido}`.trim()
}

// Agrupa a lista já filtrada da subaba em C Mil A → UF → modalidade.
// `registros` são as emendas da execução (execucao.emendas) já com os filtros
// da barra aplicados. Aqui aplicamos o recorte do modelo: só Exército, só
// impositivas (RP 6 e RP 7).
export function emendasImpositivasPorEstado(registros) {
  const impos = registros.filter((r) => ehExercito(r) && (String(r.rp) === '6' || String(r.rp) === '7'))
  const anos = [...new Set(impos.map((r) => r.ano))].sort()

  // Índice: cmila -> uf -> rp -> Map(emenda -> acumulador)
  const idx = new Map()
  for (const r of impos) {
    const cmila = r.cmila || '—'
    const uf = r.autorUF || '—'
    const rp = String(r.rp)
    if (!idx.has(cmila)) idx.set(cmila, new Map())
    const porUf = idx.get(cmila)
    if (!porUf.has(uf)) porUf.set(uf, new Map())
    const porRp = porUf.get(uf)
    if (!porRp.has(rp)) porRp.set(rp, new Map())
    const porEmenda = porRp.get(rp)
    if (!porEmenda.has(r.emenda)) {
      porEmenda.set(r.emenda, { emenda: r.emenda, valor: 0, oms: new Set(), objetos: new Set(), r0: r })
    }
    const e = porEmenda.get(r.emenda)
    e.valor += r.valor || 0
    if (r.om) e.oms.add(r.om)
    if (r.objeto) e.objetos.add(r.objeto)
  }

  const ordemCmila = (c) => {
    const i = CMILA_ORDEM.indexOf(c)
    return i === -1 ? CMILA_ORDEM.length : i
  }
  const cmilas = [...idx.keys()].sort((a, b) => ordemCmila(a) - ordemCmila(b) || a.localeCompare(b, 'pt-BR'))

  const grupos = []
  for (const cmila of cmilas) {
    const porUf = idx.get(cmila)
    const ufs = [...porUf.keys()].sort((a, b) =>
      (UF_NOME[a] || a).localeCompare(UF_NOME[b] || b, 'pt-BR'))
    for (const uf of ufs) {
      const porRp = porUf.get(uf)
      const tabelas = []
      // RP 7 (bancada) antes do RP 6 (individual), como no arquivo.
      for (const rp of ['7', '6']) {
        const porEmenda = porRp.get(rp)
        if (!porEmenda) continue
        const linhas = [...porEmenda.values()]
          .sort((a, b) => (b.valor - a.valor) || a.emenda.localeCompare(b.emenda))
          .map((e, i) => ({
            ord: i + 1,
            om: [...e.oms].join(' / '),
            objeto: [...e.objetos].join(' / '),
            valor: e.valor,
            autor: rp === '7' ? (UF_NOME[uf] || uf) : rotuloParlamentar(e.r0),
          }))
        if (!linhas.length) continue
        tabelas.push({
          rp,
          rotulo: rp === '7' ? 'Emenda de Bancada (RP 7)' : 'Emenda Individual (RP 6)',
          colAutor: rp === '7' ? 'BANCADA' : 'PARLAMENTAR',
          linhas,
          total: linhas.reduce((s, l) => s + l.valor, 0),
          qtd: linhas.length,
        })
      }
      if (!tabelas.length) continue
      grupos.push({
        cmila,
        cmilaNome: C_MIL_A_NOME[cmila] || cmila,
        uf,
        ufNome: UF_NOME[uf] || uf,
        tabelas,
        total: tabelas.reduce((s, t) => s + t.total, 0),
        qtd: tabelas.reduce((s, t) => s + t.qtd, 0),
      })
    }
  }

  return {
    anos,
    grupos,
    totalGeral: grupos.reduce((s, g) => s + g.total, 0),
    qtd: grupos.reduce((s, g) => s + g.qtd, 0),
  }
}
