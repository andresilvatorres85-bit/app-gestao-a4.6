import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Converte uma linha do Supabase (snake_case) para o formato usado na tela.
function mapRow(r) {
  return {
    id: r.id,
    parlamentar: r.parlamentar,
    cargo: r.cargo,
    partido: r.partido,
    uf: r.uf,
    oficioNr: r.oficio_nr,
    dia: r.dia, mes: r.mes, ano: r.ano,
    emenda: r.emenda,
    objetoDe: r.objeto_de,
    objetoPara: r.objeto_para,
    ajuste: r.ajuste,
    gabinete: r.gabinete,
    telefone: r.telefone,
    email: r.email,
    aoDados: r.ao_dados || null,
    autor: r.autor,
    criadoEm: r.criado_em ? new Date(r.criado_em).getTime() : null,
  };
}

// Executa a gravação; se a coluna ao_dados ainda não existir no banco, remove-a
// e tenta de novo (o registro é salvo sem os detalhes do AO, sem quebrar).
async function gravarComFallback(fazer, rec) {
  let res = await fazer(rec);
  if (res.error && /ao_dados/i.test(res.error.message || "")) {
    const { ao_dados, ...semAo } = rec; // eslint-disable-line no-unused-vars
    res = await fazer(semAo);
  }
  return res;
}

// Lista compartilhada das retificações de objeto de emenda (botão "Objeto
// Emenda"), guardada na tabela `objeto_emendas` do Supabase e mantida em tempo
// real, no mesmo padrão dos "registros" do módulo MÉTRICAS.
export function useObjetoEmendas(session) {
  const [itens, setItens] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("objeto_emendas")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) { setErro(error); setCarregado(true); return; }
    setErro(null);
    setItens((data || []).map(mapRow));
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    recarregar();
    const channel = supabase
      .channel("objeto-emendas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "objeto_emendas" }, () => recarregar())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, recarregar]);

  // Insere um registro. Recebe os campos já no formato da tela e traduz para as
  // colunas do banco. Devolve { data, error } como o supabase-js.
  const inserir = useCallback(async (d) => {
    const rec = {
      parlamentar: d.parlamentar?.trim() || null,
      cargo: d.cargo?.trim() || null,
      partido: d.partido?.trim() || null,
      uf: d.uf?.trim() || null,
      oficio_nr: d.oficioNr?.trim() || null,
      dia: d.dia ? Number(d.dia) : null,
      mes: d.mes ? Number(d.mes) : null,
      ano: d.ano ? Number(d.ano) : null,
      emenda: d.emenda?.trim() || null,
      objeto_de: d.objetoDe?.trim() || null,
      objeto_para: d.objetoPara?.trim() || null,
      ajuste: d.ajuste?.trim() || null,
      gabinete: d.gabinete?.trim() || null,
      telefone: d.telefone?.trim() || null,
      email: d.email?.trim() || null,
      ao_dados: d.aoDados ?? null,
      autor: d.autor || null,
    };
    const res = await gravarComFallback((r) => supabase.from("objeto_emendas").insert(r).select().single(), rec);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  // Atualiza um registro existente (edição pelo Painel ou pela lista).
  const atualizar = useCallback(async (id, d) => {
    const rec = {
      parlamentar: d.parlamentar?.trim() || null,
      cargo: d.cargo?.trim() || null,
      partido: d.partido?.trim() || null,
      uf: d.uf?.trim() || null,
      oficio_nr: d.oficioNr?.trim() || null,
      dia: d.dia ? Number(d.dia) : null,
      mes: d.mes ? Number(d.mes) : null,
      ano: d.ano ? Number(d.ano) : null,
      emenda: d.emenda?.trim() || null,
      objeto_de: d.objetoDe?.trim() || null,
      objeto_para: d.objetoPara?.trim() || null,
      ajuste: d.ajuste?.trim() || null,
      gabinete: d.gabinete?.trim() || null,
      telefone: d.telefone?.trim() || null,
      email: d.email?.trim() || null,
      ao_dados: d.aoDados ?? null,
    };
    const res = await gravarComFallback((r) => supabase.from("objeto_emendas").update(r).eq("id", id).select().single(), rec);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  const excluir = useCallback(async (id) => {
    const res = await supabase.from("objeto_emendas").delete().eq("id", id);
    if (!res.error) recarregar();
    return res;
  }, [recarregar]);

  return { itens, carregado, erro, inserir, atualizar, excluir, recarregar };
}
