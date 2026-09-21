// Casa legislativa de cada parlamentar do Controle_LEXOR. A planilha de origem
// não traz esse dado, então mantemos aqui a lista dos SENADORES; todo o resto é
// tratado como Deputado(a) Federal. Ao importar um novo ciclo do LEXOR, se
// surgir um senador novo, basta acrescentá-lo a esta lista.
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => semAcento(String(s || "")).toUpperCase().replace(/\s+/g, " ").trim();

// Senadores presentes na base atual (PLOA 2027, emendas ao Exército).
export const SENADORES = new Set([
  "EDUARDO GIRAO",
  "HAMILTON MOURAO",
  "IZALCI LUCAS",
  "JADER BARBALHO",
  "LUCAS BARRETO",
  "RODRIGO PACHECO",
  "ZEQUINHA MARINHO",
].map(norm));

// 'senado' | 'camara' | null (sem parlamentar definido — não prospectada).
export function casaDoParlamentar(p) {
  const nome = p && p.parlamentar;
  if (!nome || !nome.trim()) return null;
  return SENADORES.has(norm(nome)) ? "senado" : "camara";
}

export const ROTULO_CASA = { camara: "Deputados", senado: "Senadores" };
