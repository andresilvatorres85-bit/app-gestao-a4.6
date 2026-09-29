import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { LEGISLACAO } from "../data/legislacao.js";

// Sementes: achata a base da planilha em linhas {secao, nome, url, descricao, pos}.
// pos preserva a ordem original (seção * 1000 + item * 10), deixando espaço
// para inserções futuras entre itens.
const SEMENTES = LEGISLACAO.flatMap((sec, si) =>
  sec.itens.map((it, ii) => ({
    secao: sec.titulo, nome: it.nome, url: it.url || null,
    descricao: it.descricao || null, pos: si * 1000 + ii * 10,
  }))
);

const FLAG_SEMEADO = "legislacao.semeado";
const jaSemeado = () => { try { return localStorage.getItem(FLAG_SEMEADO) === "1"; } catch { return false; } };
const marcarSemeado = () => { try { localStorage.setItem(FLAG_SEMEADO, "1"); } catch { /* ignore */ } };

function mapRow(r) {
  return {
    id: r.id,
    secao: r.secao || "",
    nome: r.nome || "",
    url: r.url || "",
    descricao: r.descricao || "",
    pos: r.pos ?? 0,
  };
}
const ordenar = (arr) => [...arr].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0) || (a.nome || "").localeCompare(b.nome || ""));

// Base compartilhada de legislação (módulo CONHECIMENTO). Se a tabela estiver
// vazia, semeia a base da planilha na primeira execução.
export function useLegislacao(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);
  const semeandoRef = useRef(false);

  const recarregar = useCallback(async (podeSemear = false) => {
    const res = await supabase.from("legislacao").select("*");
    if (!vivoRef.current) return;
    if (res.error) { setErro(res.error); setCarregado(true); return; }
    setErro(null);
    if ((res.data || []).length > 0) {
      setItens(ordenar(res.data.map(mapRow)));
    } else if (podeSemear && !semeandoRef.current && !jaSemeado()) {
      semeandoRef.current = true;
      const { data: ins } = await supabase.from("legislacao").insert(SEMENTES).select();
      semeandoRef.current = false;
      marcarSemeado();
      if (vivoRef.current) setItens(ordenar((ins || []).map(mapRow)));
    } else {
      setItens([]);
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar(true);
    const canal = supabase
      .channel("legislacao-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "legislacao" }, () => recarregar(false))
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const paraBanco = (d) => ({
    secao: (d.secao || "").trim() || null,
    nome: (d.nome || "").trim() || "(sem nome)",
    url: (d.url || "").trim() || null,
    descricao: (d.descricao || "").trim() || null,
  });

  const inserir = useCallback(async (d) => {
    const { data: sessao } = await supabase.auth.getUser();
    // nova legislação vai para o fim da sua seção.
    const posSec = itens.filter((i) => i.secao === (d.secao || "").trim());
    const pos = (posSec.length ? Math.max(...posSec.map((i) => i.pos)) : 0) + 10;
    const rec = { ...paraBanco(d), pos, criado_por: sessao?.user?.email || null };
    const res = await supabase.from("legislacao").insert(rec).select().single();
    if (!res.error) recarregar(false);
    return res;
  }, [itens, recarregar]);

  const atualizar = useCallback(async (id, d) => {
    const res = await supabase.from("legislacao").update(paraBanco(d)).eq("id", id).select().single();
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
    const res = await supabase.from("legislacao").delete().eq("id", id);
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  return { itens, carregado, erro, inserir, atualizar, excluir };
}
