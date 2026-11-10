import { PROPOSTAS_LEXOR } from "./data/lexor.js";
import { valoresGND, valorTotal, chaveStatus } from "./lexorUtils.js";

// A mesma proposta pode aparecer em várias linhas, uma por parlamentar, cada
// uma com o seu Valor Negociado. A consolidadora guarda a linha escolhida
// (chaveLinha: "nr" ou "nr|PARLAMENTAR"); registros antigos guardam só o nr.
export const chaveLinha = chaveStatus;
const norm = (s) => String(s || "").trim().toUpperCase();
const PORNR = new Map();
for (const p of PROPOSTAS_LEXOR) {
  if (!PORNR.has(p.nr)) PORNR.set(p.nr, []);
  PORNR.get(p.nr).push(p);
}
const temNegociado = (p) => !!((p.gnd3n || 0) || (p.gnd4n || 0) || (p.totaln || 0));

// Linha da proposta para uma entrada da consolidadora: a do parlamentar
// gravado; senão (registro antigo, só nr), a do autor da consolidadora; senão
// a que tem Valor Negociado; senão a primeira.
function linhaDaEntrada(entrada, autorConsolidada) {
  const [nr, parlamentar] = String(entrada).split("|");
  const linhas = PORNR.get(nr.split("#")[0]) || [];
  if (linhas.length <= 1) return linhas[0] || null;
  return (parlamentar && linhas.find(p => norm(p.parlamentar) === norm(parlamentar)))
    || (autorConsolidada && linhas.find(p => norm(p.parlamentar) === norm(autorConsolidada)))
    || linhas.find(temNegociado)
    || linhas[0];
}

// Propostas consolidadoras: reúnem várias propostas da mesma ação orçamentária
// num único espelho. Recebem numeração própria a partir de 20279000, para não
// colidir com a numeração da planilha.

export const NUMERO_BASE_CONSOLIDADA = 20279000;

export function proximoNumero(consolidadas) {
  const numeros = consolidadas
    .map(c => Number(c.nr))
    .filter(n => Number.isFinite(n) && n >= NUMERO_BASE_CONSOLIDADA);
  return String(numeros.length ? Math.max(...numeros) + 1 : NUMERO_BASE_CONSOLIDADA);
}

// Só é possível juntar duas ou mais propostas que compartilhem a ação.
export function podeJuntar(propostas) {
  if (propostas.length < 2) {
    return { ok: false, erro: "Selecione pelo menos duas propostas para juntar." };
  }
  const acoes = [...new Set(propostas.map(p => p.acao || ""))];
  if (acoes.length > 1) {
    return {
      ok: false,
      erro: `As propostas selecionadas usam ações diferentes (${acoes.map(a => a || "sem ação").join(", ")}). `
        + "Só é possível juntar propostas da mesma ação orçamentária.",
    };
  }
  if (!acoes[0]) {
    return { ok: false, erro: "As propostas selecionadas não têm código de ação." };
  }
  if (propostas.some(p => Number(p.nr) >= NUMERO_BASE_CONSOLIDADA)) {
    return { ok: false, erro: "Não é possível juntar uma proposta que já é consolidadora." };
  }
  return { ok: true };
}

// "a", "a e b", "a, b e c"
export function listaPt(itens) {
  const l = itens.filter(Boolean);
  if (l.length === 0) return "";
  if (l.length === 1) return l[0];
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

function unicos(itens) {
  return [...new Set(itens.filter(Boolean))];
}

// Transforma o registro salvo no Supabase numa proposta completa, pronta para
// alimentar a tabela, o espelho e as funções de situação/pendência.
export function montarConsolidada(registro) {
  const itens = (registro.propostas || [])
    .map(entrada => linhaDaEntrada(entrada, registro.parlamentar))
    .filter(Boolean);
  if (itens.length === 0) return null;

  const base = itens[0];
  let gnd3 = 0, gnd4 = 0, total = 0;
  for (const p of itens) {
    const v = valoresGND(p);
    gnd3 += v.gnd3;
    gnd4 += v.gnd4;
    total += valorTotal(p);
  }

  const beneficiarios = unicos(itens.map(p => p.beneficiario));
  const cidades = unicos(itens.map(p => `${p.cidade || ""}${p.uf ? `/${p.uf}` : ""}`.trim()));
  const ufs = unicos(itens.map(p => p.uf));
  const objetos = unicos(itens.map(p => p.objeto));

  return {
    nr: registro.nr,
    uid: registro.nr, // consolidadoras têm nr único → uid = nr
    consolidada: true,
    itens,
    origem: itens.map(p => p.nr),
    tipo: base.tipo,
    proponente: base.proponente,
    acao: base.acao,
    uo: base.uo,
    esfera: base.esfera,
    funcao: base.funcao,
    subfuncao: base.subfuncao,
    programa: base.programa,
    subtitulo: base.subtitulo,
    cmdo: unicos(itens.map(p => p.cmdo)).join(" / "),
    // os valores já vêm somados: o espelho não deve reaplicar a regra do negociado
    gnd3, gnd4, total, totaln: total,
    beneficiario: listaPt(beneficiarios),
    cidade: listaPt(cidades),
    uf: ufs.join("/"),
    // os objetos costumam ter "e" no próprio texto; o ponto e vírgula evita
    // que a lista fique ambígua
    objeto: objetos.join("; "),
    beneficiarios,
    cidades,
    objetos,
    parlamentar: registro.parlamentar || "",
    partido: registro.partido || "",
    rp: base.rp,
    justificativa: "",   // montada campo a campo em lexorUtils
  };
}

// Autor sugerido ao criar: o primeiro parlamentar encontrado entre as propostas.
export function autorSugerido(propostas) {
  const comAutor = propostas.find(p => p.parlamentar);
  return {
    parlamentar: comAutor?.parlamentar || "",
    partido: comAutor?.partido || "",
  };
}
