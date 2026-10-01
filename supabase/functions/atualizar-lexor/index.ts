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
// O token precisa de permissão para disparar workflows do repositório do app:
//   · fine-grained PAT: Actions = Read and write no repo app-gestao-a4.6; ou
//   · classic PAT: escopo "repo" (ou "workflow").

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
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
