import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { PROPOSICOES_SEED } from "../data/proposicoesSeed.js";

const CAMPOS = [
  "proposicao", "tipo", "casa", "ementa", "autor", "impacto",
  "tramitacao", "atuacao", "percepcao", "status", "assessor", "link",
];

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
// em tempo real. Na primeira execução, semeia a tabela vazia com o controle
// normalizado da planilha A4.6.
export function useProposicoes(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from("proposicoes").select("*");
    if (error) { setErro(error); setCarregado(true); return; }
    if ((data || []).length === 0) {
      const seed = PROPOSICOES_SEED.map((p, i) => ({ ...paraBanco(p), posicao: i }));
      const { data: ins, error: e2 } = await supabase.from("proposicoes").insert(seed).select();
      if (e2) { setErro(e2); setItens([]); setCarregado(true); return; }
      setErro(null);
      setItens(ordenar((ins || []).map(mapRow)));
      setCarregado(true);
      return;
    }
    setErro(null);
    setItens(ordenar(data.map(mapRow)));
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    recarregar();
    const canal = supabase
      .channel("proposicoes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "proposicoes" }, () => recarregar())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [session, recarregar]);

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
