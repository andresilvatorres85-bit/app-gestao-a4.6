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
    const k = `${r.ano}-${r.emenda}` // o número se repete entre exercícios
    if (!porEmenda.has(k)) {
      porEmenda.set(k, { emenda: r.emenda, valor: 0, oms: new Set(), objetos: new Set(), r0: r })
    }
    const e = porEmenda.get(k)
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
      // RP 6 (individual) antes do RP 7 (bancada).
      for (const rp of ['6', '7']) {
        const porEmenda = porRp.get(rp)
        if (!porEmenda) continue
        const linhas = [...porEmenda.values()]
          .sort((a, b) => (b.valor - a.valor) || a.emenda.localeCompare(b.emenda))
          .map((e, i) => ({
            ord: i + 1,
            emenda: e.emenda,
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

  // Demais órgãos (Marinha, Aeronáutica, Ministério da Defesa): sem OM, sem
  // objeto e sem C Mil A — só órgão → estado → RP, com ORD, EMENDA, VALOR e
  // PARLAMENTAR/BANCADA.
  const outros = impositivasOutrosOrgaos(registros)
  const anosTodos = [...new Set([...anos, ...outros.anos])].sort()

  return {
    anos: anosTodos,
    grupos,
    outros: outros.orgaos,
    totalGeral: grupos.reduce((s, g) => s + g.total, 0),
    qtd: grupos.reduce((s, g) => s + g.qtd, 0),
  }
}

const ORDEM_ORGAOS = ['MARINHA', 'AERONÁUTICA', 'MINISTÉRIO DA DEFESA']
const NOME_ORGAO = { MARINHA: 'Marinha', 'AERONÁUTICA': 'Aeronáutica', 'MINISTÉRIO DA DEFESA': 'Ministério da Defesa' }

function impositivasOutrosOrgaos(registros) {
  const impos = registros.filter((r) => !ehExercito(r) && r.orgao &&
    (String(r.rp) === '6' || String(r.rp) === '7'))
  const anos = [...new Set(impos.map((r) => r.ano))].sort()
  const idx = new Map() // orgao -> uf -> rp -> Map(emenda -> acumulador)
  for (const r of impos) {
    const org = r.orgao
    const uf = r.autorUF && r.autorUF !== 'NA' ? r.autorUF : '—'
    const rp = String(r.rp)
    if (!idx.has(org)) idx.set(org, new Map())
    const porUf = idx.get(org)
    if (!porUf.has(uf)) porUf.set(uf, new Map())
    const porRp = porUf.get(uf)
    if (!porRp.has(rp)) porRp.set(rp, new Map())
    const porEmenda = porRp.get(rp)
    const k = `${r.ano}-${r.emenda}`
    if (!porEmenda.has(k)) porEmenda.set(k, { emenda: r.emenda, valor: 0, r0: r })
    porEmenda.get(k).valor += r.valor || 0
  }
  const ordemOrg = (o) => { const i = ORDEM_ORGAOS.indexOf(o); return i === -1 ? ORDEM_ORGAOS.length : i }
  const orgaos = [...idx.keys()].sort((a, b) => ordemOrg(a) - ordemOrg(b) || a.localeCompare(b, 'pt-BR'))
    .map((org) => {
      const porUf = idx.get(org)
      const ufs = [...porUf.keys()].sort((a, b) => (UF_NOME[a] || a).localeCompare(UF_NOME[b] || b, 'pt-BR'))
      const grupos = ufs.map((uf) => {
        const porRp = porUf.get(uf)
        const tabelas = ['6', '7'].filter((rp) => porRp.has(rp)).map((rp) => {
          const linhas = [...porRp.get(rp).values()]
            .sort((a, b) => (b.valor - a.valor) || a.emenda.localeCompare(b.emenda))
            .map((e, i) => ({
              ord: i + 1,
              emenda: e.emenda,
              valor: e.valor,
              autor: rp === '7' ? (UF_NOME[uf] || uf) : rotuloParlamentar(e.r0),
            }))
          return {
            rp,
            rotulo: rp === '7' ? 'Emenda de Bancada (RP 7)' : 'Emenda Individual (RP 6)',
            colAutor: rp === '7' ? 'BANCADA' : 'PARLAMENTAR',
            linhas,
            total: linhas.reduce((s, l) => s + l.valor, 0),
            qtd: linhas.length,
          }
        })
        return {
          uf, ufNome: UF_NOME[uf] || (uf === '—' ? 'Sem UF' : uf), tabelas,
          total: tabelas.reduce((s, t) => s + t.total, 0),
        }
      })
      return { orgao: org, orgaoNome: NOME_ORGAO[org] || org, grupos }
    })
  return { anos, orgaos }
}

// ---------------------------------------------------------------------------
// Emendas de COMISSÃO do Exército — slides ao final da exportação por estado.
// Comissão não tem UF: o bloco é a comissão (autor), com a Casa ao lado, e uma
// tabela por RP. Cada linha é uma emenda (valores somados), com a ação
// orçamentária e a OM (ou, sem OM, a UO).
const CASA_COMISSAO = {
  'COMISSÃO CÂMARA DOS DEPUTADOS': 'Câmara dos Deputados',
  'COMISSÃO SENADO FEDERAL': 'Senado Federal',
  'COMISSÃO MISTA DO CONGRESSO': 'Congresso Nacional (mista)',
}
const ehComissao = (r) =>
  String(r.modalidade || '').toUpperCase().startsWith('COMISS') ||
  String(r.autorTipo || '').toUpperCase().startsWith('COMISS')

export function emendasComissaoExercito(registros) {
  const regs = registros.filter((r) => ehExercito(r) && ehComissao(r))
  const anos = [...new Set(regs.map((r) => r.ano))].sort()
  const idx = new Map() // comissão -> rp -> Map(emenda -> acumulador)
  for (const r of regs) {
    const chave = `${r.autorTipo || ''}|${r.autor || '—'}`
    if (!idx.has(chave)) idx.set(chave, { autor: r.autor || '—', autorTipo: r.autorTipo || '', porRp: new Map() })
    const g = idx.get(chave)
    const rp = String(r.rp || '—')
    if (!g.porRp.has(rp)) g.porRp.set(rp, new Map())
    const porEmenda = g.porRp.get(rp)
    const k = `${r.ano}-${r.emenda}`
    if (!porEmenda.has(k)) porEmenda.set(k, { emenda: r.emenda, valor: 0, acoes: new Set(), oms: new Set(), uos: new Set() })
    const e = porEmenda.get(k)
    e.valor += r.valor || 0
    if (r.acao) e.acoes.add(r.acao)
    if (r.om) e.oms.add(r.om)
    if (r.uo) e.uos.add(r.uo)
  }
  const grupos = [...idx.values()].map((g) => {
    const tabelas = [...g.porRp.keys()].sort().map((rp) => {
      const linhas = [...g.porRp.get(rp).values()]
        .sort((a, b) => (b.valor - a.valor) || a.emenda.localeCompare(b.emenda))
        .map((e, i) => ({
          ord: i + 1,
          emenda: e.emenda,
          acao: [...e.acoes].join(' / '),
          om: [...(e.oms.size ? e.oms : e.uos)].join(' / '),
          valor: e.valor,
        }))
      return {
        rp,
        rotulo: `Emenda de Comissão (RP ${rp})`,
        linhas,
        total: linhas.reduce((s, l) => s + l.valor, 0),
      }
    })
    return {
      nome: g.autor,
      casa: CASA_COMISSAO[String(g.autorTipo).toUpperCase()] || g.autorTipo,
      tabelas,
      total: tabelas.reduce((s, t) => s + t.total, 0),
    }
  }).sort((a, b) => (b.total - a.total) || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { anos, grupos, totalGeral: grupos.reduce((s, g) => s + g.total, 0) }
}
