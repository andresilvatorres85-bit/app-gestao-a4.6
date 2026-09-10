import { useMemo } from 'react'
import { fmtCompacto, fmtInt, fmtPct } from '../dados.js'
import { fmtBi, fmtBiSeco, fmtVar } from '../ploa.js'
import {
  resumoPorAnoExec, forcaPorAnoExec, uoPorAnoExec, rpPorAnoExec, gndPorAnoExec,
  acaoPorAnoExec, fonteGrupoPorAno,
} from '../execucao.js'
import BotaoPNG from './BotaoPNG.jsx'
import GraficoColunasAno from './GraficoColunasAno.jsx'
import MatrizAnos from './MatrizAnos.jsx'

// Subaba "Histórico LOA" (seção EXECUÇÃO LOA). Mesma diagramação do Histórico
// PLOA, mas sobre a base de EXECUÇÃO e consolidando o AUTORIZADO. Como o
// Histórico PLOA, esta IGNORA o filtro de Ano (é o que ela compara) e respeita
// os demais. Exportação por PNG (sem PPTX/PDF nesta etapa).

function Variacao({ pct }) {
  if (pct === null || !Number.isFinite(pct)) {
    return <span className="var-nula">primeiro exercício da série</span>
  }
  const subiu = pct >= 0
  return (
    <span className={subiu ? 'var-sobe' : 'var-desce'}>
      {subiu ? '▲' : '▼'} {fmtPct(Math.abs(pct))} vs. exercício anterior
    </span>
  )
}

export default function AbaHistoricoExec({ registros, registrosTodasForcas, contexto }) {
  const todasForcas = registrosTodasForcas ?? registros
  const anosResumo = useMemo(() => resumoPorAnoExec(registros), [registros])
  const forcas = useMemo(() => forcaPorAnoExec(todasForcas), [todasForcas])
  const uos = useMemo(() => uoPorAnoExec(registros), [registros])
  const rps = useMemo(() => rpPorAnoExec(registros), [registros])
  const gnds = useMemo(() => gndPorAnoExec(registros), [registros])
  const acoes = useMemo(() => acaoPorAnoExec(registros, Infinity), [registros])
  const fgrupos = useMemo(() => fonteGrupoPorAno(registros), [registros])

  const anos = anosResumo.map((a) => a.ano)
  if (!anos.length) {
    return (
      <p className="vazio">
        Nenhuma dotação de execução para os filtros aplicados. Limpe algum filtro para
        voltar a comparar os exercícios.
      </p>
    )
  }

  // Total consolidado do período = soma do Autorizado de cada exercício.
  const totalPeriodo = anosResumo.reduce((s, a) => s + a.aut, 0)

  const CORES_ANO = [
    'var(--serie-azul)', 'var(--serie-verde)', 'var(--serie-laranja)',
    'var(--serie-violeta)', 'var(--serie-aqua)', 'var(--serie-magenta)',
    'var(--serie-amarelo)', 'var(--serie-vermelho)',
  ]
  const coresPorAno = anosResumo.map((_, i) => CORES_ANO[i % CORES_ANO.length])

  // Série principal: o Autorizado de cada exercício.
  const serieAut = [{
    chave: 'aut', rotulo: 'Autorizado', cor: 'var(--serie-azul)',
    valores: anosResumo.map((a) => a.aut),
  }]
  // Dotação inicial × autorizado: as duas pontas em cada exercício.
  const serieIniAut = [
    { chave: 'ini', rotulo: 'Dotação inicial', cor: 'var(--serie-azul)', valores: anosResumo.map((a) => a.ini) },
    { chave: 'aut', rotulo: 'Autorizado', cor: 'var(--serie-laranja)', valores: anosResumo.map((a) => a.aut) },
  ]
  const saldoTotal = anosResumo.reduce((s, a) => s + a.delta, 0)

  return (
    <div className="ploa-tela">
      <header className="folha-cab">
        <h2>EXECUÇÃO DA LOA — HISTÓRICO DOS EXERCÍCIOS</h2>
        <p>Ministério da Defesa · Órgão 52000 · todos os setores</p>
        <p>{contexto}</p>
      </header>

      <p className="historico-intro">
        Comparativo dos {anos.length} exercícios presentes na planilha de execução
        ({anos.join(', ')}). Esta subaba <strong>ignora o filtro de Ano</strong> — é o que ela
        compara — mas respeita todos os demais filtros da barra acima. Os valores são os da
        <strong> dotação autorizada</strong>, salvo onde o painel diz o contrário.
      </p>

      <div className="historico-anos" role="region" aria-label="Resumo por exercício">
        {anosResumo.map((a) => {
          const c = fmtCompacto(a.aut)
          const d = fmtCompacto(Math.abs(a.delta))
          return (
            <section className="ano-card" key={a.ano}>
              <p className="ano-card-ano">{a.ano}</p>
              <p className="ano-card-valor">
                R$ {c.valor}
                {c.unidade && <span className="ano-card-unidade">{c.unidade}</span>}
              </p>
              <p className="ano-card-var"><Variacao pct={a.variacao} /></p>
              <dl className="ano-card-linhas">
                <div><dt>Dotação inicial</dt><dd>{fmtBi(a.ini)}</dd></div>
                <div>
                  <dt>Saldo dotações</dt>
                  <dd className={a.delta >= 0 ? 'var-sobe' : 'var-desce'}>
                    {a.delta >= 0 ? '+' : '−'} R$ {d.valor} {d.unidade}
                  </dd>
                </div>
                <div><dt>Dotações</dt><dd>{fmtInt(a.linhas)}</dd></div>
              </dl>
            </section>
          )
        })}
      </div>

      <div className="paineis">
        {/* 1 — Lei Orçamentária Anual por exercício (total autorizado) */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Lei Orçamentária Anual por exercício</h2>
              <p className="painel-sub">Somatório da dotação autorizada em cada exercício</p>
            </div>
            <span className="painel-total">{fmtBi(totalPeriodo)}</span>
            <BotaoPNG titulo="Lei Orçamentária Anual por exercício" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={anos}
            series={serieAut}
            corPorColuna={coresPorAno}
            formatar={fmtBi}
            formatarTotal={(v) => fmtBi(v)}
            tendencia
            rotuloEixo="Dotação autorizada em cada exercício"
          />
        </section>

        {/* 2 — composição por GND */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Composição por GND</h2>
              <p className="painel-sub">Participação de cada grupo de natureza da despesa no autorizado</p>
            </div>
            <span className="painel-total">{fmtBi(totalPeriodo)}</span>
            <BotaoPNG titulo="Composição por GND" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={gnds.anos}
            series={gnds.series}
            empilhado
            className="colunas-fina"
            formatar={fmtBi}
            formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Valor por grupo de natureza da despesa, por exercício"
          />
        </section>

        {/* 3 — matriz de UO */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Unidades orçamentárias por exercício</h2>
              <p className="painel-sub">
                {uos.series.length} UO · dotação autorizada · valores em R$ bilhões
              </p>
            </div>
            <span className="painel-total">{fmtBi(uos.series.reduce((s, l) => s + l.total, 0))}</span>
            <BotaoPNG titulo="Unidades orçamentárias por exercício" contexto={contexto} />
          </div>
          <MatrizAnos
            anos={uos.anos}
            linhas={uos.series}
            formatar={fmtBiSeco}
            rotuloColuna="Unidade orçamentária"
            limite={5}
            passoExpansao={5}
          />
        </section>

        {/* 4 — composição por RP */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Composição por RP</h2>
              <p className="painel-sub">Participação de cada resultado primário no autorizado de cada ano</p>
            </div>
            <span className="painel-total">{fmtBi(totalPeriodo)}</span>
            <BotaoPNG titulo="Composição por RP" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={rps.anos}
            series={rps.series}
            proporcao
            className="colunas-fina"
            formatar={fmtBi}
            formatarTotal={(_, i) => rps.anos[i]}
            rotuloEixo="Participação de cada RP no autorizado, por exercício"
          />
        </section>

        {/* 5 — dotação inicial × autorizada por exercício */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Dotação inicial vs. dotação autorizada por exercício</h2>
              <p className="painel-sub">Quanto a dotação foi alterada da inicial para a autorizada em cada ano</p>
            </div>
            <span className="painel-total">
              {`${saldoTotal >= 0 ? '+' : '−'} ${fmtBi(Math.abs(saldoTotal))}`}
            </span>
            <BotaoPNG titulo="Dotação inicial vs. dotação autorizada por exercício" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={anos}
            series={serieIniAut}
            formatar={fmtBi}
            formatarTotal={() => ''}
            rotuloEixo="Dotação inicial e autorizada em cada exercício"
          />
          <div className="ciclo-tabela" role="table" aria-label="Saldo das dotações por exercício">
            <div className="ciclo-linha ciclo-cab" role="row">
              <span role="columnheader">Exercício</span>
              <span role="columnheader">Inicial</span>
              <span role="columnheader">Autorizado</span>
              <span role="columnheader">Saldo dotações</span>
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
        </section>

        {/* 6 — matriz de ações */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Ações orçamentárias por exercício</h2>
              <p className="painel-sub">
                {fmtInt(acoes.total)} ações · dotação autorizada · valores em R$ bilhões
              </p>
            </div>
            <span className="painel-total">{fmtBi(acoes.series.reduce((s, l) => s + l.total, 0))}</span>
            <BotaoPNG titulo="Ações orçamentárias por exercício" contexto={contexto} />
          </div>
          <MatrizAnos
            anos={acoes.anos}
            linhas={acoes.series}
            formatar={fmtBiSeco}
            rotuloColuna="Ação orçamentária"
            limite={15}
            passoExpansao={15}
            destaqueCodigo
          />
        </section>

        {/* 7 — por Força */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Por Força, ao longo dos exercícios</h2>
              <p className="painel-sub">Dotação autorizada de cada Força em cada ano</p>
            </div>
            <span className="painel-total">{fmtBi(forcas.series.reduce((s, x) => s + x.total, 0))}</span>
            <BotaoPNG titulo="Por Força, ao longo dos exercícios" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={forcas.anos}
            series={forcas.series}
            rotularPercentual
            formatar={fmtBi}
            formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Dotação autorizada por Força em cada exercício"
          />
          <p className="painel-rodape">
            Rótulo em cada barra: participação da Força no total do exercício.
            Painel comparativo entre Forças — ignora também o filtro de Órgão.
          </p>
        </section>

        {/* 8 — por Fonte Grupo (Cod/Desc) */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Por Fonte Grupo (Cod/Desc)</h2>
              <p className="painel-sub">Composição do autorizado por grupo de fonte, por exercício</p>
            </div>
            <span className="painel-total">{fmtBi(totalPeriodo)}</span>
            <BotaoPNG titulo="Por Fonte Grupo" contexto={contexto} />
          </div>
          <GraficoColunasAno
            anos={fgrupos.anos}
            series={fgrupos.series}
            empilhado
            className="colunas-fina"
            formatar={fmtBi}
            formatarTotal={(v) => fmtBi(v)}
            rotuloEixo="Valor por grupo de fonte, por exercício"
          />
        </section>
      </div>
    </div>
  )
}
