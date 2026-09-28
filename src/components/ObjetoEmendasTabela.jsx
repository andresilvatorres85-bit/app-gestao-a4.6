import { useMemo, useState } from "react";
import { Download, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { resumoObjeto, baixarOficioDocx } from "../objetoEmendaDoc.js";

function fmtData(d) {
  if (!d.dia || !d.mes || !d.ano) return "—";
  return `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
}

// Chave de ordenação por coluna. Data vira um número aaaammdd comparável;
// emenda é numérica; parlamentar compara texto.
function chaveOrd(it, coluna) {
  if (coluna === "data") return (it.ano || 0) * 10000 + (it.mes || 0) * 100 + (it.dia || 0);
  if (coluna === "emenda") return Number(String(it.emenda || "").replace(/\D/g, "")) || 0;
  return (it.parlamentar || "").toLocaleLowerCase("pt-BR");
}

// Divide o campo "ajuste" ("A; B; C") nos tipos individuais.
const tiposDoAjuste = (s) => String(s || "").split(/\s*;\s*/).map((t) => t.trim()).filter(Boolean);

// Tabela das alterações de objeto de emenda, reaproveitada na aba "Objeto
// Emenda" (últimos registros) e no card do "Painel". Cada linha permite baixar
// o ofício novamente, editar o lançamento e excluí-lo. As colunas Data,
// Parlamentar e Emenda são ordenáveis (crescente/decrescente) e há um filtro
// por Tipo de ajuste.
export default function ObjetoEmendasTabela({ itens = [], onEditar, onExcluir }) {
  const [ordem, setOrdem] = useState({ col: "data", dir: "desc" });
  const [fAjuste, setFAjuste] = useState("Todos");

  async function baixar(it) {
    try { await baixarOficioDocx(it); } catch { /* silencioso */ }
  }

  // Opções do filtro de Tipo de ajuste (todos os tipos presentes nos itens).
  const opcoesAjuste = useMemo(() => {
    const s = new Set();
    for (const it of itens) for (const t of tiposDoAjuste(it.ajuste)) s.add(t);
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  const visiveis = useMemo(() => {
    const filtrados = fAjuste === "Todos"
      ? itens
      : itens.filter((it) => tiposDoAjuste(it.ajuste).includes(fAjuste));
    const fator = ordem.dir === "asc" ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const ka = chaveOrd(a, ordem.col), kb = chaveOrd(b, ordem.col);
      if (ka < kb) return -1 * fator;
      if (ka > kb) return 1 * fator;
      return 0;
    });
  }, [itens, fAjuste, ordem]);

  function ordenarPor(col) {
    setOrdem((o) => (o.col === col ? { col, dir: o.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  const Seta = ({ col }) => {
    if (ordem.col !== col) return <ArrowUpDown size={13} className="oe-sort-ic" />;
    return ordem.dir === "asc"
      ? <ArrowUp size={13} className="oe-sort-ic oe-sort-on" />
      : <ArrowDown size={13} className="oe-sort-ic oe-sort-on" />;
  };
  const ThOrd = ({ col, children }) => (
    <th>
      <button type="button" className="oe-th-btn" onClick={() => ordenarPor(col)}
        aria-label={`Ordenar por ${children}`}>
        {children} <Seta col={col} />
      </button>
    </th>
  );

  return (
    <>
      <div className="oe-tbl-toolbar">
        <label className="oe-filtro">
          Tipo de ajuste
          <select className="input" value={fAjuste} onChange={(e) => setFAjuste(e.target.value)}>
            <option value="Todos">Todos</option>
            {opcoesAjuste.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <span className="oe-tbl-contagem">{visiveis.length} de {itens.length}</span>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <ThOrd col="data">Data</ThOrd>
              <ThOrd col="parlamentar">Parlamentar</ThOrd>
              <th>Partido/UF</th>
              <ThOrd col="emenda">Emenda</ThOrd>
              <th>Objeto</th><th>Ajuste</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((it) => (
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
            {visiveis.length === 0 && (
              <tr><td colSpan={7} className="empty-row">Nenhum lançamento para o filtro aplicado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
