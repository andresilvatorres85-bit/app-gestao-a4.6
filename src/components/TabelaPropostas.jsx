import { FileText, Square, CheckSquare, Trash2 } from "lucide-react";
import { Badge } from "./UI.jsx";
import {
  moeda, valorTotal, pendencias, situacaoDe, SITUACOES,
  STATUS_LEXOR, STATUS_LEXOR_PADRAO,
} from "../lexorUtils.js";

// Tabela de propostas usada nos dois cards do módulo LEXOR: o da planilha e o
// das consolidadoras. No modo consolidadora aparecem duas colunas a mais —
// o autor editável e o botão de excluir.

export default function TabelaPropostas({
  itens,
  selecionadas,
  aoAlternar,
  aoAlternarTodos,
  aoAbrirEspelho,
  statusLexor,
  aoMudarStatus,
  salvando,
  erroStatus,
  consolidadora = false,
  aoMudarAutor,
  aoExcluir,
  vazio = "Nenhuma proposta encontrada com esses filtros.",
}) {
  const colunas = consolidadora ? 11 : 10;
  // Identidade de SELEÇÃO/linha = uid (a mesma proposta pode aparecer para
  // vários parlamentares, com o mesmo nr). O status e as ações da consolidadora
  // continuam por nr (são do projeto, não da linha).
  const chave = p => p.uid || p.nr;
  const todosMarcados = itens.length > 0 && itens.every(p => selecionadas.has(chave(p)));

  return (
    <div className="table-wrap">
      <table className="tbl tbl-lexor">
        <thead>
          <tr>
            <th className="col-check">
              <button className="icon-btn" onClick={aoAlternarTodos} title="Selecionar tudo o que está à vista">
                {todosMarcados ? <CheckSquare size={15} /> : <Square size={15} />}
              </button>
            </th>
            <th className="col-acao">Espelho</th>
            <th>Nº</th>
            <th>Beneficiário</th>
            <th>Município / UF</th>
            <th>Ação</th>
            <th className="esp-right">Valor</th>
            <th>Autor</th>
            <th>Situação</th>
            <th>LEXOR</th>
            {consolidadora && <th className="col-acao"></th>}
          </tr>
        </thead>
        <tbody>
          {itens.map(p => {
            const probs = pendencias(p);
            const sit = situacaoDe(p);
            const status = statusLexor[p.nr] || STATUS_LEXOR_PADRAO;
            return (
              <tr key={chave(p)} className={selecionadas.has(chave(p)) ? "row-sel" : ""}>
                <td className="col-check">
                  <button className="icon-btn" onClick={() => aoAlternar(chave(p))}>
                    {selecionadas.has(chave(p)) ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                </td>
                <td className="col-acao">
                  <button className="icon-btn edit" title="Ver espelho de emenda"
                    onClick={() => aoAbrirEspelho(p)}>
                    <FileText size={15} />
                  </button>
                </td>
                <td className="mono">
                  {p.nr}
                  {p.consolidada && (
                    <span className="cel-origem">{p.itens.length} propostas</span>
                  )}
                </td>
                <td className="cel-benef">
                  {p.beneficiario || <span className="muted">sem beneficiário</span>}
                </td>
                <td className="cel-local">
                  {p.consolidada
                    ? (p.cidade || "—")
                    : <>{p.cidade || "—"} <span className="mono">{p.uf || ""}</span></>}
                </td>
                <td className="mono">{p.acao || "—"}</td>
                <td className="mono esp-right">{moeda(valorTotal(p))}</td>
                <td>
                  {p.consolidada
                    ? (
                      <input className="input input-autor" value={p.parlamentar || ""}
                        placeholder="a definir"
                        onChange={e => aoMudarAutor(p.nr, e.target.value, p.partido)} />
                    )
                    : p.parlamentar
                      ? `${p.parlamentar}${p.partido ? ` (${p.partido})` : ""}`
                      : <span className="muted">a definir</span>}
                </td>
                <td>
                  <span title={probs.length ? probs.join(" · ") : undefined}>
                    <Badge tone={SITUACOES[sit].tone}>{SITUACOES[sit].rotulo}</Badge>
                  </span>
                </td>
                <td>
                  <select className={`select-status status-${status.toLowerCase()}`}
                    value={status} disabled={erroStatus}
                    onChange={e => aoMudarStatus(p.nr, e.target.value)}>
                    {STATUS_LEXOR.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {salvando === p.nr && <span className="salvando">salvando…</span>}
                </td>
                {consolidadora && (
                  <td className="col-acao">
                    {p.consolidada && (
                      <button className="icon-btn del" title="Excluir esta proposta consolidadora"
                        onClick={() => aoExcluir(p.nr)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {itens.length === 0 && (
            <tr><td colSpan={colunas} className="empty-row">{vazio}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
