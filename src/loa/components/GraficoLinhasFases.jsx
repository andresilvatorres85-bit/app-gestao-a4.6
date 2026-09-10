import { useMemo, useState } from 'react'

// Gráfico de linhas do ciclo do PLOA: o eixo x são as FASES do rito (PL →
// Ciclo Setorial → Ciclo Geral → Ciclo Plenário → Autógrafo) e cada série é um
// EXERCÍCIO — uma linha acompanhando a trajetória daquele ano ao longo das
// cinco fases.
//
// É a única leitura do app em que o ano vai na cor (uma linha por exercício):
// aqui a posição já carrega a fase, então a série só pode ser o ano. A paleta é
// a categórica já validada (não uma rampa sequencial), e cada linha também se
// distingue pelo próprio traçado — a cor não é a única codificação.
//
// Pontos `null` (fase sem coluna na planilha daquele ano — semAut) QUEBRAM a
// linha em vez de puxá-la a zero. Um exercício com um só ponto (só o PL, no
// início do rito) aparece como um marcador solto, sem segmento.

// Escala "redonda" para o topo do eixo, para os rótulos de valor caírem em
// números limpos. Devolve o próprio máximo quando ele já é 0.
function maxRedondo(max) {
  if (!(max > 0)) return 1
  const exp = Math.floor(Math.log10(max))
  const base = 10 ** exp
  const passo = [1, 2, 2.5, 5, 10].find((p) => p * base >= max) ?? 10
  return passo * base
}

// Passo "redondo" para uma faixa arbitrária (usado no eixo com zoom): mantém o
// domínio exato pedido (min−margem, max+margem) mas põe as marcas em números
// limpos dentro dele.
function passoNice(range, alvo = 5) {
  if (!(range > 0)) return 1
  const bruto = range / alvo
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const norm = bruto / mag
  const passo = norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1
  return passo * mag
}
function ticksNaFaixa(min, max, alvo = 5) {
  const passo = passoNice(max - min, alvo)
  const t = []
  for (let v = Math.ceil(min / passo) * passo; v <= max + passo * 1e-6; v += passo) t.push(v)
  return t
}

// Geometria em unidades do viewBox. Proporção real (não há distorção como no
// SVG de tendências das colunas), então marcadores saem redondos. viewBox mais
// largo (panorâmico) e o CSS fixa aspect-ratio = VB_W/VB_H, então o gráfico
// ocupa toda a largura do painel sem sobra lateral (letterbox).
const VB_W = 1120
const VB_H = 360
const PADL = 78
const PADR = 28
const PADT = 22
const PADB = 48
const PLOT_W = VB_W - PADL - PADR
const PLOT_H = VB_H - PADT - PADB
const Y_BASE = PADT + PLOT_H // y do piso do eixo (yMin)

export default function GraficoLinhasFases({
  fases,
  series,
  formatar = (v) => v,
  formatarTick = (v) => v,
  rotuloEixo,
  // Quando > 0, o eixo Y dá "zoom" na faixa dos dados: vai de (menor − margem)
  // a (maior + margem), em vez de 0 → topo. Para o ciclo do PLOA passamos 1 bi,
  // então as linhas (todas ~120–148 bi) deixam de ficar achatadas contra o zero.
  margemEixo = 0,
  vazio = 'Sem valores para os filtros aplicados.',
}) {
  const [hover, setHover] = useState(null)

  const { yMin, yMax, ticks } = useMemo(() => {
    const todos = series.flatMap((s) => s.valores.filter((v) => v != null && Number.isFinite(v)))
    if (!todos.length) return { yMin: 0, yMax: 1, ticks: [0, 1] }
    const dMin = Math.min(...todos)
    const dMax = Math.max(...todos)
    if (margemEixo > 0) {
      const lo = Math.max(0, dMin - margemEixo)
      const hi = dMax + margemEixo > lo ? dMax + margemEixo : lo + 1
      return { yMin: lo, yMax: hi, ticks: ticksNaFaixa(lo, hi) }
    }
    const hi = maxRedondo(dMax)
    const N = 4
    return { yMin: 0, yMax: hi, ticks: Array.from({ length: N + 1 }, (_, k) => (hi * k) / N) }
  }, [series, margemEixo])

  const n = fases.length
  const xAt = (i) => (n <= 1 ? PADL + PLOT_W / 2 : PADL + (i / (n - 1)) * PLOT_W)
  const yAt = (v) => {
    const t = (Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin || 1)
    return Y_BASE - t * PLOT_H
  }

  const temAlgumValor = series.some((s) => s.valores.some((v) => v != null && v > 0))
  if (!n || !series.length || !temAlgumValor) {
    return <p className="grafico-vazio">{vazio}</p>
  }

  // Um <path> por série, quebrado em subtrajetos onde há `null`, para a linha
  // não cruzar a lacuna.
  const caminho = (valores) => {
    let d = ''
    let abrindo = true
    valores.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        abrindo = true
        return
      }
      d += `${abrindo ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)} `
      abrindo = false
    })
    return d.trim()
  }

  const linhas = series.map((s) => ({
    ...s,
    d: caminho(s.valores),
    pontos: s.valores
      .map((v, i) => (v == null || !Number.isFinite(v) ? null : { i, v, x: xAt(i), y: yAt(v) }))
      .filter(Boolean),
  }))

  return (
    <figure className="linhas-fases" aria-label={rotuloEixo || 'Fases do ciclo por exercício'}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" preserveAspectRatio="xMidYMid meet">
        {/* grade horizontal + rótulos de valor (marcas na faixa com zoom) */}
        {ticks.map((v, k) => {
          const y = yAt(v)
          return (
            <g key={k}>
              <line
                className="lf-grade"
                x1={PADL} y1={y} x2={VB_W - PADR} y2={y}
                vectorEffect="non-scaling-stroke"
              />
              <text className="lf-tick-y" x={PADL - 10} y={y} dy="0.32em" textAnchor="end">
                {formatarTick(v)}
              </text>
            </g>
          )
        })}

        {/* rótulos das fases (eixo x) — primeiro e último ancorados nas pontas
            para não vazar a viewBox em telas estreitas */}
        {fases.map((f, i) => {
          const ancora = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'
          return (
            <text key={f} className="lf-tick-x" x={xAt(i)} y={Y_BASE + 26} textAnchor={ancora}>
              {f}
            </text>
          )
        })}

        {/* linhas dos exercícios */}
        {linhas.map((l) => {
          const ativo = hover === null || hover === l.chave
          return (
            <path
              key={l.chave}
              className="lf-linha"
              d={l.d}
              fill="none"
              stroke={l.cor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={ativo ? 1 : 0.18}
              onMouseEnter={() => setHover(l.chave)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}

        {/* marcadores por ponto, com tooltip nativo */}
        {linhas.map((l) => {
          const ativo = hover === null || hover === l.chave
          return l.pontos.map((p) => (
            <circle
              key={`${l.chave}-${p.i}`}
              className="lf-ponto"
              cx={p.x} cy={p.y} r={l.pontos.length === 1 ? 4.5 : 3.5}
              fill={l.cor}
              stroke="var(--superficie)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              opacity={ativo ? 1 : 0.18}
              onMouseEnter={() => setHover(l.chave)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${l.rotulo} · ${fases[p.i]}: ${formatar(p.v)}`}</title>
            </circle>
          ))
        })}
      </svg>

      <figcaption className="barras-legenda">
        {series.map((s) => (
          <span
            className="barras-legenda-item"
            key={s.chave}
            onMouseEnter={() => setHover(s.chave)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="legenda-linha" style={{ background: s.cor }} aria-hidden />
            {s.rotulo}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
