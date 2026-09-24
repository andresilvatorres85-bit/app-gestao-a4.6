// Metadados e utilidades do módulo "Proposições" (controle das proposições
// legislativas de interesse orçamentário do Exército).

// Status = a legenda por cor do controle original.
export const STATUS = {
  atencao:   { rotulo: "Atenção", cor: "#E08A3C", legenda: "Atenção no acompanhamento." },
  normal:    { rotulo: "Em acompanhamento", cor: "#9BA89E", legenda: "Acompanhamento normal." },
  interesse: { rotulo: "Interesse (CD/SF)", cor: "#5A8FCB", legenda: "O acompanhamento é da CD/SF, mas interessa à Força." },
  arquivada: { rotulo: "Arquivada", cor: "#C9A96A", legenda: "Arquivada — manter push em caso de desarquivamento." },
  concluida: { rotulo: "Concluída", cor: "#4E9A6B", legenda: "Virou norma ou perdeu a eficácia — não precisa acompanhar." },
};
export const STATUS_ORDEM = ["atencao", "normal", "interesse", "arquivada", "concluida"];
export const statusInfo = (s) => STATUS[s] || STATUS.normal;

// Tipos e casas conhecidos (para os seletores; a lista real também sai dos dados).
export const TIPOS = ["PL", "PLP", "PEC", "MPV", "PLN", "PDL", "PRN", "REQ", "VET", "MSC", "PLV"];
export const CASAS = [
  { id: "CD", rotulo: "Câmara dos Deputados" },
  { id: "SF", rotulo: "Senado Federal" },
  { id: "CN", rotulo: "Congresso Nacional" },
];
export const rotuloCasa = (c) => (CASAS.find((x) => x.id === c)?.rotulo || c || "—");

// --------------------------------------------------------- normalização -----
const semNbsp = (s) => String(s ?? "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();

// "44062021" → "4406/2021"; "3887/2020" mantém; "5/2026" mantém.
export function normalizarProposicao(v) {
  const s = semNbsp(v);
  if (!s) return "";
  if (s.includes("/")) {
    const [num, ano] = s.split("/");
    const n = num.replace(/\D/g, ""); const a = ano.replace(/\D/g, "");
    return n && a ? `${parseInt(n, 10)}/${a}` : s;
  }
  const d = s.replace(/\D/g, "");
  if (d.length >= 5) return `${parseInt(d.slice(0, -4), 10)}/${d.slice(-4)}`;
  return s;
}

// Limpa o autor (tira \xa0, colapsa espaços); mantém a grafia do operador.
export const normalizarAutor = (v) => semNbsp(v);

// Ano da proposição (para ordenar/filtrar), a partir de "NUM/AAAA".
export function anoDaProposicao(p) {
  const m = String(p || "").match(/\/(\d{4})/);
  return m ? Number(m[1]) : 0;
}
