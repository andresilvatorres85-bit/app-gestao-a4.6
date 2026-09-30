import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Save, Search, Phone, Mail } from "lucide-react";
import { UFS } from "../constants.js";

// Grupos de contatos (ordem de exibição).
const GRUPOS = [
  { id: "camara", nome: "Câmara dos Deputados" },
  { id: "senado", nome: "Senado" },
  { id: "conorf", nome: "CONORF" },
  { id: "conof", nome: "CONOF" },
  { id: "aspar_eb", nome: "AsPar EB" },
  { id: "exercito", nome: "Exército" },
  { id: "aspar_aer", nome: "AsPar Aeronáutica" },
  { id: "aspar_mar", nome: "AsPar Marinha" },
  { id: "outros", nome: "Outros" },
];
const NOME_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.id, g.nome]));

// Campos (schema) de cada grupo.
const F_PARLAMENTO = [
  { k: "nome", rot: "Nome" },
  { k: "funcao", rot: "Função" },
  { k: "parlamentar", rot: "Parlamentar", tipo: "parlamentar" },
  { k: "partido", rot: "Partido" },
  { k: "estado", rot: "Estado", tipo: "uf" },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const F_CONSULTORIA = [
  { k: "nome", rot: "Nome" },
  { k: "funcao", rot: "Função" },
  { k: "consultoria", rot: "Consultoria", tipo: "select", opcoes: ["CONORF", "CONOF"] },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const F_EB = [
  { k: "posto", rot: "Posto/Grad" },
  { k: "nomeGuerra", rot: "Nome de Guerra" },
  { k: "turma", rot: "Turma" },
  { k: "cmila", rot: "C Mil A" },
  { k: "estado", rot: "Estado", tipo: "uf" },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const F_EXERCITO = [
  { k: "posto", rot: "Posto/Grad" },
  { k: "nomeGuerra", rot: "Nome de Guerra" },
  { k: "turma", rot: "Turma" },
  { k: "om", rot: "OM" },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const F_FORCA = [
  { k: "posto", rot: "Posto/Grad" },
  { k: "nomeGuerra", rot: "Nome de Guerra" },
  { k: "funcao", rot: "Função" },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const F_OUTROS = [
  { k: "nome", rot: "Nome" },
  { k: "funcao", rot: "Função" },
  { k: "instituicao", rot: "Instituição/Órgão" },
  { k: "telefone", rot: "Telefone" },
  { k: "email", rot: "E-mail" },
  { k: "obs", rot: "Observações", tipo: "textarea" },
];
const SCHEMAS = {
  camara: F_PARLAMENTO, senado: F_PARLAMENTO,
  conorf: F_CONSULTORIA, conof: F_CONSULTORIA,
  aspar_eb: F_EB, exercito: F_EXERCITO,
  aspar_aer: F_FORCA, aspar_mar: F_FORCA, outros: F_OUTROS,
};
const MILITAR = new Set(["aspar_eb", "exercito", "aspar_aer", "aspar_mar"]);

function tituloContato(c) {
  const d = c.dados || {};
  if (MILITAR.has(c.grupo)) return [d.posto, d.nomeGuerra].filter(Boolean).join(" ").trim() || "(sem nome)";
  return (d.nome || "").trim() || "(sem nome)";
}
function subtituloContato(c) {
  return (c.dados || {}).funcao || "";
}
function textoBusca(c) {
  const d = c.dados || {};
  return [NOME_GRUPO[c.grupo], ...Object.values(d)].join(" ").toLowerCase();
}

export default function Contatos({ contatos }) {
  const { itens = [], carregado, erro, inserir, atualizar, excluir } = contatos || {};
  const [grupoSel, setGrupoSel] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);

  const contagem = useMemo(() => {
    const m = {}; for (const c of itens) m[c.grupo] = (m[c.grupo] || 0) + 1; return m;
  }, [itens]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens
      .filter((c) => grupoSel === "todos" || c.grupo === grupoSel)
      .filter((c) => !q || textoBusca(c).includes(q))
      .sort((a, b) => tituloContato(a).localeCompare(tituloContato(b), "pt-BR"));
  }, [itens, grupoSel, busca]);

  function novo() { setModal({ grupo: grupoSel === "todos" ? "camara" : grupoSel, dados: {} }); }
  function editar(c) { setModal({ id: c.id, grupo: c.grupo, dados: { ...c.dados } }); }

  return (
    <div className="ct-wrap">
      {erro && (
        <div className="lexor-aviso-erro">
          A agenda de contatos não pôde ser lida ou gravada. Rode o script
          <code> supabase_conhecimento.sql </code> no SQL Editor do Supabase para criar as tabelas.
        </div>
      )}

      <div className="ct-topo">
        <div className="ct-busca">
          <Search size={15} className="ct-busca-ico" />
          <input className="ct-busca-in" placeholder="Buscar contato…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={novo}><Plus size={15} /> Novo contato</button>
      </div>

      <div className="ct-grupos">
        <button className={`chip ${grupoSel === "todos" ? "chip-active" : ""}`} onClick={() => setGrupoSel("todos")}>
          Todos <span className="ct-cont">{itens.length}</span>
        </button>
        {GRUPOS.map((g) => (
          <button key={g.id} className={`chip ${grupoSel === g.id ? "chip-active" : ""}`} onClick={() => setGrupoSel(g.id)}>
            {g.nome} <span className="ct-cont">{contagem[g.id] || 0}</span>
          </button>
        ))}
      </div>

      {!carregado ? (
        <div className="loading-state">Carregando contatos…</div>
      ) : visiveis.length === 0 ? (
        <p className="ct-vazio">{busca ? "Nenhum contato encontrado." : "Nenhum contato neste grupo. Use “Novo contato” para incluir."}</p>
      ) : (
        <div className="ct-lista">
          {visiveis.map((c) => (
            <CartaoContato key={c.id} c={c} onEditar={() => editar(c)}
              onExcluir={() => { if (confirm(`Excluir "${tituloContato(c)}"?`)) excluir?.(c.id); }} />
          ))}
        </div>
      )}

      {modal && (
        <ModalContato estado={modal}
          onFechar={() => setModal(null)}
          onSalvar={async (grupo, dados) => {
            const res = modal.id ? await atualizar(modal.id, grupo, dados) : await inserir(grupo, dados);
            if (!res?.error) setModal(null);
            return res;
          }} />
      )}
    </div>
  );
}

function CartaoContato({ c, onEditar, onExcluir }) {
  const d = c.dados || {};
  const schema = SCHEMAS[c.grupo] || F_OUTROS;
  const titulo = tituloContato(c);
  const sub = subtituloContato(c);
  // linhas mostradas no corpo (fora título/subtítulo, telefone, email e obs).
  const ocultar = new Set(["obs", "telefone", "email", "posto", "nomeGuerra", "nome", "funcao"]);
  const linhas = schema.filter((f) => !ocultar.has(f.k) && f.tipo !== "parlamentar" && (d[f.k] || "").toString().trim());
  const parlamentar = d.parlamentarNome ? `${d.parlamentarTipo ? d.parlamentarTipo + ". " : ""}${d.parlamentarNome}` : "";

  return (
    <div className="ct-card">
      <div className="ct-card-cab">
        <div className="ct-card-tit">
          <strong>{titulo}</strong>
          {sub && <span className="ct-card-sub">{sub}</span>}
        </div>
        <div className="ct-card-acoes">
          <button className="icon-btn" title="Editar" onClick={onEditar}><Pencil size={13} /></button>
          <button className="icon-btn" title="Excluir" onClick={onExcluir}><Trash2 size={13} /></button>
        </div>
      </div>
      <span className="ct-tag">{NOME_GRUPO[c.grupo]}</span>
      <div className="ct-campos">
        {parlamentar && <div className="ct-linha"><span>Parlamentar</span><b>{parlamentar}</b></div>}
        {linhas.map((f) => (<div key={f.k} className="ct-linha"><span>{f.rot}</span><b>{d[f.k]}</b></div>))}
        {d.telefone && <div className="ct-linha"><span><Phone size={12} /> Telefone</span><a href={`tel:${d.telefone}`}>{d.telefone}</a></div>}
        {d.email && <div className="ct-linha"><span><Mail size={12} /> E-mail</span><a href={`mailto:${d.email}`}>{d.email}</a></div>}
        {d.obs && <p className="ct-obs">{d.obs}</p>}
      </div>
    </div>
  );
}

function ModalContato({ estado, onFechar, onSalvar }) {
  const [grupo, setGrupo] = useState(estado.grupo);
  const [dados, setDados] = useState(estado.dados || {});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const schema = SCHEMAS[grupo] || F_OUTROS;
  const set = (k) => (e) => setDados((s) => ({ ...s, [k]: e.target.value }));

  async function salvar(ev) {
    ev.preventDefault();
    setSalvando(true);
    const res = await onSalvar(grupo, dados);
    setSalvando(false);
    if (res?.error) setErro("Não foi possível salvar: " + (res.error.message || "erro"));
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <form className="modal-caixa" onSubmit={salvar}>
        <div className="modal-cab">
          <h2>{estado.id ? "Editar contato" : "Novo contato"}</h2>
          <button type="button" className="icon-btn" onClick={onFechar}><X size={18} /></button>
        </div>
        <div className="modal-corpo cal-campo-col">
          <div className="cal-campo">
            <span className="cal-campo-rot">Grupo</span>
            <select className="input" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              {GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
          {schema.map((f) => (
            <div className="cal-campo" key={f.k}>
              <span className="cal-campo-rot">{f.rot}</span>
              <CampoContato campo={f} dados={dados} set={set} setDados={setDados} />
            </div>
          ))}
          {erro && <div className="alert alert-error">{erro}</div>}
        </div>
        <div className="modal-rodape">
          <span />
          <div className="cal-modal-acoes">
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CampoContato({ campo, dados, set, setDados }) {
  const v = dados[campo.k] || "";
  if (campo.tipo === "uf") {
    return (
      <select className="input" value={v} onChange={set(campo.k)}>
        <option value="">—</option>
        {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    );
  }
  if (campo.tipo === "select") {
    return (
      <select className="input" value={v} onChange={set(campo.k)}>
        <option value="">—</option>
        {campo.opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (campo.tipo === "textarea") {
    return <textarea className="input textarea" rows={3} value={v} onChange={set(campo.k)} placeholder="Opcional" />;
  }
  if (campo.tipo === "parlamentar") {
    return (
      <div className="ct-parlamentar">
        <select className="input ct-parl-tipo" value={dados.parlamentarTipo || ""} onChange={(e) => setDados((s) => ({ ...s, parlamentarTipo: e.target.value }))}>
          <option value="">—</option>
          <option value="Dep">Dep</option>
          <option value="Sen">Sen</option>
        </select>
        <input className="input" value={dados.parlamentarNome || ""} onChange={(e) => setDados((s) => ({ ...s, parlamentarNome: e.target.value }))} placeholder="Nome do parlamentar" />
      </div>
    );
  }
  return <input className="input" value={v} onChange={set(campo.k)} placeholder="Opcional" inputMode={campo.k === "email" ? "email" : campo.k === "telefone" ? "tel" : undefined} />;
}
