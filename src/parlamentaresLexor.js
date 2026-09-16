// Parlamentares que concederam emendas ao Exército, extraídos do próprio
// dados.json do app (o mesmo que alimenta o módulo LOA → RESULTADO LEXOR →
// Emendas). Serve para o autopreenchimento de Cargo, Partido e UF na aba
// "Alteração emenda", filtrando pelo ano selecionado.

// Mesmo arquivo que o módulo LOA carrega (mesma origem, caminho relativo).
let _cache = null;
async function carregarDadosJson() {
  if (!_cache) {
    _cache = fetch("./dados.json")
      .then((r) => { if (!r.ok) throw new Error(`dados.json ${r.status}`); return r.json(); })
      .catch((e) => { _cache = null; throw e; });
  }
  return _cache;
}

// Só emendas individuais de parlamentar (as que geram ofício); bancadas,
// comissões e relator-geral não assinam retificação de objeto.
const TIPOS_INDIVIDUAIS = new Set(["DEPUTADO FEDERAL", "SENADOR"]);

// Carrega os registros de emendas ao EXÉRCITO de autor individual (todas as
// safras). O filtro por ano é feito depois, na tela.
export async function carregarEmendasExercito() {
  const d = await carregarDadosJson();
  return (d.registros || [])
    .filter((r) => r.orgao === "EXÉRCITO" && TIPOS_INDIVIDUAIS.has(r.autorTipo) && (r.autor || "").trim())
    .map((r) => ({
      nome: r.autor.trim(), autorTipo: r.autorTipo,
      partido: r.partido || "", uf: r.autorUF || "", ano: String(r.ano),
    }));
}

// Consolida os autores de um ano em uma lista de parlamentares distintos
// (nome, cargo-base, partido, UF), ordenada por nome.
export function parlamentaresDoAno(registros, ano) {
  const alvo = ano != null ? String(ano) : null;
  const mapa = new Map();
  for (const r of registros) {
    if (alvo && r.ano !== alvo) continue;
    const chave = r.nome.toUpperCase();
    if (!mapa.has(chave)) mapa.set(chave, { nome: r.nome, autorTipo: r.autorTipo, partido: r.partido, uf: r.uf });
    const o = mapa.get(chave);
    if (r.partido) o.partido = r.partido; // último não-vazio
    if (r.uf) o.uf = r.uf;
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
}

// -------------------------------------------------- gênero (heurística) -----
// O dados.json não traz o sexo do parlamentar. Deduzimos para escrever o cargo
// (Deputado/Deputada, Senador/Senadora): primeiro por títulos com gênero no
// nome de urna (Delegada, Professora…), depois por uma lista de exceções e, por
// fim, pela terminação do primeiro nome (-a/-ã → feminino). O operador pode
// corrigir o Cargo à mão.
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => semAcento(String(s || "")).toUpperCase().trim();

const TITULOS_F = new Set(["DEPUTADA", "SENADORA", "DELEGADA", "PROFESSORA", "DOUTORA", "DRA", "PASTORA", "IRMA", "MADRE", "GOVERNADORA", "PREFEITA", "VEREADORA"]);
const TITULOS_M = new Set(["DEPUTADO", "SENADOR", "DELEGADO", "PROFESSOR", "PROF", "DOUTOR", "DR", "PASTOR", "GENERAL", "CORONEL", "CAPITAO", "MAJOR", "TENENTE", "SUBTENENTE", "SARGENTO", "SOLDADO", "CABO", "PADRE", "BISPO", "FREI", "COMANDANTE", "JUIZ", "PROMOTOR", "PREFEITO", "VEREADOR", "GOVERNADOR"]);
// Palavras iniciais que não indicam gênero — pula para o próximo nome.
const PULAR = new Set(["ASTRONAUTA"]);
// Exceções de primeiro nome (contrariam a regra da terminação), calibradas com
// os autores de emendas ao Exército presentes no dados.json.
const NOMES_F = new Set(["RAQUEL", "CARMEN", "DAMARES", "GLEISI", "ELCIONE", "MARGARETE", "ZENAIDE", "LIDICE", "FLORDELIS", "ROSE", "MERCEDES", "ALINE", "ANY", "FRANCIANE", "IVETE", "LIZIANE", "LUIZIANNE", "SIMONE", "DENISE", "DORINHA", "JO"]);
const NOMES_M = new Set(["BALEIA", "NICOLA", "TIRIRICA", "LULA", "JOSA", "SA", "SILAS", "MESSIAS", "GONZAGA", "FLEXA", "MANDETTA", "MENDONCA", "VAVA", "ATILA", "CEZINHA", "VITORIA"]);

export function ehFeminino(nome) {
  const tokens = norm(nome).split(/\s+/).map((t) => t.replace(/[^A-Z]/g, "")).filter(Boolean);
  if (!tokens.length) return false;
  // 1) título com gênero no nome de urna (Delegada, Professor, General…)
  for (const t of tokens) {
    if (TITULOS_F.has(t)) return true;
    if (TITULOS_M.has(t)) return false;
    if (PULAR.has(t)) continue;
    if (t.length > 2) break; // passou dos títulos/partículas iniciais
  }
  // 2) primeiro nome de fato (ignora títulos e partículas curtas)
  const cand = tokens.filter((t) => t.length > 2 && !PULAR.has(t) && !TITULOS_F.has(t) && !TITULOS_M.has(t));
  const primeiro = cand[0] || tokens[0];
  const checar = [primeiro, tokens[0]];
  if (checar.some((x) => NOMES_F.has(x))) return true;
  if (checar.some((x) => NOMES_M.has(x))) return false;
  // 3) terminação (após remover acentos, -a/-ã viram "A")
  return /A$/.test(primeiro);
}

// Cargo completo a partir do tipo (Deputado/Senador) e do gênero deduzido.
export function cargoDoParlamentar(p) {
  const fem = ehFeminino(p.nome);
  if (p.autorTipo === "SENADOR") return fem ? "Senadora" : "Senador";
  return fem ? "Deputada Federal" : "Deputado Federal";
}
