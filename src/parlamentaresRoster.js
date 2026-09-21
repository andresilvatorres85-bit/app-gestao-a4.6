// Índice nome → casa (câmara/senado) montado ao vivo, no navegador do operador,
// a partir das listas oficiais de parlamentares em exercício da Câmara dos
// Deputados e do Senado Federal. Usado para classificar os autores do LEXOR sem
// depender de um mapa fixo. Se uma casa falhar (CORS/rede), o classificador cai
// no mapa curado de reserva (ver lexorCasas.js).

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const JSON_H = { headers: { Accept: "application/json" } };

// Normaliza o nome para casar as duas grafias: sem acento, maiúsculas, só letras
// e números (remove pontos/títulos como "Dr."), espaços colapsados.
export function normNome(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

async function deputadosNomes() {
  let url = `${CAMARA}/deputados?ordem=ASC&ordenarPor=nome&itens=100`;
  const out = [];
  for (let guarda = 0; url && guarda < 12; guarda++) {
    const j = await fetch(url, JSON_H).then((r) => r.json());
    for (const d of j.dados || []) if (d.nome) out.push(d.nome);
    const next = (j.links || []).find((l) => l.rel === "next");
    url = next ? next.href : null;
  }
  return out;
}

async function senadoresNomes() {
  const j = await fetch(`${SENADO}/senador/lista/atual`, JSON_H).then((r) => r.json());
  const arr = j?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || [];
  return arr.map((p) => p?.IdentificacaoParlamentar?.NomeParlamentar).filter(Boolean);
}

// Cache por sessão: busca as duas casas em paralelo; se uma falhar, a outra
// ainda entra. Devolve um Map<nomeNormalizado, 'camara'|'senado'>.
let _cache = null;
export function carregarIndiceCasa() {
  if (!_cache) {
    _cache = Promise.allSettled([deputadosNomes(), senadoresNomes()])
      .then(([d, s]) => {
        const dep = d.status === "fulfilled" ? d.value : [];
        const sen = s.status === "fulfilled" ? s.value : [];
        if (!dep.length && !sen.length) throw new Error("Listas de parlamentares indisponíveis");
        const m = new Map();
        for (const n of dep) { const k = normNome(n); if (k && !m.has(k)) m.set(k, "camara"); }
        for (const n of sen) { const k = normNome(n); if (k) m.set(k, "senado"); }
        return m;
      })
      .catch((e) => { _cache = null; throw e; });
  }
  return _cache;
}
