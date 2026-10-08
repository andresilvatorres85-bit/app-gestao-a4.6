import { ACOES_LEXOR, UO_LEXOR } from "./data/lexor.js";

// Reproduz a lógica da mala direta do Word no layout do relatório oficial do
// Lexor: cada campo vem da planilha SIOPLEx (dados da proposta) ou da aba
// Ações (tabela de apoio, consultada pelo código da ação).

// ---------------------------------------------------------------------------
// Cabeçalho do relatório. Trocar a cada exercício.
// ---------------------------------------------------------------------------
export const CABECALHO = {
  orgao: "Congresso Nacional",
  comissao: "Comissão Mista de Planos, Orçamentos Públicos e Fiscalização",
  sistema: "Lexor - Sistemas de Leis Orçamentárias",
  projeto: "PLN 24/2026 - Projeto de Lei Orçamentária Anual para 2027",
  titulo: "Relatório de espelho de Emendas",
  aviso: "Este espelho de emenda estará disponível no Sistema Lexor, para importação, conforme cronograma do PLOA 2027",
};

// Cancelamento compensatório padrão — igual em todos os espelhos, exceto o
// valor, que acompanha a soma dos acréscimos (GND 3 + GND 4).
export const CANCELAMENTO_PADRAO = {
  sequencial: "3655",
  fonte: "1000",
  gnd: "9",
  gndNome: "Reserva de Contingência",
  modalidade: "99",
  modalidadeNome: "A Definir",
  id: "0",
  rp: "2",
};

// Descrições da classificação orçamentária. Editar aqui se a SOF alterar.
export const ESFERAS = {
  10: "Orçamento Fiscal",
  20: "Orçamento da Seguridade Social",
  30: "Orçamento de Investimento",
};

export const FUNCOES = { "05": "Defesa Nacional" };

export const SUBFUNCOES = {
  122: "Administração Geral",
  153: "Defesa Terrestre",
  301: "Atenção Básica",
  363: "Ensino Profissional",
  364: "Ensino Superior",
  368: "Educação Básica",
  572: "Desenvolvimento Tecnológico e Engenharia",
};

export const PROGRAMAS = {
  "0032": "Programa de Gestão e Manutenção do Poder Executivo",
  6112: "Defesa Nacional",
};

export const GND_NOMES = { 3: "Outras Despesas Correntes", 4: "Investimentos" };

// Ações de emendas de inclusão: não constam do PLOA, então não têm Sequencial
// SOF atribuído. A ausência desse número nelas é esperada e não conta como
// pendência. Acrescente aqui outras ações de inclusão que venham a surgir.
export const ACOES_SEM_SEQUENCIAL = ["2E74", "20XM"];

const CNPJ_COMANDO = "Beneficiário para lançamento no SIOP - CNPJ: 00.394.452/0001-03 - Comando do Exército";

// ---------------------------------------------------------------------------

export function moeda(v) {
  return (v || 0).toLocaleString("pt-BR");
}

// Regra de valores: prevalece o par negociado (Valor Negociado GND 3 / GND 4).
// Se os dois estiverem zerados ou vazios, usa o par original (Valor GND 3 / 4).
export function valoresGND(p) {
  const negociado = !!((p.gnd3n || 0) || (p.gnd4n || 0));
  return {
    gnd3: negociado ? (p.gnd3n || 0) : (p.gnd3 || 0),
    gnd4: negociado ? (p.gnd4n || 0) : (p.gnd4 || 0),
    negociado,
  };
}

// Mesma regra para o total: Valor Negociado Total, com queda para Valor Total.
export function valorTotal(p) {
  if (p.consolidada) return (p.gnd3 || 0) + (p.gnd4 || 0);
  if (p.totaln) return p.totaln;
  if (p.total) return p.total;
  const { gnd3, gnd4 } = valoresGND(p);
  return gnd3 + gnd4;
}

// O exercício vem dos 4 primeiros dígitos do Nr Proposta (ex.: 20270032 -> 2027)
export function exercicioDe(p) {
  const s = String(p.nr || "");
  const ano = Number(s.slice(0, 4));
  return ano >= 2020 && ano <= 2099 ? ano : null;
}

export function nomeUO(codigo) {
  return UO_LEXOR[codigo] || "";
}

// Junta código e descrição no formato "0032 - Programa de Gestão…"
function comDescricao(codigo, tabela) {
  if (!codigo) return "";
  const desc = tabela[codigo];
  return desc ? `${codigo} - ${desc}` : String(codigo);
}

// Ementa: mesma frase montada pelo modelo do Word, campo a campo. Quando o
// espelho reúne várias propostas, o texto fixo vai para o plural — "nas (os)",
// "nos municípios de" — e as listas são separadas por vírgula e "e".
export function montarEmenta({
  tipo, uf, descricaoAcao, beneficiario, cidade, uoCod, uoNome, objeto, plural = false,
}) {
  const ondeRot = plural ? "nas (os)" : "na (o)";
  const municipioRot = plural ? "nos municípios de" : "no município de";
  return [
    "Exército Brasileiro",
    tipo || "Emenda",
    uf || "—",
    `${descricaoAcao || "—"} ${ondeRot} ${beneficiario || "—"}, ${municipioRot} ${cidade || "—"}`
    + ` - Unidade Orçamentária: ${uoCod || "—"} - ${uoNome || "—"} - ${uf || "—"}.`
    + ` ${objeto || ""}`,
  ].join(" – ").trim();
}

// Justificativa da proposta consolidadora: cabeçalho do CNPJ e, em seguida, um
// item numerado por proposta com beneficiário, cidade/UF, valor e justificativa.
function justificativaConsolidada(p) {
  const linhas = [CNPJ_COMANDO];
  p.itens.forEach((sub, i) => {
    const local = [sub.cidade, sub.uf].filter(Boolean).join("/");
    const valor = `R$ ${moeda(valorTotal(sub))}`;
    linhas.push(`${i + 1}. Organização Militar Beneficiária: ${sub.beneficiario || "—"}`
      + `${local ? ` - ${local}` : ""} - ${valor}`);
    if (sub.justificativa) linhas.push(sub.justificativa);
  });
  return linhas.join("\n");
}

// Reúne tudo que o espelho precisa imprimir.
export function montarEspelho(p, exercicioForcado) {
  const acao = ACOES_LEXOR[p.acao] || null;
  const uoCod = p.uo || acao?.uoCod || "";
  const uoNome = nomeUO(uoCod) || acao?.uoNome || "";
  const exercicio = exercicioForcado || exercicioDe(p) || "";

  // Na consolidadora os valores já vêm somados dos itens; nas demais vale a
  // regra do par negociado.
  const { gnd3, gnd4, negociado } = p.consolidada
    ? { gnd3: p.gnd3 || 0, gnd4: p.gnd4 || 0, negociado: false }
    : valoresGND(p);
  const linhas = [];
  if (gnd3) linhas.push({ gnd: "3", gndNome: GND_NOMES[3], valor: gnd3 });
  if (gnd4) linhas.push({ gnd: "4", gndNome: GND_NOMES[4], valor: gnd4 });
  // o cancelamento compensatório acompanha a soma dos acréscimos do espelho
  const total = gnd3 + gnd4;

  // Funcional programática no formato do Lexor: 05.301.0032.2E74.
  const funcional = [p.funcao, p.subfuncao, p.programa, p.acao]
    .filter(Boolean).join(".") + (p.acao ? "." : "");

  const justificativa = p.consolidada
    ? justificativaConsolidada(p)
    : [
      CNPJ_COMANDO,
      `Organização Militar Beneficiária: ${p.beneficiario || "—"}`
        + (p.cidade || p.uf ? ` - ${[p.cidade, p.uf].filter(Boolean).join("/")}` : ""),
      p.justificativa || "",
    ].filter(Boolean).join("\n");

  return {
    exercicio,
    ementa: montarEmenta({
      tipo: p.tipo,
      uf: p.uf,
      descricaoAcao: acao?.descricao,
      beneficiario: p.beneficiario,
      cidade: p.cidade,
      uoCod,
      uoNome,
      objeto: p.objeto,
      plural: !!p.consolidada && p.itens.length > 1,
    }),
    sequencial: acao?.seq || "",
    esfera: comDescricao(p.esfera, ESFERAS),
    orgao: `${acao?.orgaoCod || "52000"} - ${acao?.orgaoNome || "Ministério da Defesa"}`,
    unidade: uoCod ? `${uoCod} - ${uoNome}` : "",
    funcional,
    funcao: comDescricao(p.funcao, FUNCOES),
    subfuncao: comDescricao(p.subfuncao, SUBFUNCOES),
    programa: comDescricao(p.programa, PROGRAMAS),
    acaoTexto: p.acao ? `${p.acao} - ${acao?.descricao || ""}`.replace(/ - $/, "") : "",
    // o subtítulo só é atribuído pela SOF depois; a tabela Ações traz "XXXX"
    subtitulo: acao?.subtitulo || p.subtitulo || "XXXX",
    descricaoSubtitulo: p.objeto || "",
    produto: acao?.produto && acao.produto !== "-"
      ? `${acao.produto} (${acao.unidade || "unidade"})` : "",
    meta: String(acao?.meta || "1"),
    linhas,
    total,
    rp: p.rp || "6",
    cancelamento: { ...CANCELAMENTO_PADRAO, valor: total },
    justificativa,
    autor: [p.parlamentar, p.partido ? `(${p.partido})` : ""].filter(Boolean).join(" "),
    negociado,
    temAcao: !!acao,
  };
}

// Informações que faltam para montar o espelho. A ausência de autor não entra
// aqui: ela define a prospecção, tratada em situacaoDe().
export function pendencias(p) {
  const lista = [];
  if (!p.acao) lista.push("sem código de ação");
  else if (!ACOES_LEXOR[p.acao]) lista.push(`ação ${p.acao} não cadastrada na aba Ações`);
  else if (!ACOES_LEXOR[p.acao].seq && !ACOES_SEM_SEQUENCIAL.includes(p.acao)) {
    lista.push("ação sem Sequencial SOF");
  }
  if (!valorTotal(p)) lista.push("sem valor em GND 3 e GND 4");
  if (!p.objeto) lista.push("sem objeto");
  if (!p.beneficiario) lista.push("sem beneficiário");
  if (p.rep && !p.consolidada) lista.push("marcada como repetida na planilha");
  return lista;
}

// Situação exibida na tabela geral:
//   pendencia      — falta informação para montar o espelho (amarelo)
//   prospectada    — tem parlamentar autor definido (verde)
//   nao_prospectada— sem autor, mas com os demais dados completos (vermelho)
export const SITUACOES = {
  prospectada: { rotulo: "Prospectada", tone: "novo" },
  nao_prospectada: { rotulo: "Não Prospectada", tone: "erro" },
  pendencia: { rotulo: "Pendência", tone: "alerta" },
};

export function situacaoDe(p) {
  if (pendencias(p).length > 0) return "pendencia";
  return p.parlamentar ? "prospectada" : "nao_prospectada";
}

// Status de tramitação no LEXOR, editado à mão na tabela geral.
// "Desconsiderar" marca a proposta que não deve ser lançada no LEXOR; ela sai
// da tabela principal e passa para o card das desconsideradas.
export const STATUS_DESCONSIDERAR = "Desconsiderar";
export const STATUS_LEXOR = ["Aguardando", "Confeccionado", "Exportado", STATUS_DESCONSIDERAR];
export const STATUS_LEXOR_PADRAO = "Aguardando";
