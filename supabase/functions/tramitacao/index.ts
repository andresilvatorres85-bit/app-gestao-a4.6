// Edge Function "tramitacao" — proxy server-side para as APIs de dados abertos
// da Câmara e do Senado. Necessária porque essas APIs têm CORS instável e
// costumam barrar a chamada feita direto do navegador (GitHub Pages). Aqui a
// requisição sai do servidor do Supabase (sem CORS) e devolvemos o JSON ao app.
//
// Deploy (uma vez):
//   supabase functions deploy tramitacao
// ou pelo painel: Edge Functions → Deploy a new function → nome "tramitacao"
// → colar este arquivo → Deploy. (Manter "Verify JWT" ligado; o app chama
// autenticado via supabase.functions.invoke.)

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { fonte, id } = await req.json();
    const cod = String(id ?? "").replace(/\D/g, "");
    if (!cod) return json({ error: "id inválido" }, 400);

    let url: string;
    if (fonte === "camara") {
      url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${cod}/tramitacoes`;
    } else if (fonte === "senado") {
      url = `https://legis.senado.leg.br/dadosabertos/materia/movimentacoes/${cod}.json`;
    } else {
      return json({ error: "fonte inválida" }, 400);
    }

    const up = await fetch(url, { headers: { Accept: "application/json" } });
    if (!up.ok) return json({ error: `upstream ${up.status}` });
    const body = await up.text();
    return new Response(body, {
      headers: { ...cors, "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
