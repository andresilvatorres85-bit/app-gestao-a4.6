import { useMemo } from 'react'
import { agruparPorEmenda, chaveEmenda, fmtInt } from '../dados.js'
import CartaoEmenda from './CartaoEmenda.jsx'
import { FolhaEmendasEstado } from './FolhaPDFExec.jsx'

// Subaba "Emendas LOA" (seção EXECUÇÃO LOA). Mesma diagramação da subaba
// "Emendas" da seção RESULTADO LEXOR, mas sobre as EMENDAS DA EXECUÇÃO
// (valor = Autorizado). OM/Objeto vêm da base de emendas apresentadas, ligados
// pelo número da emenda no pipeline.
// Os valores vêm do LOA_despesa_execucao de cada ano; o que esse arquivo não
// traz (localidade, justificativa e, se faltarem, OM, objeto, funcional, GND e
// modalidade de aplicação) vem do Historico_emendas_apresentadas — a mesma
// emenda (ano + número), preferindo o item com a mesma funcional e GND.
const COMPLETAR = ['localidade', 'justificativa', 'om', 'objeto', 'funcional', 'gnd', 'modAplic']

function completarPeloHistorico(registros, historico) {
  const porChave = new Map()
  for (const h of historico) {
    const k = chaveEmenda(h)
    if (!porChave.has(k)) porChave.set(k, [])
    porChave.get(k).push(h)
  }
  return registros.map((r) => {
    // restos a pagar: a emenda está no histórico do ano em que foi apresentada
    const cands = porChave.get(chaveEmenda({ ano: r.anoOrigem || r.ano, emenda: r.emenda }))
    if (!cands) return r
    const h = cands.find((c) => c.funcional === r.funcional && String(c.gnd) === String(r.gnd))
      ?? cands.find((c) => c.funcional === r.funcional)
      ?? cands[0]
    const novo = { ...r }
    for (const c of COMPLETAR) if (!novo[c] && h[c]) novo[c] = h[c]
    return novo
  })
}

export default function AbaEmendasExec({ registros, historico = [], detalhe, abrirDetalhe, filtrosTexto }) {
  const completos = useMemo(() => completarPeloHistorico(registros, historico), [registros, historico])
  // Dotação Inicial zerada = emenda de outro exercício inscrita em restos a
  // pagar: vai para o final da página, com outra cor e os valores de RP.
  const grupos = useMemo(() => {
    const todos = agruparPorEmenda(completos).map((g) => ({ ...g, restos: !g.exec.ini }))
    return [...todos.filter((g) => !g.restos), ...todos.filter((g) => g.restos)]
  }, [completos])
  const nRestos = grupos.filter((g) => g.restos).length
  return (
    <>
      <section aria-label="Emendas">
        <p className="contagem">
          {fmtInt(grupos.length)} emenda(s)
          {nRestos > 0 && ` · ${fmtInt(grupos.length - nRestos)} do exercício e ${fmtInt(nRestos)} inscrita(s) em restos a pagar (ao final)`}
        </p>
        <div className="grade">
          {grupos.map((g) => (
            <CartaoEmenda
              key={g.chave}
              grupo={g}
              aberto={detalhe === g.chave}
              onToggle={() => abrirDetalhe(g.chave)}
              execucao
            />
          ))}
        </div>
        {grupos.length === 0 && <p className="vazio">Nenhuma emenda para os filtros aplicados.</p>}
      </section>

      {/* Só aparece na impressão via botão "Exportar PDF" (ver styles.css).
          Espelha o PPTX de tabelas por estado (impositivas do Exército). */}
      <div className="folha-pdf" aria-hidden>
        <FolhaEmendasEstado registros={registros} filtrosTexto={filtrosTexto} />
      </div>
    </>
  )
}
