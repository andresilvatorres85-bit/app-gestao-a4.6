import { useMemo, useState } from 'react'
import { fmtMilhoes } from '../dados.js'

// Barras horizontais empilhadas de CONTENÇÃO DE GASTOS: cada barra soma
// Bloqueio + Contingenciamento (por exercício, em regra, só um deles tem
// valor). Mesma diagramação do gráfico por C Mil A (classes `.cmila*`), mas
// genérico e paginado — a lista de ações/emendas pode ser longa.
const SERIES = [
  { chave: 'bloq', rotulo: 'Bloqueio', cor: 'var(--serie-laranja)' },
  { chave: 'conting', rotulo: 'Contingenciamento', cor: 'var(--serie-violeta)' },
]

export default function GraficoContencao({
  dados,
  limite = 12,
  passoExpansao = 12,
  vazio = 'Sem valores de contenção (Bloqueio/Contingenciamento) para os filtros aplicados.',
}) {
  const [hover, setHover] = useState(null)
  const [mostrar, setMostrar] = useState(limite)

  const max = useMemo(() => Math.max(1, ...dados.map((d) => d.total)), [dados])

  if (!dados.length) return <p className="grafico-vazio">{vazio}</p>

  const visiveis = dados.slice(0, mostrar)
  const restam = dados.length - visiveis.length
  const proximo = Math.min(passoExpansao, restam)

  return (
    <figure className="cmila" aria-label="Gráfico de barras: contenção de gastos (Bloqueio e Contingenciamento)">
      <ol className="cmila-lista">
        {visiveis.map((d) => {
          const larguraTotal = (d.total / max) * 100
          return (
            <li className="cmila-item" key={d.chave}>
              <div className="cmila-topo">
                {d.codigo && <span className="cmila-sigla">{d.codigo}</span>}
                <span className="cmila-nome" title={d.sublinha || d.rotulo}>{d.rotulo}</span>
                <span className="cmila-total">{fmtMilhoes(d.total)}</span>
              </div>
              <div className="cmila-barra" style={{ width: `${larguraTotal}%` }}>
                {SERIES.map((s) =>
                  d[s.chave] > 0 ? (
                    <span
                      key={s.chave}
                      className="cmila-seg"
                      title={`${d.rotulo} · ${s.rotulo}: ${fmtMilhoes(d[s.chave])}`}
                      style={{
                        width: `${(d[s.chave] / d.total) * 100}%`,
                        background: s.cor,
                        opacity: hover === null || hover === s.chave ? 1 : 0.35,
                      }}
                      onMouseEnter={() => setHover(s.chave)}
                      onMouseLeave={() => setHover(null)}
                    />
                  ) : null
                )}
              </div>
              <div className="cmila-quebra">
                {d.sublinha && <span className="cmila-quebra-item cmila-sub">{d.sublinha}</span>}
                {SERIES.filter((s) => d[s.chave] > 0).map((s) => (
                  <span key={s.chave} className="cmila-quebra-item">
                    <span className="cmila-ponto" style={{ background: s.cor }} aria-hidden />
                    {s.rotulo} {fmtMilhoes(d[s.chave])}
                  </span>
                ))}
              </div>
            </li>
          )
        })}
      </ol>

      {(restam > 0 || mostrar > limite) && (
        <div className="pbar-expansao no-print">
          {restam > 0 && (
            <button type="button" className="pbar-btn" onClick={() => setMostrar((m) => m + proximo)}>
              Mostrar + <span className="pbar-btn-nota">({proximo} de {restam} restantes)</span>
            </button>
          )}
          {mostrar > limite && (
            <button type="button" className="pbar-btn" onClick={() => setMostrar(limite)}>
              Mostrar −
            </button>
          )}
        </div>
      )}

      <figcaption className="barras-legenda">
        {SERIES.map((s) => (
          <span
            className="barras-legenda-item"
            key={s.chave}
            onMouseEnter={() => setHover(s.chave)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="legenda-cor" style={{ background: s.cor }} aria-hidden />
            {s.rotulo}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
