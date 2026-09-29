import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Converte uma linha do Supabase (snake_case) para o formato usado na tela.
// `inicio`/`fim` viram milissegundos (Number) para comparação simples.
function mapRow(r) {
  return {
    id: r.id,
    titulo: r.titulo || "",
    inicio: r.inicio ? new Date(r.inicio).getTime() : null,
    fim: r.fim ? new Date(r.fim).getTime() : null,
    diaInteiro: !!r.dia_inteiro,
    local: r.local || "",
    descricao: r.descricao || "",
    cor: r.cor || "azul",
    criadoPor: r.criado_por || "",
  };
}

// Traduz o evento da tela para as colunas do banco.
function paraBanco(e) {
  return {
    titulo: (e.titulo || "").trim() || "(sem título)",
    inicio: e.inicio ? new Date(e.inicio).toISOString() : null,
    fim: e.fim ? new Date(e.fim).toISOString() : null,
    dia_inteiro: !!e.diaInteiro,
    local: (e.local || "").trim() || null,
    descricao: (e.descricao || "").trim() || null,
    cor: e.cor || "azul",
  };
}

// Agenda compartilhada (tabela `calendario_eventos` do Supabase), em tempo real
// — todos da A4.6 veem os mesmos compromissos. Mesmo padrão dos demais módulos.
export function useCalendario(session) {
  const [eventos, setEventos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from("calendario_eventos").select("*");
    if (!vivoRef.current) return;
    if (error) { setErro(error); setCarregado(true); return; }
    setErro(null);
    setEventos((data || []).map(mapRow));
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar();
    const canal = supabase
      .channel("calendario-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendario_eventos" }, () => recarregar())
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const inserir = useCallback(async (e) => {
    const { data: sessao } = await supabase.auth.getUser();
    const rec = { ...paraBanco(e), criado_por: sessao?.user?.email || null };
    const res = await supabase.from("calendario_eventos").insert(rec).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const atualizar = useCallback(async (id, e) => {
    const res = await supabase.from("calendario_eventos").update(paraBanco(e)).eq("id", id).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    const res = await supabase.from("calendario_eventos").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  return { eventos, carregado, erro, inserir, atualizar, excluir };
}
