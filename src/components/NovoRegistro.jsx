import { useState } from "react";
import { Plus, Landmark, Building2, UserCog, ShieldCheck } from "lucide-react";
import { Field } from "./UI.jsx";
import { UFS, ESTADOS, ASSUNTOS_ASPAR, ORGAOS_CONSULTORIA, MESES_LONGO, ESP_LABEL } from "../constants.js";
import { protocolo, todayParts } from "../helpers.js";
import { supabase } from "../lib/supabaseClient.js";

export default function NovoRegistro({ onSaved, nextProtocolo, partidos, mapaEspectro, autorAtual, emailAtual }) {
  const hoje = todayParts();
  const [tipo, setTipo] = useState("Dep"); // 'Sen' | 'Dep' | 'Consultor' | 'AsPar'
  const [nome, setNome] = useState("");
  const [partido, setPartido] = useState("");
  const [uf, setUf] = useState("");
  const [orgao, setOrgao] = useState("");
  const [estadoAspar, setEstadoAspar] = useState("");
  const [assunto, setAssunto] = useState("");
  const [papelDireto, setPapelDireto] = useState(false);
  const [dia, setDia] = useState(hoje.d);
  const [mes, setMes] = useState(hoje.m);
  const [ano, setAno] = useState(hoje.y);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(null);
  const [saving, setSaving] = useState(false);

  // espectro é sempre automático, a partir do partido escolhido
  const espFinal = partido && mapaEspectro[partido.toUpperCase()] ? mapaEspectro[partido.toUpperCase()] : null;

  function limpar() {
    setNome(""); setPartido(""); setUf(""); setOrgao("");
    setEstadoAspar(""); setAssunto(""); setPapelDireto(false); setErro("");
  }

  async function submeter(e) {
    e.preventDefault();
    setErro(""); setOk(null);
    if (!autorAtual) { setErro('Seu e-mail de login ainda não está vinculado a um nome. Peça para cadastrarem em CONFIGURAÇÕES > Geral > Usuários.'); return; }

    if (tipo === "Consultor") {
      if (!nome.trim()) { setErro("Informe o nome do consultor."); return; }
    } else if (tipo === "AsPar") {
      if (!nome.trim()) { setErro("Informe o nome do assessor."); return; }
      if (!estadoAspar) { setErro("Selecione o estado do assessor."); return; }
      if (!assunto) { setErro("Selecione o assunto."); return; }
    } else {
      if (!nome.trim()) { setErro("Informe o nome do parlamentar."); return; }
      if (!partido.trim()) { setErro("Informe o partido."); return; }
      if (!espFinal) { setErro("Partido não cadastrado — adicione-o na aba Partidos para o espectro ser preenchido."); return; }
    }

    let role;
    if (tipo === "Consultor") role = "C";
    else if (tipo === "AsPar") role = "AE";
    else if (tipo === "Sen") role = papelDireto ? "S" : "AS";
    else role = papelDireto ? "D" : "AD";

    const rec = {
      dia: Number(dia), mes: Number(mes), ano: Number(ano),
      funcao: tipo === "AsPar" ? "AsPar EB" : tipo,
      nome: nome.trim(),
      partido: tipo === "Consultor" ? (orgao.trim() || null) : (tipo === "AsPar" ? null : partido.trim().toUpperCase()),
      uf: tipo === "AsPar" ? estadoAspar : (tipo === "Consultor" ? null : (uf || null)),
      papel: role,
      espectro: (tipo === "Consultor" || tipo === "AsPar") ? null : espFinal,
      assunto: tipo === "AsPar" ? assunto : null,
      autor: autorAtual,
      protocolo: protocolo(ano, nextProtocolo),
    };

    setSaving(true);
    const { data, error } = await supabase.from("registros").insert(rec).select().single();
    setSaving(false);
    if (error) { setErro("Não foi possível salvar: " + error.message); return; }
    setOk(data.protocolo);
    limpar();
    onSaved(data);
  }

  const TIPOS = [
    ["Sen", "Senador", Landmark],
    ["Dep", "Deputado", Building2],
    ["Consultor", "Consultor", UserCog],
    ["AsPar", "AsPar EB", ShieldCheck],
  ];

  return (
    <div className="view-pad">
      <h1 className="page-title">Novo lançamento</h1>
      <p className="page-sub">Registre um contato ou visita recém-realizado.</p>

      <form className="panel form" onSubmit={submeter}>
        <div className="tipo-toggle" role="tablist" aria-label="Tipo de contato">
          {TIPOS.map(([val, label, Icon]) => (
            <button type="button" key={val}
              className={`tipo-btn ${tipo === val ? "tipo-btn-active" : ""}`}
              onClick={() => { setTipo(val); setErro(""); }}>
              <Icon size={15} strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <Field label="Nome" required>
            <input className="input" value={nome} onChange={e => setNome(e.target.value)}
              placeholder={
                tipo === "Consultor" ? "Nome do consultor" :
                tipo === "AsPar" ? "Nome do assessor" : "Nome do parlamentar"
              } />
          </Field>

          {tipo === "Sen" || tipo === "Dep" ? (
            <>
              <Field label="Partido" required hint={espFinal ? `Espectro: ${ESP_LABEL[espFinal]}` : (partido ? "Partido não cadastrado — adicione na aba Partidos" : "Selecione um partido cadastrado")}>
                <input className="input" list="partidos-list" value={partido}
                  onChange={e => setPartido(e.target.value)}
                  placeholder="Sigla do partido, ex: PL" />
                <datalist id="partidos-list">
                  {partidos.map(p => <option key={p.id || p.sigla} value={p.sigla}>{p.nome}</option>)}
                </datalist>
              </Field>

              <Field label="Espectro" hint="Preenchido automaticamente pelo partido.">
                {espFinal
                  ? <span className="esp-auto">Espectro: <strong>{ESP_LABEL[espFinal]}</strong></span>
                  : <span className="esp-auto">Aguardando partido…</span>}
              </Field>

              <Field label="UF">
                <select className="input" value={uf} onChange={e => setUf(e.target.value)}>
                  <option value="">—</option>
                  {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>

              <Field label="Tipo de contato" required hint="A maioria dos contatos históricos foi com a equipe, não diretamente com o parlamentar — marque com atenção.">
                <div className="chip-row">
                  <button type="button" className={`chip ${!papelDireto ? "chip-active" : ""}`} onClick={() => setPapelDireto(false)}>
                    Com o gabinete / assessor
                  </button>
                  <button type="button" className={`chip ${papelDireto ? "chip-active" : ""}`} onClick={() => setPapelDireto(true)}>
                    Direto com o {tipo === "Sen" ? "senador" : "deputado"}
                  </button>
                </div>
              </Field>
            </>
          ) : tipo === "Consultor" ? (
            <Field label="Órgão / consultoria">
              <select className="input" value={orgao} onChange={e => setOrgao(e.target.value)}>
                <option value="">Selecione o órgão…</option>
                {ORGAOS_CONSULTORIA.map(o => <option key={o.sigla} value={o.sigla}>{o.sigla} — {o.nome}</option>)}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Estado do assessor" required>
                <select className="input" value={estadoAspar} onChange={e => setEstadoAspar(e.target.value)}>
                  <option value="">Selecione o estado…</option>
                  {ESTADOS.map(e => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}
                </select>
              </Field>
              <Field label="Assunto" required>
                <select className="input" value={assunto} onChange={e => setAssunto(e.target.value)}>
                  <option value="">Selecione o assunto…</option>
                  {ASSUNTOS_ASPAR.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            </>
          )}

          <Field label="Data" required>
            <div className="date-row">
              <select className="input" value={dia} onChange={e => setDia(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="input" value={mes} onChange={e => setMes(e.target.value)}>
                {MESES_LONGO.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select className="input" value={ano} onChange={e => setAno(e.target.value)}>
                {[hoje.y - 1, hoje.y, hoje.y + 1].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </Field>

          <Field label="Registrado por" hint={autorAtual ? "Preenchido automaticamente pelo seu login." : "Seu e-mail ainda não está vinculado a um nome."}>
            {autorAtual
              ? <div className="registrado-auto">{autorAtual}</div>
              : <div className="registrado-auto registrado-auto-alerta">{emailAtual || "—"} <span>(vincule em CONFIGURAÇÕES → Usuários)</span></div>}
          </Field>
        </div>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && (
          <div className="alert alert-ok">
            <span className="stamp">Protocolo {ok}</span> registrado com sucesso.
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : <><Plus size={16} /> Registrar contato</>}
          </button>
        </div>
      </form>
    </div>
  );
}
