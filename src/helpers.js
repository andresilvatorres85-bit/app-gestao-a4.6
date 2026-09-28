import { MESES } from "./constants.js";

export function protocolo(y, seq) {
  return `${String(seq).padStart(4, "0")}/${y}`;
}

// Mensagem de erro ao salvar/editar no Supabase. Quando a edição falha por RLS
// (o banco devolve 0 linhas — código PGRST116 do PostgREST — ou fala em
// política/permissão), aponta o remédio: rodar o script de políticas.
export function msgErroSalvar(error, editando = false) {
  const m = error?.message || "";
  const bloqueio = error?.code === "PGRST116" || /row-level|policy|permission|não autorizado|not authorized/i.test(m);
  if (bloqueio && editando) {
    return "A edição não foi salva: o banco (Supabase) está bloqueando a alteração. "
      + "Rode uma vez o script supabase_edicao_policies.sql no SQL Editor do Supabase.";
  }
  return "Não foi possível salvar: " + (m || "erro desconhecido");
}

export function todayParts() {
  const d = new Date();
  return { d: d.getDate(), m: d.getMonth() + 1, y: d.getFullYear() };
}

export function fmtData(rec) {
  if (!rec.d) return `${MESES[rec.m]}/${rec.y}`;
  return `${String(rec.d).padStart(2, "0")}/${String(rec.m).padStart(2, "0")}/${rec.y}`;
}

export function chaveOrdenacao(rec) {
  return rec.y * 10000 + rec.m * 100 + (rec.d || 0);
}
