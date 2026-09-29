import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Notas em formato de checklist (estilo Google Keep) compartilhadas pela A4.6.
// Duas listas fixas: "pendencias" e "briefing". Cada item guarda texto, se
// está concluído (feito) e uma posição (pos, em segundos) para ordenar.
function mapItem(r) {
  return {
    id: r.id,
    lista: r.lista || "pendencias",
    texto: r.texto || "",
    feito: !!r.feito,
    pos: r.pos ?? 0,
    criadoPor: r.criado_por || "",
  };
}

// Não concluídos primeiro (na ordem em que foram criados), concluídos ao fim.
const ordenar = (arr) =>
  [...arr].sort((a, b) => (a.feito - b.feito) || (a.pos - b.pos));

export function useChecklists(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);

  const recarregar = useCallback(async () => {
    const res = await supabase.from("checklist_itens").select("*");
    if (!vivoRef.current) return;
    if (res.error) { setErro(res.error); setCarregado(true); return; }
    setErro(null);
    setItens(ordenar((res.data || []).map(mapItem)));
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar();
    const canal = supabase
      .channel("checklist-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_itens" }, () => recarregar())
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const adicionar = useCallback(async (lista, texto) => {
    const t = (texto || "").trim();
    if (!t) return { error: null };
    const { data: sessao } = await supabase.auth.getUser();
    const rec = {
      lista, texto: t, feito: false,
      pos: Math.floor(Date.now() / 1000),
      criado_por: sessao?.user?.email || null,
    };
    // otimista: já aparece na lista antes da confirmação do servidor.
    const provisorio = { id: "tmp_" + Math.random().toString(36).slice(2, 9), ...mapItem(rec) };
    setItens((prev) => ordenar([...prev, provisorio]));
    const res = await supabase.from("checklist_itens").insert(rec).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const alternar = useCallback(async (id, feito) => {
    setItens((prev) => ordenar(prev.map((i) => (i.id === id ? { ...i, feito } : i))));
    const res = await supabase.from("checklist_itens").update({ feito }).eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const remover = useCallback(async (id) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
    const res = await supabase.from("checklist_itens").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const editar = useCallback(async (id, texto) => {
    const t = (texto || "").trim();
    if (!t) return remover(id);
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, texto: t } : i)));
    const res = await supabase.from("checklist_itens").update({ texto: t }).eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar, remover]);

  return { itens, carregado, erro, adicionar, alternar, editar, remover };
}
