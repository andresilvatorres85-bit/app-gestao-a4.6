import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, Pencil, Trash2, X, ExternalLink, RefreshCw, Save, ClipboardList,
} from "lucide-react";
import { StatCard } from "./UI.jsx";
import { Field } from "./UI.jsx";
import {
  STATUS, STATUS_ORDEM, statusInfo, TIPOS, CASAS, rotuloCasa,
  normalizarProposicao, normalizarAutor,
} from "../proposicoes.js";
import { lerTramitacao, podeAtualizar } from "../tramitacao.js";

const VAZIO = {
  proposicao: "", tipo: "PL", casa: "CD", status: "normal", autor: "", relator: "", assessor: "",
  link: "", ementa: "", impacto: "", tramitacao: "", atuacao: "", percepcao: "",
};

const PAGINA = 10; // proposições exibidas por vez ("Mostrar +")

export default function Proposicoes({ itens = [], inserir, atualizar, excluir }) {
  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("Todos");
  const [fCasa, setFCasa] = useState("Todas");
  const [fStatus, setFStatus] = useState("Todos");
  const [fAssessor, setFAssessor] = useState("Todos");
  const [edit, setEdit] = useState(null); // registro em edição/criação
  const [visiveis, setVisiveis] = useState(PAGINA);

  const opcoes = useMemo(() => {
    const tipos = new Set(TIPOS), assessores = new Set();
    for (const p of itens) { if (p.tipo) tipos.add(p.tipo); if (p.assessor) assessores.add(p.assessor); }
    return { tipos: [...tipos].sort(), assessores: [...assessores].sort() };
  }, [itens]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((p) => {
      if (fTipo !== "Todos" && p.tipo !== fTipo) return false;
      if (fCasa !== "Todas" && p.casa !== fCasa) return false;
      if (fStatus !== "Todos" && p.status !== fStatus) return false;
      if (fAssessor !== "Todos" && p.assessor !== fAssessor) return false;
      if (!termo) return true;
      return [p.proposicao, p.tipo, p.ementa, p.autor, p.assessor, p.tramitacao, p.percepcao]
        .some((c) => (c || "").toLowerCase().includes(termo));
    });
  }, [itens, busca, fTipo, fCasa, fStatus, fAssessor]);

  // Volta a 10 sempre que o recorte muda.
  useEffect(() => { setVisiveis(PAGINA); }, [busca, fTipo, fCasa, fStatus, fAssessor]);
  const mostradas = filtradas.slice(0, visiveis);

  const porStatus = useMemo(() => {
    const m = {}; for (const s of STATUS_ORDEM) m[s] = 0;
    for (const p of itens) m[p.status] = (m[p.status] || 0) + 1;
    return m;
  }, [itens]);

  return (
    <div className="view-pad view-pad-lexor">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Proposições legislativas</h1>
          <p className="page-sub">
            Controle das proposições de interesse orçamentário do Exército — {itens.length.toLocaleString("pt-BR")} no total.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit({ ...VAZIO })}>
          <Plus size={16} /> Nova proposição
        </button>
      </div>

      <div className="stat-grid stat-grid-3">
        <StatCard label="No filtro" value={filtradas.length.toLocaleString("pt-BR")}
          sub={`de ${itens.length.toLocaleString("pt-BR")} no total`} icon={ClipboardList} />
        <StatCard label="Atenção" value={porStatus.atencao || 0} sub="acompanhamento prioritário" icon={ClipboardList} />
        <StatCard label="Em acompanhamento" value={(porStatus.normal || 0) + (porStatus.interesse || 0)} sub="normal + interesse" icon={ClipboardList} />
      </div>

      {/* Legenda de status */}
      <div className="prop-legenda">
        {STATUS_ORDEM.map((s) => (
          <span key={s} className="prop-legenda-item" title={STATUS[s].legenda}>
            <span className="prop-bolinha" style={{ background: STATUS[s].cor }} />
            {STATUS[s].rotulo}
          </span>
        ))}
      </div>

      <div className="lexor-filtros">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="input search-input" placeholder="Buscar por nº, ementa, autor, tramitação…"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className={`input ${fTipo === "Todos" ? "input-marca" : ""}`} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
          <option value="Todos">Tipo</option>
          {opcoes.tipos.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className={`input ${fCasa === "Todas" ? "input-marca" : ""}`} value={fCasa} onChange={(e) => setFCasa(e.target.value)}>
          <option value="Todas">Casa</option>
          {CASAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select>
        <select className={`input ${fStatus === "Todos" ? "input-marca" : ""}`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="Todos">Status</option>
          {STATUS_ORDEM.map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
        </select>
        <select className={`input ${fAssessor === "Todos" ? "input-marca" : ""}`} value={fAssessor} onChange={(e) => setFAssessor(e.target.value)}>
          <option value="Todos">Assessor</option>
          {opcoes.assessores.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="tbl tbl-prop">
          <colgroup>
            <col className="c-prop" /><col className="c-tipo" /><col className="c-casa" />
            <col className="c-ementa" /><col className="c-tram" /><col className="c-autor" />
            <col className="c-relator" /><col className="c-assessor" /><col className="c-status" /><col className="c-acoes" />
          </colgroup>
          <thead>
            <tr>
              <th>Proposição</th><th>Tipo</th><th>Casa</th><th>Ementa</th>
              <th>Tramitação</th><th>Autor</th><th>Relator</th><th>Assessor</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {mostradas.map((p) => {
              const si = statusInfo(p.status);
              return (
                <tr key={p.id}>
                  <td className="mono prop-nr">
                    <span className="prop-bolinha" style={{ background: si.cor }} title={si.rotulo} />
                    {p.link
                      ? <a href={p.link} target="_blank" rel="noreferrer" className="prop-link">{p.proposicao} <ExternalLink size={12} /></a>
                      : p.proposicao}
                  </td>
                  <td className="mono">{p.tipo}</td>
                  <td className="mono" title={rotuloCasa(p.casa)}>{p.casa}</td>
                  <td title={p.ementa}><div className="lc lc-3">{p.ementa}</div></td>
                  <td className="prop-tram-col" title={p.tramitacao}><div className="lc lc-3">{p.tramitacao || "—"}</div></td>
                  <td title={p.autor}><div className="lc lc-2">{p.autor}</div></td>
                  <td title={p.relator}><div className="lc lc-2">{p.relator || "—"}</div></td>
                  <td className="prop-assessor">{p.assessor || "—"}</td>
                  <td><span className="prop-chip" style={{ color: si.cor, borderColor: si.cor }}>{si.rotulo}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title="Editar" onClick={() => setEdit(p)}><Pencil size={16} /></button>
                      <button className="icon-btn" title="Excluir" onClick={() => { if (confirm(`Excluir a proposição ${p.proposicao}?`)) excluir(p.id); }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={10} className="empty-row">Nenhuma proposição para os filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="prop-mostrar">
        <span className="page-info">
          Mostrando {mostradas.length} de {filtradas.length.toLocaleString("pt-BR")}
        </span>
        {visiveis < filtradas.length && (
          <button className="btn btn-ghost btn-sm" onClick={() => setVisiveis((v) => v + PAGINA)}>
            Mostrar + {Math.min(PAGINA, filtradas.length - visiveis)}
          </button>
        )}
      </div>

      {edit && (
        <ModalProposicao registro={edit} onFechar={() => setEdit(null)}
          inserir={inserir} atualizar={atualizar} />
      )}
    </div>
  );
}

function ModalProposicao({ registro, onFechar, inserir, atualizar }) {
  const editando = !!registro.id;
  const [f, setF] = useState({ ...VAZIO, ...registro });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [tram, setTram] = useState({ carregando: false, msg: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErro(""); };

  async function atualizarTramitacao() {
    setTram({ carregando: true, msg: "" });
    try {
      const texto = await lerTramitacao(f.link);
      setF((s) => ({ ...s, tramitacao: texto }));
      setTram({ carregando: false, msg: "Tramitação atualizada pelo site." });
    } catch (e) {
      setTram({ carregando: false, msg: e?.message || "Falha ao ler a tramitação." });
    }
  }

  async function salvar(e) {
    e.preventDefault();
    const dados = { ...f, proposicao: normalizarProposicao(f.proposicao), autor: normalizarAutor(f.autor) };
    if (!dados.proposicao) { setErro("Informe o número da proposição."); return; }
    setSalvando(true);
    const res = editando ? await atualizar(registro.id, dados) : await inserir(dados);
    setSalvando(false);
    if (res.error) { setErro("Não foi possível salvar: " + res.error.message); return; }
    onFechar();
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <form className="modal-caixa" onSubmit={salvar}>
        <div className="modal-cab">
          <h2>{editando ? `Editar proposição ${registro.proposicao}` : "Nova proposição"}</h2>
          <button type="button" className="icon-btn" onClick={onFechar}><X size={18} /></button>
        </div>

        <div className="modal-corpo">
          <div className="form-grid">
            <Field label="Proposição" required hint="Nº/ano — normalizado ao salvar.">
              <input className="input" value={f.proposicao} onChange={set("proposicao")} placeholder="Ex: 4406/2021" />
            </Field>
            <Field label="Tipo">
              <input className="input" list="prop-tipos" value={f.tipo} onChange={set("tipo")} placeholder="PL" />
              <datalist id="prop-tipos">{TIPOS.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Casa">
              <select className="input" value={f.casa} onChange={set("casa")}>
                {CASAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={f.status} onChange={set("status")}>
                {STATUS_ORDEM.map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
              </select>
            </Field>
            <Field label="Autor">
              <input className="input" value={f.autor} onChange={set("autor")} placeholder="Nome (PARTIDO/UF)" />
            </Field>
            <Field label="Relator">
              <input className="input" value={f.relator} onChange={set("relator")} placeholder="Ex: Dep. Fulano" />
            </Field>
            <Field label="Assessor designado">
              <input className="input" value={f.assessor} onChange={set("assessor")} placeholder="Ex: Maj Torres" />
            </Field>
            <Field label="Link da proposição" hint="Câmara/Senado — habilita a atualização automática.">
              <input className="input" value={f.link} onChange={set("link")} placeholder="https://…" />
            </Field>
          </div>

          <Field label="Ementa">
            <textarea className="input textarea" rows={2} value={f.ementa} onChange={set("ementa")} />
          </Field>
          <Field label="Impacto">
            <textarea className="input textarea" rows={2} value={f.impacto} onChange={set("impacto")} />
          </Field>

          <Field label="Tramitação">
            <div className="prop-tram-cab">
              <button type="button" className="btn btn-ghost btn-sm" onClick={atualizarTramitacao}
                disabled={tram.carregando || !podeAtualizar(f.link)}
                title={podeAtualizar(f.link) ? "Lê as movimentações no site (Câmara/Senado)" : "Link sem fonte reconhecida — edite à mão"}>
                <RefreshCw size={14} className={tram.carregando ? "girando" : ""} /> {tram.carregando ? "Atualizando…" : "Atualizar pelo site"}
              </button>
              {tram.msg && <span className="prop-tram-msg">{tram.msg}</span>}
            </div>
            <textarea className="input textarea" rows={5} value={f.tramitacao} onChange={set("tramitacao")} />
          </Field>

          <div className="form-grid">
            <Field label="Atuação (A4.6)">
              <textarea className="input textarea" rows={2} value={f.atuacao} onChange={set("atuacao")} />
            </Field>
            <Field label="Percepção / Observações">
              <textarea className="input textarea" rows={2} value={f.percepcao} onChange={set("percepcao")} />
            </Field>
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}
        </div>

        <div className="modal-rodape">
          <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            <Save size={16} /> {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
