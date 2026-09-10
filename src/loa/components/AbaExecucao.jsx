import { useMemo } from 'react'
import { fmtCompacto, fmtInt, fmtPct } from '../dados.js'
import {
  AGREGADOS, fmtBi, fmtVar, variacao,
  somaTotais, porRP, porGND, porUO, acoesOrdenadas, porForca, iniVsAutorizado, porFonte,
} from '../execucao.js'
import BotaoPNG from './BotaoPNG.jsx'
import GraficoBarrasExec from './GraficoBarrasExec.jsx'
import GraficoColunasAno from './GraficoColunasAno.jsx'

// Subaba "Dashboard LOA" (seção EXECUÇÃO LOA). Mesma diagramação do Dashboard
// PLOA, mas sobre a base de EXECUÇÃO (Dotação Inicial × Autorizado). Recebe as
// dotações já filtradas; `registrosTodasForcas` é o mesmo recorte SEM o filtro
// de Órgão — os painéis que comparam Forças precisam das quatro, não de uma só.
export default function AbaExecucao({
  registros, registrosTodasForcas, anos, contexto,
}) {
  const todasForcas = registrosTodasForcas ?? registros
  const totais = useMemo(() => somaTotais(registros), [registros])
  const rps = useMemo(() => porRP(registros), [registros])
  const gnds = useMemo(() => porGND(registros), [registros])
  const uos = useMemo(() => porUO(registros), [registros])
  const acoes = useMemo(() => acoesOrdenadas(registros), [registros])
  const forcas = useMemo(() => porForca(todasForcas), [todasForcas])
  const iniAut = useMemo(() => iniVsAutorizado(todasForcas), [todasForcas])
  const fontes = useMemo(() => porFonte(registros), [registros])

  if (!registros.length) {
    return (
      <p className="vazio">
        Nenhuma dotação de execução para os filtros aplicados. A base de execução da LOA
        cobre os exercícios {anos.join(', ')} — se o filtro de Ano estiver fora dessa
        faixa, ajuste-o para voltar a ver os painéis.
      </p>
    )
  }

  const anosEmTela = [...new Set(registros.map((r) => r.ano))].sort()
  const totalAut = totais.aut
  const totalIni = totais.ini
  const totalCont = totais.cont
  const varDot = totais.variacao // Autorizado − Inicial
  const heroi = fmtCompacto(totalAut)
  const cInicial = fmtCompacto(totalIni)
  const cCont = fmtCompacto(totalCont)
  const cVar = fmtCompacto(Math.abs(varDot))
  const pctVar = variacao(totalIni, totalAut)

  // Total das Forças (ignora o filtro de Órgão): tem base própria, senão o
  // cabeçalho contradiria o gráfico que mostra as quatro Forças.
  const totalAutForcas = forcas.reduce((s, a) => s + a.valor, 0)
  const totalIniForcas = forcas.reduce((s, a) => s + a.pl, 0)
  const deltaForcas = totalAutForcas - totalIniForcas

  // Dotação inicial × autorizado: o eixo são as Forças; as duas séries são as
  // pontas (inicial e autorizado). As barras herdam a cor da Força (corPorColuna).
  const catsForca = iniAut.map((a) => a.rotulo)
  const coresForca = iniAut.map((a) => a.cor)
  const serieIniAut = [
    { chave: 'ini', rotulo: 'Dotação inicial', cor: 'var(--tinta-3)', valores: iniAut.map((a) => a.ini) },
    { chave: 'aut', rotulo: 'Autorizado', cor: 'var(--tinta-3)', valores: iniAut.map((a) => a.aut) },
  ]

  return (
    <div className="ploa-tela">
      <header className="folha-cab">
        <h2>EXECUÇÃO DA LOA — DESPESA POR DOTAÇÃO</h2>
        <p>Ministério da Defesa · Órgão 52000 · todos os setores</p>
        <p>{contexto}</p>
      </header>

      <div className="destaque destaque-ploa" role="region" aria-label="Indicadores da execução da LOA">
        {/* Card maior: Dotação autorizada — o total efetivamente autorizado, a
            referência primária desta análise. */}
        <section className="heroi">
          <p className="heroi-rotulo">Dotação autorizada</p>
          <p className="heroi-valor">
            R$ {heroi.valor}
            {heroi.unidade && <span className="heroi-unidade">{heroi.unidade}</span>}
          </p>
          <p className="heroi-nota">
            Autorizado · exercício {anosEmTela.join(', ')} · {fmtInt(registros.length)} dotações
          </p>
        </section>

        <div className="tiras">
          <section className="tira">
            <p className="tira-rotulo">Dotação inicial</p>
            <p className="tira-valor">
              R$ {cInicial.valor}
              <span className="tira-unidade">{cInicial.unidade}</span>
            </p>
            <p className="tira-nota">Dotação inicial da LOA</p>
          </section>
          <section className="tira">
            <p className="tira-rotulo">Contingenciamentos</p>
            <p className="tira-valor">
              R$ {cCont.valor}
              <span className="tira-unidade">{cCont.unidade}</span>
            </p>
            <p className="tira-nota">Total contingenciado no recorte</p>
          </section>
          <section className="tira">
            <p className="tira-rotulo">Variação das dotações</p>
            <p className={`tira-valor ${varDot >= 0 ? 'var-sobe' : 'var-desce'}`}>
              {varDot >= 0 ? '+' : '−'} R$ {cVar.valor}
              <span className="tira-unidade">{cVar.unidade}</span>
            </p>
            <p className="tira-nota">
              Autorizado − inicial{pctVar === null ? '' : ` · ${fmtVar(pctVar)}`}
            </p>
          </section>
        </div>
      </div>

      <div className="paineis">
        {/* RP + GND lado a lado */}
        <section className="painel-grafico p-6">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Por Identificador de Resultado Primário</h2>
              <p className="painel-sub">Autorizado por RP · barra = autorizado, traço = dotação inicial</p>
            </div>
            <span className="painel-total">{fmtBi(totalAut)}</span>
            <BotaoPNG titulo="Por Identificador de Resultado Primário" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={rps.map((d) => ({ chave: d.rp, rotulo: d.rotulo, valor: d.valor, pl: d.pl, cor: d.cor }))}
            mostrarPercentual
            rotuloGrafico="Autorizado por identificador de resultado primário (traço = dotação inicial)"
          />
        </section>

        <section className="painel-grafico p-6">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Valor por Grupo de Natureza da Despesa</h2>
              <p className="painel-sub">Composição por GND · barra = autorizado, traço = dotação inicial</p>
            </div>
            <span className="painel-total">{fmtBi(totalAut)}</span>
            <BotaoPNG titulo="Valor por Grupo de Natureza da Despesa" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={gnds.map((g) => ({
              chave: g.gnd, rotulo: g.nome || g.rotulo, sublinha: g.rotulo,
              valor: g.valor, pl: g.pl, cor: g.cor,
            }))}
            mostrarPercentual
            rotuloGrafico="Autorizado por grupo de natureza da despesa (traço = dotação inicial)"
          />
        </section>

        {/* UO em largura cheia */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Valor por Unidade Orçamentária</h2>
              <p className="painel-sub">Todas as UO do órgão 52000 · barra = autorizado, traço = dotação inicial</p>
            </div>
            <span className="painel-total">{fmtBi(totalAut)}</span>
            <BotaoPNG titulo="Valor por Unidade Orçamentária" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={uos.map((u) => ({
              chave: u.uoCod, rotulo: u.uo, sublinha: `UO ${u.uoCod}`,
              valor: u.valor, pl: u.pl, cor: AGREGADOS.find((a) => a.id === u.orgao)?.cor,
            }))}
            limite={4}
            passoExpansao={4}
            mostrarPercentual
            rotuloGrafico="Autorizado por unidade orçamentária (traço = dotação inicial)"
          />
        </section>

        {/* Ação em largura cheia, código destacado */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Valor por Ação orçamentária</h2>
              <p className="painel-sub">
                {fmtInt(acoes.length)} ações do recorte · barra = autorizado, traço = dotação inicial
              </p>
            </div>
            <span className="painel-total">{fmtBi(totalAut)}</span>
            <BotaoPNG titulo="Valor por Ação orçamentária" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={acoes.map((a) => ({
              chave: a.acaoCod, rotulo: a.acao || a.acaoCod,
              codigo: a.acaoCod !== '—' ? a.acaoCod : null,
              valor: a.valor, pl: a.pl,
            }))}
            corNumero="var(--serie-laranja)"
            limite={15}
            passoExpansao={15}
            mostrarPercentual
            rotuloGrafico="Autorizado por ação orçamentária (traço = dotação inicial)"
          />
        </section>

        {/* Total por Força em largura cheia */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Total por Força</h2>
              <p className="painel-sub">
                Soma de todas as UO de cada Força e da Administração Direta do MD · barra = autorizado, traço = dotação inicial
              </p>
            </div>
            <span className="painel-total">{fmtBi(totalAutForcas)}</span>
            <BotaoPNG titulo="Total por Força" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={forcas.map((a) => ({ chave: a.id, rotulo: a.rotulo, valor: a.valor, pl: a.pl, cor: a.cor }))}
            mostrarPercentual
            rotuloGrafico="Autorizado total por Força (traço = dotação inicial)"
          />
          <p className="painel-rodape">
            Painel comparativo entre Forças — ignora o filtro de Órgão da barra superior.
          </p>
        </section>

        {/* Dotação inicial × autorizado, barras na tonalidade da Força */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Dotação inicial vs. dotação autorizada</h2>
              <p className="painel-sub">
                Diferença entre o autorizado e a dotação inicial, por Força · tom cheio = inicial, tom claro = autorizado
              </p>
            </div>
            <span className="painel-total">
              {`${deltaForcas >= 0 ? '+' : '−'} ${fmtBi(Math.abs(deltaForcas))}`}
            </span>
            <BotaoPNG titulo="Dotação inicial vs. dotação autorizada" contexto={contexto} />
          </div>
          <div className="rolagem-x">
            <GraficoColunasAno
              anos={catsForca}
              series={serieIniAut}
              corPorColuna={coresForca}
              formatar={fmtBi}
              formatarTotal={() => ''}
              rotuloEixo="Comparativo da dotação inicial e da autorizada, por Força"
            />
          </div>
          <div className="ciclo-tabela" role="table" aria-label="Variação da dotação inicial para a autorizada">
            <div className="ciclo-linha ciclo-cab" role="row">
              <span role="columnheader">Força</span>
              <span role="columnheader">Inicial</span>
              <span role="columnheader">Autorizado</span>
              <span role="columnheader">Variação</span>
            </div>
            {iniAut.map((a) => (
              <div className="ciclo-linha" role="row" key={a.id}>
                <span role="cell" className="ciclo-nome">
                  <span className="pbar-chave" style={{ background: a.cor }} aria-hidden />
                  {a.rotulo}
                </span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.ini)}</span></span>
                <span role="cell" className="ciclo-cel"><span className="ciclo-val">{fmtBi(a.aut)}</span></span>
                <span role="cell" className="ciclo-cel">
                  <span className="ciclo-val">{a.delta >= 0 ? '+' : '−'} {fmtBi(Math.abs(a.delta))}</span>
                  <span className={a.pct === null || a.pct === 0 ? 'var-nula' : a.pct > 0 ? 'var-sobe' : 'var-desce'}>
                    {a.pct === null ? '—' : a.pct === 0 ? 'sem alteração'
                      : `${a.pct > 0 ? '▲' : '▼'} ${fmtPct(Math.abs(a.pct))}`}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="painel-rodape">
            Painel comparativo entre Forças — ignora o filtro de Órgão.
          </p>
        </section>

        {/* Por Fonte (Cod/Desc) */}
        <section className="painel-grafico p-12">
          <div className="painel-cab">
            <div className="painel-cab-txt">
              <h2>Valor por Fonte (Cod/Desc)</h2>
              <p className="painel-sub">
                {fmtInt(fontes.length)} fontes do recorte · barra = autorizado, traço = dotação inicial
              </p>
            </div>
            <span className="painel-total">{fmtBi(totalAut)}</span>
            <BotaoPNG titulo="Valor por Fonte" contexto={contexto} />
          </div>
          <GraficoBarrasExec
            dados={fontes.map((f) => ({
              chave: f.fonteCod || f.fonte,
              // o código vai no selo; o rótulo fica só com a descrição, sem repetir o código
              rotulo: f.fonteCod ? f.fonte.replace(new RegExp(`^${f.fonteCod}\\s*-\\s*`), '') : f.fonte,
              codigo: f.fonteCod || null,
              valor: f.valor, pl: f.pl,
            }))}
            corNumero="var(--serie-aqua)"
            limite={12}
            passoExpansao={12}
            mostrarPercentual
            rotuloGrafico="Autorizado por fonte (traço = dotação inicial)"
          />
        </section>
      </div>
    </div>
  )
}
