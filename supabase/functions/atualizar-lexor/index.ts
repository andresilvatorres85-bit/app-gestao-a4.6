// Edge Function "atualizar-lexor" — dispara o workflow "Deploy no GitHub Pages"
// (deploy.yml), que baixa as planilhas Controle_LEXOR.xlsx e "Prospecção de
// Propostas de Emendas.xlsx" do repositório de dados, roda gerar_lexor.py e
// republica o site. Assim o botão "Atualizar dados" do módulo LEXOR reprocessa
// os dados na hora, sem esperar o build diário.
//
// Deploy (uma vez):
//   supabase functions deploy atualizar-lexor
//   supabase secrets set GH_DISPATCH_TOKEN=<token>
// ou pelo painel: Edge Functions → Deploy a new function → nome "atualizar-lexor"
// → colar este arquivo → Deploy; depois Settings → Edge Functions → Secrets →
// adicionar GH_DISPATCH_TOKEN. (Manter "Verify JWT" ligado; o app chama
// autenticado via supabase.functions.invoke.)
//
// Permissão: só dispara para quem tem o recurso "Atualizar dados" liberado em
// CONFIGURAÇÕES › Geral › Acessos (chave "recursos.atualizar" fora de
// usuarios.bloqueios) ou é administrador — a mesma regra do app. Sem nenhum
// administrador definido, todos podem (comportamento anterior).
//
// O token precisa de permissão para disparar workflows do repositório do app:
//   · fine-grained PAT: Actions = Read and write no repo app-gestao-a4.6; ou
//   · classic PAT: escopo "repo" (ou "workflow").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}

const OWNER = "andresilvatorres85-bit";
const REPO = "app-gestao-a4.6";
const WORKFLOW = "deploy.yml";
const REF = "main";

// Mesma regra de src/acessos.js (calcularAcesso) para a chave "recursos.atualizar".
async function podeAtualizar(req: Request): Promise<boolean> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const { data: usuarios, error } = await supabase.from("usuarios").select("*");
  if (error) return true; // colunas de acesso ainda não criadas: mantém o comportamento anterior
  if (!usuarios.some((u) => u.admin === true)) return true;
  const email = user.email.trim().toLowerCase();
  const eu = usuarios.find((u) => (u.email || "").trim().toLowerCase() === email);
  if (!eu) return false;
  if (eu.admin) return true;
  const bloqueios: string[] = Array.isArray(eu.bloqueios) ? eu.bloqueios : [];
  return !bloqueios.includes("recursos") && !bloqueios.includes("recursos.atualizar");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!(await podeAtualizar(req))) {
      return json({ error: "Seu usuário não tem permissão para atualizar os dados (CONFIGURAÇÕES › Acessos)." }, 403);
    }
  } catch (e) {
    return json({ error: "Falha ao verificar a permissão: " + String((e as Error)?.message || e) }, 500);
  }
  const token = Deno.env.get("GH_DISPATCH_TOKEN");
  if (!token) return json({ error: "GH_DISPATCH_TOKEN não configurado na função." }, 500);
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "gestao-a4.6-atualizar-lexor",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: REF }),
    });
    // GitHub responde 204 (No Content) em sucesso.
    if (r.status === 204) return json({ ok: true });
    const txt = await r.text();
    return json({ error: `GitHub respondeu ${r.status}: ${txt || "sem detalhe"}` }, 502);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
