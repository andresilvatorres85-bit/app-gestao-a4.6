// Identidade visual comum a TODAS as exportações PPTX do app, no modelo da
// apresentação "Métricas A4.6": slide 1 com a faixa verde, o título
// "5. Subassessoria de Orçamento (A4.6)" e a imagem institucional; demais
// slides com fundo verde-claro, faixa verde com o título em azul-escuro e o
// brasão no canto superior direito.
import capaImg from "./metricasCapa.jpg";
import brasaoImg from "./brasao.png";

export const MODELO = {
  barra: "A9D08E",      // verde (accent 6, 40% mais claro)
  fundo: "E2EFDA",      // verde-claro (accent 6, 80% mais claro)
  titulo: "1F3864",     // azul (accent 1, 50% mais escuro)
  fonte: "Calibri",
};

// Geometria em polegadas (slide 16:9 de 13,333" × 7,5").
export const GEO = {
  W: 13.333, H: 7.5,
  barra: { y: -0.01, h: 0.64 },
  tituloX: 0.42,
  brasao: { x: 12.288, y: 0.293, lado: 0.778 },
  capa: {
    barra: { y: -0.01, h: 0.707 },
    imagem: { y: 0.696, h: 6.804 },
    brasao: { x: 12.381, y: 0.329, lado: 0.773 },
  },
};

export const CAPA_TITULO = "5. Subassessoria de Orçamento";
export const CAPA_SUFIXO = " (A4.6)";
export const prefixarTitulo = (t) => (/^\d+\.\s/.test(t) ? t : `5. ${t}`);

// Tamanho (pt) do título da faixa: 32 como no modelo, reduzindo para títulos
// longos para que caibam numa linha sem passar por baixo do brasão.
export function tamanhoTitulo(t) {
  const n = String(t || "").length;
  const caixaAlta = n > 0 && t === t.toUpperCase();
  const efetivo = caixaAlta ? n * 1.25 : n; // maiúsculas ocupam mais
  if (efetivo <= 54) return 32;
  if (efetivo <= 62) return 28;
  if (efetivo <= 72) return 24;
  if (efetivo <= 86) return 20;
  if (efetivo <= 104) return 16;
  return 14;
}

async function bytesDe(url) {
  if (String(url).startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const resp = await fetch(url);
  return new Uint8Array(await resp.arrayBuffer());
}

function paraBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Imagens do modelo, carregadas uma vez por sessão: `bytes` para quem monta o
// ZIP à mão (LOA) e `dataUrl` para o pptxgenjs (MÉTRICAS).
let cache = null;
export function imagensModelo() {
  if (!cache) {
    cache = Promise.all([bytesDe(capaImg), bytesDe(brasaoImg)]).then(([capa, brasao]) => ({
      capa: { bytes: capa, dataUrl: `data:image/jpeg;base64,${paraBase64(capa)}` },
      brasao: { bytes: brasao, dataUrl: `data:image/png;base64,${paraBase64(brasao)}` },
    }));
    cache.catch(() => { cache = null; });
  }
  return cache;
}
