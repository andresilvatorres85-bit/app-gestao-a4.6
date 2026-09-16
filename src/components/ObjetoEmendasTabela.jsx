import { Download, Pencil, Trash2 } from "lucide-react";
import { resumoObjeto, baixarOficioDocx } from "../objetoEmendaDoc.js";

function fmtData(d) {
  if (!d.dia || !d.mes || !d.ano) return "—";
  return `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
}

// Tabela das alterações de objeto de emenda, reaproveitada na aba "Objeto
// Emenda" (últimos registros) e no card do "Painel". Cada linha permite baixar
// o ofício novamente, editar o lançamento e excluí-lo.
export default function ObjetoEmendasTabela({ itens = [], onEditar, onExcluir }) {
  async function baixar(it) {
    try { await baixarOficioDocx(it); } catch { /* silencioso */ }
  }
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Data</th><th>Parlamentar</th><th>Partido/UF</th><th>Emenda</th>
            <th>Objeto</th><th>Ajuste</th><th></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => (
            <tr key={it.id}>
              <td className="mono">{fmtData(it)}</td>
              <td>{it.parlamentar}</td>
              <td className="mono">{[it.partido, it.uf].filter(Boolean).join("/") || "—"}</td>
              <td className="mono">{it.emenda || "—"}</td>
              <td className="obj-col">{resumoObjeto(it)}</td>
              <td>{it.ajuste || "—"}</td>
              <td>
                <div className="row-actions">
                  <button type="button" className="icon-btn" title="Baixar ofício novamente" onClick={() => baixar(it)}>
                    <Download size={16} />
                  </button>
                  {onEditar && (
                    <button type="button" className="icon-btn" title="Editar lançamento" onClick={() => onEditar(it)}>
                      <Pencil size={16} />
                    </button>
                  )}
                  {onExcluir && (
                    <button type="button" className="icon-btn" title="Excluir lançamento" onClick={() => onExcluir(it.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
