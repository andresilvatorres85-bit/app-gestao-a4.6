import { useState, useMemo } from "react";
import { Plus, X, Check } from "lucide-react";

// Card de nota em formato de checklist (estilo Google Keep).
// `lista` é o identificador da lista ("pendencias" | "briefing"); `titulo` é o
// rótulo exibido. Os itens chegam já filtrados desta lista.
export default function ChecklistCard({ titulo, lista, tom, itens = [], adicionar, alternar, editar, remover }) {
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState(null);
  const [rascunho, setRascunho] = useState("");

  const abertos = useMemo(() => itens.filter((i) => !i.feito), [itens]);
  const feitos = useMemo(() => itens.filter((i) => i.feito), [itens]);

  function enviarNovo() {
    const t = novo.trim();
    if (!t) return;
    adicionar?.(lista, t);
    setNovo("");
  }

  function salvarEdicao(id) {
    editar?.(id, rascunho);
    setEditId(null);
  }

  const linha = (i) => (
    <li key={i.id} className={`chk-item ${i.feito ? "chk-item-feito" : ""}`}>
      <button type="button" className="chk-box" aria-pressed={i.feito}
        title={i.feito ? "Desmarcar" : "Concluir"} onClick={() => alternar?.(i.id, !i.feito)}>
        {i.feito && <Check size={12} strokeWidth={3} />}
      </button>
      {editId === i.id ? (
        <input className="input chk-edit" autoFocus value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={() => salvarEdicao(i.id)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditId(null); }} />
      ) : (
        <button type="button" className="chk-txt" title="Editar"
          onClick={() => { setEditId(i.id); setRascunho(i.texto); }}>{i.texto}</button>
      )}
      <button type="button" className="icon-btn chk-del" title="Remover" onClick={() => remover?.(i.id)}>
        <X size={13} />
      </button>
    </li>
  );

  return (
    <section className={`chk-card${tom ? ` chk-card-${tom}` : ""}`}>
      <p className="chk-tit">{titulo}</p>

      <div className="chk-add">
        <Plus size={14} className="chk-add-ico" />
        <input className="chk-add-in" placeholder="Adicionar item" value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviarNovo(); }} />
      </div>

      {itens.length === 0 ? (
        <p className="chk-vazio">Nenhum item ainda.</p>
      ) : (
        <>
          <ul className="chk-lista">{abertos.map(linha)}</ul>
          {feitos.length > 0 && (
            <>
              <p className="chk-sep">{feitos.length} concluído{feitos.length > 1 ? "s" : ""}</p>
              <ul className="chk-lista chk-lista-feitos">{feitos.map(linha)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
