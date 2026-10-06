import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Rotina do Assessor de Orçamento: tarefas e subtarefas dentro de cada card
// (atividade). `card` identifica a atividade; `parent_id` liga a subtarefa ao
// item pai — tarefa ou outra subtarefa, em qualquer profundidade. Tudo
// compartilhado e em tempo real.
// `alteradoEm`: momento da inclusão ou da última edição do texto (ms). Usa
// `atualizado_em` quando a coluna existe (ver supabase_rotina.sql); senão,
// `criado_em`.
function mapRow(r) {
  const quando = r.atualizado_em || r.criado_em;
  return {
    id: r.id, card: r.card || "", parentId: r.parent_id || null, texto: r.texto || "", pos: r.pos ?? 0,
    alteradoEm: quando ? new Date(quando).getTime() : null,
  };
}

// Coluna `atualizado_em` ainda não criada no banco → grava sem ela.
const semColuna = (err) => !!err && (err.code === "PGRST204" || /atualizado_em/i.test(err.message || ""));
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
    const agora = new Date();
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, texto: t, alteradoEm: agora.getTime() } : i)));
    let res = await supabase.from("rotina_itens").update({ texto: t, atualizado_em: agora.toISOString() }).eq("id", id);
    if (semColuna(res.error)) res = await supabase.from("rotina_itens").update({ texto: t }).eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  // Exclui o item e TODOS os descendentes (subtarefas em qualquer nível).
  const excluir = useCallback(async (id) => {
    const filhosDe = (pid) => itens.filter((i) => i.parentId === pid).map((i) => i.id);
    const descendentes = [];
    for (let fila = filhosDe(id); fila.length; ) {
      const atual = fila.shift();
      descendentes.push(atual);
      fila.push(...filhosDe(atual));
    }
    const remover = new Set([id, ...descendentes]);
    setItens((prev) => prev.filter((i) => !remover.has(i.id)));
    if (descendentes.length) await supabase.from("rotina_itens").delete().in("id", descendentes);
    const res = await supabase.from("rotina_itens").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [itens, recarregar]);

  // reordena um grupo de irmãos (tarefas de um card, ou subtarefas de uma
  // tarefa): grava a nova posição. Reconstrói a linha completa no upsert
  // (card/texto/parent_id) para não violar NOT NULL.
  const reordenar = useCallback(async (idsOrdenados) => {
    const porId = Object.fromEntries(itens.map((i) => [i.id, i]));
    const posPorId = Object.fromEntries(idsOrdenados.map((id, i) => [id, i * 10]));
    setItens((prev) => ordenar(prev.map((i) => (posPorId[i.id] != null ? { ...i, pos: posPorId[i.id] } : i))));
    const linhas = idsOrdenados.map((id, i) => {
      const it = porId[id];
      return { id, card: it.card, parent_id: it.parentId, texto: it.texto, pos: i * 10 };
    });
    const res = await supabase.from("rotina_itens").upsert(linhas, { onConflict: "id" }).select("id");
    if (res.error) recarregar();
    return res;
  }, [itens, recarregar]);

  return { itens, carregado, erro, adicionar, editar, excluir, reordenar };
}
