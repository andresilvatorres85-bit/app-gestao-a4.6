// Busca ao vivo dos parlamentares em exercício, direto das APIs de dados
// abertos da Câmara dos Deputados e do Senado Federal, no navegador do operador.
// A lista (nome, partido, UF) alimenta a seleção; ao escolher um parlamentar,
// um segundo fetch traz o detalhe (sexo → cargo com gênero, gabinete, telefone,
// e-mail). Tudo é best-effort: se uma casa bloquear a requisição (CORS) ou faltar
// um campo, aquele trecho fica em branco e o operador preenche à mão.

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const JSON_H = { headers: { Accept: "application/json" } };

// ------------------------------------------------------------- lista -----
async function listarDeputados() {
  let url = `${CAMARA}/deputados?ordem=ASC&ordenarPor=nome&itens=100`;
  const out = [];
  // paginação: ~513 deputados, 100 por página.
  for (let guarda = 0; url && guarda < 12; guarda++) {
    const j = await fetch(url, JSON_H).then((r) => r.json());
    for (const d of j.dados || []) {
      out.push({ casa: "camara", id: String(d.id), nome: d.nome, partido: d.siglaPartido || "", uf: d.siglaUf || "" });
    }
    const next = (j.links || []).find((l) => l.rel === "next");
    url = next ? next.href : null;
  }
  return out;
}

async function listarSenadores() {
  const j = await fetch(`${SENADO}/senador/lista/atual`, JSON_H).then((r) => r.json());
  const arr = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  return arr.map((p) => {
    const i = p.IdentificacaoParlamentar || {};
    return {
      casa: "senado", id: String(i.CodigoParlamentar || ""),
      nome: i.NomeParlamentar || "", nomeCompleto: i.NomeCompletoParlamentar || "",
      sexo: i.SexoParlamentar || "", partido: i.SiglaPartidoParlamentar || "",
      uf: i.UfParlamentar || "", email: i.EmailParlamentar || "",
    };
  });
}

// Cache em nível de módulo: a lista é buscada uma vez por sessão (as duas casas
// em paralelo; se uma falhar, a outra ainda entra).
let _cache = null;
export function listarParlamentares() {
  if (!_cache) {
    _cache = Promise.allSettled([listarDeputados(), listarSenadores()])
      .then(([d, s]) => {
        const dep = d.status === "fulfilled" ? d.value : [];
        const sen = s.status === "fulfilled" ? s.value : [];
        if (!dep.length && !sen.length) throw new Error("APIs indisponíveis");
        return [...dep, ...sen].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
      })
      .catch((e) => { _cache = null; throw e; });
  }
  return _cache;
}

// ------------------------------------------------------------ detalhe -----
async function detalheDeputado(p) {
  const j = await fetch(`${CAMARA}/deputados/${p.id}`, JSON_H).then((r) => r.json());
  const d = j.dados || {};
  const st = d.ultimoStatus || {};
  const g = st.gabinete || {};
  const fem = String(d.sexo || "").toUpperCase() === "F";
  return {
    cargo: fem ? "Deputada Federal" : "Deputado Federal",
    partido: st.siglaPartido || p.partido || "",
    uf: st.siglaUf || p.uf || "",
    gabinete: g.sala || "",
    telefone: g.telefone || "",
    email: g.email || st.email || d.email || "",
  };
}

async function detalheSenador(p) {
  const fem = String(p.sexo || "").toLowerCase().startsWith("f");
  let gabinete = "";
  let telefone = "";
  // A lista já traz sexo/partido/UF/e-mail; o detalhe (quando acessível) traz o
  // telefone e o endereço do gabinete.
  try {
    const j = await fetch(`${SENADO}/senador/${p.id}`, JSON_H).then((r) => r.json());
    const par = j?.DetalheParlamentar?.Parlamentar || {};
    const tels = par?.Telefones?.Telefone;
    const tel = Array.isArray(tels) ? tels[0] : tels;
    telefone = tel?.NumeroTelefone || "";
    // Endereço do gabinete: composição "Anexo/Ala - Gabinete" quando disponível.
    const end = par?.DadosBasicosParlamentar?.EnderecoParlamentar || par?.EnderecoParlamentar || "";
    if (end && typeof end === "string") gabinete = end;
  } catch { /* mantém em branco */ }
  return {
    cargo: fem ? "Senadora" : "Senador",
    partido: p.partido || "",
    uf: p.uf || "",
    gabinete,
    telefone,
    email: p.email || "",
  };
}

// Detalha um parlamentar da lista, devolvendo os campos para o autopreenchimento.
export async function detalharParlamentar(p) {
  try {
    return p.casa === "camara" ? await detalheDeputado(p) : await detalheSenador(p);
  } catch {
    // Sem detalhe: pelo menos cargo (com gênero, quando o sexo veio da lista),
    // partido e UF, que já vêm da listagem do Senado.
    const fem = String(p.sexo || "").toLowerCase().startsWith("f");
    const cargo = p.casa === "senado" ? (fem ? "Senadora" : "Senador") : "";
    return { cargo, partido: p.partido || "", uf: p.uf || "", gabinete: "", telefone: "", email: p.email || "" };
  }
}
