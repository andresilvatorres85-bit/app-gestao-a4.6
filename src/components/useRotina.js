import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Rotina do Assessor de Orçamento: tarefas e subtarefas dentro de cada card
// (atividade). `card` identifica a atividade; `parent_id` liga a subtarefa à
// tarefa. Tudo compartilhado e em tempo real.
function mapRow(r) {
  return { id: r.id, card: r.card || "", parentId: r.parent_id || null, texto: r.texto || "", pos: r.pos ?? 0 };
}
const ordenar = (arr) => [...arr].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

export function useRotina(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);

  const recarregar = useCallback(async () => {
    const res = await supabase.from("rotina_itens").select("*");
    if (!vivoRef.current) return;
    if (res.error) { setErro(res.error); setCarregado(true); return; }
    setErro(null);
    setItens(ordenar((res.data || []).map(mapRow)));
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar();
    const canal = supabase
      .channel("rotina-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rotina_itens" }, () => recarregar())
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const proximoPos = (card, parentId) => {
    const irmaos = itens.filter((i) => i.card === card && i.parentId === (parentId || null));
    return (irmaos.length ? Math.max(...irmaos.map((i) => i.pos)) : 0) + 10;
  };

  const adicionar = useCallback(async (card, texto, parentId = null) => {
    const t = (texto || "").trim();
    if (!t) return { error: null };
    const { data: sessao } = await supabase.auth.getUser();
    const rec = { card, texto: t, parent_id: parentId || null, pos: proximoPos(card, parentId), criado_por: sessao?.user?.email || null };
    const res = await supabase.from("rotina_itens").insert(rec).select().single();
    if (!res.error) recarregar();
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, recarregar]);

  const editar = useCallback(async (id, texto) => {
    const t = (texto || "").trim();
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, texto: t } : i)));
    const res = await supabase.from("rotina_itens").update({ texto: t }).eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    const filhos = itens.filter((i) => i.parentId === id).map((i) => i.id);
    setItens((prev) => prev.filter((i) => i.id !== id && i.parentId !== id));
    if (filhos.length) await supabase.from("rotina_itens").delete().in("id", filhos);
    const res = await supabase.from("rotina_itens").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [itens, recarregar]);

  return { itens, carregado, erro, adicionar, editar, excluir };
}
