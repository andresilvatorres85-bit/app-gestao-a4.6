import { useMemo, useState } from 'react'
import { fmtPct } from '../dados.js'
import { fmtBi, fmtVar, variacao } from '../ploa.js'

// Barras horizontais para a aba EXECUÇÃO LOA. Estrutura idêntica à do
// GraficoBarrasPLOA (mesmas classes CSS), mas com a terminologia desta base:
//   BARRA  = Autorizado (dotação autorizada)   -> campo `valor`
//   TRAÇO  = Dotação Inicial                    -> campo `pl`
// Mantido à parte para não tocar no componente do PLOA (pedido do usuário).
//
// `limite` mostra só os N primeiros e revela o resto em blocos de
// `passoExpansao` (a lista de ações e de fontes é longa).
export default function GraficoBarrasExec({
  dados,
  corPadrao = 'var(--acento)',
  formatar = fmtBi,
  vazio = 'Sem dotações para os filtros aplicados.',
  rotuloGrafico = 'Autorizado por categoria (traço = dotação inicial)',
  corNumero = null,
  limite = null,
  passoExpansao = 15,
  mostrarPercentual = false,
  comparar = true,
}) {
  const [hover, setHover] = useState(null)
  const [mostrar, setMostrar] = useState(limite ?? dados.length)

  const max = useMemo(
    () => Math.max(1, ...dados.map((d) => Math.max(d.valor || 0, comparar ? d.pl || 0 : 0))),
    [dados, comparar]
  )
  const totalPct = useMemo(
    () => dados.reduce((s, d) => s + (d.valor || 0), 0),
    [dados]
  )

  if (!dados.length) return <p className="grafico-vazio">{vazio}</p>

  const visiveis = limite === null ? dados : dados.slice(0, mostrar)
  const restam = dados.length - visiveis.length
  const proximo = Math.min(passoExpansao, restam)

  return (
    <figure className="pbar" aria-label={rotuloGrafico}>
      <ol className="pbar-lista">
        {visiveis.map((d, i) => {
          const aut = d.valor || 0
          const ini = d.pl || 0
          const pct = comparar ? variacao(ini, aut) : null
          const ativo = hover === null || hover === d.chave
          return (
            <li
              className="pbar-item"
              key={d.chave ?? `${d.rotulo}-${i}`}
              style={{ opacity: ativo ? 1 : 0.45 }}
              onMouseEnter={() => setHover(d.chave)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="pbar-topo">
                <span className="pbar-rotulo" title={d.sublinha || d.rotulo}>
                  <span className="pbar-chave" style={{ background: d.cor || corPadrao }} aria-hidden />
                  {d.codigo && (
                    <span className="pbar-codigo" style={corNumero ? { color: corNumero } : undefined}>
                      {d.codigo}
                    </span>
                  )}
                  <span className="pbar-nome">{d.rotulo}</span>
                  {d.sublinha && !d.codigo && <span className="pbar-sub">{d.sublinha}</span>}
                </span>
                <span className="pbar-valor">
                  {formatar(aut)}
                  {mostrarPercentual && totalPct > 0 && (
                    <span className="pbar-pct"> ({fmtPct((aut / totalPct) * 100)})</span>
                  )}
                </span>
              </div>

              <div className="pbar-trilho">
                <span
                  className="pbar-barra"
                  style={{ width: `${(aut / max) * 100}%`, background: d.cor || corPadrao }}
                  title={`Autorizado: ${formatar(aut)}`}
                />
                {comparar && ini > 0 && (
                  <span
                    className="pbar-marca-pl"
                    style={{ left: `${(ini / max) * 100}%` }}
                    title={`Dotação inicial: ${formatar(ini)}`}
                    aria-hidden
                  />
                )}
              </div>

              {comparar && (
                <p className="pbar-nota">
                  <span className="pbar-nota-pl">Dotação inicial {formatar(ini)}</span>
                  <span className={pct === null ? 'var-nula' : pct >= 0 ? 'var-sobe' : 'var-desce'}>
                    {pct === null ? 'sem dotação inicial' : `${pct >= 0 ? '▲' : '▼'} ${fmtVar(pct)}`}
                  </span>
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {limite !== null && (restam > 0 || mostrar > limite) && (
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

      {comparar && (
        <figcaption className="barras-legenda">
          <span className="barras-legenda-item">
            <span className="legenda-cor" style={{ background: corPadrao }} aria-hidden />
            Barra: dotação autorizada
          </span>
          <span className="barras-legenda-item">
            <span className="legenda-marca-pl" aria-hidden />
            Traço: dotação inicial
          </span>
        </figcaption>
      )}
    </figure>
  )
}
