import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { RECEBIMENTO_SEED } from "../data/recebimentoSeed.js";

// Check list de recebimento da função. Atividades e subatividades ficam em
// `recebimento_atividades` (compartilhadas). As marcações (concluído) ficam em
// `recebimento_check`, POR USUÁRIO — cada um vê e altera só as suas.
const FLAG_SEMEADO = "recebimento.semeado";
const jaSemeado = () => { try { return localStorage.getItem(FLAG_SEMEADO) === "1"; } catch { return false; } };
const marcarSemeado = () => { try { localStorage.setItem(FLAG_SEMEADO, "1"); } catch { /* ignore */ } };

function mapRow(r) {
  return { id: r.id, parentId: r.parent_id || null, texto: r.texto || "", pos: r.pos ?? 0 };
}
const ordenar = (arr) => [...arr].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

export function useRecebimento(session) {
  const [itens, setItens] = useState([]);
  const [checks, setChecks] = useState(() => new Set()); // ids marcados por mim
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);
  const semeandoRef = useRef(false);
  const email = session?.user?.email || null;

  const recarregar = useCallback(async (podeSemear = false) => {
    const [at, ck] = await Promise.all([
      supabase.from("recebimento_atividades").select("*"),
      email ? supabase.from("recebimento_check").select("atividade_id").eq("user_email", email) : Promise.resolve({ data: [] }),
    ]);
    if (!vivoRef.current) return;
    if (at.error) { setErro(at.error); setCarregado(true); return; }
    setErro(null);
    setChecks(new Set((ck.data || []).map((r) => r.atividade_id)));

    if ((at.data || []).length > 0) {
      setItens(ordenar(at.data.map(mapRow)));
    } else if (podeSemear && !semeandoRef.current && !jaSemeado()) {
      semeandoRef.current = true;
      // 1) insere as atividades de topo
      const topo = RECEBIMENTO_SEED.map((a, i) => ({ texto: a.texto, parent_id: null, pos: i * 10 }));
      const { data: insTopo } = await supabase.from("recebimento_atividades").insert(topo).select();
      // 2) insere as subatividades referenciando o pai (casado pelo texto)
      const idPorTexto = Object.fromEntries((insTopo || []).map((r) => [r.texto, r.id]));
      const subs = [];
      for (const a of RECEBIMENTO_SEED) {
        if (a.subs?.length) {
          const pid = idPorTexto[a.texto];
          a.subs.forEach((t, i) => subs.push({ texto: t, parent_id: pid, pos: i * 10 }));
        }
      }
      if (subs.length) await supabase.from("recebimento_atividades").insert(subs);
      semeandoRef.current = false;
      marcarSemeado();
      recarregar(false);
      return;
    } else {
      setItens([]);
    }
    setCarregado(true);
  }, [email]);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar(true);
    const canal = supabase
      .channel("recebimento-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recebimento_atividades" }, () => recarregar(false))
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const proximoPos = (parentId) => {
    const irmaos = itens.filter((i) => i.parentId === (parentId || null));
    return (irmaos.length ? Math.max(...irmaos.map((i) => i.pos)) : 0) + 10;
  };

  const adicionar = useCallback(async (texto, parentId = null) => {
    const t = (texto || "").trim();
    if (!t) return { error: null };
    const { data: sessao } = await supabase.auth.getUser();
    const rec = { texto: t, parent_id: parentId || null, pos: proximoPos(parentId), criado_por: sessao?.user?.email || null };
    const res = await supabase.from("recebimento_atividades").insert(rec).select().single();
    if (!res.error) recarregar(false);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, recarregar]);

  const editar = useCallback(async (id, texto) => {
    const t = (texto || "").trim();
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, texto: t } : i)));
    const res = await supabase.from("recebimento_atividades").update({ texto: t }).eq("id", id);
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    // remove a atividade e suas subatividades
    const filhos = itens.filter((i) => i.parentId === id).map((i) => i.id);
    setItens((prev) => prev.filter((i) => i.id !== id && i.parentId !== id));
    if (filhos.length) await supabase.from("recebimento_atividades").delete().in("id", filhos);
    const res = await supabase.from("recebimento_atividades").delete().eq("id", id);
    if (!res.error) recarregar(false);
    return res;
  }, [itens, recarregar]);

  const reordenar = useCallback(async (idsOrdenados) => {
    const posPorId = Object.fromEntries(idsOrdenados.map((id, i) => [id, i * 10]));
    setItens((prev) => ordenar(prev.map((i) => (posPorId[i.id] != null ? { ...i, pos: posPorId[i.id] } : i))));
    const linhas = idsOrdenados.map((id, i) => ({ id, pos: i * 10 }));
    // upsert só de id+pos (mantém texto/parent)
    const res = await supabase.from("recebimento_atividades").upsert(linhas, { onConflict: "id" }).select("id");
    if (res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const alternarCheck = useCallback(async (id, feito) => {
    if (!email) return;
    setChecks((prev) => { const s = new Set(prev); feito ? s.add(id) : s.delete(id); return s; });
    if (feito) {
      await supabase.from("recebimento_check").upsert({ atividade_id: id, user_email: email }, { onConflict: "atividade_id,user_email" });
    } else {
      await supabase.from("recebimento_check").delete().eq("atividade_id", id).eq("user_email", email);
    }
  }, [email]);

  return { itens, checks, carregado, erro, adicionar, editar, excluir, reordenar, alternarCheck };
}
