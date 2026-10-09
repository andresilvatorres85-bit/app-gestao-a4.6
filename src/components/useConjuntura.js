import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Relatórios diários de Conjuntura (CONHECIMENTO › Conjuntura). Só leitura:
// quem grava é o workflow conjuntura.yml (scripts/conjuntura.py). Traz os
// relatórios mais recentes, do mais novo para o mais antigo, e atualiza em
// tempo real quando o relatório do dia é gravado.
const LIMITE = 90;

export function useConjuntura(session) {
  const [relatorios, setRelatorios] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState(null);
  const vivoRef = useRef(true);

  const recarregar = useCallback(async () => {
    const res = await supabase.from("conjuntura_relatorios").select("*")
      .order("data", { ascending: false }).limit(LIMITE);
    if (!vivoRef.current) return;
    if (res.error) { setErro(res.error); setCarregado(true); return; }
    setErro(null);
    setRelatorios(res.data || []);
    setCarregado(true);
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    if (!session) return () => { vivoRef.current = false; };
    recarregar();
    const canal = supabase
      .channel("conjuntura-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conjuntura_relatorios" }, () => recarregar())
      .subscribe();
    return () => { vivoRef.current = false; supabase.removeChannel(canal); };
  }, [session, recarregar]);

  return { relatorios, carregado, erro, recarregar };
}
