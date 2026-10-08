import { fmtBRL, RP_LABEL, ESTAGIOS_EXEC, ESTAGIOS_RP, somaExecucao } from '../dados.js'

// Cartão de emenda da aba "Emendas".
// `grupo.inconsistencias` é uma lista de OBJETOS ({tipo, gravidade, rotulo,
// descricao, evidencia, ...}) produzidos pelo pipeline. Aqui usamos apenas o
// suficiente para sinalizar a emenda e remeter à aba "Inconsistências", que
// tem a visualização completa (CartaoInconsistencia.jsx).
// Quadro com os estágios da execução (subaba Emendas LOA).
function QuadroExecucao({ valores, restos = false, compacto = false }) {
  return (
    <div className={`cartao-exec${restos ? ' restos' : ''}${compacto ? ' compacto' : ''}`}>
      {(restos ? ESTAGIOS_RP : ESTAGIOS_EXEC).map(({ id, rotulo }) => (
        <div key={id} className={`cartao-exec-item exec-${id}${valores[id] > 0 ? ' positivo' : ''}`}>
          <span className="cartao-exec-rot">{rotulo}</span>
          <span className="cartao-exec-val">{fmtBRL(valores[id] || 0)}</span>
        </div>
      ))}
    </div>
  )
}

// `execucao`: cartão da subaba Emendas LOA — mostra os estágios da execução
// (LOA_despesa_execucao) e os dados completados pelo histórico de emendas.
export default function CartaoEmenda({ grupo, aberto, onToggle, alerta = false, execucao = false }) {
  const incons = grupo.inconsistencias || []
  const rotulos = incons.map((i) => i.rotulo).filter((v, i, a) => a.indexOf(v) === i)
  const frase = rotulos.join(' · ')
  // Emenda de outro exercício, no arquivo por ter sido inscrita em restos a
  // pagar: Dotação Inicial zerada (ver AbaEmendasExec, que as põe no final).
  const restos = execucao && grupo.restos

  return (
    <article className={`cartao${alerta ? ' cartao-alerta' : ''}${restos ? ' cartao-restos' : ''}${aberto ? ' aberto' : ''}`}>
      <button
        type="button"
        className="cartao-cab"
        onClick={onToggle}
        aria-expanded={aberto}
      >
        <div className="cartao-linha1">
          <strong className="cartao-autor">{grupo.autor}</strong>
          <span className="cartao-valor" title={restos ? 'RP Inscrito' : undefined}>
            {fmtBRL(restos ? grupo.exec.rpInsc : grupo.valor)}
          </span>
        </div>
        <div className="cartao-linha2">
          {grupo.ano && <span className="tag tag-ano" title="Exercício (ano da LOA) da emenda">{grupo.ano}</span>}
          {restos && (
            <span className="tag tag-restos" title={`Emenda inscrita em restos a pagar no exercício de ${grupo.ano}`}>
              Restos a pagar{grupo.anoOrigem ? ` · emenda de ${grupo.anoOrigem}` : ''}
            </span>
          )}
          <span className="tag">{grupo.partido}</span>
          <span className="tag">{grupo.autorUF}</span>
          {grupo.rps.map((rp) => (
            <span key={rp} className="tag tag-rp">{RP_LABEL(rp)}</span>
          ))}
          {incons.length > 0 && <span className="tag tag-incons">⚠ inconsistência</span>}
          <span className="cartao-num">Nº {grupo.emenda}</span>
        </div>
        {/* OM e objeto ficam visíveis com o cartão fechado: é o que responde
            "para onde vai e para quê" sem precisar abrir. Só existem onde a
            planilha traz a identificação — hoje, quase toda em emendas do
            Exército. */}
        {(grupo.oms.length > 0 || grupo.objetos.length > 0) && (
          <p className="cartao-om">
            {grupo.oms.length > 0 && (
              <span className="cartao-om-bloco">
                <span className="cartao-om-rot">OM</span>
                <span className="cartao-om-txt">{grupo.oms.join(' · ')}</span>
              </span>
            )}
            {grupo.objetos.length > 0 && (
              <span className="cartao-om-bloco">
                <span className="cartao-om-rot">Objeto</span>
                <span className="cartao-om-txt">{grupo.objetos.join(' · ')}</span>
              </span>
            )}
          </p>
        )}
        {execucao && <QuadroExecucao valores={grupo.exec} restos={restos} />}
        {alerta && frase && <p className="cartao-frase-alerta" role="alert">⚠ {frase}</p>}
      </button>

      {aberto && (
        <div className="cartao-detalhe">
          {grupo.itens.map((r, i) => (
            <div key={r.id} className="detalhe-item">
              {grupo.itens.length > 1 && (
                <p className="detalhe-item-titulo">Item {i + 1} de {grupo.itens.length} — {fmtBRL(r.valor)}</p>
              )}
              <dl>
                <div><dt>Ano</dt><dd>{r.ano}{r.anoOrigem ? ` (restos a pagar da emenda de ${r.anoOrigem})` : ''}</dd></div>
                <div><dt>UO</dt><dd>{r.uoCod} — {r.uo}</dd></div>
                {execucao && r.acao && <div><dt>Ação</dt><dd>{r.acaoCod} — {r.acao}</dd></div>}
                {r.om && <div><dt>OM</dt><dd>{r.om}</dd></div>}
                {r.objeto && <div><dt>Objeto</dt><dd>{r.objeto}</dd></div>}
                <div><dt>Funcional</dt><dd>{r.funcional || '—'}</dd></div>
                <div><dt>Autor (UF)</dt><dd>{r.autorUF || '—'}</dd></div>
                <div><dt>Localidade</dt><dd>{r.localidade || '—'}</dd></div>
                <div><dt>GND (Cod)</dt><dd>{r.gnd || '—'}</dd></div>
                <div><dt>Mod. Aplic. (Cod)</dt><dd>{r.modAplic || '—'}</dd></div>
                <div><dt>C Mil A</dt><dd>{r.cmila}{r.cmilaFallback ? ' (município de MG não identificado — regra de fallback)' : ''}</dd></div>
              </dl>
              {execucao && grupo.itens.length > 1 && <QuadroExecucao valores={somaExecucao([r])} restos={restos} compacto />}
              <p className="detalhe-just-titulo">Emenda (Justificativa)</p>
              <p className="detalhe-just">{r.justificativa || '—'}</p>
              {(r.inconsistencias || []).length > 0 && (
                <div className="detalhe-incons">
                  <p className="detalhe-incons-titulo">Inconsistências identificadas</p>
                  <ul>
                    {r.inconsistencias.map((inc, j) => (
                      <li key={j}>
                        <strong>{inc.rotulo}:</strong> {inc.descricao}
                      </li>
                    ))}
                  </ul>
                  <p className="detalhe-incons-nota">
                    Detalhamento completo na aba <strong>Inconsistências</strong>.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
