import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Agenda de contatos (módulo CONHECIMENTO > aba "Contatos"). Cada contato tem
// um `grupo` e um objeto `dados` (jsonb) com os campos próprios daquele grupo.
function mapRow(r) {
  return { id: r.id, grupo: r.grupo || "outros", dados: r.dados || {}, criadoEm: r.criado_em };
}

export function useContatos(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);

  const recarregar = useCallback(async () => {
    const res = await supabase.from("contatos").select("*").order("criado_em", { ascending: true });
    if (!vivoRef.current) return;
    if (res.error) { setErro(res.error); setCarregado(true); return; }
    setErro(null);
    setItens((res.data || []).map(mapRow));
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar();
    const canal = supabase
      .channel("contatos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contatos" }, () => recarregar())
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const inserir = useCallback(async (grupo, dados) => {
    const { data: sessao } = await supabase.auth.getUser();
    const res = await supabase.from("contatos").insert({ grupo, dados, criado_por: sessao?.user?.email || null }).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const atualizar = useCallback(async (id, grupo, dados) => {
    const res = await supabase.from("contatos").update({ grupo, dados }).eq("id", id).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    setItens((prev) => prev.filter((c) => c.id !== id));
    const res = await supabase.from("contatos").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  return { itens, carregado, erro, inserir, atualizar, excluir };
}
