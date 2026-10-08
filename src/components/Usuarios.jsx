import { useState } from "react";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { Field } from "./UI.jsx";
import { supabase } from "../lib/supabaseClient.js";

// Gerencia os nomes que aparecem em "Registrado por" e os associa ao e-mail
// de login. A criação do login em si é feita no painel do Supabase; aqui só
// cadastramos nome + e-mail para o preenchimento automático funcionar.
export default function Usuarios({ usuarios, emailAtual, somenteLeitura = false }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");

  async function adicionar(e) {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) { setErro("Informe o nome do usuário."); return; }
    setSalvando(true);
    const { error } = await supabase.from("usuarios").insert({
      nome: nome.trim(), email: email.trim() || null,
    });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar: " + error.message); return; }
    setNome(""); setEmail("");
  }

  async function excluir(id) {
    await supabase.from("usuarios").delete().eq("id", id);
  }

  function iniciarEdicao(u) {
    setEditId(u.id); setEditNome(u.nome); setEditEmail(u.email || "");
  }

  async function salvarEdicao(id) {
    await supabase.from("usuarios").update({ nome: editNome.trim(), email: editEmail.trim() || null }).eq("id", id);
    setEditId(null);
  }

  const ordenados = [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div>
      <p className="config-help">
        Cadastre aqui cada pessoa que lança contatos e associe o <strong>e-mail de login</strong> dela.
        Quando essa pessoa entrar no app, o campo "Registrado por" será preenchido automaticamente com o nome correspondente.
        A criação do login (e-mail e senha) continua sendo feita no painel do Supabase.
      </p>

      {somenteLeitura && (
        <p className="config-help"><strong>Somente leitura:</strong> apenas administradores incluem, alteram ou excluem usuários.</p>
      )}

      {!somenteLeitura && <form className="partido-form" onSubmit={adicionar}>
        <Field label="Nome" required>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Maj Silva" />
        </Field>
        <Field label="E-mail de login" hint="O mesmo e-mail criado no Supabase para essa pessoa.">
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
        </Field>
        <div />
        <button className="btn btn-primary btn-sm" type="submit" disabled={salvando}>
          <Plus size={15} /> Adicionar
        </button>
      </form>}
      {erro && <div className="alert alert-error" style={{ marginTop: 8 }}>{erro}</div>}

      <div className="partido-count">{ordenados.length} usuários cadastrados</div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Nome</th><th>E-mail de login</th><th></th></tr>
          </thead>
          <tbody>
            {ordenados.map(u => {
              const ehAtual = emailAtual && (u.email || "").trim().toLowerCase() === emailAtual.trim().toLowerCase();
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {editId === u.id
                      ? <input className="input" value={editNome} onChange={e => setEditNome(e.target.value)} />
                      : <>{u.nome} {ehAtual && <span className="badge badge-novo" style={{ marginLeft: 6 }}>você</span>}</>}
                  </td>
                  <td>
                    {editId === u.id
                      ? <input className="input" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="pessoa@exemplo.com" />
                      : (u.email || <span className="muted">sem e-mail associado</span>)}
                  </td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    {somenteLeitura ? null : editId === u.id ? (
                      <>
                        <button className="icon-btn edit" title="Salvar" onClick={() => salvarEdicao(u.id)}><Check size={15} /></button>
                        <button className="icon-btn" title="Cancelar" onClick={() => setEditId(null)}><X size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn edit" title="Editar" onClick={() => iniciarEdicao(u)}><Pencil size={14} /></button>
                        {!(ehAtual && u.admin) && <button className="icon-btn" title="Excluir" onClick={() => excluir(u.id)}><Trash2 size={14} /></button>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
