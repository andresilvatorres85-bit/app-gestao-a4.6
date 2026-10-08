import { useMemo, useState } from "react";
import { Check, RotateCcw, ShieldCheck, Unlock, Lock } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";
import { itensDoCatalogo, bloqueado, normalizar } from "../acessos.js";

const ITENS = itensDoCatalogo();
const mesmoEmail = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const listaDe = (u) => normalizar(Array.isArray(u?.bloqueios) ? u.bloqueios : []);

function resumo(u) {
  if (u.admin) return "Administrador";
  const n = listaDe(u).length;
  return n ? `${n} ${n === 1 ? "item retirado" : "itens retirados"}` : "Acesso total";
}

// Liberação e retirada de acesso por usuário aos módulos, abas e subabas.
// Visível apenas para administradores.
export default function AcessosPanel({ usuarios, emailAtual }) {
  const ordenados = useMemo(
    () => [...usuarios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [usuarios]);
  const [selId, setSelId] = useState(null);
  const sel = ordenados.find((u) => u.id === selId) || null;
  const [rascunho, setRascunho] = useState(null); // { bloqueios: Set, admin }
  const [msg, setMsg] = useState(null); // { tipo, texto }
  const [salvando, setSalvando] = useState(false);

  const escolher = (u) => {
    setSelId(u.id);
    setRascunho({ bloqueios: new Set(listaDe(u)), admin: !!u.admin });
    setMsg(null);
  };

  const souEu = sel && mesmoEmail(sel.email, emailAtual);
  const alterado = sel && rascunho && (
    rascunho.admin !== !!sel.admin ||
    normalizar([...rascunho.bloqueios]).join("|") !== listaDe(sel).join("|"));

  const alternar = (chave) => {
    const b = new Set(rascunho.bloqueios);
    if (b.has(chave)) b.delete(chave);
    else {
      b.add(chave);
      [...b].forEach((k) => { if (k.startsWith(chave + ".")) b.delete(k); });
    }
    setRascunho({ ...rascunho, bloqueios: b });
    setMsg(null);
  };
  const todos = (liberar) => {
    setRascunho({ ...rascunho, bloqueios: new Set(liberar ? [] : ITENS.filter((i) => i.nivel === 0).map((i) => i.chave)) });
    setMsg(null);
  };

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase.from("usuarios")
      .update({ admin: rascunho.admin, bloqueios: normalizar([...rascunho.bloqueios]) })
      .eq("id", sel.id);
    setSalvando(false);
    setMsg(error
      ? { tipo: "erro", texto: "Não foi possível salvar: " + error.message + " (rodou o supabase_acessos.sql?)" }
      : { tipo: "ok", texto: "Acessos salvos. Valem imediatamente para o usuário." });
  }

  return (
    <>
      <p className="config-help">
        Escolha um usuário e marque o que ele pode ver. Desmarcar um módulo retira também todas as
        suas abas e subabas; módulos com todas as abas retiradas somem do cabeçalho. Novos módulos
        nascem liberados. Administradores têm acesso a tudo e gerenciam os acessos.
      </p>
      <div className="acessos-grid">
        <ul className="acessos-usuarios">
          {ordenados.map((u) => (
            <li key={u.id}>
              <button className={`acessos-usuario${u.id === selId ? " ativo" : ""}`} onClick={() => escolher(u)}>
                <span className="acessos-nome">
                  {u.admin && <ShieldCheck size={14} />} {u.nome}
                  {mesmoEmail(u.email, emailAtual) && <span className="badge badge-novo">você</span>}
                </span>
                <span className="acessos-resumo">{u.email ? resumo(u) : "Sem e-mail de login"}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="acessos-editor">
          {!sel || !rascunho ? (
            <div className="acessos-vazio">Selecione um usuário para ver e alterar os acessos.</div>
          ) : (
            <>
              <div className="acessos-cab">
                <div>
                  <div className="acessos-cab-nome">{sel.nome}</div>
                  <div className="acessos-resumo">{sel.email || "Sem e-mail de login — vincule em Usuários para os acessos valerem."}</div>
                </div>
                <label className={`acessos-admin${souEu ? " desabilitado" : ""}`}
                  title={souEu ? "Você não pode retirar o seu próprio perfil de administrador." : ""}>
                  <input type="checkbox" checked={rascunho.admin} disabled={souEu}
                    onChange={(e) => { setRascunho({ ...rascunho, admin: e.target.checked }); setMsg(null); }} />
                  <ShieldCheck size={15} /> Administrador
                </label>
              </div>

              {rascunho.admin ? (
                <div className="acessos-vazio">Administradores têm acesso a todos os módulos, abas e subabas.</div>
              ) : (
                <>
                  <div className="cfg-acoes" style={{ marginTop: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => todos(true)}><Unlock size={14} /> Liberar tudo</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => todos(false)}><Lock size={14} /> Retirar tudo</button>
                  </div>
                  <ul className="acessos-arvore">
                    {ITENS.map((it) => {
                      const doPai = it.pai && bloqueado(rascunho.bloqueios, it.pai);
                      const liberado = !bloqueado(rascunho.bloqueios, it.chave);
                      const parcial = liberado && it.temFilhos &&
                        [...rascunho.bloqueios].some((k) => k.startsWith(it.chave + "."));
                      return (
                        <li key={it.chave} className={`acessos-item nivel-${it.nivel}${doPai ? " herdado" : ""}`}>
                          <label>
                            <input type="checkbox" checked={liberado} disabled={doPai}
                              onChange={() => alternar(it.chave)} />
                            <span>{it.rotulo}</span>
                            {parcial && <span className="acessos-parcial">parcial</span>}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              <div className="cfg-acoes">
                <button className="btn btn-primary btn-sm" disabled={!alterado || salvando} onClick={salvar}>
                  <Check size={15} /> {salvando ? "Salvando…" : "Salvar acessos"}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={!alterado || salvando} onClick={() => escolher(sel)}>
                  <RotateCcw size={14} /> Desfazer
                </button>
                {msg && <span className={msg.tipo === "erro" ? "cfg-erro" : "cfg-aviso"}>{msg.texto}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
