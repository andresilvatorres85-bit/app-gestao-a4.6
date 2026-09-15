import { useState } from "react";
import { FileText, Save, Download, Trash2 } from "lucide-react";
import { Field } from "./UI.jsx";
import { UFS, MESES_LONGO } from "../constants.js";
import { todayParts } from "../helpers.js";
import { baixarOficioDocx, resumoObjeto } from "../objetoEmendaDoc.js";

const CARGOS = ["Deputado Federal", "Deputada Federal", "Senador", "Senadora"];
const AJUSTES = [
  "Ampliação do objeto.",
  "Alteração de objeto.",
  "Alteração de objeto e de OM beneficiária.",
  "Mudança de ação orçamentária (AO).",
  "Alteração de OM beneficiária.",
];

function fmtData(d) {
  if (!d.dia || !d.mes || !d.ano) return "—";
  return `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
}

export default function ObjetoEmenda({ itens, inserir, excluir, partidos = [], autorAtual, emailAtual }) {
  const hoje = todayParts();
  const [f, setF] = useState({
    parlamentar: "", cargo: "Deputado Federal", partido: "", uf: "",
    oficioNr: "", dia: hoje.d, mes: hoje.m, ano: hoje.y,
    emenda: "", objetoDe: "", objetoPara: "", ajuste: "",
    gabinete: "", telefone: "", email: "",
  });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErro(""); setOk(""); };

  function validar(paraSalvar) {
    if (!f.parlamentar.trim()) return "Informe o nome do parlamentar.";
    if (!f.emenda.trim()) return "Informe o número da emenda.";
    if (!f.objetoPara.trim()) return "Informe o novo objeto (PARA).";
    if (paraSalvar && !f.ajuste.trim()) return "Informe o tipo de ajuste (para a consolidação).";
    return "";
  }

  async function gerar() {
    const v = validar(false);
    if (v) { setErro(v); return; }
    setGerando(true);
    try {
      await baixarOficioDocx(f);
      setOk("Ofício gerado — verifique os downloads.");
    } catch (e) {
      setErro("Falha ao gerar o documento: " + (e?.message || e));
    }
    setGerando(false);
  }

  async function salvar() {
    const v = validar(true);
    if (v) { setErro(v); return; }
    setSalvando(true);
    const { error } = await inserir({ ...f, autor: autorAtual || emailAtual || null });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar: " + error.message); return; }
    setOk("Registro adicionado à consolidação (Painel).");
    setF((s) => ({
      ...s, parlamentar: "", partido: "", uf: "", oficioNr: "",
      emenda: "", objetoDe: "", objetoPara: "", ajuste: "",
    }));
  }

  async function baixarItem(it) {
    try { await baixarOficioDocx(it); } catch (e) { /* silencioso */ }
  }

  return (
    <div className="view-pad">
      <h1 className="page-title">Objeto de emenda</h1>
      <p className="page-sub">
        Gere o ofício de autorização de troca/ampliação do objeto de uma emenda destinada ao
        Exército e registre a mudança na consolidação (aba <strong>Painel</strong>).
      </p>

      <form className="panel form" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div className="form-grid">
          <Field label="Parlamentar" required>
            <input className="input" value={f.parlamentar} onChange={set("parlamentar")}
              placeholder="Nome do parlamentar (como assina)" />
          </Field>

          <Field label="Cargo" hint="Concorda o gênero do cabeçalho (do/da).">
            <input className="input" list="cargos-list" value={f.cargo} onChange={set("cargo")}
              placeholder="Deputado Federal" />
            <datalist id="cargos-list">
              {CARGOS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field label="Partido" hint="Vai para a tabela de consolidação.">
            <input className="input" list="obj-partidos-list" value={f.partido} onChange={set("partido")}
              placeholder="Ex: PL" />
            <datalist id="obj-partidos-list">
              {partidos.map((p) => <option key={p.id || p.sigla} value={p.sigla}>{p.nome}</option>)}
            </datalist>
          </Field>

          <Field label="UF">
            <select className="input" value={f.uf} onChange={set("uf")}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Nº do ofício" hint="Deixe em branco para sair como “____/ano”.">
            <input className="input" value={f.oficioNr} onChange={set("oficioNr")} placeholder="____" />
          </Field>

          <Field label="Data do ofício" required hint="O ano também identifica a LOA da emenda.">
            <div className="date-row">
              <select className="input" value={f.dia} onChange={set("dia")}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="input" value={f.mes} onChange={set("mes")}>
                {MESES_LONGO.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select className="input" value={f.ano} onChange={set("ano")}>
                {[hoje.y - 1, hoje.y, hoje.y + 1].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </Field>

          <Field label="Nº da emenda" required>
            <input className="input" value={f.emenda} onChange={set("emenda")} placeholder="Ex: 27590005" inputMode="numeric" />
          </Field>

          <Field label="Tipo de ajuste" hint="Escolha ou digite — vai para a coluna “Ajustes”.">
            <input className="input" list="ajustes-list" value={f.ajuste} onChange={set("ajuste")}
              placeholder="Ampliação do objeto." />
            <datalist id="ajustes-list">
              {AJUSTES.map((a) => <option key={a} value={a} />)}
            </datalist>
          </Field>

          <Field label="Objeto atual (DE)" hint="Como está hoje na emenda.">
            <textarea className="input textarea" rows={2} value={f.objetoDe} onChange={set("objetoDe")}
              placeholder="Ex: Ambulância tipo “B” — Suporte básico" />
          </Field>

          <Field label="Novo objeto (PARA)" required hint="Como deverá ficar.">
            <textarea className="input textarea" rows={2} value={f.objetoPara} onChange={set("objetoPara")}
              placeholder="Ex: Aquisição de viatura administrativa e bens…" />
          </Field>
        </div>

        <details className="obj-rodape">
          <summary>Dados do gabinete (rodapé do ofício) — opcional</summary>
          <div className="form-grid">
            <Field label="Gabinete (nº)"><input className="input" value={f.gabinete} onChange={set("gabinete")} placeholder="Ex: 321" /></Field>
            <Field label="Telefone"><input className="input" value={f.telefone} onChange={set("telefone")} placeholder="(61) 3215-0000" /></Field>
            <Field label="E-mail"><input className="input" value={f.email} onChange={set("email")} placeholder="dep.nome@camara.leg.br" /></Field>
          </div>
        </details>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div className="form-actions form-actions-2">
          <button type="button" className="btn btn-ghost" onClick={gerar} disabled={gerando}>
            <FileText size={16} /> {gerando ? "Gerando…" : "Gerar ofício (.docx)"}
          </button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            <Save size={16} /> {salvando ? "Salvando…" : "Salvar na consolidação"}
          </button>
        </div>
      </form>

      {itens.length > 0 && (
        <div className="panel obj-lista">
          <h2 className="panel-title">Últimos registros ({itens.length})</h2>
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
                        <button type="button" className="icon-btn" title="Baixar ofício novamente" onClick={() => baixarItem(it)}>
                          <Download size={16} />
                        </button>
                        <button type="button" className="icon-btn" title="Excluir registro" onClick={() => excluir(it.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
