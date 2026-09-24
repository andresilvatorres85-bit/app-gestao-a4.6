// Atualização automática da "Tramitação" a partir do link da proposição,
// lendo as APIs de dados abertos no navegador do operador:
//  - Câmara  (www.camara.leg.br/.../fichadetramitacao?idProposicao=… ou
//             /propostas-legislativas/{id}) → dadosabertos.camara.leg.br
//  - Senado / Congresso (…/materia/{cod}, …/mpv/{cod}) → legis.senado.leg.br
// Vetos, LDO e links não reconhecidos não são suportados (retorna null em
// `fonteDoLink`), e a tramitação segue editável à mão.

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const JSON_H = { headers: { Accept: "application/json" } };

// Descobre a fonte e o identificador a partir do link.
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
      // .../materia/{cod} ou .../mpv/{cod} → código de matéria do Senado
      const m = u.pathname.match(/\/(?:materia|mpv)\/(\d+)/);
      if (m) return { fonte: "senado", id: m[1] };
      return null; // vetos, ldo, etc.
    }
  } catch { /* url inválida */ }
  return null;
}

// Diz se um link é auto-atualizável (para habilitar/explicar o botão).
export const podeAtualizar = (link) => !!fonteDoLink(link);

const fmtData = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString("pt-BR");
};

async function tramitacaoCamara(id) {
  const j = await fetch(`${CAMARA}/proposicoes/${id}/tramitacoes?ordem=DESC&itens=20`, JSON_H).then((r) => r.json());
  const arr = j.dados || [];
  return arr.map((t) => {
    const data = fmtData(t.dataHora);
    const org = t.siglaOrgao || "";
    const txt = (t.despacho || t.descricaoTramitacao || "").replace(/\s+/g, " ").trim();
    return `${data}${org ? ` - ${org}` : ""}: ${txt}`;
  });
}

async function tramitacaoSenado(id) {
  // Movimentações da matéria; o formato do Senado varia, então lemos de forma
  // defensiva qualquer lista de eventos com data e descrição.
  const j = await fetch(`${SENADO}/materia/movimentacoes/${id}`, JSON_H).then((r) => r.json());
  const raiz = j?.MovimentacaoMateria?.Materia || j?.Materia || j || {};
  let eventos =
    raiz?.Movimentacoes?.Movimentacao ||
    raiz?.InformesLegislativos?.InformeLegislativo ||
    raiz?.OrdemDoDia?.Sessao || [];
  if (!Array.isArray(eventos)) eventos = eventos ? [eventos] : [];
  const linhas = eventos.map((e) => {
    const data = fmtData(e.DataMovimentacao || e.Data || e.DataSessao || e.DataInforme);
    const org = e.SiglaOrgao || e.Orgao?.SiglaOrgao || e.ColegiadoCasa || "";
    const txt = (e.Descricao || e.TextoInforme || e.DescricaoSituacao || e.Situacao || "").toString().replace(/\s+/g, " ").trim();
    return [data, org, txt];
  }).filter((l) => l[0] || l[2]).map(([data, org, txt]) => `${data}${org ? ` - ${org}` : ""}: ${txt}`);
  return linhas.reverse(); // mais recente primeiro
}

// Busca e devolve o texto de tramitação (mais recentes primeiro), pronto para
// preencher o campo. Lança erro com mensagem amigável quando não dá.
export async function lerTramitacao(link) {
  const f = fonteDoLink(link);
  if (!f) throw new Error("Link sem fonte reconhecida (Câmara/Senado). Edite a tramitação à mão.");
  const linhas = f.fonte === "camara" ? await tramitacaoCamara(f.id) : await tramitacaoSenado(f.id);
  if (!linhas.length) throw new Error("A fonte não retornou movimentações.");
  const carimbo = new Date().toLocaleDateString("pt-BR");
  return `Atualizado em ${carimbo} (fonte: ${f.fonte === "camara" ? "Câmara" : "Senado/Congresso"}).\n` + linhas.join("\n");
}
