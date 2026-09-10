import { useMemo } from 'react'
import { agruparPorEmenda, fmtInt } from '../dados.js'
import CartaoEmenda from './CartaoEmenda.jsx'

// Subaba "Emendas LOA" (seção EXECUÇÃO LOA). Mesma diagramação da subaba
// "Emendas" da seção RESULTADO LEXOR, mas sobre as EMENDAS DA EXECUÇÃO
// (valor = Autorizado). OM/Objeto vêm da base de emendas apresentadas, ligados
// pelo número da emenda no pipeline.
export default function AbaEmendasExec({ registros, detalhe, abrirDetalhe }) {
  const grupos = useMemo(() => agruparPorEmenda(registros), [registros])
  return (
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
  )
}
