import { useMemo } from 'react'
import {
  resumo, valorPorRP, valorImpositivas, impositivasPorCMilA, topAutores, valorPorPartido,
  fmtBRL, fmtCompacto, fmtInt, fmtMilhoes, fmtPct,
} from '../dados.js'
import BotaoPNG from './BotaoPNG.jsx'
import GraficoPizza from './GraficoPizza.jsx'
import GraficoBarras from './GraficoBarras.jsx'
import GraficoBarrasSimples from './GraficoBarrasSimples.jsx'
import GraficoPartidos from './GraficoPartidos.jsx'

// Subaba "Dashboard Emendas" (seção EXECUÇÃO LOA). Mesma diagramação do Dashboard
// da seção RESULTADO LEXOR, mas sobre as EMENDAS DA EXECUÇÃO (valor = Autorizado).
// Reaproveita as agregações de dados.js — os registros têm o mesmo formato das
// emendas apresentadas. Exportação por PNG (sem PPTX nesta etapa).
export default function AbaDashboardEmendasExec({ registros, contexto, anoTexto }) {
  const stats = useMemo(() => resumo(registros), [registros])
  const porRP = useMemo(() => valorPorRP(registros), [registros])
  const impositivas = useMemo(() => valorImpositivas(registros), [registros])
  const impCMilA = useMemo(() => impositivasPorCMilA(registros), [registros])
  const autoresTop = useMemo(() => topAutores(registros, 10), [registros])
  const partidos = useMemo(() => valorPorPartido(registros), [registros])

  const totalImpositivas = impositivas.reduce((s, d) => s + d.valor, 0)
  const totalCMilA = impCMilA.reduce((s, d) => s + d.total, 0)
  const totalAutores = autoresTop.reduce((s, d) => s + d.valor, 0)
  const totalPartidos = partidos.reduce((s, d) => s + d.valor, 0)
  const totalRP6 = porRP.find((d) => String(d.rp) === '6')?.valor ?? 0
  const pctAutoresRP6 = totalRP6 ? (totalAutores / totalRP6) * 100 : 0
  const pctImpositivas = stats.valorTotal ? (totalImpositivas / stats.valorTotal) * 100 : 0
  const heroi = fmtCompacto(stats.valorTotal)
  const impositivo = fmtCompacto(totalImpositivas)

  return (
    <>
      <div className="destaque" role="region" aria-label="Indicadores">
        <section className="heroi">
          <p className="heroi-rotulo">Valor total autorizado</p>
          <p className="heroi-valor">
            R$ {heroi.valor}
            {heroi.unidade && <span className="heroi-unidade">{heroi.unidade}</span>}
          </p>
          <p className="heroi-exato">{fmtBRL(stats.valorTotal)}</p>
          <p className="heroi-nota">
            {anoTexto} · {fmtInt(stats.qtdEmendas)} emendas em {fmtInt(registros.length)} registros
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
              <h2>Emendas parlamentares — autorizado</h2>
              <p className="painel-sub">Valor autorizado por identificador de resultado primário (RP)</p>
            </div>
            <span className="painel-total">{fmtMilhoes(stats.valorTotal)}</span>
            <BotaoPNG titulo="Emendas parlamentares — autorizado" contexto={contexto} />
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
            <BotaoPNG titulo="Emendas impositivas" contexto={contexto} />
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
            <BotaoPNG titulo="Impositivas por C Mil A" contexto={contexto} />
          </div>
          <GraficoBarras dados={impCMilA} />
        </section>

        <section className="painel-grafico p-6">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>10 maiores autores</h2>
              <p className="painel-sub">Deputados Federais e Senadores, por valor autorizado</p>
            </div>
            <span className="painel-total">
              {fmtMilhoes(totalAutores)}
              <span className="painel-total-nota"> ({fmtPct(pctAutoresRP6)} do RP6)</span>
            </span>
            <BotaoPNG titulo="10 maiores autores" contexto={contexto} />
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
            <BotaoPNG titulo="Emendas por partido" contexto={contexto} />
          </div>
          <GraficoPartidos dados={partidos} />
        </section>
      </div>
    </>
  )
}
