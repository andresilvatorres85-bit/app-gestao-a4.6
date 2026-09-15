import { useEffect, useMemo, useState } from 'react'
import {
  carregarDados, filtrarRegistros, opcoesDoFiltro, agruparPorEmenda,
  resumo, valorPorRP, valorImpositivas, impositivasPorCMilA, topAutores, valorPorPartido,
  resumoPorAno, rpPorAno, modalidadePorAno, impositivasPorAno,
  forcaPorAno, cmilaPorAno, partidosPorAno, autoresRecorrentes,
  FILTROS, fmtBRL, fmtInt, fmtMilhoes, fmtPct, fmtCompacto,
} from './dados.js'
// As agregações do PLOA entram com prefixo `ploa`: vários nomes coincidem com
// os das emendas (`porRP`, `resumoPorAno`) porque respondem à mesma pergunta em
// bases diferentes — e é justamente por isso que precisam ficar distinguíveis
// à leitura, dentro de um arquivo que usa os dois conjuntos lado a lado.
import {
  FILTROS_PLOA, filtrarPLOA, opcoesPLOA,
  somaFases as ploaSomaFases,
  porAgregado as ploaPorAgregado,
  porUO as ploaPorUO,
  porRP as ploaPorRPFase,
  ciclos as ploaCiclos,
  plVsAutografo as ploaPlVsAutografo,
  acoesOrdenadas as ploaAcoesOrdenadas,
  porGND as ploaPorGND,
  resumoPorAno as ploaResumoPorAno,
  agregadoPorAno as ploaAgregadoPorAno,
  uoPorAno as ploaUoPorAno,
  rpPorAno as ploaRpPorAno,
  gndPorAno as ploaGndPorAno,
  acaoPorAno as ploaAcaoPorAno,
  ciclosPorAno as ploaCiclosPorAno,
  autografoIndisponivel as ploaAutografoIndisponivel,
  IDX_PL, IDX_AUTOGRAFO, fmtBi, FASE_ROTULOS,
} from './ploa.js'
import { useUrlState } from './useUrlState.js'
import {
  exportarPPTX, exportarPPTXHistorico, exportarSlidePPTX,
  exportarPPTXPLOA, exportarPPTXHistoricoPLOA,
  exportarPPTXExec, exportarPPTXHistoricoExec, exportarPPTXEmendasEstado,
} from './pptx.js'
import { emendasImpositivasPorEstado } from './emendasEstado.js'
import { exportarFolhaPDF } from './pdf.js'
import MultiSelect from './components/MultiSelect.jsx'
import BotaoPNG from './components/BotaoPNG.jsx'
import BotaoPPTX from './components/BotaoPPTX.jsx'
import GraficoPizza from './components/GraficoPizza.jsx'
import GraficoBarras from './components/GraficoBarras.jsx'
import GraficoBarrasSimples from './components/GraficoBarrasSimples.jsx'
import GraficoPartidos from './components/GraficoPartidos.jsx'
import CartaoEmenda from './components/CartaoEmenda.jsx'
import AbaInconsistencias from './components/AbaInconsistencias.jsx'
import AbaHistorico from './components/AbaHistorico.jsx'
import AbaPLOA from './components/AbaPLOA.jsx'
import AbaHistoricoPLOA from './components/AbaHistoricoPLOA.jsx'
import AbaExecucao from './components/AbaExecucao.jsx'
import AbaHistoricoExec from './components/AbaHistoricoExec.jsx'
import AbaDashboardEmendasExec from './components/AbaDashboardEmendasExec.jsx'
import AbaEmendasExec from './components/AbaEmendasExec.jsx'
import AbaHistoricoEmendasExec from './components/AbaHistoricoEmendasExec.jsx'
import {
  FolhaDashboardEmendasExec, FolhaHistoricoEmendasExec,
  FolhaEmendasEstado, FolhaInconsistencias,
} from './components/FolhaPDFExec.jsx'
import {
  filtrarExecucao, opcoesExecucao, FILTROS_EXEC,
  somaTotais, porRP as execPorRP, porGND as execPorGND, porUO as execPorUO,
  acoesOrdenadas as execAcoes, porForca as execPorForca,
  iniVsAutorizado as execIniAut, porFonte as execPorFonte,
  resumoPorAnoExec, forcaPorAnoExec, uoPorAnoExec, rpPorAnoExec,
  gndPorAnoExec, acaoPorAnoExec, fonteGrupoPorAno,
  contencaoPorAcao, emendasContencao,
} from './execucao.js'

// Subabas de emenda da seção EXECUÇÃO LOA (usam a base execucao.emendas, com os
// filtros completos de emenda). As demais subabas de execução são de dotação.
const EXEC_EMENDAS_ABAS = new Set([
  'exec-emendas-dashboard', 'exec-emendas', 'exec-emendas-historico',
])

// Navegação em dois níveis. Cada seção responde por UMA base de dados:
// "Resultado LEXOR" pelas emendas apresentadas (`Historico_emendas_apresentadas
// .xlsx`) e "PLOA" pelas despesas por fase de elaboração
// (`PLOA_Despesas_Elaboracao.xlsx`).
//
// O id da SUBABA continua sendo o único valor escrito na URL (`?aba=…`), e a
// seção é deduzida dele. Isso preserva todos os links já compartilhados —
// `?aba=historico` continua abrindo o Histórico das emendas — sem precisar de
// um parâmetro novo nem de migração.
const SECOES = [
  {
    id: 'lexor',
    rotulo: 'Resultado LEXOR',
    descricao: 'Emendas parlamentares apresentadas ao PLOA',
    subabas: [
      { id: 'dashboard', rotulo: 'Dashboard' },
      { id: 'emendas', rotulo: 'Emendas' },
      { id: 'historico', rotulo: 'Histórico' },
      { id: 'inconsistencias', rotulo: 'Inconsistências' },
    ],
  },
  {
    id: 'ploa',
    rotulo: 'PLOA',
    descricao: 'Despesas do órgão 52000 por fase de elaboração',
    subabas: [
      { id: 'ploa-dashboard', rotulo: 'Dashboard PLOA' },
      { id: 'ploa-historico', rotulo: 'Histórico PLOA' },
    ],
  },
  {
    id: 'execucao',
    rotulo: 'EXECUÇÃO LOA',
    descricao: 'Despesa por execução do órgão 52000 (LOA)',
    subabas: [
      { id: 'exec-dashboard', rotulo: 'Dashboard LOA' },
      { id: 'exec-historico', rotulo: 'Histórico LOA' },
      { id: 'exec-emendas-dashboard', rotulo: 'Dashboard Emendas' },
      { id: 'exec-emendas', rotulo: 'Emendas LOA' },
      { id: 'exec-emendas-historico', rotulo: 'Histórico Emendas' },
    ],
  },
]
const SECAO_DA_ABA = Object.fromEntries(
  SECOES.flatMap((s) => s.subabas.map((sub) => [sub.id, s.id]))
)
const PRIMEIRA_SUBABA = Object.fromEntries(SECOES.map((s) => [s.id, s.subabas[0].id]))

export default function LoaApp() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const {
    aba, detalhe, filtros,
    irParaAba, abrirDetalhe, setFiltro, limparFiltros, definirPadrao, noPadrao,
  } = useUrlState()

  useEffect(() => {
    carregarDados().then(setDados).catch((e) => setErro(e.message))
  }, [])

  // Filtros com que o app abre. O ano vem do próprio dado — acrescentar 2027 à
  // planilha basta para o app abrir em 2027 — e o Órgão abre no Exército, que é
  // o recorte de trabalho do dia a dia. Sem padrão de ano o Dashboard somaria
  // todos os exercícios de uma vez, que não é a pergunta que alguém faz ao
  // abrir um painel do PLOA. Os dois voltam nesses valores no "Limpar filtros"
  // e são sobrepostos por qualquer link compartilhado.
  useEffect(() => {
    if (!dados?.anoCorrente) return
    definirPadrao('ano', [dados.anoCorrente])
    definirPadrao('orgao', ['EXÉRCITO'])
  }, [dados, definirPadrao])

  const registros = dados?.registros ?? []
  // Seção ativa, deduzida da subaba — a URL guarda só a subaba (ver SECOES).
  const secaoId = SECAO_DA_ABA[aba] ?? 'lexor'
  const secao = SECOES.find((s) => s.id === secaoId)

  // ------------------------------------------------------------ base PLOA ---
  // Base independente da das emendas: outro arquivo, outro escopo (o órgão
  // 52000 inteiro) e outra unidade (a dotação). Um `dados.json` gerado antes
  // desta versão não traz o bloco — daí o objeto vazio de reserva, que faz a
  // seção PLOA aparecer vazia em vez de derrubar o app.
  const ploa = dados?.ploa ?? { anos: [], registros: [], fasesVazias: {}, anosDuplicados: [] }
  const ploaRegistros = ploa.registros ?? []
  const ploaFiltrados = useMemo(
    () => filtrarPLOA(ploaRegistros, filtros), [ploaRegistros, filtros]
  )
  // Os painéis que comparam as Forças entre si ignoram o filtro de Órgão —
  // com o padrão do app (Exército) sobrariam uma barra e nenhuma comparação.
  const ploaSemOrgao = useMemo(
    () => filtrarPLOA(ploaRegistros, filtros, 'orgao'), [ploaRegistros, filtros]
  )
  // O Histórico PLOA ignora o Ano (é o que ele compara)…
  const ploaSemAno = useMemo(
    () => filtrarPLOA(ploaRegistros, filtros, 'ano'), [ploaRegistros, filtros]
  )
  // …e o painel por Força dele ignora os dois. Encadear duas chamadas não
  // substitui a lista: a primeira já teria removido o que a segunda precisa ver.
  const ploaSemAnoNemOrgao = useMemo(
    () => filtrarPLOA(ploaRegistros, filtros, ['ano', 'orgao']), [ploaRegistros, filtros]
  )

  // ------------------------------------------------------ base EXECUÇÃO LOA ---
  // Terceira base independente: a despesa por execução do órgão 52000. Um
  // dados.json anterior a esta versão não traz o bloco — o objeto vazio de
  // reserva faz a seção aparecer vazia em vez de derrubar o app.
  const execucao = dados?.execucao ?? { anos: [], registros: [] }
  const execRegistros = execucao.registros ?? []
  const execFiltrados = useMemo(
    () => filtrarExecucao(execRegistros, filtros), [execRegistros, filtros]
  )
  // O painel "Total por Força" e o "Inicial × Autorizado" comparam as Forças —
  // ignoram o filtro de Órgão, senão sob o padrão do app (Exército) sobraria uma.
  const execSemOrgao = useMemo(
    () => filtrarExecucao(execRegistros, filtros, 'orgao'), [execRegistros, filtros]
  )
  // A subaba Histórico LOA compara exercícios — ignora o Ano; e o painel por
  // Força dela ignora também o Órgão, pelo mesmo motivo do PLOA.
  const execSemAno = useMemo(
    () => filtrarExecucao(execRegistros, filtros, 'ano'), [execRegistros, filtros]
  )
  const execSemAnoNemOrgao = useMemo(
    () => filtrarExecucao(execRegistros, filtros, ['ano', 'orgao']), [execRegistros, filtros]
  )
  // Emendas da execução no MESMO recorte do Dashboard LOA (filtros de dotação),
  // para o gráfico de "Emendas parlamentares — contenção de gastos".
  const execEmDash = useMemo(
    () => filtrarExecucao(execucao.emendas ?? [], filtros), [execucao, filtros]
  )

  // Emendas da execução (base própria: execucao.emendas, no formato das emendas
  // apresentadas). Usa os filtros completos de emenda (filtrarRegistros).
  const execEmRegistros = execucao.emendas ?? []
  const execEmFiltrados = useMemo(
    () => filtrarRegistros(execEmRegistros, filtros), [execEmRegistros, filtros]
  )
  const execEmSemAno = useMemo(
    () => filtrarRegistros(execEmRegistros, filtros, 'ano'), [execEmRegistros, filtros]
  )
  const execEmSemAnoNemOrgao = useMemo(
    () => filtrarRegistros(execEmRegistros, filtros, ['ano', 'orgao']), [execEmRegistros, filtros]
  )
  const emExecEmendas = EXEC_EMENDAS_ABAS.has(aba)

  const filtrados = useMemo(() => filtrarRegistros(registros, filtros), [registros, filtros])
  // A aba Histórico compara exercícios — ela é a única que ignora o filtro de Ano.
  const semAno = useMemo(() => filtrarRegistros(registros, filtros, 'ano'), [registros, filtros])
  // …e o painel "Por Força" dela ignora também o Órgão, pelo mesmo motivo: é o
  // que ele compara.
  const semAnoNemOrgao = useMemo(
    () => filtrarRegistros(registros, filtros, ['ano', 'orgao']),
    [registros, filtros]
  )
  const grupos = useMemo(() => agruparPorEmenda(filtrados), [filtrados])
  const gruposIncons = useMemo(() => grupos.filter((g) => g.inconsistencias.length > 0), [grupos])
  const stats = useMemo(() => resumo(filtrados), [filtrados])
  const porRP = useMemo(() => valorPorRP(filtrados), [filtrados])
  const impositivas = useMemo(() => valorImpositivas(filtrados), [filtrados])
  const totalImpositivas = useMemo(() => impositivas.reduce((s, d) => s + d.valor, 0), [impositivas])
  const impCMilA = useMemo(() => impositivasPorCMilA(filtrados), [filtrados])
  const autoresTop = useMemo(() => topAutores(filtrados, 10), [filtrados])
  const partidos = useMemo(() => valorPorPartido(filtrados), [filtrados])
  // Filtros aplicáveis à subaba em tela. Numa dotação orçamentária não existe
  // partido, autor nem C Mil A — esses descrevem uma emenda parlamentar. Se a
  // barra mantivesse todos, bastaria alguém selecionar um partido na seção das
  // emendas e passar para o PLOA para a aba inteira zerar sem explicação.
  //
  // "Emendas Autógrafo" é a exceção dentro da seção PLOA: os cartões dela SÃO
  // emendas, e os filtros de emenda continuam valendo. Esconder a barra cheia
  // ali faria o partido selecionado na outra seção seguir filtrando a lista sem
  // aparecer em lugar nenhum.
  const filtrosVisiveis =
    secaoId === 'execucao' ? (emExecEmendas ? FILTROS : FILTROS_EXEC)
      : secaoId === 'ploa' && aba !== 'ploa-emendas' ? FILTROS_PLOA
        : FILTROS
  // "Limpar filtros" só aparece se algo estiver fora do padrão — e olha apenas
  // os filtros da tela, senão o botão surgiria no PLOA por causa de um filtro
  // de partido que ali nem está sendo aplicado.
  const temFiltro = filtrosVisiveis.some((f) => !noPadrao(f.id, filtros[f.id]))

  if (erro) {
    return <main className="carregando">Erro ao carregar os dados: {erro}</main>
  }
  if (!dados) {
    return <main className="carregando">Carregando dados…</main>
  }

  const heroi = fmtCompacto(stats.valorTotal)
  const impositivo = fmtCompacto(totalImpositivas)
  const pctImpositivas = stats.valorTotal ? (totalImpositivas / stats.valorTotal) * 100 : 0
  const totalCMilA = impCMilA.reduce((s, d) => s + d.total, 0)
  const totalAutores = autoresTop.reduce((s, d) => s + d.valor, 0)
  const totalPartidos = partidos.reduce((s, d) => s + d.valor, 0)
  // Os 10 maiores autores são parlamentares individuais, e emenda individual é
  // RP6 — por isso a base de comparação do percentual é o total de RP6.
  const totalRP6 = porRP.find((d) => String(d.rp) === '6')?.valor ?? 0
  const pctAutoresRP6 = totalRP6 ? (totalAutores / totalRP6) * 100 : 0

  // Texto do recorte: vai no rodapé de cada PNG e no cabeçalho da folha A4,
  // para que a imagem/página exportada diga sozinha o que está mostrando.
  // O Ano sai na frente e sempre — é o recorte que muda mais e o que faz uma
  // imagem solta ser interpretável meses depois.
  const anosSel = [...(filtros.ano ?? [])].sort()
  const anoTexto = anosSel.length
    ? `Exercício ${anosSel.join(', ')}`
    : `Todos os exercícios (${(dados.anos ?? []).join(', ')})`
  const filtrosAtivos = FILTROS
    .filter((f) => f.id !== 'ano' && filtros[f.id]?.size > 0)
    .map((f) => `${f.rotulo}: ${[...filtros[f.id]].join(', ')}`)
  const recorte = filtrosAtivos.length
    ? `${anoTexto} · filtros — ${filtrosAtivos.join(' · ')}`
    : `${anoTexto} · sem outros filtros`
  const escopo = 'Ministério da Defesa · Órgão 52000 · Setor Defesa'
  const contextoExport =
    `Emendas ao PLOA — ${escopo}. ${recorte}. ` +
    `${fmtInt(stats.qtdEmendas)} emendas · ${fmtBRL(stats.valorTotal)}. ` +
    `Extraído em ${new Date().toLocaleString('pt-BR')}.`
  // A aba Histórico ignora o filtro de Ano, então o rodapé dos PNG dela
  // precisa dizer isso — senão a imagem sai carimbada com um ano só.
  const recorteHistorico = filtrosAtivos.length
    ? `Todos os exercícios (${(dados.anos ?? []).join(', ')}) · filtros — ${filtrosAtivos.join(' · ')}`
    : `Todos os exercícios (${(dados.anos ?? []).join(', ')}) · sem outros filtros`
  const contextoHistorico =
    `Emendas ao PLOA — ${escopo}. ${recorteHistorico}. ` +
    `${fmtInt(new Set(semAno.map((r) => r.emenda)).size)} emendas · ` +
    `${fmtBRL(semAno.reduce((s, r) => s + r.valor, 0))}. ` +
    `Extraído em ${new Date().toLocaleString('pt-BR')}.`

  // Carga do PPTX: os mesmos números que estão na tela, já filtrados. Montada
  // no clique (e não a cada render) para não custar nada enquanto ninguém
  // exporta — e para carimbar a hora da exportação, não a do render.
  const cargaPPTX = () => ({
      titulo: 'EMENDAS PARLAMENTARES APRESENTADAS AO PLOA',
      escopo,
      recorte,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      stats,
      qtdRegistros: filtrados.length,
      totalImpositivas,
      pctImpositivas,
      porRP,
      impositivas,
      autores: autoresTop,
      totalAutores,
      pctAutoresRP6,
      cmila: impCMilA,
      totalCMilA,
      partidos,
      totalPartidos,
  })
  const baixarPPTX = () => exportarPPTX(cargaPPTX())
  const baixarSlide = (id) => exportarSlidePPTX(cargaPPTX(), id)

  // Carga do PPTX da aba Histórico. Montada no clique, como a do Dashboard —
  // as agregações só rodam quando alguém exporta de fato. As séries saem na
  // mesma ordem de `anos`, que é a ordem dos eixos e das colunas das tabelas.
  const cargaHistorico = () => {
    const porAno = resumoPorAno(semAno)
    const serie = (campo) => porAno.map((a) => a[campo])
    return {
      titulo: 'EMENDAS PARLAMENTARES APRESENTADAS AO PLOA',
      escopo,
      recorte: recorteHistorico,
      recorteForca: `${recorteHistorico} · painel sem o filtro de Órgão`,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      stats: resumo(semAno),
      anos: porAno.map((a) => a.ano),
      serieValor: serie('valor'),
      serieEmendas: serie('qtdEmendas'),
      serieParlamentares: serie('qtdParlamentares'),
      serieImpositivo: serie('impositivo'),
      totalPeriodo: porAno.reduce((s, a) => s + a.valor, 0),
      impositivasPorAno: impositivasPorAno(semAno).series,
      rpPorAno: rpPorAno(semAno).series,
      modalidadePorAno: modalidadePorAno(semAno).series,
      forcaPorAno: forcaPorAno(semAnoNemOrgao),
      cmilaPorAno: cmilaPorAno(semAno),
      partidosPorAno: partidosPorAno(semAno, 12),
      autoresPorAno: autoresRecorrentes(semAno, 12),
    }
  }
  const baixarPPTXHistorico = () => exportarPPTXHistorico(cargaHistorico())
  const baixarSlideHistorico = (id) => exportarSlidePPTX(cargaHistorico(), id)

  // ------------------------------------------------ exportações da seção PLOA
  // O recorte impresso no rodapé só cita os filtros que a seção PLOA aplica de
  // fato — carimbar "Partido: PL" num painel que ignora o partido tornaria a
  // imagem, sozinha, enganosa.
  const filtrosAtivosPLOA = FILTROS_PLOA
    .filter((f) => f.id !== 'ano' && filtros[f.id]?.size > 0)
    .map((f) => `${f.rotulo}: ${[...filtros[f.id]].join(', ')}`)
  const anosPloaEmTela = [...new Set(ploaFiltrados.map((r) => r.ano))].sort()
  // Início do rito: o(s) exercício(s) em tela ainda não têm autógrafo na
  // planilha. Vale para o Dashboard (respeita o Ano). Consolida os painéis e as
  // exportações pelo PL e exibe o autógrafo em branco.
  const semAutPLOA = ploaAutografoIndisponivel(ploa.fasesVazias ?? {}, anosPloaEmTela)
  const anoTextoPLOA = anosPloaEmTela.length
    ? `Exercício ${anosPloaEmTela.join(', ')}`
    : `Todos os exercícios (${(ploa.anos ?? []).join(', ')})`
  const recortePLOA = filtrosAtivosPLOA.length
    ? `${anoTextoPLOA} · filtros — ${filtrosAtivosPLOA.join(' · ')}`
    : `${anoTextoPLOA} · sem outros filtros`
  const recorteHistPLOA = filtrosAtivosPLOA.length
    ? `Todos os exercícios (${(ploa.anos ?? []).join(', ')}) · filtros — ${filtrosAtivosPLOA.join(' · ')}`
    : `Todos os exercícios (${(ploa.anos ?? []).join(', ')}) · sem outros filtros`
  // Textos que a folha A4 imprime no cabeçalho de cada subaba do PLOA. O
  // Dashboard destaca o Órgão (é o recorte que o painel aplica); o Histórico,
  // que ignora o Ano, discrimina todos os filtros selecionados.
  // O Dashboard respeita o filtro de Ano (é o exercício em foco), então o seu
  // cabeçalho discrimina TODOS os filtros aplicados, o Ano incluído (rotulado
  // como "Exercício"). O Histórico ignora o Ano e lista só os demais.
  const filtrosDashSelec = FILTROS_PLOA
    .filter((f) => filtros[f.id]?.size > 0)
    .map((f) => {
      const rot = f.id === 'ano' ? 'Exercício' : f.rotulo
      const vals = [...filtros[f.id]].map((v) => (f.formatar ? f.formatar(v) : v)).join(', ')
      return `${rot}: ${vals}`
    })
  const filtrosTextoDashPLOA = filtrosDashSelec.length
    ? filtrosDashSelec.join(' · ')
    : 'Todos os órgãos e exercícios do 52000 (sem filtros)'
  const filtrosTextoHistPLOA = filtrosAtivosPLOA.length
    ? filtrosAtivosPLOA.join(' · ')
    : 'sem filtros aplicados (todos os órgãos e exercícios)'
  const escopoPLOA = 'Ministério da Defesa · Órgão 52000 · todos os setores'
  const totaisPLOA = ploaSomaFases(ploaFiltrados)
  const contextoPLOA =
    `PLOA — despesas por fase de elaboração — ${escopoPLOA}. ${recortePLOA}. ` +
    `${fmtInt(ploaFiltrados.length)} dotações · ` +
    (semAutPLOA
      ? `PL ${fmtBi(totaisPLOA[IDX_PL])} (autógrafo ainda não na planilha)`
      : `autógrafo ${fmtBi(totaisPLOA[IDX_AUTOGRAFO])}`) +
    `. Extraído em ${new Date().toLocaleString('pt-BR')}.`
  const contextoHistPLOA =
    `PLOA — despesas por fase de elaboração — ${escopoPLOA}. ${recorteHistPLOA}. ` +
    `${fmtInt(ploaSemAno.length)} dotações. ` +
    `Extraído em ${new Date().toLocaleString('pt-BR')}.`

  // ---------------------------------------------- contexto da EXECUÇÃO LOA ---
  const anosExecEmTela = [...new Set(execFiltrados.map((r) => r.ano))].sort()
  const escopoExec = 'Ministério da Defesa · Órgão 52000 · execução da LOA'
  const anoTextoExec = anosExecEmTela.length
    ? `Exercício ${anosExecEmTela.join(', ')}`
    : `Todos os exercícios (${(execucao.anos ?? []).join(', ')})`
  const contextoExec =
    `Execução da LOA — despesa por dotação — ${escopoExec}. ${anoTextoExec}. ` +
    `${fmtInt(execFiltrados.length)} dotações. ` +
    `Extraído em ${new Date().toLocaleString('pt-BR')}.`
  const contextoHistExec =
    `Execução da LOA — histórico dos exercícios — ${escopoExec}. ` +
    `Todos os exercícios (${(execucao.anos ?? []).join(', ')}). ` +
    `${fmtInt(execSemAno.length)} dotações. ` +
    `Extraído em ${new Date().toLocaleString('pt-BR')}.`

  // ------------------------------------- contexto das emendas da EXECUÇÃO LOA
  const anosExecEmEmTela = [...new Set(execEmFiltrados.map((r) => r.ano))].sort()
  const anoTextoExecEm = anosExecEmEmTela.length
    ? `Exercício ${anosExecEmEmTela.join(', ')}`
    : `Todos os exercícios (${(execucao.emendasAnos ?? []).join(', ')})`
  const contextoExecEm =
    `Emendas da execução da LOA (autorizado) — ${escopoExec}. ${anoTextoExecEm}. ` +
    `${fmtInt(execEmFiltrados.length)} registros. Extraído em ${new Date().toLocaleString('pt-BR')}.`
  const contextoExecEmHist =
    `Emendas da execução da LOA (autorizado) — histórico — ${escopoExec}. ` +
    `Todos os exercícios (${(execucao.emendasAnos ?? []).join(', ')}). ` +
    `${fmtInt(execEmSemAno.length)} registros. Extraído em ${new Date().toLocaleString('pt-BR')}.`

  // Recortes impressos no rodapé das exportações da EXECUÇÃO LOA. Como no PLOA,
  // as subabas de dotação só citam os filtros que de fato aplicam (FILTROS_EXEC);
  // as de emenda usam os filtros completos (FILTROS). O Dashboard respeita o Ano
  // (é o exercício em foco); o Histórico o ignora e cita todos os demais.
  const anosExecTodos = `Todos os exercícios (${(execucao.anos ?? []).join(', ')})`
  const anosExecEmTodos = `Todos os exercícios (${(execucao.emendasAnos ?? []).join(', ')})`
  const filtrosAtivosExec = FILTROS_EXEC
    .filter((f) => f.id !== 'ano' && filtros[f.id]?.size > 0)
    .map((f) => `${f.rotulo}: ${[...filtros[f.id]].join(', ')}`)
  const recorteExec = filtrosAtivosExec.length
    ? `${anoTextoExec} · filtros — ${filtrosAtivosExec.join(' · ')}`
    : `${anoTextoExec} · sem outros filtros`
  const recorteHistExec = filtrosAtivosExec.length
    ? `${anosExecTodos} · filtros — ${filtrosAtivosExec.join(' · ')}`
    : `${anosExecTodos} · sem outros filtros`
  const filtrosAtivosExecEm = FILTROS
    .filter((f) => f.id !== 'ano' && filtros[f.id]?.size > 0)
    .map((f) => `${f.rotulo}: ${[...filtros[f.id]].join(', ')}`)
  const recorteExecEm = filtrosAtivosExecEm.length
    ? `${anoTextoExecEm} · filtros — ${filtrosAtivosExecEm.join(' · ')}`
    : `${anoTextoExecEm} · sem outros filtros`
  const recorteExecEmHist = filtrosAtivosExecEm.length
    ? `${anosExecEmTodos} · filtros — ${filtrosAtivosExecEm.join(' · ')}`
    : `${anosExecEmTodos} · sem outros filtros`

  // Linha "— FILTROS:" impressa no cabeçalho de cada folha A4 (PDF) da EXECUÇÃO.
  // O Dashboard respeita o Ano (rotulado "Exercício"); o Histórico o ignora.
  const listarFiltros = (lista) => lista
    .filter((f) => filtros[f.id]?.size > 0)
    .map((f) => {
      const rot = f.id === 'ano' ? 'Exercício' : f.rotulo
      const vals = [...filtros[f.id]].map((v) => (f.formatar ? f.formatar(v) : v)).join(', ')
      return `${rot}: ${vals}`
    })
  const filtrosDashExec = listarFiltros(FILTROS_EXEC)
  const filtrosTextoDashExec = filtrosDashExec.length
    ? filtrosDashExec.join(' · ') : 'Todos os órgãos e exercícios do 52000 (sem filtros)'
  const filtrosTextoHistExec = filtrosAtivosExec.length
    ? filtrosAtivosExec.join(' · ') : 'sem filtros aplicados (todos os órgãos e exercícios)'
  const filtrosDashExecEm = listarFiltros(FILTROS)
  const filtrosTextoDashExecEm = filtrosDashExecEm.length
    ? filtrosDashExecEm.join(' · ') : 'sem filtros aplicados (todos os exercícios)'
  const filtrosTextoHistExecEm = filtrosAtivosExecEm.length
    ? filtrosAtivosExecEm.join(' · ') : 'sem filtros aplicados (todos os exercícios)'

  // Montadas no clique, como as demais: as agregações só rodam quando alguém
  // exporta de fato, e a hora carimbada é a da exportação.
  const cargaPLOA = () => ({
    titulo: 'PLOA — DESPESAS POR FASE DE ELABORAÇÃO',
    escopo: escopoPLOA,
    recorte: recortePLOA,
    recorteForca: `${recortePLOA} · painel sem o filtro de Órgão`,
    geradoEm: new Date().toLocaleString('pt-BR'),
    fonte: dados.fonte,
    // A capa e os cartões servem às duas bases: quem monta a carga escreve a
    // linha-resumo, porque só aqui se sabe se a unidade é "emendas" ou "dotações".
    linhaResumo:
      `${fmtInt(ploaFiltrados.length)} dotações · ` +
      (semAutPLOA
        ? `PL ${fmtBi(totaisPLOA[IDX_PL])} (autógrafo ainda não na planilha)`
        : `autógrafo ${fmtBi(totaisPLOA[IDX_AUTOGRAFO])}`),
    fases: FASE_ROTULOS,
    qtdDotacoes: ploaFiltrados.length,
    // Início do rito: o PPTX consolida pelo PL e omite o autógrafo (ver pptx.js).
    semAut: semAutPLOA,
    totalPL: totaisPLOA[IDX_PL],
    totalAutografo: totaisPLOA[IDX_AUTOGRAFO],
    agregados: ploaPorAgregado(ploaSemOrgao),
    uos: ploaPorUO(ploaFiltrados),
    rps: ploaPorRPFase(ploaFiltrados),
    ciclos: ploaCiclos(ploaSemOrgao),
    plAutografo: ploaPlVsAutografo(ploaSemOrgao),
    acoes: ploaAcoesOrdenadas(ploaFiltrados),
    gnds: ploaPorGND(ploaFiltrados),
  })
  const cargaHistPLOA = () => {
    const porAno = ploaResumoPorAno(ploaSemAno)
    return {
      titulo: 'PLOA — HISTÓRICO DOS EXERCÍCIOS',
      escopo: escopoPLOA,
      recorte: recorteHistPLOA,
      recorteForca: `${recorteHistPLOA} · painel sem o filtro de Órgão`,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      linhaResumo:
        `${fmtInt(ploaSemAno.length)} dotações em ${porAno.length} exercícios · ` +
        `PL somado ${fmtBi(porAno.reduce((s2, a) => s2 + a.pl, 0))}`,
      anos: porAno.map((a) => a.ano),
      resumoAnos: porAno,
      fasesVazias: ploa.fasesVazias ?? {},
      totalPeriodo: porAno.reduce((s, a) => s + a.pl, 0),
      forcasPorAno: ploaAgregadoPorAno(ploaSemAnoNemOrgao),
      uoPorAno: ploaUoPorAno(ploaSemAno),
      rpPorAno: ploaRpPorAno(ploaSemAno),
      gndPorAno: ploaGndPorAno(ploaSemAno),
      acaoPorAno: ploaAcaoPorAno(ploaSemAno, Infinity),
      ciclosPorAno: ploaCiclosPorAno(ploaSemAno),
    }
  }
  const baixarPPTXPLOA = () => exportarPPTXPLOA(cargaPLOA())
  const baixarSlidePLOA = (id) => exportarSlidePPTX(cargaPLOA(), id)
  const baixarPPTXHistPLOA = () => exportarPPTXHistoricoPLOA(cargaHistPLOA())
  const baixarSlideHistPLOA = (id) => exportarSlidePPTX(cargaHistPLOA(), id)

  // ------------------------------------------ exportações da EXECUÇÃO LOA -----
  // Dotação (Dashboard/Histórico LOA): geradores próprios, fiéis à tela — o
  // Autorizado × Dotação inicial, em bilhões (ver pptx.js). As emendas da
  // execução reaproveitam os geradores das emendas apresentadas (mesmo formato),
  // apenas com a base da execução (valor = Autorizado). Montadas no clique.
  const cargaExec = () => ({
    titulo: 'EXECUÇÃO DA LOA — DESPESA POR DOTAÇÃO',
    escopo: escopoExec,
    recorte: recorteExec,
    geradoEm: new Date().toLocaleString('pt-BR'),
    fonte: dados.fonte,
    linhaResumo:
      `${fmtInt(execFiltrados.length)} dotações · ` +
      `autorizado ${fmtBi(somaTotais(execFiltrados).aut)}`,
    totais: somaTotais(execFiltrados),
    qtdDotacoes: execFiltrados.length,
    rps: execPorRP(execFiltrados),
    gnds: execPorGND(execFiltrados).map((g) => ({ rotulo: g.nome || g.rotulo, valor: g.valor, pl: g.pl })),
    uos: execPorUO(execFiltrados).map((u) => ({ rotulo: u.uo, valor: u.valor, pl: u.pl })),
    acoes: execAcoes(execFiltrados).map((a) => ({ rotulo: a.acao || a.acaoCod, valor: a.valor, pl: a.pl })),
    forcas: execPorForca(execSemOrgao).map((a) => ({ rotulo: a.rotulo, valor: a.valor, pl: a.pl })),
    iniAut: execIniAut(execSemOrgao),
    fontes: execPorFonte(execFiltrados).map((f) => ({ rotulo: f.fonte, valor: f.valor, pl: f.pl })),
    contencao: contencaoPorAcao(execFiltrados)
      .map((a) => ({ rotulo: a.acao || a.acaoCod, bloq: a.bloq, conting: a.conting, total: a.total })),
    contEmendas: emendasContencao(execEmDash).map((e) => ({
      rotulo: [e.autor, e.partido && e.partido !== '—' ? `(${e.partido})` : ''].filter(Boolean).join(' '),
      bloq: e.bloq, conting: e.conting, total: e.total,
    })),
  })
  const cargaHistExec = () => {
    const porAno = resumoPorAnoExec(execSemAno)
    return {
      titulo: 'EXECUÇÃO DA LOA — HISTÓRICO DOS EXERCÍCIOS',
      escopo: escopoExec,
      recorte: recorteHistExec,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      linhaResumo:
        `${fmtInt(execSemAno.length)} dotações em ${porAno.length} exercícios · ` +
        `autorizado somado ${fmtBi(porAno.reduce((s, a) => s + a.aut, 0))}`,
      anos: porAno.map((a) => a.ano),
      serieValor: porAno.map((a) => a.aut),
      serieIni: porAno.map((a) => a.ini),
      serieDot: porAno.map((a) => a.linhas),
      gnd: gndPorAnoExec(execSemAno),
      uo: uoPorAnoExec(execSemAno),
      rp: rpPorAnoExec(execSemAno),
      acao: acaoPorAnoExec(execSemAno, Infinity),
      forca: forcaPorAnoExec(execSemAnoNemOrgao),
      fgrupo: fonteGrupoPorAno(execSemAno),
    }
  }
  const baixarPPTXExec = () => exportarPPTXExec(cargaExec())
  const baixarSlideExec = (id) => exportarSlidePPTX(cargaExec(), id)
  const baixarPPTXHistExec = () => exportarPPTXHistoricoExec(cargaHistExec())
  const baixarSlideHistExec = (id) => exportarSlidePPTX(cargaHistExec(), id)

  // Emendas da execução — mesma estrutura das emendas apresentadas (cargaPPTX /
  // cargaHistorico), só que sobre execucao.emendas (valor = Autorizado).
  const cargaEmExec = () => {
    const regs = execEmFiltrados
    const st = resumo(regs)
    const prp = valorPorRP(regs)
    const imp = valorImpositivas(regs)
    const totImp = imp.reduce((s, d) => s + d.valor, 0)
    const cmilaArr = impositivasPorCMilA(regs)
    const aut10 = topAutores(regs, 10)
    const totAut = aut10.reduce((s, d) => s + d.valor, 0)
    const parts = valorPorPartido(regs)
    const totRP6 = prp.find((d) => String(d.rp) === '6')?.valor ?? 0
    return {
      titulo: 'EMENDAS DA EXECUÇÃO DA LOA (AUTORIZADO)',
      escopo: escopoExec,
      recorte: recorteExecEm,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      stats: st,
      qtdRegistros: regs.length,
      totalImpositivas: totImp,
      pctImpositivas: st.valorTotal ? (totImp / st.valorTotal) * 100 : 0,
      porRP: prp,
      impositivas: imp,
      autores: aut10,
      totalAutores: totAut,
      pctAutoresRP6: totRP6 ? (totAut / totRP6) * 100 : 0,
      cmila: cmilaArr,
      totalCMilA: cmilaArr.reduce((s, d) => s + d.total, 0),
      partidos: parts,
      totalPartidos: parts.reduce((s, d) => s + d.valor, 0),
    }
  }
  const cargaEmHistExec = () => {
    const porAno = resumoPorAno(execEmSemAno)
    const serie = (campo) => porAno.map((a) => a[campo])
    return {
      titulo: 'EMENDAS DA EXECUÇÃO DA LOA (AUTORIZADO)',
      escopo: escopoExec,
      recorte: recorteExecEmHist,
      recorteForca: `${recorteExecEmHist} · painel sem o filtro de Órgão`,
      geradoEm: new Date().toLocaleString('pt-BR'),
      fonte: dados.fonte,
      stats: resumo(execEmSemAno),
      anos: porAno.map((a) => a.ano),
      serieValor: serie('valor'),
      serieEmendas: serie('qtdEmendas'),
      serieParlamentares: serie('qtdParlamentares'),
      serieImpositivo: serie('impositivo'),
      totalPeriodo: porAno.reduce((s, a) => s + a.valor, 0),
      impositivasPorAno: impositivasPorAno(execEmSemAno).series,
      rpPorAno: rpPorAno(execEmSemAno).series,
      modalidadePorAno: modalidadePorAno(execEmSemAno).series,
      forcaPorAno: forcaPorAno(execEmSemAnoNemOrgao),
      cmilaPorAno: cmilaPorAno(execEmSemAno),
      partidosPorAno: partidosPorAno(execEmSemAno, 12),
      autoresPorAno: autoresRecorrentes(execEmSemAno, 12),
    }
  }
  const baixarPPTXEmExec = () => exportarPPTX(cargaEmExec())
  const baixarSlideEmExec = (id) => exportarSlidePPTX(cargaEmExec(), id)
  const baixarPPTXEmHistExec = () => exportarPPTXHistorico(cargaEmHistExec())
  const baixarSlideEmHistExec = (id) => exportarSlidePPTX(cargaEmHistExec(), id)

  // "Emendas LOA" em tabelas por estado (modelo do arquivo de referência):
  // impositivas do Exército por C Mil A → Estado → modalidade (ver pptx.js /
  // emendasEstado.js). Um baralho de tabelas, sem gráficos.
  const cargaEmendasEstado = () => ({
    titulo: 'EMENDAS IMPOSITIVAS POR ESTADO',
    escopo: escopoExec,
    recorte: recorteExecEm,
    geradoEm: new Date().toLocaleString('pt-BR'),
    fonte: dados.fonte,
    porEstado: emendasImpositivasPorEstado(execEmFiltrados),
  })
  const baixarPPTXEmendasEstado = () => exportarPPTXEmendasEstado(cargaEmendasEstado())

  // A mesma exportação de tabelas por estado para a subaba "Emendas" do RESULTADO
  // LEXOR — só que sobre as emendas APRESENTADAS (valor = solicitado).
  const cargaEmendasEstadoLexor = () => ({
    titulo: 'EMENDAS IMPOSITIVAS POR ESTADO',
    escopo,
    recorte,
    geradoEm: new Date().toLocaleString('pt-BR'),
    fonte: dados.fonte,
    porEstado: emendasImpositivasPorEstado(filtrados),
  })
  const baixarPPTXEmendasEstadoLexor = () => exportarPPTXEmendasEstado(cargaEmendasEstadoLexor())

  // "Exportar PDF": gera o arquivo DIRETO (sem abrir o diálogo de impressão) a
  // partir da folha A4 da subaba em tela — ver pdf.js. Sem window.print(), o
  // navegador não injeta cabeçalho/endereço/data no papel; o rodapé com a data e
  // hora da exportação é desenhado pelo próprio módulo.
  const exportarPDF = async () => {
    if (gerandoPDF) return
    const folha = document.querySelector('.folha-pdf')
    const titulo = TITULO_PDF[aba] ?? 'Análise LOA'
    setGerandoPDF(true)
    try {
      await exportarFolhaPDF(folha, titulo)
    } catch (e) {
      console.error('Falha ao gerar o PDF:', e)
    } finally {
      setGerandoPDF(false)
    }
  }
  // Subabas com folha A4 dedicada (ver FolhaPDF.jsx / FolhaPDFExec.jsx): as duas
  // do PLOA e as quatro subabas com gráficos da EXECUÇÃO LOA.
  const ABAS_COM_PDF = new Set([
    'ploa-dashboard', 'ploa-historico',
    'exec-dashboard', 'exec-historico', 'exec-emendas-dashboard', 'exec-emendas-historico',
    'exec-emendas',
    'dashboard', 'emendas', 'historico', 'inconsistencias',
  ])
  const TITULO_PDF = {
    'ploa-dashboard': 'Análise PLOA',
    'ploa-historico': 'Análise Histórico PLOA',
    'exec-dashboard': 'Análise Execução LOA',
    'exec-historico': 'Análise Histórico LOA',
    'exec-emendas-dashboard': 'Análise Emendas Execução LOA',
    'exec-emendas-historico': 'Análise Histórico Emendas Execução LOA',
    'exec-emendas': 'Emendas Impositivas por Estado',
    dashboard: 'Análise Emendas ao PLOA',
    emendas: 'Emendas Impositivas por Estado (apresentadas)',
    historico: 'Análise Histórico Emendas ao PLOA',
    inconsistencias: 'Análise de Inconsistências',
  }

  // Abas que exportam o baralho inteiro (as demais exportam só por gráfico).
  const ABAS_COM_BARALHO = {
    dashboard: { acao: baixarPPTX, dica: 'Baixar o Dashboard em PowerPoint editável com os filtros atuais' },
    emendas: { acao: baixarPPTXEmendasEstadoLexor, dica: 'Baixar as emendas impositivas do Exército em tabelas por estado (C Mil A → UF)' },
    historico: { acao: baixarPPTXHistorico, dica: 'Baixar a aba Histórico em PowerPoint editável com os filtros atuais' },
    'ploa-dashboard': { acao: baixarPPTXPLOA, dica: 'Baixar o Dashboard PLOA em PowerPoint editável com os filtros atuais' },
    'ploa-historico': { acao: baixarPPTXHistPLOA, dica: 'Baixar o Histórico PLOA em PowerPoint editável com os filtros atuais' },
    'exec-dashboard': { acao: baixarPPTXExec, dica: 'Baixar o Dashboard LOA em PowerPoint editável com os filtros atuais' },
    'exec-historico': { acao: baixarPPTXHistExec, dica: 'Baixar o Histórico LOA em PowerPoint editável com os filtros atuais' },
    'exec-emendas-dashboard': { acao: baixarPPTXEmExec, dica: 'Baixar o Dashboard Emendas em PowerPoint editável com os filtros atuais' },
    'exec-emendas-historico': { acao: baixarPPTXEmHistExec, dica: 'Baixar o Histórico Emendas em PowerPoint editável com os filtros atuais' },
    'exec-emendas': { acao: baixarPPTXEmendasEstado, dica: 'Baixar as emendas impositivas do Exército em tabelas por estado (C Mil A → UF)' },
  }

  // Filtros exibidos na barra: só os que existem na base da seção ativa (ver
  // `filtrosVisiveis`, definido junto com `temFiltro`). As opções vêm da base
  // correspondente e são facetadas, então uma UO ou um RP novo na planilha
  // aparece sozinho na lista, sem tocar no código.
  const opcoesDe = (f) =>
    secaoId === 'execucao'
      ? (emExecEmendas
        ? opcoesDoFiltro(execEmRegistros, filtros, f)
        : opcoesExecucao(execRegistros, filtros, f))
      : secaoId === 'ploa' && aba !== 'ploa-emendas'
        ? opcoesPLOA(ploaRegistros, filtros, f)
        : opcoesDoFiltro(registros, filtros, f)
  return (
    <div className="loa-app">
      <header className="cabecalho" data-secao={secaoId}>
        {/* Nível 1: a base de dados. Cada seção responde por uma planilha. */}
        <nav className="secoes" role="tablist" aria-label="Seções">
          {SECOES.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={secaoId === s.id}
              className={`secao secao-${s.id}${secaoId === s.id ? ' ativa' : ''}`}
              onClick={() => irParaAba(PRIMEIRA_SUBABA[s.id])}
              title={s.descricao}
            >
              {s.rotulo}
            </button>
          ))}
        </nav>

        {/* Nível 2: as subabas da seção ativa. */}
        <nav className="abas" role="tablist" aria-label={`Subseções de ${secao.rotulo}`}>
          {secao.subabas.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              className={`aba${aba === a.id ? ' ativa' : ''}`}
              onClick={() => irParaAba(a.id)}
            >
              {a.rotulo}
              {a.id === 'inconsistencias' && gruposIncons.length > 0 && (
                <span className="aba-badge">{gruposIncons.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <section className="filtros" aria-label="Filtros">
        <span className="filtros-rotulo">Filtros</span>
        {filtrosVisiveis.map((f) => (
          <MultiSelect
            key={f.id}
            rotulo={f.rotulo}
            opcoes={opcoesDe(f)}
            selecionados={filtros[f.id]}
            onChange={(v) => setFiltro(f.id, v)}
          />
        ))}
        {temFiltro && (
          <button type="button" className="limpar-tudo" onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
        {ABAS_COM_BARALHO[aba] && (
          <button
            type="button"
            className="btn-pptx"
            onClick={ABAS_COM_BARALHO[aba].acao}
            title={ABAS_COM_BARALHO[aba].dica}
          >
            Exportar PPTX
          </button>
        )}
        {ABAS_COM_PDF.has(aba) && (
          <button
            type="button"
            className="btn-pdf"
            onClick={exportarPDF}
            disabled={gerandoPDF}
            aria-busy={gerandoPDF}
            title="Exportar esta subaba em PDF (papel A4, retrato) — baixa direto, sem diálogo de impressão"
          >
            {gerandoPDF ? 'Gerando PDF…' : 'Exportar PDF'}
          </button>
        )}
      </section>

      <main className="conteudo">
        {aba === 'dashboard' && (
          <>
            {/* só aparece na impressão / PDF */}
            <header className="folha-cab">
              <h2>EMENDAS APRESENTADAS AO PLOA</h2>
              <p>{escopo}</p>
              <p>{recorte}</p>
              <p>Extraído em {new Date().toLocaleString('pt-BR')} · fonte: {dados.fonte}</p>
            </header>

            <div className="destaque" role="region" aria-label="Indicadores">
              <section className="heroi">
                <p className="heroi-rotulo">Valor total solicitado</p>
                <p className="heroi-valor">
                  R$ {heroi.valor}
                  {heroi.unidade && <span className="heroi-unidade">{heroi.unidade}</span>}
                </p>
                <p className="heroi-exato">{fmtBRL(stats.valorTotal)}</p>
                {/* o denominador é o do RECORTE (não o da base inteira): com
                    vários exercícios carregados, "em 1.636 registros" ao lado
                    de "370 emendas" comparava anos diferentes */}
                <p className="heroi-nota">
                  {anoTexto} · {fmtInt(stats.qtdEmendas)} emendas em {fmtInt(filtrados.length)} registros
                </p>
              </section>

              <div className="tiras">
                <section className="tira">
                  <p className="tira-rotulo">Emendas</p>
                  <p className="tira-valor">{fmtInt(stats.qtdEmendas)}</p>
                  <p className="tira-nota">Emendas distintas no recorte</p>
                </section>
                <section className="tira">
                  <p className="tira-rotulo">Parlamentares</p>
                  <p className="tira-valor">{fmtInt(stats.qtdParlamentares)}</p>
                  <p className="tira-nota">Autores distintos das emendas</p>
                </section>
                <section className="tira">
                  <p className="tira-rotulo">Impositivas</p>
                  <p className="tira-valor">
                    R$ {impositivo.valor}
                    {impositivo.unidade && <span className="tira-unidade">{impositivo.unidade}</span>}
                  </p>
                  <p className="tira-nota">RP6 + RP7 · {fmtPct(pctImpositivas)} do total</p>
                </section>
              </div>
            </div>

            <div className="paineis">
              <section className="painel-grafico p-6">
                <div className="painel-cab">
                  <div className="painel-cab-txt">
                    <h2>Emendas parlamentares ao PLOA</h2>
                    <p className="painel-sub">Valor solicitado por identificador de resultado primário (RP)</p>
                  </div>
                  <span className="painel-total">{fmtMilhoes(stats.valorTotal)}</span>
                  <BotaoPPTX titulo="Emendas parlamentares ao PLOA" onExportar={() => baixarSlide('rp')} />
                  <BotaoPNG titulo="Emendas parlamentares ao PLOA" contexto={contextoExport} />
                </div>
                <GraficoPizza dados={porRP} total={stats.valorTotal} />
              </section>

              <section className="painel-grafico p-6">
                <div className="painel-cab">
                  <div className="painel-cab-txt">
                    <h2>Emendas impositivas</h2>
                    <p className="painel-sub">RP6 por tipo de autor · RP7 por bancada</p>
                  </div>
                  <span className="painel-total">{fmtMilhoes(totalImpositivas)}</span>
                  <BotaoPPTX titulo="Emendas impositivas" onExportar={() => baixarSlide('impositivas')} />
                  <BotaoPNG titulo="Emendas impositivas" contexto={contextoExport} />
                </div>
                <GraficoPizza dados={impositivas} total={totalImpositivas} />
              </section>

              <section className="painel-grafico p-6">
                <div className="painel-cab">
                  <div className="painel-cab-txt">
                    <h2>Impositivas por C Mil A</h2>
                    <p className="painel-sub">Somente UO do Exército (Comando do Exército, IMBEL e Fundo do Exército)</p>
                  </div>
                  <span className="painel-total">{fmtMilhoes(totalCMilA)}</span>
                  <BotaoPPTX titulo="Impositivas por C Mil A" onExportar={() => baixarSlide('cmila')} />
                  <BotaoPNG titulo="Impositivas por C Mil A" contexto={contextoExport} />
                </div>
                <GraficoBarras dados={impCMilA} />
              </section>

              <section className="painel-grafico p-6">
                <div className="painel-cab">
                  <div className="painel-cab-txt">
                    <h2>10 maiores autores</h2>
                    <p className="painel-sub">Deputados Federais e Senadores, por valor total</p>
                  </div>
                  <span className="painel-total">
                    {fmtMilhoes(totalAutores)}
                    <span className="painel-total-nota"> ({fmtPct(pctAutoresRP6)} do RP6)</span>
                  </span>
                  <BotaoPPTX titulo="10 maiores autores" onExportar={() => baixarSlide('autores')} />
                  <BotaoPNG titulo="10 maiores autores" contexto={contextoExport} />
                </div>
                <GraficoBarrasSimples dados={autoresTop} />
              </section>

              <section className="painel-grafico p-12">
                <div className="painel-cab">
                  <div className="painel-cab-txt">
                    <h2>Emendas por partido</h2>
                    <p className="painel-sub">Exclui comissões e bancadas (sem partido)</p>
                  </div>
                  <span className="painel-total">{fmtMilhoes(totalPartidos)}</span>
                  <BotaoPPTX titulo="Emendas por partido" onExportar={() => baixarSlide('partidos')} />
                  <BotaoPNG titulo="Emendas por partido" contexto={contextoExport} />
                </div>
                <GraficoPartidos dados={partidos} />
              </section>
            </div>

            {/* Folha A4 do PDF (revelada só na exportação) — mesmos painéis. */}
            <div className="folha-pdf" aria-hidden>
              <FolhaDashboardEmendasExec
                registros={filtrados}
                base="lexor"
                filtrosTexto={filtrosTextoDashExecEm}
                anoTexto={anoTexto}
              />
            </div>
          </>
        )}

        {aba === 'emendas' && (
          <>
            <section aria-label="Emendas">
              <p className="contagem">{fmtInt(grupos.length)} emenda(s)</p>
              <div className="grade">
                {grupos.map((g) => (
                  <CartaoEmenda
                    key={g.emenda}
                    grupo={g}
                    aberto={detalhe === g.emenda}
                    onToggle={() => abrirDetalhe(g.emenda)}
                  />
                ))}
              </div>
              {grupos.length === 0 && <p className="vazio">Nenhuma emenda para os filtros aplicados.</p>}
            </section>

            {/* PDF/PPTX: tabelas por estado (impositivas do Exército). */}
            <div className="folha-pdf" aria-hidden>
              <FolhaEmendasEstado registros={filtrados} filtrosTexto={filtrosTextoDashExecEm} base="lexor" />
            </div>
          </>
        )}

        {aba === 'historico' && (
          <section aria-label="Histórico">
            <AbaHistorico
              registros={semAno}
              registrosTodasForcas={semAnoNemOrgao}
              contexto={contextoHistorico}
              onExportarSlide={baixarSlideHistorico}
            />
            <div className="folha-pdf" aria-hidden>
              <FolhaHistoricoEmendasExec
                registros={semAno}
                registrosTodasForcas={semAnoNemOrgao}
                base="lexor"
                filtrosTexto={filtrosTextoHistExecEm}
              />
            </div>
          </section>
        )}

        {aba === 'inconsistencias' && (
          <>
            <AbaInconsistencias
              registros={filtrados}
              detalhe={detalhe}
              abrirDetalhe={abrirDetalhe}
            />
            <div className="folha-pdf" aria-hidden>
              <FolhaInconsistencias registros={filtrados} filtrosTexto={filtrosTextoDashExecEm} />
            </div>
          </>
        )}

        {aba === 'ploa-dashboard' && (
          <AbaPLOA
            registros={ploaFiltrados}
            registrosTodasForcas={ploaSemOrgao}
            anos={ploa.anos ?? []}
            fasesVazias={ploa.fasesVazias ?? {}}
            duplicados={ploa.anosDuplicados ?? []}
            contexto={contextoPLOA}
            onExportarSlide={baixarSlidePLOA}
            filtrosTexto={filtrosTextoDashPLOA}
          />
        )}

        {aba === 'ploa-historico' && (
          <AbaHistoricoPLOA
            registros={ploaSemAno}
            registrosTodasForcas={ploaSemAnoNemOrgao}
            duplicados={ploa.anosDuplicados ?? []}
            fasesVazias={ploa.fasesVazias ?? {}}
            contexto={contextoHistPLOA}
            onExportarSlide={baixarSlideHistPLOA}
            filtrosTexto={filtrosTextoHistPLOA}
          />
        )}

        {aba === 'exec-dashboard' && (
          <AbaExecucao
            registros={execFiltrados}
            registrosTodasForcas={execSemOrgao}
            emendas={execEmDash}
            anos={execucao.anos ?? []}
            contexto={contextoExec}
            onExportarSlide={baixarSlideExec}
            filtrosTexto={filtrosTextoDashExec}
          />
        )}

        {aba === 'exec-historico' && (
          <AbaHistoricoExec
            registros={execSemAno}
            registrosTodasForcas={execSemAnoNemOrgao}
            contexto={contextoHistExec}
            onExportarSlide={baixarSlideHistExec}
            filtrosTexto={filtrosTextoHistExec}
          />
        )}

        {aba === 'exec-emendas-dashboard' && (
          <AbaDashboardEmendasExec
            registros={execEmFiltrados}
            contexto={contextoExecEm}
            anoTexto={anoTextoExecEm}
            onExportarSlide={baixarSlideEmExec}
            filtrosTexto={filtrosTextoDashExecEm}
          />
        )}

        {aba === 'exec-emendas' && (
          <AbaEmendasExec
            registros={execEmFiltrados}
            detalhe={detalhe}
            abrirDetalhe={abrirDetalhe}
            filtrosTexto={filtrosTextoDashExecEm}
          />
        )}

        {aba === 'exec-emendas-historico' && (
          <AbaHistoricoEmendasExec
            registros={execEmSemAno}
            registrosTodasForcas={execEmSemAnoNemOrgao}
            contexto={contextoExecEmHist}
            onExportarSlide={baixarSlideEmHistExec}
            filtrosTexto={filtrosTextoHistExecEm}
          />
        )}
      </main>

      <footer className="rodape">
        <p>
          Desenvolvido por Maj Torres · Fonte: SIGA Brasil · Dados processados em{' '}
          {new Date(dados.geradoEm).toLocaleString('pt-BR')}.
        </p>
      </footer>
    </div>
  )
}
