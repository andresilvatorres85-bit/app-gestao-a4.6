// Edge Function "disparar-conjuntura" — dispara o workflow "Relatório de
// Conjuntura" (conjuntura.yml) às 08:00 de Brasília, chamada pelo pg_cron do
// Supabase (supabase_conjuntura_cron.sql). O agendamento do próprio GitHub
// Actions não tem hora garantida e chegou a atrasar horas; este disparo é o
// horário principal, e os horários do workflow ficam como reserva.
//
// Deploy (uma vez): Edge Functions → Deploy a new function → nome
// "disparar-conjuntura" → colar este arquivo → DESLIGAR "Verify JWT" (quem
// chama é o pg_cron) → Deploy. Depois, em Settings → Edge Functions → Secrets,
// adicionar CONJUNTURA_CRON_SECRET (qualquer texto longo e aleatório; o mesmo
// vai no SQL). Usa o GH_DISPATCH_TOKEN que já existe (botão "Atualizar dados").

const OWNER = "andresilvatorres85-bit";
const REPO = "app-gestao-a4.6";
const WORKFLOW = "conjuntura.yml";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get("CONJUNTURA_CRON_SECRET");
  if (!segredo || req.headers.get("x-cron-secret") !== segredo) {
    return json({ error: "não autorizado" }, 401);
  }
  const token = Deno.env.get("GH_DISPATCH_TOKEN");
  if (!token) return json({ error: "GH_DISPATCH_TOKEN não configurado." }, 500);
  const r = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "gestao-a4.6-conjuntura",
        "content-type": "application/json",
      },
      // agendado=1: o script não busca de novo se já houve busca no dia
      // (uma busca por dia, para não consumir créditos em dobro).
      body: JSON.stringify({ ref: "main", inputs: { agendado: "1" } }),
    },
  );
  if (r.status === 204) return json({ ok: true });
  return json({ error: `GitHub respondeu ${r.status}: ${await r.text()}` }, 502);
});
