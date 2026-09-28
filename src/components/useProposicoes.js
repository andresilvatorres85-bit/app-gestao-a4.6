import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { PROPOSICOES_SEED } from "../data/proposicoesSeed.js";

const CAMPOS = [
  "proposicao", "tipo", "casa", "ementa", "autor", "relator", "impacto",
  "tramitacao", "atuacao", "percepcao", "status", "assessor", "link",
];

// Marca, no próprio navegador, que a tabela já foi vista com dados — para NUNCA
// semear de novo. Sem isso, uma leitura que volte vazia por um instante (ex.:
// durante a recriação das políticas de RLS no Supabase, quando por um momento
// não há policy de SELECT) faria o app reinserir a semente inteira e duplicar
// todas as proposições. Foi o que deixou o app lento e "sem salvar".
const FLAG_SEMEADO = "a46_proposicoes_semeado";
const jaSemeado = () => {
  try { return localStorage.getItem(FLAG_SEMEADO) === "1"; } catch { return false; }
};
const marcarSemeado = () => {
  try { localStorage.setItem(FLAG_SEMEADO, "1"); } catch { /* modo privado */ }
};

function mapRow(r) {
  const o = { id: r.id, posicao: r.posicao, criadoEm: r.criado_em ? new Date(r.criado_em).getTime() : null };
  for (const c of CAMPOS) o[c] = r[c] ?? "";
  return o;
}
function paraBanco(d) {
  const o = {};
  for (const c of CAMPOS) o[c] = (d[c] ?? "").toString().trim() || null;
  return o;
}

// Ordena como no controle original: pela posição semeada (nulos, ou seja, os
// lançados no app, vão ao topo por data), depois por posição.
function ordenar(itens) {
  return [...itens].sort((a, b) => {
    const pa = a.posicao ?? -1, pb = b.posicao ?? -1;
    if (pa < 0 && pb < 0) return (b.criadoEm || 0) - (a.criadoEm || 0);
    if (pa < 0) return -1;
    if (pb < 0) return 1;
    return pa - pb;
  });
}

// Controle compartilhado das proposições (tabela `proposicoes` do Supabase),
// em tempo real. Na PRIMEIRA execução (tabela vazia e ainda não semeada neste
// navegador), semeia a tabela com o controle normalizado da planilha A4.6.
export function useProposicoes(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  // Garante que a semeadura roda no máximo uma vez por sessão e só a partir da
  // carga inicial — jamais como efeito de um refresh disparado pelo realtime.
  const semeandoRef = useRef(false);

  // `podeSemear` só é true na carga inicial. O realtime chama com false, então
  // uma volta vazia (transitória) nunca re-semeia.
  const carregar = useCallback(async (podeSemear) => {
    const { data, error } = await supabase.from("proposicoes").select("*");
    if (error) { setErro(error); setCarregado(true); return; }

    const linhas = data || [];
    if (linhas.length > 0) {
      marcarSemeado();
      setErro(null);
      setItens(ordenar(linhas.map(mapRow)));
      setCarregado(true);
      return;
    }

    // Tabela vazia. Só semeia se: for a carga inicial, ainda não semeamos nesta
    // sessão e este navegador nunca viu a tabela com dados.
    if (podeSemear && !semeandoRef.current && !jaSemeado()) {
      semeandoRef.current = true;
      const seed = PROPOSICOES_SEED.map((p, i) => ({ ...paraBanco(p), posicao: i }));
      const { data: ins, error: e2 } = await supabase.from("proposicoes").insert(seed).select();
      if (e2) { setErro(e2); setItens([]); setCarregado(true); return; }
      marcarSemeado();
      setErro(null);
      setItens(ordenar((ins || []).map(mapRow)));
      setCarregado(true);
      return;
    }

    // Vazia mas sem autorização para semear (refresh do realtime, ou já semeado):
    // apenas reflete o vazio, sem reinserir nada.
    setErro(null);
    setItens([]);
    setCarregado(true);
  }, []);

  const recarregar = useCallback(() => carregar(false), [carregar]);

  useEffect(() => {
    if (!session) return;
    carregar(true); // única carga que pode semear
    const canal = supabase
      .channel("proposicoes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "proposicoes" }, () => carregar(false))
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [session, carregar]);

  const inserir = useCallback(async (d) => {
    const res = await supabase.from("proposicoes").insert(paraBanco(d)).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const atualizar = useCallback(async (id, d) => {
    const res = await supabase.from("proposicoes").update(paraBanco(d)).eq("id", id).select().single();
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    const res = await supabase.from("proposicoes").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  return { itens, carregado, erro, inserir, atualizar, excluir };
}
