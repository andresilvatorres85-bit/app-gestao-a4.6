import { normNome } from "./parlamentaresRoster.js";

// Casa legislativa de cada parlamentar do Controle_LEXOR. A classificação é
// feita ao vivo pelas listas oficiais (ver parlamentaresRoster.js); esta lista
// de senadores é apenas a RESERVA usada quando o índice ao vivo não carregou
// (CORS/rede) ou não encontrou o nome.
export const SENADORES = new Set([
  "EDUARDO GIRAO",
  "HAMILTON MOURAO",
  "IZALCI LUCAS",
  "JADER BARBALHO",
  "LUCAS BARRETO",
  "RODRIGO PACHECO",
  "ZEQUINHA MARINHO",
].map(normNome));

// 'senado' | 'camara' | null (sem parlamentar definido — não prospectada).
// `indice` é o Map<nomeNormalizado, casa> vindo das listas oficiais; quando
// ausente ou sem o nome, cai na reserva curada (demais autores = deputado).
export function casaDoParlamentar(p, indice = null) {
  const nome = p && p.parlamentar;
  if (!nome || !nome.trim()) return null;
  const chave = normNome(nome);
  if (indice) {
    const c = indice.get(chave);
    if (c) return c;
  }
  return SENADORES.has(chave) ? "senado" : "camara";
}

export const ROTULO_CASA = { camara: "Câmara de Deputados", senado: "Senado Federal" };
