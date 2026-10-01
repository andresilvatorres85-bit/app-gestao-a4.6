import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, CornerDownRight, GripVertical } from "lucide-react";

// Card de largura total no topo.
const ROTINA_DIARIA = { id: "rotina_diaria", titulo: "Rotina Diária", cor: "#C0392B" };

// Cards (atividades) da rotina do Assessor de Orçamento, com cores próprias.
const CARDS = [
  { id: "ppa", titulo: "Plano Plurianual (PPA)", cor: "#3B6FB0" },
  { id: "pldo", titulo: "Projeto de Lei de Diretrizes Orçamentárias (PLDO)", cor: "#3F9D6B" },
  { id: "ploa", titulo: "Projeto de Lei Orçamentária Anual (PLOA)", cor: "#C6543F" },
  { id: "pln", titulo: "Projeto de Lei do Congresso Nacional (PLN)", cor: "#7A5AC2" },
  { id: "mpv", titulo: "Medida Provisória (MPV)", cor: "#C79A3A" },
  { id: "cartilhas", titulo: "Confecção das Cartilhas", cor: "#3AA6A6" },
  { id: "emendas", titulo: "Emendas Parlamentares", cor: "#C25A93" },
  { id: "cmo", titulo: "Comissão Mista de Planos, Orçamentos Públicos e Fiscalização (CMO)", cor: "#2E8B99" },
  { id: "medalhas", titulo: "Indicação de Medalhas", cor: "#8E6D3A" },
  { id: "convidados", titulo: "Indicação de Convidados para Atividades Institucionais", cor: "#5C6BC0" },
];

// Transforma URLs do texto em links clicáveis.
function comLinks(texto) {
  const partes = String(texto || "").split(/(https?:\/\/[^\s]+)/g);
  return partes.map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="rot-link">{p}</a>
      : <span key={i}>{p}</span>
  );
}

export default function RotinaAsseOrc({ rotina }) {
  const { itens = [], carregado, erro, adicionar, editar, excluir, reordenar } = rotina || {};
  const comum = { itens, adicionar, editar, excluir, reordenar };
  return (
    <div className="rot-wrap">
      <p className="page-sub">
        Atividades do Assessor Parlamentar de Orçamento. Em cada card, adicione, edite, exclua e
        reordene (arrastando) tarefas e subtarefas. Links colados viram clicáveis.
      </p>

      {erro && (
        <div className="lexor-aviso-erro">
          A rotina não pôde ser lida ou gravada. Rode o script
          <code> supabase_rotina.sql </code> no SQL Editor do Supabase para criar a tabela.
        </div>
      )}

      {!carregado ? (
        <div className="loading-state">Carregando rotina…</div>
      ) : (
        <>
          <CardAtividade card={ROTINA_DIARIA} {...comum} />
          <div className="rot-cards">
            {CARDS.map((c) => <CardAtividade key={c.id} card={c} {...comum} />)}
          </div>
        </>
      )}
    </div>
  );
}

function CardAtividade({ card, itens, adicionar, editar, excluir, reordenar }) {
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [subDe, setSubDe] = useState(null);
  const [subTexto, setSubTexto] = useState("");
  const [arr, setArr] = useState(null);   // { id, parent } sendo arrastado
  const [alvo, setAlvo] = useState(null);

  const tarefas = useMemo(
    () => itens.filter((i) => i.card === card.id && !i.parentId).sort((a, b) => a.pos - b.pos),
    [itens, card.id]
  );
  const subsDe = (pid) => itens.filter((i) => i.parentId === pid).sort((a, b) => a.pos - b.pos);

  function enviarNovo() { const t = novo.trim(); if (!t) return; adicionar?.(card.id, t, null); setNovo(""); }
  function salvarEdicao(id) { editar?.(id, rascunho); setEditId(null); }
  function enviarSub(pid) { const t = subTexto.trim(); if (!t) return; adicionar?.(card.id, t, pid); setSubTexto(""); setSubDe(null); }

  // parentId = null → reordena tarefas; senão, subtarefas daquele pai.
  function soltarEm(alvoId, parentId) {
    const de = arr; setArr(null); setAlvo(null);
    if (!de || de.id === alvoId || de.parent !== parentId) return;
    const grupo = (parentId === null ? tarefas : subsDe(parentId)).map((x) => x.id);
    const iDe = grupo.indexOf(de.id), iAlvo = grupo.indexOf(alvoId);
    if (iDe < 0 || iAlvo < 0) return;
    grupo.splice(iAlvo, 0, grupo.splice(iDe, 1)[0]);
    reordenar?.(grupo);
  }

  const editInput = (onBlurSalvar) => (
    <input className="input rot-edit" autoFocus value={rascunho}
      onChange={(e) => setRascunho(e.target.value)} onBlur={onBlurSalvar}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditId(null); }} />
  );

  return (
    <section className="rot-card" style={{ "--rot-cor": card.cor, "--rot-cor-bg": card.cor + "14" }}>
      <h3 className="rot-card-tit">{card.titulo}</h3>

      <ul className="rot-lista">
        {tarefas.map((t) => (
          <li key={t.id}
            className={`rot-tarefa${arr?.id === t.id ? " rot-arrastando" : ""}${alvo === t.id && arr && arr.parent === null && arr.id !== t.id ? " rot-alvo" : ""}`}
            draggable={editId !== t.id}
            onDragStart={(e) => { if (editId === t.id) return; setArr({ id: t.id, parent: null }); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => { setArr(null); setAlvo(null); }}
            onDragOver={(e) => { if (arr && arr.parent === null) { e.preventDefault(); setAlvo(t.id); } }}
            onDrop={(e) => { e.preventDefault(); soltarEm(t.id, null); }}>
            <div className="rot-linha">
              <span className="rot-grip" title="Arraste para reordenar"><GripVertical size={13} /></span>
              {editId === t.id ? editInput(() => salvarEdicao(t.id)) : <span className="rot-txt">{comLinks(t.texto)}</span>}
              <div className="rot-acoes">
                <button className="icon-btn" title="Adicionar subtarefa" onClick={() => { setSubDe(t.id); setSubTexto(""); }}><CornerDownRight size={13} /></button>
                <button className="icon-btn" title="Editar" onClick={() => { setEditId(t.id); setRascunho(t.texto); }}><Pencil size={13} /></button>
                <button className="icon-btn" title="Excluir" onClick={() => { if (confirm("Excluir esta tarefa?")) excluir?.(t.id); }}><Trash2 size={13} /></button>
              </div>
            </div>
            {(subsDe(t.id).length > 0 || subDe === t.id) && (
              <ul className="rot-subs">
                {subsDe(t.id).map((s) => (
                  <li key={s.id}
                    className={`rot-sub${arr?.id === s.id ? " rot-arrastando" : ""}${alvo === s.id && arr && arr.parent === t.id && arr.id !== s.id ? " rot-alvo" : ""}`}
                    draggable={editId !== s.id}
                    onDragStart={(e) => { if (editId === s.id) return; e.stopPropagation(); setArr({ id: s.id, parent: t.id }); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setArr(null); setAlvo(null); }}
                    onDragOver={(e) => { if (arr && arr.parent === t.id) { e.preventDefault(); setAlvo(s.id); } }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); soltarEm(s.id, t.id); }}>
                    <span className="rot-grip rot-grip-sub" title="Arraste para reordenar"><GripVertical size={12} /></span>
                    <CornerDownRight size={12} className="rot-sub-ico" />
                    {editId === s.id ? editInput(() => salvarEdicao(s.id)) : <span className="rot-txt">{comLinks(s.texto)}</span>}
                    <div className="rot-acoes">
                      <button className="icon-btn" title="Editar" onClick={() => { setEditId(s.id); setRascunho(s.texto); }}><Pencil size={12} /></button>
                      <button className="icon-btn" title="Excluir" onClick={() => { if (confirm("Excluir esta subtarefa?")) excluir?.(s.id); }}><Trash2 size={12} /></button>
                    </div>
                  </li>
                ))}
                {subDe === t.id && (
                  <li className="rot-sub">
                    <CornerDownRight size={12} className="rot-sub-ico" />
                    <input className="input rot-edit" autoFocus placeholder="Nova subtarefa" value={subTexto}
                      onChange={(e) => setSubTexto(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") enviarSub(t.id); if (e.key === "Escape") setSubDe(null); }}
                      onBlur={() => { if (subTexto.trim()) enviarSub(t.id); else setSubDe(null); }} />
                  </li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="rot-add">
        <Plus size={14} className="rot-add-ico" />
        <input className="rot-add-in" placeholder="Adicionar tarefa" value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviarNovo(); }} />
      </div>
    </section>
  );
}
