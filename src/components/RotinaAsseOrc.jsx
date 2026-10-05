import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, CornerDownRight, GripVertical, FileDown, Image as ImageIcon } from "lucide-react";
import { exportarCardDocx } from "../rotinaDoc.js";
import { exportarGraficoPng } from "../exportUtils.js";

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
  { id: "eleicoes", titulo: "Eleições", cor: "#2F8F5B" },
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
        reordene (arrastando) tarefas e subtarefas — inclusive subtarefas de subtarefas. Links
        colados viram clicáveis. Cada card pode ser exportado em DOCX ou PNG.
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
  const ref = useRef(null);
  const [novo, setNovo] = useState("");
  const [editId, setEditId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [subDe, setSubDe] = useState(null);     // id do item que recebe nova subtarefa
  const [subTexto, setSubTexto] = useState("");
  const [arr, setArr] = useState(null);          // { id, parent } sendo arrastado
  const [alvo, setAlvo] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  // Filhos de um item (null = tarefas do card), na ordem salva.
  const filhosDe = (pid) =>
    itens.filter((i) => i.card === card.id && (i.parentId || null) === pid).sort((a, b) => a.pos - b.pos);

  function enviarNovo() { const t = novo.trim(); if (!t) return; adicionar?.(card.id, t, null); setNovo(""); }
  function salvarEdicao(id) { editar?.(id, rascunho); setEditId(null); }
  function enviarSub(pid) { const t = subTexto.trim(); if (!t) return; adicionar?.(card.id, t, pid); setSubTexto(""); setSubDe(null); }

  // Reordena entre irmãos (mesmo pai); arrastar para outro nível não faz nada.
  function soltarEm(alvoId, parentId) {
    const de = arr; setArr(null); setAlvo(null);
    if (!de || de.id === alvoId || de.parent !== parentId) return;
    const grupo = filhosDe(parentId).map((x) => x.id);
    const iDe = grupo.indexOf(de.id), iAlvo = grupo.indexOf(alvoId);
    if (iDe < 0 || iAlvo < 0) return;
    grupo.splice(iAlvo, 0, grupo.splice(iDe, 1)[0]);
    reordenar?.(grupo);
  }

  async function exportar(fn) {
    setOcupado(true);
    try { await fn(); } catch (e) { console.error("Falha ao exportar o card:", e); }
    setOcupado(false);
  }

  const editInput = (onBlurSalvar) => (
    <input className="input rot-edit" autoFocus value={rascunho}
      onChange={(e) => setRascunho(e.target.value)} onBlur={onBlurSalvar}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditId(null); }} />
  );

  // Um item e, recursivamente, suas subtarefas. Função de render (não
  // componente), para não remontar a árvore — e perder o foco — a cada tecla.
  function renderNo(it, parent, nivel) {
    const filhos = filhosDe(it.id);
    const ehAlvo = alvo === it.id && arr && arr.parent === parent && arr.id !== it.id;
    return (
      <li key={it.id} className={`rot-no rot-nivel-${Math.min(nivel, 3)}${arr?.id === it.id ? " rot-arrastando" : ""}${ehAlvo ? " rot-alvo" : ""}`}
        draggable={editId !== it.id}
        onDragStart={(e) => { e.stopPropagation(); if (editId === it.id) return; setArr({ id: it.id, parent }); e.dataTransfer.effectAllowed = "move"; }}
        onDragEnd={(e) => { e.stopPropagation(); setArr(null); setAlvo(null); }}
        onDragOver={(e) => { if (arr && arr.parent === parent) { e.preventDefault(); e.stopPropagation(); setAlvo(it.id); } }}
        onDrop={(e) => { if (arr && arr.parent === parent) { e.preventDefault(); e.stopPropagation(); soltarEm(it.id, parent); } }}>
        <div className="rot-linha">
          <span className="rot-grip no-export" title="Arraste para reordenar"><GripVertical size={nivel ? 12 : 13} /></span>
          {nivel > 0 && <CornerDownRight size={12} className="rot-sub-ico" />}
          {editId === it.id ? editInput(() => salvarEdicao(it.id)) : <span className="rot-txt">{comLinks(it.texto)}</span>}
          <div className="rot-acoes no-export">
            <button className="icon-btn" title="Adicionar subtarefa" onClick={() => { setSubDe(it.id); setSubTexto(""); }}><CornerDownRight size={13} /></button>
            <button className="icon-btn" title="Editar" onClick={() => { setEditId(it.id); setRascunho(it.texto); }}><Pencil size={13} /></button>
            <button className="icon-btn" title="Excluir"
              onClick={() => { if (confirm(filhos.length ? "Excluir este item e todas as suas subtarefas?" : "Excluir este item?")) excluir?.(it.id); }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {(filhos.length > 0 || subDe === it.id) && (
          <ul className="rot-subs">
            {filhos.map((f) => renderNo(f, it.id, nivel + 1))}
            {subDe === it.id && (
              <li className="rot-no rot-nivel-novo no-export">
                <div className="rot-linha">
                  <CornerDownRight size={12} className="rot-sub-ico" />
                  <input className="input rot-edit" autoFocus placeholder="Nova subtarefa" value={subTexto}
                    onChange={(e) => setSubTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") enviarSub(it.id); if (e.key === "Escape") setSubDe(null); }}
                    onBlur={() => { if (subTexto.trim()) enviarSub(it.id); else setSubDe(null); }} />
                </div>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  const slug = card.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "_");

  return (
    <section ref={ref} className="rot-card" style={{ "--rot-cor": card.cor, "--rot-cor-bg": card.cor + "14" }}>
      <div className="rot-card-topo">
        <h3 className="rot-card-tit">{card.titulo}</h3>
        <div className="chart-actions no-export">
          <button className="mini-btn" disabled={ocupado} title="Exportar este card em DOCX (Word)"
            onClick={() => exportar(() => exportarCardDocx({ card, itens }))}>
            <FileDown size={13} /> DOCX
          </button>
          <button className="mini-btn" disabled={ocupado} title="Exportar este card como imagem PNG"
            onClick={() => exportar(() => exportarGraficoPng(ref.current, `Rotina_${slug}`))}>
            <ImageIcon size={13} /> PNG
          </button>
        </div>
      </div>

      <ul className="rot-lista">
        {filhosDe(null).map((t) => renderNo(t, null, 0))}
      </ul>

      <div className="rot-add no-export">
        <Plus size={14} className="rot-add-ico" />
        <input className="rot-add-in" placeholder="Adicionar tarefa" value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enviarNovo(); }} />
      </div>
    </section>
  );
}
