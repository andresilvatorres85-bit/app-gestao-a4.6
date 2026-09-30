import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Check, X, GripVertical, CornerDownRight } from "lucide-react";

// Aba "Recebimento Função": check list das atividades de passagem de função.
// Atividades com subatividades; marcação (concluído) por usuário (independente);
// concluídas ficam riscadas e vão para baixo (estilo Google Keep). Arrastar
// reordena as atividades de topo.
export default function Recebimento({ rec }) {
  const { itens = [], checks = new Set(), carregado, erro, adicionar, editar, excluir, reordenar, alternarCheck } = rec || {};
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [subDe, setSubDe] = useState(null);   // id da atividade recebendo nova sub
  const [subTexto, setSubTexto] = useState("");
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);

  const feito = (id) => checks.has(id);

  // Atividades de topo, subatividades agrupadas por pai; concluídas ao fim.
  const topo = useMemo(() => {
    const pais = itens.filter((i) => !i.parentId);
    const ord = [...pais].sort((a, b) => (feito(a.id) - feito(b.id)) || (a.pos - b.pos));
    return ord;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, checks]);
  const subsDe = (pid) => {
    const s = itens.filter((i) => i.parentId === pid);
    return s.sort((a, b) => (feito(a.id) - feito(b.id)) || (a.pos - b.pos));
  };

  function enviarNovo() { const t = novo.trim(); if (!t) return; adicionar?.(t, null); setNovo(""); }
  function salvarEdicao(id) { editar?.(id, rascunho); setEditId(null); }
  function enviarSub(pid) { const t = subTexto.trim(); if (!t) return; adicionar?.(t, pid); setSubTexto(""); setSubDe(null); }

  function soltar(alvoId) {
    const de = arrastando; setArrastando(null); setAlvo(null);
    if (!de || de === alvoId) return;
    const ids = topo.map((i) => i.id);
    const iDe = ids.indexOf(de), iAlvo = ids.indexOf(alvoId);
    if (iDe < 0 || iAlvo < 0) return;
    ids.splice(iAlvo, 0, ids.splice(iDe, 1)[0]);
    reordenar?.(ids);
  }

  const linhaEdit = (it, onBlurSalvar) => (
    <input className="input rec-edit" autoFocus value={rascunho}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={onBlurSalvar}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditId(null); }} />
  );

  return (
    <div className="rec-wrap">
      <p className="page-sub">
        Marque as atividades concluídas — suas marcações são pessoais e independentes das dos demais.
        Concluídas ficam riscadas e vão para o fim. Arraste pela alça para reordenar.
      </p>

      {erro && (
        <div className="lexor-aviso-erro">
          O check list não pôde ser lido ou gravado. Rode o script
          <code> supabase_conhecimento.sql </code> no SQL Editor do Supabase para criar as tabelas.
        </div>
      )}

      <div className="rec-add">
        <Plus size={15} className="rec-add-ico" />
        <input className="rec-add-in" placeholder="Adicionar atividade" value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviarNovo(); }} />
      </div>

      {!carregado ? (
        <div className="loading-state">Carregando check list…</div>
      ) : (
        <ul className="rec-lista">
          {topo.map((it) => {
            const f = feito(it.id);
            const subs = subsDe(it.id);
            return (
              <li key={it.id}
                className={`rec-atv${f ? " rec-feito" : ""}${arrastando === it.id ? " rec-arrastando" : ""}${alvo === it.id && arrastando && arrastando !== it.id ? " rec-alvo" : ""}`}
                draggable={editId !== it.id}
                onDragStart={(e) => { if (editId === it.id) return; setArrastando(it.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                onDragOver={(e) => { if (arrastando) { e.preventDefault(); setAlvo(it.id); } }}
                onDrop={(e) => { e.preventDefault(); soltar(it.id); }}>
                <div className="rec-atv-cab">
                  <span className="rec-grip" title="Arraste para reordenar"><GripVertical size={14} /></span>
                  <button type="button" className="rec-box" aria-pressed={f} title={f ? "Desmarcar" : "Concluir"}
                    onClick={() => alternarCheck?.(it.id, !f)}>{f && <Check size={12} strokeWidth={3} />}</button>
                  {editId === it.id ? linhaEdit(it, () => salvarEdicao(it.id)) : (
                    <span className="rec-txt">{it.texto}</span>
                  )}
                  <div className="rec-acoes">
                    <button className="icon-btn" title="Adicionar subatividade" onClick={() => { setSubDe(it.id); setSubTexto(""); }}><CornerDownRight size={14} /></button>
                    <button className="icon-btn" title="Editar" onClick={() => { setEditId(it.id); setRascunho(it.texto); }}><Pencil size={13} /></button>
                    <button className="icon-btn" title="Excluir" onClick={() => { if (confirm(`Excluir "${it.texto}"?`)) excluir?.(it.id); }}><Trash2 size={13} /></button>
                  </div>
                </div>

                {(subs.length > 0 || subDe === it.id) && (
                  <ul className="rec-subs">
                    {subs.map((s) => {
                      const sf = feito(s.id);
                      return (
                        <li key={s.id} className={`rec-sub${sf ? " rec-feito" : ""}`}>
                          <button type="button" className="rec-box" aria-pressed={sf} title={sf ? "Desmarcar" : "Concluir"}
                            onClick={() => alternarCheck?.(s.id, !sf)}>{sf && <Check size={11} strokeWidth={3} />}</button>
                          {editId === s.id ? linhaEdit(s, () => salvarEdicao(s.id)) : (
                            <span className="rec-txt">{s.texto}</span>
                          )}
                          <div className="rec-acoes">
                            <button className="icon-btn" title="Editar" onClick={() => { setEditId(s.id); setRascunho(s.texto); }}><Pencil size={12} /></button>
                            <button className="icon-btn" title="Excluir" onClick={() => { if (confirm(`Excluir "${s.texto}"?`)) excluir?.(s.id); }}><Trash2 size={12} /></button>
                          </div>
                        </li>
                      );
                    })}
                    {subDe === it.id && (
                      <li className="rec-sub rec-sub-novo">
                        <CornerDownRight size={13} className="rec-sub-ico" />
                        <input className="input rec-edit" autoFocus placeholder="Nova subatividade" value={subTexto}
                          onChange={(e) => setSubTexto(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") enviarSub(it.id); if (e.key === "Escape") setSubDe(null); }}
                          onBlur={() => { if (subTexto.trim()) enviarSub(it.id); else setSubDe(null); }} />
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
          {topo.length === 0 && <li className="rec-vazio">Nenhuma atividade. Use o campo acima para incluir.</li>}
        </ul>
      )}
    </div>
  );
}
