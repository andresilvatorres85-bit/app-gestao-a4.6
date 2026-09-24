// Atualização automática da "Tramitação" a partir do link da proposição.
// As APIs da Câmara e do Senado têm CORS instável e barram a chamada direta do
// navegador, então passamos por uma Edge Function do Supabase ("tramitacao"),
// que busca no servidor e devolve o JSON. Ver supabase/functions/tramitacao.
import { supabase } from "./lib/supabaseClient.js";

// Descobre a fonte e o identificador a partir do link.
//  - Câmara  (…/fichadetramitacao?idProposicao=… ou /propostas-legislativas/{id})
//  - Senado/Congresso (…/materia/{cod}, …/mpv/{cod}) → código de matéria
// Vetos, LDO e links não reconhecidos não são suportados.
export function fonteDoLink(link) {
  const url = String(link || "");
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host.includes("camara.leg.br")) {
      const q = u.searchParams.get("idProposicao");
      if (q) return { fonte: "camara", id: q };
      const m = u.pathname.match(/propostas-legislativas\/(\d+)/);
      if (m) return { fonte: "camara", id: m[1] };
      return null;
    }
    if (host.includes("senado.leg.br") || host.includes("congressonacional.leg.br")) {
      const m = u.pathname.match(/\/(?:materia|mpv)\/(\d+)/);
      if (m) return { fonte: "senado", id: m[1] };
      return null; // vetos, ldo, etc.
    }
  } catch { /* url inválida */ }
  return null;
}

export const podeAtualizar = (link) => !!fonteDoLink(link);

const fmtData = (iso) => {
  if (!iso) return "";
  const s = String(iso);
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toLocaleDateString("pt-BR");
};

// Chama a Edge Function (proxy) e devolve o JSON da API.
async function buscarViaProxy(fonte, id) {
  const { data, error } = await supabase.functions.invoke("tramitacao", { body: { fonte, id } });
  if (error) {
    throw new Error(
      "Não foi possível acessar o proxy de tramitação. Confirme que a Edge Function " +
      "“tramitacao” foi publicada no Supabase. (" + (error.message || "erro") + ")"
    );
  }
  if (data && data.error) throw new Error("A fonte respondeu: " + data.error);
  return data;
}

// Câmara: dados[] com dataHora/siglaOrgao/despacho — ordena do mais recente.
function linhasCamara(json) {
  const arr = Array.isArray(json?.dados) ? json.dados : [];
  return [...arr]
    .sort((a, b) => String(b.dataHora || "").localeCompare(String(a.dataHora || "")))
    .slice(0, 20)
    .map((t) => {
      const txt = (t.despacho || t.descricaoTramitacao || "").replace(/\s+/g, " ").trim();
      return `${fmtData(t.dataHora)}${t.siglaOrgao ? ` - ${t.siglaOrgao}` : ""}: ${txt}`;
    });
}

// Senado: o JSON varia conforme a matéria, então varremos a estrutura à procura
// de eventos com uma data e uma descrição (informes, movimentações, prazos…).
function linhasSenado(json) {
  const RE_DATA = /^data/i;
  const RE_TXT = /(descricao|texto|situacao|informe|despacho|titulo|assunto)/i;
  const eventos = [];
  const visto = new Set();
  const walk = (o) => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o && typeof o === "object") {
      const keys = Object.keys(o);
      const dk = keys.find((k) => RE_DATA.test(k) && typeof o[k] === "string" && /\d{4}/.test(o[k]));
      const tk = keys.find((k) => RE_TXT.test(k) && typeof o[k] === "string" && o[k].trim());
      if (dk && tk) {
        const org = o.SiglaColegiado || o.SiglaOrgao || o.ColegiadoCasa || o.NomeColegiado || "";
        const chave = o[dk] + "|" + o[tk];
        if (!visto.has(chave)) { visto.add(chave); eventos.push({ data: o[dk], org, txt: o[tk] }); }
      }
      for (const k of keys) walk(o[k]);
    }
  };
  walk(json);
  return eventos
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
    .slice(0, 25)
    .map((e) => `${fmtData(e.data)}${e.org ? ` - ${e.org}` : ""}: ${String(e.txt).replace(/\s+/g, " ").trim()}`);
}

// Busca e devolve o texto de tramitação (mais recentes primeiro).
export async function lerTramitacao(link) {
  const f = fonteDoLink(link);
  if (!f) throw new Error("Link sem fonte reconhecida (Câmara/Senado). Edite a tramitação à mão.");
  const json = await buscarViaProxy(f.fonte, f.id);
  const linhas = f.fonte === "camara" ? linhasCamara(json) : linhasSenado(json);
  if (!linhas.length) throw new Error("A fonte não retornou movimentações.");
  const carimbo = new Date().toLocaleDateString("pt-BR");
  return `Atualizado em ${carimbo} (fonte: ${f.fonte === "camara" ? "Câmara" : "Senado/Congresso"}).\n` + linhas.join("\n");
}
