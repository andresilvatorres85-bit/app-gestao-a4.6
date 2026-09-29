import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Calendários padrão (semeados na primeira execução). `id` estável para casar
// com eventos já existentes (que guardam a cor como id do calendário).
export const CALENDARIOS_PADRAO = [
  { id: "azul", nome: "Azul", cor: "#3B6FB0", pos: 0 },
  { id: "verde", nome: "Verde", cor: "#3F9D6B", pos: 1 },
  { id: "vermelho", nome: "Vermelho", cor: "#C6543F", pos: 2 },
  { id: "roxo", nome: "Roxo", cor: "#7A5AC2", pos: 3 },
  { id: "ambar", nome: "Âmbar", cor: "#C79A3A", pos: 4 },
  { id: "ciano", nome: "Ciano", cor: "#3AA6A6", pos: 5 },
  { id: "rosa", nome: "Rosa", cor: "#C25A93", pos: 6 },
  { id: "cinza", nome: "Cinza", cor: "#6C7A72", pos: 7 },
];

const FLAG_SEMEADO = "cal.agendas.semeado";
const jaSemeado = () => { try { return localStorage.getItem(FLAG_SEMEADO) === "1"; } catch { return false; } };
const marcarSemeado = () => { try { localStorage.setItem(FLAG_SEMEADO, "1"); } catch { /* ignore */ } };

function mapEvento(r) {
  return {
    id: r.id,
    titulo: r.titulo || "",
    inicio: r.inicio ? new Date(r.inicio).getTime() : null,
    fim: r.fim ? new Date(r.fim).getTime() : null,
    diaInteiro: !!r.dia_inteiro,
    local: r.local || "",
    descricao: r.descricao || "",
    cor: r.cor || "azul",
    recorrencia: r.recorrencia || "nao",
    criadoPor: r.criado_por || "",
  };
}
function eventoParaBanco(e) {
  return {
    titulo: (e.titulo || "").trim() || "(sem título)",
    inicio: e.inicio ? new Date(e.inicio).toISOString() : null,
    fim: e.fim ? new Date(e.fim).toISOString() : null,
    dia_inteiro: !!e.diaInteiro,
    local: (e.local || "").trim() || null,
    descricao: (e.descricao || "").trim() || null,
    cor: e.cor || "azul",
    recorrencia: e.recorrencia || "nao",
  };
}
const ordenarCals = (arr) => [...arr].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0) || (a.nome || "").localeCompare(b.nome || ""));

// Agenda compartilhada. `eventos` (calendario_eventos) e `calendarios`
// (calendario_agendas: id, nome, cor, pos) em tempo real. Se a tabela de
// calendários não existir ou estiver vazia, usa/semeia os padrões.
export function useCalendario(session) {
  const [eventos, setEventos] = useState([]);
  const [calendarios, setCalendarios] = useState(CALENDARIOS_PADRAO);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);
  const semeandoRef = useRef(false);

  const recarregar = useCallback(async (podeSemear = false) => {
    const [ev, ag] = await Promise.all([
      supabase.from("calendario_eventos").select("*"),
      supabase.from("calendario_agendas").select("*"),
    ]);
    if (!vivoRef.current) return;
    if (ev.error) { setErro(ev.error); setCarregado(true); return; }
    setErro(null);
    setEventos((ev.data || []).map(mapEvento));

    if (ag.error) {
      // tabela de calendários ainda não existe: mantém os padrões em memória.
      setCalendarios(CALENDARIOS_PADRAO);
    } else if ((ag.data || []).length > 0) {
      marcarSemeado();
      setCalendarios(ordenarCals(ag.data));
    } else if (podeSemear && !semeandoRef.current && !jaSemeado()) {
      // primeira vez: semeia os calendários padrão.
      semeandoRef.current = true;
      const { data: ins } = await supabase.from("calendario_agendas").insert(CALENDARIOS_PADRAO).select();
      marcarSemeado();
      setCalendarios(ordenarCals(ins && ins.length ? ins : CALENDARIOS_PADRAO));
    } else {
      setCalendarios(CALENDARIOS_PADRAO);
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar(true);
    const canal = supabase
      .channel("calendario-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendario_eventos" }, () => recarregar(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "calendario_agendas" }, () => recarregar(false))
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  const inserir = useCallback(async (e) => {
    const { data: sessao } = await supabase.auth.getUser();
    const rec = { ...eventoParaBanco(e), criado_por: sessao?.user?.email || null };
    const res = await supabase.from("calendario_eventos").insert(rec).select().single();
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const atualizar = useCallback(async (id, e) => {
    const res = await supabase.from("calendario_eventos").update(eventoParaBanco(e)).eq("id", id).select().single();
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    const res = await supabase.from("calendario_eventos").delete().eq("id", id);
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  // ---- calendários ----
  const criarAgenda = useCallback(async ({ nome, cor }) => {
    const id = "cal_" + Math.random().toString(36).slice(2, 9);
    // pos em segundos (cabe no int do Postgres; Date.now() em ms estoura o int4).
    const pos = Math.floor(Date.now() / 1000);
    const novo = { id, nome: (nome || "").trim() || "Novo calendário", cor, pos };
    setCalendarios((prev) => ordenarCals([...prev, novo]));
    const res = await supabase.from("calendario_agendas").insert(novo).select().single();
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  const renomearAgenda = useCallback(async (id, nome) => {
    setCalendarios((prev) => prev.map((c) => (c.id === id ? { ...c, nome } : c)));
    await supabase.from("calendario_agendas").update({ nome: (nome || "").trim() || null }).eq("id", id);
  }, []);

  const excluirAgenda = useCallback(async (id) => {
    setCalendarios((prev) => prev.filter((c) => c.id !== id));
    const res = await supabase.from("calendario_agendas").delete().eq("id", id);
    if (!res.error) recarregar(false);
    return res;
  }, [recarregar]);

  return {
    eventos, calendarios, carregado, erro,
    inserir, atualizar, excluir,
    criarAgenda, renomearAgenda, excluirAgenda,
  };
}
