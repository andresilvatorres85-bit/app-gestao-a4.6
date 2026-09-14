import { useMemo } from 'react'
import { agruparPorEmenda, fmtInt } from '../dados.js'
import CartaoEmenda from './CartaoEmenda.jsx'
import { FolhaEmendasEstado } from './FolhaPDFExec.jsx'

// Subaba "Emendas LOA" (seção EXECUÇÃO LOA). Mesma diagramação da subaba
// "Emendas" da seção RESULTADO LEXOR, mas sobre as EMENDAS DA EXECUÇÃO
// (valor = Autorizado). OM/Objeto vêm da base de emendas apresentadas, ligados
// pelo número da emenda no pipeline.
export default function AbaEmendasExec({ registros, detalhe, abrirDetalhe, filtrosTexto }) {
  const grupos = useMemo(() => agruparPorEmenda(registros), [registros])
  return (
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

      {/* Só aparece na impressão via botão "Exportar PDF" (ver styles.css).
          Espelha o PPTX de tabelas por estado (impositivas do Exército). */}
      <div className="folha-pdf" aria-hidden>
        <FolhaEmendasEstado registros={registros} filtrosTexto={filtrosTexto} />
      </div>
    </>
  )
}
