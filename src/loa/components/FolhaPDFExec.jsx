import {
  resumo, valorPorRP, valorImpositivas, impositivasPorCMilA, topAutores, valorPorPartido,
  resumoPorAno, rpPorAno, modalidadePorAno, impositivasPorAno,
  forcaPorAno, cmilaPorAno, partidosPorAno, autoresRecorrentes,
  fmtCompacto, fmtBRL, fmtInt, fmtMilhoes, fmtPct,
} from '../dados.js'
import { fmtBi, fmtBiSeco } from '../ploa.js'
import {
  AGREGADOS, fmtVar, variacao,
  somaTotais, porRP, porGND, porUO, acoesOrdenadas, porForca, iniVsAutorizado, porFonte,
  resumoPorAnoExec, forcaPorAnoExec, uoPorAnoExec, rpPorAnoExec, gndPorAnoExec,
  acaoPorAnoExec, fonteGrupoPorAno,
} from '../execucao.js'
import GraficoBarrasExec from './GraficoBarrasExec.jsx'
import GraficoColunasAno from './GraficoColunasAno.jsx'
import MatrizAnos from './MatrizAnos.jsx'
import GraficoPizza from './GraficoPizza.jsx'
import GraficoBarras from './GraficoBarras.jsx'
import GraficoBarrasSimples from './GraficoBarrasSimples.jsx'
import GraficoPartidos from './GraficoPartidos.jsx'
import { Fragment } from 'react'
import { emendasImpositivasPorEstado } from '../emendasEstado.js'

const rsInt = (v) => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

// ==========================================================================
// Folhas A4 (retrato) para o "Exportar PDF" das quatro subabas com gráficos da
// seção EXECUÇÃO LOA. Mesma mecânica das folhas do PLOA (ver FolhaPDF.jsx): só
// existem no papel, ficam `display:none` na tela e são paginadas e rasterizadas
// pelo pdf.js. Reaproveitam os MESMOS componentes de gráfico das telas — o
// "retrato fiel" — remontados sem botões, notas de rodapé nem recortes.
//
// Para garantir que o papel traga exatamente os números da tela, cada folha
// recebe os mesmos `registros` já filtrados e refaz as mesmas agregações que a
// subaba correspondente.
// ==========================================================================

function Cabeca({ titulo, valor, sec }) {
  return (
    <header className="pdf-cabeca">
      <h1 className="pdf-titulo">{titulo}</h1>
      <p className="pdf-recorte">
        <span className="pdf-recorte-rot">— FILTROS:</span> {valor}
      </p>
      {sec && <p className="pdf-recorte pdf-recorte-sec">{sec}</p>}
    </header>
  )
}

function CardPDF({ titulo, sub, total, fluido = false, children }) {
  return (
    <section className={`pdf-card${fluido ? ' pdf-card-fluido' : ''}`}>
      <div className="pdf-card-cab">
        <div className="pdf-card-txt">
          <h2>{titulo}</h2>
          {sub && <p className="pdf-card-sub">{sub}</p>}
        </div>
        {total != null && <span className="pdf-card-total">{total}</span>}
      </div>
      {children}
    </section>
  )
}

// ====================================================== Dashboard LOA (dotação)
export function FolhaDashboardExec({ registros, registrosTodasForcas, filtrosTexto }) {
  const todasForcas = registrosTodasForcas ?? registros
  const totais = somaTotais(registros)
  const rps = porRP(registros)
  const gnds = porGND(registros)
  const uos = porUO(registros)
  const acoes = acoesOrdenadas(registros)
  const forcas = porForca(todasForcas)
  const iniAut = iniVsAutorizado(todasForcas)
  const fontes = porFonte(registros)

  const anosEmTela = [...new Set(registros.map((r) => r.ano))].sort()
  const heroi = fmtCompacto(totais.aut)
  const cIni = fmtCompacto(totais.ini)
  const cCont = fmtCompacto(totais.cont)
  const cVar = fmtCompacto(Math.abs(totais.variacao))
  const pctVar = variacao(totais.ini, totais.aut)
  const totalAutForcas = forcas.reduce((s, a) => s + a.valor, 0)
  const totalIniForcas = forcas.reduce((s, a) => s + a.pl, 0)
  const deltaForcas = totalAutForcas - totalIniForcas

  const catsForca = iniAut.map((a) => a.rotulo)
  const coresForca = iniAut.map((a) => a.cor)
  const serieIniAut = [
    { chave: 'ini', rotulo: 'Dotação inicial', cor: 'var(--tinta-3)', valores: iniAut.map((a) => a.ini) },
    { chave: 'aut', rotulo: 'Autorizado', cor: 'var(--tinta-3)', valores: iniAut.map((a) => a.aut) },
  ]

  return (
    <>
      {/* página 1: título, cards, RP+GND, UO */}
      <div className="pdf-pagina">
        <Cabeca titulo="Análise Execução LOA" valor={filtrosTexto}
          sec={`Exercício ${anosEmTela.join(', ')} · ${fmtInt(registros.length)} dotações · dotação autorizada`} />

        <div className="pdf-topo">
          <section className="pdf-mini pdf-mini-heroi">
            <p className="pdf-mini-rot">Dotação autorizada</p>
            <p className="pdf-mini-val">
              R$ {heroi.valor}{heroi.unidade && <span className="pdf-mini-un">{heroi.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">Autorizado · {fmtInt(registros.length)} dotações</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Dotação inicial</p>
            <p className="pdf-mini-val">
              R$ {cIni.valor}{cIni.unidade && <span className="pdf-mini-un">{cIni.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">Dotação inicial da LOA</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Contenção de gastos</p>
            <p className="pdf-mini-val">
              R$ {cCont.valor}{cCont.unidade && <span className="pdf-mini-un">{cCont.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">Total em contenção no recorte</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Variação das dotações</p>
            <p className={`pdf-mini-val ${totais.variacao >= 0 ? 'var-sobe' : 'var-desce'}`}>
              {totais.variacao >= 0 ? '+' : '−'} R$ {cVar.valor}
              {cVar.unidade && <span className="pdf-mini-un">{cVar.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">Autorizado − inicial{pctVar === null ? '' : ` · ${fmtVar(pctVar)}`}</p>
          </section>
        </div>

        <div className="pdf-linha-2">
          <CardPDF titulo="Por Identificador de Resultado Primário"
            sub="barra = autorizado, traço = dotação inicial" total={fmtBi(totais.aut)}>
            <GraficoBarrasExec
              dados={rps.map((d) => ({ chave: d.rp, rotulo: d.rotulo, valor: d.valor, pl: d.pl, cor: d.cor }))}
              mostrarPercentual rotuloGrafico="Autorizado por RP (traço = dotação inicial)" />
          </CardPDF>
          <CardPDF titulo="Valor por Grupo de Natureza da Despesa"
            sub="barra = autorizado, traço = dotação inicial" total={fmtBi(totais.aut)}>
            <GraficoBarrasExec
              dados={gnds.map((g) => ({ chave: g.gnd, rotulo: g.nome || g.rotulo, sublinha: g.rotulo, valor: g.valor, pl: g.pl, cor: g.cor }))}
              mostrarPercentual rotuloGrafico="Autorizado por GND (traço = dotação inicial)" />
          </CardPDF>
        </div>

        <CardPDF titulo="Valor por Unidade Orçamentária"
          sub="Todas as UO do órgão 52000 · barra = autorizado, traço = dotação inicial" total={fmtBi(totais.aut)}>
          <GraficoBarrasExec
            dados={uos.map((u) => ({ chave: u.uoCod, rotulo: u.uo, sublinha: `UO ${u.uoCod}`, valor: u.valor, pl: u.pl, cor: AGREGADOS.find((a) => a.id === u.orgao)?.cor }))}
            mostrarPercentual rotuloGrafico="Autorizado por unidade orçamentária (traço = dotação inicial)" />
        </CardPDF>
      </div>

      {/* página 2+: ação (fluida) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Valor por Ação orçamentária"
          sub={`${fmtInt(acoes.length)} ações do recorte · barra = autorizado, traço = dotação inicial`}
          total={fmtBi(totais.aut)} fluido>
          <GraficoBarrasExec
            dados={acoes.map((a) => ({ chave: a.acaoCod, rotulo: a.acao || a.acaoCod, codigo: a.acaoCod !== '—' ? a.acaoCod : null, valor: a.valor, pl: a.pl }))}
            corNumero="var(--serie-laranja)" mostrarPercentual
            rotuloGrafico="Autorizado por ação orçamentária (traço = dotação inicial)" />
        </CardPDF>
      </div>

      {/* página 3+: fonte (fluida) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Valor por Fonte (Cod/Desc)"
          sub={`${fmtInt(fontes.length)} fontes do recorte · barra = autorizado, traço = dotação inicial`}
          total={fmtBi(totais.aut)} fluido>
          <GraficoBarrasExec
            dados={fontes.map((f) => ({ chave: f.fonteCod || f.fonte, rotulo: f.fonteCod ? f.fonte.replace(new RegExp(`^${f.fonteCod}\\s*-\\s*`), '') : f.fonte, codigo: f.fonteCod || null, valor: f.valor, pl: f.pl }))}
            corNumero="var(--serie-aqua)" mostrarPercentual
            rotuloGrafico="Autorizado por fonte (traço = dotação inicial)" />
        </CardPDF>
      </div>

      {/* página final: Força + Inicial × Autorizado */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Total por Força"
          sub="Soma de todas as UO de cada Força e da Adm. Direta do MD · barra = autorizado, traço = dotação inicial"
          total={fmtBi(totalAutForcas)}>
          <GraficoBarrasExec
            dados={forcas.map((a) => ({ chave: a.id, rotulo: a.rotulo, valor: a.valor, pl: a.pl, cor: a.cor }))}
            mostrarPercentual rotuloGrafico="Autorizado total por Força (traço = dotação inicial)" />
        </CardPDF>

        <CardPDF titulo="Dotação inicial vs. dotação autorizada"
          sub="Diferença entre o autorizado e a dotação inicial, por Força"
          total={`${deltaForcas >= 0 ? '+' : '−'} ${fmtBi(Math.abs(deltaForcas))}`}>
          <GraficoColunasAno anos={catsForca} series={serieIniAut} corPorColuna={coresForca}
            formatar={fmtBi} formatarTotal={() => ''}
            rotuloEixo="Comparativo da dotação inicial e da autorizada, por Força" />
          <div className="ciclo-tabela" role="table" aria-label="Variação da dotação inicial para a autorizada">
            <div className="ciclo-linha ciclo-cab" role="row">
              <span role="columnheader">Força</span><span role="columnheader">Inicial</span>
              <span role="columnheader">Autorizado</span><span role="columnheader">Variação</span>
            </div>
            {iniAut.map((a) => (
              <div className="ciclo-linha" role="row" key={a.id}>
                <span role="cell" className="ciclo-nome">
                  <span className="pbar-chave" style={{ background: a.cor }} aria-hidden />{a.rotulo}
                </span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.ini)}</span></span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.aut)}</span></span>
                <span role="cell" className="ciclo-cel">
                  <span className="ciclo-val">{a.delta >= 0 ? '+' : '−'} {fmtBi(Math.abs(a.delta))}</span>
                  <span className={a.pct === null || a.pct === 0 ? 'var-nula' : a.pct > 0 ? 'var-sobe' : 'var-desce'}>
                    {a.pct === null ? '—' : a.pct === 0 ? 'sem alteração' : `${a.pct > 0 ? '▲' : '▼'} ${fmtPct(Math.abs(a.pct))}`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardPDF>
      </div>
    </>
  )
}

// ====================================================== Histórico LOA (dotação)
export function FolhaHistoricoExec({ registros, registrosTodasForcas, filtrosTexto }) {
  const todasForcas = registrosTodasForcas ?? registros
  const anosResumo = resumoPorAnoExec(registros)
  const forcas = forcaPorAnoExec(todasForcas)
  const uos = uoPorAnoExec(registros)
  const rps = rpPorAnoExec(registros)
  const gnds = gndPorAnoExec(registros)
  const acoes = acaoPorAnoExec(registros, Infinity)
  const fgrupos = fonteGrupoPorAno(registros)

  const anos = anosResumo.map((a) => a.ano)
  const totalPeriodo = anosResumo.reduce((s, a) => s + a.aut, 0)
  const saldoTotal = anosResumo.reduce((s, a) => s + a.delta, 0)
  const CORES_ANO = [
    'var(--serie-azul)', 'var(--serie-verde)', 'var(--serie-laranja)', 'var(--serie-violeta)',
    'var(--serie-aqua)', 'var(--serie-magenta)', 'var(--serie-amarelo)', 'var(--serie-vermelho)',
  ]
  const coresPorAno = anosResumo.map((_, i) => CORES_ANO[i % CORES_ANO.length])
  const serieAut = [{ chave: 'aut', rotulo: 'Autorizado', cor: 'var(--serie-azul)', valores: anosResumo.map((a) => a.aut) }]
  const serieIniAut = [
    { chave: 'ini', rotulo: 'Dotação inicial', cor: 'var(--serie-azul)', valores: anosResumo.map((a) => a.ini) },
    { chave: 'aut', rotulo: 'Autorizado', cor: 'var(--serie-laranja)', valores: anosResumo.map((a) => a.aut) },
  ]

  return (
    <>
      {/* página 1: cards de exercício, LOA anual, GND, UO */}
      <div className="pdf-pagina">
        <Cabeca titulo="Análise Histórico LOA" valor={filtrosTexto}
          sec={`Comparativo dos exercícios ${anos.join(', ')} · ignora o filtro de Ano · dotação autorizada`} />

        <div className="pdf-anos">
          {anosResumo.map((a) => {
            const c = fmtCompacto(a.aut)
            const d = fmtCompacto(Math.abs(a.delta))
            return (
              <section className="pdf-ano" key={a.ano}>
                <p className="pdf-ano-ano">{a.ano}</p>
                <p className="pdf-ano-val">R$ {c.valor}{c.unidade && <span className="pdf-ano-un">{c.unidade}</span>}</p>
                <dl className="pdf-ano-linhas">
                  <div><dt>Inicial</dt><dd>{fmtBi(a.ini)}</dd></div>
                  <div>
                    <dt>Saldo</dt>
                    <dd className={a.delta >= 0 ? 'var-sobe' : 'var-desce'}>{a.delta >= 0 ? '+' : '−'} {d.valor} {d.unidade}</dd>
                  </div>
                </dl>
              </section>
            )
          })}
        </div>

        <CardPDF titulo="Lei Orçamentária Anual por exercício"
          sub="Somatório da dotação autorizada em cada exercício" total={fmtBi(totalPeriodo)}>
          <GraficoColunasAno anos={anos} series={serieAut} corPorColuna={coresPorAno}
            formatar={fmtBi} formatarTotal={(v) => fmtBi(v)} tendencia
            rotuloEixo="Dotação autorizada em cada exercício" />
        </CardPDF>

        <CardPDF titulo="Composição por GND"
          sub="Participação de cada GND no autorizado" total={fmtBi(totalPeriodo)}>
          <GraficoColunasAno anos={gnds.anos} series={gnds.series} empilhado className="colunas-fina"
            formatar={fmtBi} formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Valor por GND, por exercício" />
        </CardPDF>
      </div>

      {/* página 2+: matriz de UO (fluida) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Unidades orçamentárias por exercício"
          sub={`${uos.series.length} UO · dotação autorizada · R$ bilhões`}
          total={fmtBi(uos.series.reduce((s, l) => s + l.total, 0))} fluido>
          <MatrizAnos anos={uos.anos} linhas={uos.series} formatar={fmtBiSeco} rotuloColuna="Unidade orçamentária" />
        </CardPDF>
      </div>

      {/* página 3: RP + Inicial × Autorizado por exercício */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Composição por RP"
          sub="Participação de cada RP no autorizado de cada ano" total={fmtBi(totalPeriodo)}>
          <GraficoColunasAno anos={rps.anos} series={rps.series} proporcao className="colunas-fina"
            formatar={fmtBi} formatarTotal={(_, i) => rps.anos[i]}
            rotuloEixo="Participação de cada RP no autorizado, por exercício" />
        </CardPDF>

        <CardPDF titulo="Dotação inicial vs. dotação autorizada por exercício"
          sub="Quanto a dotação foi alterada da inicial para a autorizada em cada ano"
          total={`${saldoTotal >= 0 ? '+' : '−'} ${fmtBi(Math.abs(saldoTotal))}`}>
          <GraficoColunasAno anos={anos} series={serieIniAut} formatar={fmtBi} formatarTotal={() => ''}
            rotuloEixo="Dotação inicial e autorizada em cada exercício" />
          <div className="ciclo-tabela" role="table" aria-label="Saldo das dotações por exercício">
            <div className="ciclo-linha ciclo-cab" role="row">
              <span role="columnheader">Exercício</span><span role="columnheader">Inicial</span>
              <span role="columnheader">Autorizado</span><span role="columnheader">Saldo dotações</span>
            </div>
            {anosResumo.map((a) => (
              <div className="ciclo-linha" role="row" key={a.ano}>
                <span role="cell" className="ciclo-nome">{a.ano}</span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.ini)}</span></span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.aut)}</span></span>
                <span role="cell" className="ciclo-cel">
                  <span className="ciclo-val">{a.delta >= 0 ? '+' : '−'} {fmtBi(Math.abs(a.delta))}</span>
                  <span className={a.pctSaldo === null || a.pctSaldo === 0 ? 'var-nula' : a.pctSaldo > 0 ? 'var-sobe' : 'var-desce'}>
                    {a.pctSaldo === null ? '—' : a.pctSaldo === 0 ? 'sem alteração' : fmtVar(a.pctSaldo)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardPDF>
      </div>

      {/* página 4+: matriz de ações (fluida) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Ações orçamentárias por exercício"
          sub={`${fmtInt(acoes.total)} ações · dotação autorizada · R$ bilhões`}
          total={fmtBi(acoes.series.reduce((s, l) => s + l.total, 0))} fluido>
          <MatrizAnos anos={acoes.anos} linhas={acoes.series} formatar={fmtBiSeco}
            rotuloColuna="Ação orçamentária" destaqueCodigo />
        </CardPDF>
      </div>

      {/* página final: Força + Fonte Grupo */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Por Força, ao longo dos exercícios"
          sub="Dotação autorizada de cada Força em cada ano"
          total={fmtBi(forcas.series.reduce((s, x) => s + x.total, 0))}>
          <GraficoColunasAno anos={forcas.anos} series={forcas.series} rotularPercentual
            formatar={fmtBi} formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Dotação autorizada por Força em cada exercício" />
        </CardPDF>

        <CardPDF titulo="Por Fonte Grupo (Cod/Desc)"
          sub="Composição do autorizado por grupo de fonte, por exercício" total={fmtBi(totalPeriodo)}>
          <GraficoColunasAno anos={fgrupos.anos} series={fgrupos.series} empilhado className="colunas-fina"
            formatar={fmtBi} formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Valor por grupo de fonte, por exercício" />
        </CardPDF>
      </div>
    </>
  )
}

// ================================================== Dashboard Emendas (execução)
export function FolhaDashboardEmendasExec({ registros, filtrosTexto, anoTexto }) {
  const stats = resumo(registros)
  const porRPd = valorPorRP(registros)
  const impositivas = valorImpositivas(registros)
  const impCMilA = impositivasPorCMilA(registros)
  const autoresTop = topAutores(registros, 10)
  const partidos = valorPorPartido(registros)

  const totalImpositivas = impositivas.reduce((s, d) => s + d.valor, 0)
  const totalCMilA = impCMilA.reduce((s, d) => s + d.total, 0)
  const totalAutores = autoresTop.reduce((s, d) => s + d.valor, 0)
  const totalPartidos = partidos.reduce((s, d) => s + d.valor, 0)
  const totalRP6 = porRPd.find((d) => String(d.rp) === '6')?.valor ?? 0
  const pctAutoresRP6 = totalRP6 ? (totalAutores / totalRP6) * 100 : 0
  const pctImpositivas = stats.valorTotal ? (totalImpositivas / stats.valorTotal) * 100 : 0
  const heroi = fmtCompacto(stats.valorTotal)
  const imp = fmtCompacto(totalImpositivas)

  return (
    <>
      {/* página 1: cards, RP + Impositivas */}
      <div className="pdf-pagina">
        <Cabeca titulo="Análise Emendas — Execução LOA" valor={filtrosTexto}
          sec={`${anoTexto} · valor = autorizado`} />

        <div className="pdf-topo">
          <section className="pdf-mini pdf-mini-heroi">
            <p className="pdf-mini-rot">Valor total autorizado</p>
            <p className="pdf-mini-val">
              R$ {heroi.valor}{heroi.unidade && <span className="pdf-mini-un">{heroi.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">{fmtInt(stats.qtdEmendas)} emendas em {fmtInt(registros.length)} registros</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Emendas</p>
            <p className="pdf-mini-val">{fmtInt(stats.qtdEmendas)}</p>
            <p className="pdf-mini-nota">Emendas distintas no recorte</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Parlamentares</p>
            <p className="pdf-mini-val">{fmtInt(stats.qtdParlamentares)}</p>
            <p className="pdf-mini-nota">Autores distintos das emendas</p>
          </section>
          <section className="pdf-mini">
            <p className="pdf-mini-rot">Impositivas</p>
            <p className="pdf-mini-val">
              R$ {imp.valor}{imp.unidade && <span className="pdf-mini-un">{imp.unidade}</span>}
            </p>
            <p className="pdf-mini-nota">RP6 + RP7 · {fmtPct(pctImpositivas)} do total</p>
          </section>
        </div>

        <div className="pdf-linha-2">
          <CardPDF titulo="Emendas parlamentares — autorizado"
            sub="Valor autorizado por identificador de resultado primário (RP)" total={fmtMilhoes(stats.valorTotal)}>
            <GraficoPizza dados={porRPd} total={stats.valorTotal} />
          </CardPDF>
          <CardPDF titulo="Emendas impositivas"
            sub="RP6 por tipo de autor · RP7 por bancada" total={fmtMilhoes(totalImpositivas)}>
            <GraficoPizza dados={impositivas} total={totalImpositivas} />
          </CardPDF>
        </div>
      </div>

      {/* página 2: C Mil A + 10 maiores autores */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Impositivas por C Mil A"
          sub="Somente UO do Exército (Comando do Exército, IMBEL e Fundo do Exército)" total={fmtMilhoes(totalCMilA)}>
          <GraficoBarras dados={impCMilA} />
        </CardPDF>
        <CardPDF titulo="10 maiores autores"
          sub={`Deputados Federais e Senadores, por valor autorizado · ${fmtPct(pctAutoresRP6)} do RP6`}
          total={fmtMilhoes(totalAutores)}>
          <GraficoBarrasSimples dados={autoresTop} />
        </CardPDF>
      </div>

      {/* página 3+: emendas por partido (fluida) */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Emendas por partido"
          sub="Exclui comissões e bancadas (sem partido)" total={fmtMilhoes(totalPartidos)}>
          <GraficoPartidos dados={partidos} />
        </CardPDF>
      </div>
    </>
  )
}

// ================================================== Histórico Emendas (execução)
function Variacao({ pct }) {
  if (pct === null || !Number.isFinite(pct)) return <span className="var-nula">primeiro ano da série</span>
  const subiu = pct >= 0
  return <span className={subiu ? 'var-sobe' : 'var-desce'}>{subiu ? '▲' : '▼'} {fmtPct(Math.abs(pct))} vs. ano anterior</span>
}

export function FolhaHistoricoEmendasExec({ registros, registrosTodasForcas, filtrosTexto }) {
  const anosResumo = resumoPorAno(registros)
  const rp = rpPorAno(registros)
  const modalidade = modalidadePorAno(registros)
  const impositivas = impositivasPorAno(registros)
  const forca = forcaPorAno(registrosTodasForcas ?? registros)
  const cmila = cmilaPorAno(registros)
  const partidos = partidosPorAno(registros, 12)
  const autores = autoresRecorrentes(registros, 12)

  const anos = anosResumo.map((a) => a.ano)
  const totalPeriodo = anosResumo.reduce((s, a) => s + a.valor, 0)
  const emendasPeriodo = anosResumo.reduce((s, a) => s + a.qtdEmendas, 0)

  const serieValor = [{ chave: 'valor', rotulo: 'Valor autorizado', cor: 'var(--serie-azul)', valores: anosResumo.map((a) => a.valor) }]
  const serieContagem = [
    { chave: 'emendas', rotulo: 'Emendas', cor: 'var(--serie-azul)', valores: anosResumo.map((a) => a.qtdEmendas) },
    { chave: 'parlamentares', rotulo: 'Parlamentares', cor: 'var(--serie-verde)', valores: anosResumo.map((a) => a.qtdParlamentares) },
  ]

  return (
    <>
      {/* página 1: cards de exercício, valor por ano, emendas+parlamentares */}
      <div className="pdf-pagina">
        <Cabeca titulo="Análise Histórico Emendas — Execução LOA" valor={filtrosTexto}
          sec={`Comparativo dos exercícios ${anos.join(', ')} · ignora o filtro de Ano · valor = autorizado`} />

        <div className="pdf-anos">
          {anosResumo.map((a) => {
            const c = fmtCompacto(a.valor)
            return (
              <section className="pdf-ano" key={a.ano}>
                <p className="pdf-ano-ano">{a.ano}</p>
                <p className="pdf-ano-val">R$ {c.valor}{c.unidade && <span className="pdf-ano-un">{c.unidade}</span>}</p>
                <p className="pdf-ano-var"><Variacao pct={a.variacao} /></p>
                <dl className="pdf-ano-linhas">
                  <div><dt>Emendas</dt><dd>{fmtInt(a.qtdEmendas)}</dd></div>
                  <div><dt>Impositivas</dt><dd>{fmtMilhoes(a.impositivo)} <span className="ano-card-pct">({fmtPct(a.pctImpositivo)})</span></dd></div>
                </dl>
              </section>
            )
          })}
        </div>

        <CardPDF titulo="Valor autorizado por ano"
          sub="Total autorizado das emendas em cada exercício" total={fmtMilhoes(totalPeriodo)}>
          <GraficoColunasAno anos={anos} series={serieValor} formatar={fmtBRL} formatarTotal={fmtMilhoes}
            rotuloEixo="Valor autorizado em cada exercício" />
        </CardPDF>

        <CardPDF titulo="Emendas e parlamentares por ano"
          sub="Quantidade de emendas distintas e de autores distintos · tracejado = tendência"
          total={`${fmtInt(emendasPeriodo)} emendas`}>
          <GraficoColunasAno anos={anos} series={serieContagem} formatar={fmtInt} formatarTotal={() => ''}
            rotularBarras tendencia rotuloEixo="Emendas e parlamentares por exercício" />
        </CardPDF>
      </div>

      {/* página 2: impositivas, RP, modalidade */}
      <div className="pdf-pagina pdf-pagina-nova">
        <CardPDF titulo="Emendas impositivas por ano"
          sub="RP6 (individual) + RP7 (bancada) · o rótulo traz o % do total do ano"
          total={fmtMilhoes(anosResumo.reduce((s, a) => s + a.impositivo, 0))}>
          <GraficoColunasAno anos={anos} series={impositivas.series} empilhado formatar={fmtBRL}
            formatarTotal={(v, i) => `${fmtMilhoes(v)} (${fmtPct(anosResumo[i].pctImpositivo)})`}
            rotuloEixo="Valor impositivo por exercício"
            vazio="Sem emendas impositivas para os filtros aplicados." />
        </CardPDF>

        <CardPDF titulo="Composição por RP"
          sub="Participação de cada identificador de resultado primário no ano">
          <GraficoColunasAno anos={anos} series={rp.series} proporcao formatar={fmtBRL} formatarTotal={fmtMilhoes}
            rotuloEixo="Composição por RP em cada exercício" />
        </CardPDF>

        <CardPDF titulo="Composição por modalidade"
          sub="Individual, bancada estadual e comissão — participação no ano">
          <GraficoColunasAno anos={anos} series={modalidade.series} proporcao formatar={fmtBRL} formatarTotal={fmtMilhoes}
            rotuloEixo="Composição por modalidade em cada exercício" />
        </CardPDF>
      </div>

      {/* página 3+: matriz por Força + C Mil A (fluidas) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Por Força"
          sub="Valor autorizado por Força, consolidando as UO de cada uma · ignora o filtro de Órgão" fluido>
          <MatrizAnos anos={forca.anos} linhas={forca.series} formatar={fmtMilhoes} rotuloColuna="Força" />
        </CardPDF>
      </div>
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Impositivas por C Mil A"
          sub="RP6 + RP7 nas UO do Exército, por Comando Militar de Área" fluido>
          <MatrizAnos anos={cmila.anos} linhas={cmila.series} formatar={fmtMilhoes} rotuloColuna="C Mil A"
            vazio="Sem valores impositivos nas UO do Exército para os filtros aplicados." />
        </CardPDF>
      </div>

      {/* página 5+: partidos + autores recorrentes (fluidas) */}
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Partidos por ano"
          sub="12 maiores no período · exclui comissões e bancadas" fluido>
          <MatrizAnos anos={partidos.anos} linhas={partidos.series} formatar={fmtMilhoes} rotuloColuna="Partido" />
        </CardPDF>
      </div>
      <div className="pdf-pagina pdf-pagina-nova pdf-pagina-fluida">
        <CardPDF titulo="Autores recorrentes"
          sub="Parlamentares ordenados por número de exercícios com emenda e, em seguida, por valor" fluido>
          <MatrizAnos anos={autores.anos} linhas={autores.series} formatar={fmtMilhoes} rotuloColuna="Parlamentar"
            vazio="Sem parlamentares (Deputado/Senador) para os filtros aplicados." />
        </CardPDF>
      </div>
    </>
  )
}

// ============================================ Emendas LOA — tabelas por estado
// Modelo do arquivo de referência: impositivas do Exército (RP6+RP7), por
// C Mil A → Estado → modalidade. Uma página por C Mil A; tabelas longas quebram
// linha a linha (pdf.js pagina `table.matriz tbody`).
export function FolhaEmendasEstado({ registros, filtrosTexto }) {
  const agg = emendasImpositivasPorEstado(registros)
  const anosTxt = agg.anos.join(', ')

  if (!agg.grupos.length) {
    return (
      <div className="pdf-pagina">
        <Cabeca titulo={`Emendas Impositivas ao PLOA${anosTxt ? ' ' + anosTxt : ''}`} valor={filtrosTexto} />
        <p className="pdf-vazio">Sem emendas impositivas do Exército para os filtros aplicados.</p>
      </div>
    )
  }

  // Agrupa por C Mil A (cada comando abre uma página nova).
  const porCmila = []
  for (const g of agg.grupos) {
    const ult = porCmila[porCmila.length - 1]
    if (ult && ult.cmila === g.cmila) ult.grupos.push(g)
    else porCmila.push({ cmila: g.cmila, cmilaNome: g.cmilaNome, grupos: [g] })
  }

  return (
    <>
      {porCmila.map((bloco, bi) => (
        <div className={`pdf-pagina${bi > 0 ? ' pdf-pagina-nova' : ''}`} key={bloco.cmila}>
          <Cabeca
            titulo={`Emendas Impositivas ao PLOA${anosTxt ? ' ' + anosTxt : ''} — ${bloco.cmilaNome} (${bloco.cmila})`}
            valor={filtrosTexto}
            sec="Emendas impositivas do Exército (RP 6 individual e RP 7 de bancada) · valor = autorizado" />
          {bloco.grupos.map((g) => (
            <Fragment key={g.uf}>
              <h3 className="tab-estado">▸ {g.ufNome}</h3>
              {g.tabelas.map((t) => (
                <section className="pdf-card pdf-card-fluido tab-emendas-card" key={t.rp}>
                  <div className="pdf-card-cab">
                    <div className="pdf-card-txt"><h2>{t.rotulo}</h2></div>
                    <span className="pdf-card-total">Total R$ {rsInt(t.total)}</span>
                  </div>
                  <table className="matriz tab-emendas">
                    <thead>
                      <tr>
                        <th className="c-ord">ORD</th>
                        <th className="c-om">OM</th>
                        <th className="c-obj">OBJETO</th>
                        <th className="c-val">VALOR (R$)</th>
                        <th className="c-aut">{t.colAutor}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.linhas.map((l) => (
                        <tr key={l.ord}>
                          <td className="c-ord">{l.ord}</td>
                          <td className="c-om">{l.om || '—'}</td>
                          <td className="c-obj">{l.objeto || '—'}</td>
                          <td className="c-val">{rsInt(l.valor)}</td>
                          <td className="c-aut">{l.autor}</td>
                        </tr>
                      ))}
                      <tr className="tab-total">
                        <td className="c-ord" />
                        <td className="c-om" />
                        <td className="c-obj">TOTAL</td>
                        <td className="c-val">{rsInt(t.total)}</td>
                        <td className="c-aut" />
                      </tr>
                    </tbody>
                  </table>
                </section>
              ))}
            </Fragment>
          ))}
        </div>
      ))}
    </>
  )
}
