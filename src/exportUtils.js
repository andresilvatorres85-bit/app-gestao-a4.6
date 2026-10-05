import { ESP_LABEL, PAPEL_LABEL_CURTO, MESES } from "./constants.js";
import { MODELO, GEO, CAPA_TITULO, CAPA_SUFIXO, tamanhoTitulo, imagensModelo } from "./pptxModelo.js";

// pptxgenjs, jszip e html-to-image são pesados e só usados na exportação;
// carregamos sob demanda (dynamic import) para não pesar o app.
async function getPptx() {
  const mod = await import("pptxgenjs");
  return mod.default;
}
async function getToPng() {
  const mod = await import("html-to-image");
  return mod.toPng;
}

// Identidade visual da apresentação "Métricas A4.6" (ver pptxModelo.js):
// faixa verde com o título, brasão, fundo verde-claro e gráficos em azul com
// gradiente.
const { W, H } = GEO;
const REF = {
  barra: MODELO.barra,
  fundo: MODELO.fundo,
  titulo: MODELO.titulo,
  azul: "4472C4",
  grade: "D9D9D9",
  cinza: "595959",
  rotulo: "404040",
  preto: "000000",
  esq: "FF0000", dir: "0432FF", cen: "FFD966",
  card: "1E2A23", cardBorda: "3B7C53", cardRotulo: "9BA89E",
};
const FONTE = MODELO.fonte;
const CORES_ANOS = [REF.azul, "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];

function rotuloAnos(anos) {
  return [...anos].sort((a, b) => a - b).join(" · ");
}

function novaApresentacao(pptxgen) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "A4.6 - Subassessoria de Orçamento";
  pptx.title = "Métricas A4.6";
  pptx.theme = { headFontFace: FONTE, bodyFontFace: FONTE };
  return pptx;
}

// Slide de conteúdo: fundo verde-claro, faixa verde com o título e brasão.
function slideBase(pptx, titulo, brasao) {
  const s = pptx.addSlide();
  s.background = { color: REF.fundo };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: GEO.barra.y, w: W, h: GEO.barra.h, fill: { color: REF.barra }, line: { color: REF.barra, width: 0 } });
  s.addText(titulo, {
    // largura total, como no modelo (títulos longos passam sob o brasão)
    x: GEO.tituloX, y: GEO.barra.y, w: W - GEO.tituloX, h: GEO.barra.h, margin: 0, valign: "middle",
    fontFace: FONTE, fontSize: tamanhoTitulo(titulo), color: REF.titulo, fit: "shrink", isTextBox: true,
  });
  const b = GEO.brasao;
  s.addImage({ data: brasao, x: b.x, y: b.y, w: b.lado, h: b.lado, altText: "Brasão da Assessoria Parlamentar" });
  return s;
}

// Slide 1 (capa) do modelo: faixa com o título e a imagem institucional.
function slideCapa(pptx, capa, brasao) {
  const c = GEO.capa;
  const s = pptx.addSlide();
  s.background = { color: "FFFFFF" };
  s.addImage({ data: capa, x: 0, y: c.imagem.y, w: W, h: c.imagem.h, altText: "Congresso Nacional e a Subassessoria de Orçamento" });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: c.barra.y, w: W, h: c.barra.h, fill: { color: REF.barra }, line: { color: REF.barra, width: 0 } });
  s.addText([
    { text: CAPA_TITULO, options: { fontSize: 36 } },
    { text: CAPA_SUFIXO, options: { fontSize: 32 } },
  ], { x: GEO.tituloX, y: c.barra.y, w: 11.7, h: c.barra.h, margin: 0, valign: "middle", fontFace: FONTE, color: REF.titulo, isTextBox: true });
  s.addImage({ data: brasao, x: c.brasao.x, y: c.brasao.y, w: c.brasao.lado, h: c.brasao.lado, altText: "Brasão da Assessoria Parlamentar" });
  return s;
}

// Opções comuns dos gráficos, no padrão do modelo: rótulos 20pt, categorias
// em negrito, grade cinza-clara, sem legenda (exceto séries por ano).
function estilo(o = {}) {
  return {
    x: o.x, y: o.y, w: o.w, h: o.h,
    barDir: o.horizontal ? "bar" : "col",
    barGrouping: "clustered",
    barGapWidthPct: o.gap ?? 115,
    chartColors: o.cores || [REF.azul],
    showTitle: !!o.titulo, title: o.titulo, titleFontSize: o.tituloTam || 24,
    titleBold: true, titleColor: REF.preto, titleFontFace: FONTE,
    showLegend: !!o.legenda, legendPos: "b", legendFontSize: 16, legendFontFace: FONTE,
    catAxisLabelFontSize: 20, catAxisLabelFontBold: true, catAxisLabelFontFace: FONTE,
    catAxisLabelColor: o.corEixo || REF.preto,
    catAxisLineShow: true, catAxisLineColor: REF.grade,
    catAxisMajorTickMark: "none",
    valAxisLabelFontSize: o.valTam || 20, valAxisLabelFontBold: o.valNegrito ?? true, valAxisLabelFontFace: FONTE,
    valAxisLabelColor: o.corVal || o.corEixo || REF.preto,
    valAxisLineShow: false, valAxisMajorTickMark: "none", valAxisMinVal: 0,
    valGridLine: { color: REF.grade, size: 0.75 }, catGridLine: { style: "none" },
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 20, dataLabelFontFace: FONTE,
    dataLabelColor: o.corRotulo || REF.preto, dataLabelFormatCode: o.formatoRotulo || "#,##0",
  };
}

// ---- Construtores de dados para cada gráfico, a partir dos registros filtrados ----

// `meses` (opcional): números dos meses a exibir; padrão = Jan–Dez.
export function dadosEvolucaoMensal(registros, anos, meses) {
  const anosOrd = [...anos].sort((a, b) => a - b);
  const nums = meses && meses.length ? meses : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const labels = nums.map(m => MESES[m]);
  const series = anosOrd.map(ano => ({
    name: String(ano),
    labels,
    values: nums.map(m => registros.filter(r => r.y === ano && r.m === m).length),
  }));
  return { labels, series };
}

export function dadosPorFuncao(registros) {
  const ordem = ["S", "AS", "D", "AD", "C", "AE"];
  const labels = ordem.map(c => PAPEL_LABEL_CURTO[c]);
  const values = ordem.map(c => registros.filter(r => r.role === c).length);
  return { labels, values };
}

export function dadosPorEspectro(registros) {
  const ordem = ["E", "D", "C"];
  const labels = ordem.map(c => ESP_LABEL[c]);
  const values = ordem.map(c => registros.filter(r => r.esp === c).length);
  return { labels, values, cores: [REF.esq, REF.dir, REF.cen] };
}

export function dadosTopGabinetes(registros, n = 10) {
  const cont = {};
  for (const r of registros) {
    const chave = r.n || "—";
    cont[chave] = (cont[chave] || 0) + 1;
  }
  const ord = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, n);
  return { labels: ord.map(x => x[0]), values: ord.map(x => x[1]) };
}

export function dadosTopPartidos(registros, n = 10) {
  const cont = {};
  for (const r of registros) {
    if (!r.p) continue;
    cont[r.p] = (cont[r.p] || 0) + 1;
  }
  const ord = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, n);
  return { labels: ord.map(x => x[0]), values: ord.map(x => x[1]) };
}

// ---- Gráficos nativos no padrão do modelo ----

function graficoEvolucao(pptx, slide, { series }, pos) {
  const data = series.map(s => ({ name: s.name, labels: s.labels, values: s.values }));
  slide.addChart(pptx.ChartType.bar, data, estilo({
    // uma cor por ano (com um só ano, todas as barras em azul); meses sem
    // contatos ficam sem rótulo, como no modelo.
    ...pos, gap: 100, cores: CORES_ANOS.slice(0, Math.max(series.length, 1)), legenda: series.length > 1,
    corEixo: REF.cinza, corRotulo: REF.rotulo, formatoRotulo: '#,##0;;""',
  }));
}

function graficoSimples(pptx, slide, { labels, values, cores }, pos, extra = {}) {
  slide.addChart(pptx.ChartType.bar, [{ name: "Contatos", labels, values }], estilo({ ...pos, cores, ...extra }));
}

// Cartão escuro de destaque (número + rótulo), como no slide de totais.
function cartaoTotal(pptx, slide, x, y, valor, rotulo) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.919, h: 0.9, rectRadius: 0.07,
    fill: { color: REF.card }, line: { color: REF.cardBorda, width: 1 },
  });
  slide.addText(String(valor), {
    x, y: y - 0.133, w: 1.919, h: 0.7, align: "center", valign: "middle",
    fontFace: "Georgia", fontSize: 30, bold: true, color: "FFFFFF", isTextBox: true,
  });
  slide.addText(rotulo, {
    x: x - 0.25, y: y + 0.455, w: 2.4, h: 0.4, align: "center", valign: "middle",
    fontSize: 11, color: REF.cardRotulo, isTextBox: true,
  });
}

// ---- Alterações em emendas parlamentares ----

const AJUSTE_AO = "Mudança de Ação Orçamentária (AO)";
const AJUSTE_GND = "Mudança de GND";
const tiposDoAjuste = (s) => String(s || "").split(/\s*;\s*/).map(t => t.trim()).filter(Boolean);

// Texto da coluna "Alterações" (mesma regra da tabela do Painel).
function textoAlteracao(it) {
  const tipos = tiposDoAjuste(it.ajuste);
  const ao = it.aoDados || {};
  if (tipos.includes(AJUSTE_AO) && ((ao.aoDeAcao || "").trim() || (ao.aoParaAcao || "").trim())) {
    return `De “Ação Orçamentária ${(ao.aoDeAcao || "").trim() || "—"}” para “Ação Orçamentária ${(ao.aoParaAcao || "").trim() || "—"}”`;
  }
  if (tipos.includes(AJUSTE_GND) && ((ao.gndDe || "").trim() || (ao.gndPara || "").trim() || (ao.aoValor || "").trim())) {
    const v = (ao.aoValor || "").trim() || "—";
    return `De “${v} em GND${(ao.gndDe || "").trim() || "—"}” para “${v} em GND${(ao.gndPara || "").trim() || "—"}”.`;
  }
  const de = (it.objetoDe || "").trim(), para = (it.objetoPara || "").trim();
  if (de && para) return `De “${de}” para “${para}”.`;
  return para ? `Para “${para}”.` : de ? `De “${de}”.` : "—";
}

const fmtData = (it) => (it.dia && it.mes && it.ano)
  ? `${String(it.dia).padStart(2, "0")}/${String(it.mes).padStart(2, "0")}/${it.ano}` : "—";
const cortar = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

// Cartão de uma alteração (grade 3 × 2 → 6 por slide).
function cartaoAlteracao(pptx, slide, it, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08, fill: { color: "FFFFFF" }, line: { color: "C5DDB5", width: 0.75 },
    shadow: { type: "outer", blur: 4, offset: 1.5, angle: 90, color: "000000", opacity: 0.18 },
  });
  const ix = x + 0.16, iw = w - 0.32;
  slide.addText(it.parlamentar || "—", {
    x: ix, y: y + 0.12, w: iw - 1.15, h: 0.36, margin: 0, valign: "middle",
    fontSize: 16, bold: true, color: REF.titulo, fit: "shrink", isTextBox: true,
  });
  slide.addText(fmtData(it), {
    x: ix + iw - 1.15, y: y + 0.12, w: 1.15, h: 0.36, margin: 0, align: "right", valign: "middle",
    fontSize: 12, color: REF.cinza, isTextBox: true,
  });
  const partUf = [it.partido, it.uf].filter(Boolean).join("/");
  slide.addText([
    { text: partUf ? `${partUf}  ·  ` : "", options: { color: REF.cinza } },
    { text: "Emenda ", options: { color: REF.cinza } },
    { text: it.emenda || "—", options: { bold: true, color: REF.rotulo } },
  ], { x: ix, y: y + 0.5, w: iw, h: 0.28, margin: 0, valign: "middle", fontSize: 12, isTextBox: true });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: ix, y: y + 0.86, w: iw, h: 0.34, rectRadius: 0.06, fill: { color: "DEEAF6" }, line: { color: "DEEAF6", width: 0 },
  });
  slide.addText(cortar(tiposDoAjuste(it.ajuste).join(" · ") || "Ajuste não informado", 70), {
    x: ix + 0.1, y: y + 0.86, w: iw - 0.2, h: 0.34, margin: 0, valign: "middle",
    fontSize: 11, bold: true, color: "2F5597", fit: "shrink", isTextBox: true,
  });
  slide.addText(cortar(textoAlteracao(it), 300), {
    x: ix, y: y + 1.3, w: iw, h: h - 1.42, margin: 0, valign: "top",
    fontSize: 12, color: "262626", fit: "shrink", paraSpaceAfter: 0, isTextBox: true,
  });
}

function slidesAlteracoes(pptx, alteracoes, brasao) {
  const titulo = "5. Alterações em emendas parlamentares";
  const ord = [...alteracoes].sort((a, b) =>
    ((b.ano || 0) * 10000 + (b.mes || 0) * 100 + (b.dia || 0)) - ((a.ano || 0) * 10000 + (a.mes || 0) * 100 + (a.dia || 0)));
  if (!ord.length) {
    const s = slideBase(pptx, titulo, brasao);
    s.addText("Nenhuma alteração em emenda parlamentar registrada no período selecionado.", {
      x: 1, y: 3.2, w: W - 2, h: 0.8, align: "center", valign: "middle", fontSize: 20, color: REF.cinza, isTextBox: true,
    });
    return;
  }
  const POR_SLIDE = 6, cols = 3, gap = 0.3;
  const x0 = 0.5, y0 = 1.25, larg = W - 2 * x0, alt = H - y0 - 0.35;
  const w = (larg - gap * (cols - 1)) / cols, h = (alt - gap) / 2;
  const paginas = Math.ceil(ord.length / POR_SLIDE);
  for (let p = 0; p < paginas; p++) {
    const s = slideBase(pptx, paginas > 1 ? `${titulo} (${p + 1}/${paginas})` : titulo, brasao);
    ord.slice(p * POR_SLIDE, (p + 1) * POR_SLIDE).forEach((it, i) => {
      const c = i % cols, l = Math.floor(i / cols);
      cartaoAlteracao(pptx, s, it, x0 + c * (w + gap), y0 + l * (h + gap), w, h);
    });
  }
}

// pptxgenjs não gera preenchimento em gradiente: substitui o preenchimento
// sólido azul das séries pelo gradiente + sombra do modelo.
const GRADIENTE_AZUL =
  '<a:gradFill rotWithShape="1"><a:gsLst>' +
  '<a:gs pos="0"><a:srgbClr val="4472C4"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:srgbClr></a:gs>' +
  '<a:gs pos="50000"><a:srgbClr val="4472C4"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:srgbClr></a:gs>' +
  '<a:gs pos="100000"><a:srgbClr val="4472C4"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:srgbClr></a:gs>' +
  '</a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>';

async function aplicarGradiente(buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const graficos = Object.keys(zip.files).filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  for (const nome of graficos) {
    const xml = await zip.file(nome).async("string");
    const novo = xml.replace(/(<c:ser>[\s\S]*?<c:spPr>\s*)<a:solidFill>\s*<a:srgbClr val="4472C4"\s*(?:\/>|>[\s\S]*?<\/a:srgbClr>)\s*<\/a:solidFill>/g,
      (_, ini) => ini + GRADIENTE_AZUL);
    if (novo !== xml) zip.file(nome, novo);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

async function salvar(pptx, nomeArquivo) {
  const buf = await pptx.write({ outputType: "arraybuffer" });
  const blob = await aplicarGradiente(buf);
  if (typeof document === "undefined") return blob;  // uso fora do navegador (testes)
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return blob;
}

// ---- Exportação do PAINEL inteiro ----

export async function exportarPainelPptx({ registros, anos, meses, resumo, alteracoes = [] }) {
  const pptxgen = await getPptx();
  const img = await imagensModelo();
  const brasao = img.brasao.dataUrl;
  const pptx = novaApresentacao(pptxgen);

  // Slide 1 — capa do modelo.
  slideCapa(pptx, img.capa.dataUrl, brasao);

  // Slide 2 — totais e evolução mensal. Sem filtro de mês, vai de Jan até o
  // último mês com registros (como no modelo).
  let nums = meses && meses.length && meses.length < 12 ? [...meses].sort((a, b) => a - b) : null;
  if (!nums) {
    const ultimo = registros.reduce((m, r) => Math.max(m, r.m || 0), 0) || 12;
    nums = Array.from({ length: ultimo }, (_, i) => i + 1);
  }
  const s2 = slideBase(pptx, "5. Total de contatos/visitas da A4.6", brasao);
  cartaoTotal(pptx, s2, 4.267, 0.758, resumo.totalPeriodo, "Total no período");
  cartaoTotal(pptx, s2, 7.044, 0.763, resumo.totalMes, "Contatos no mês atual");
  graficoEvolucao(pptx, s2, dadosEvolucaoMensal(registros, anos, nums), { x: 0.5, y: 1.741, w: 12.184, h: 5.27 });

  // Slide 3 — por tipo (função) e por espectro.
  const s3 = slideBase(pptx, "5. Total de contatos por tipo e espectro político", brasao);
  graficoSimples(pptx, s3, dadosPorFuncao(registros), { x: 0.77, y: 1.546, w: 5.128, h: 5.343 },
    { horizontal: true, titulo: "Total de contatos por tipo", tituloTam: 24 });
  graficoSimples(pptx, s3, dadosPorEspectro(registros), { x: 7.348, y: 1.546, w: 5.356, h: 5.362 },
    { titulo: "Total de contatos por espectro", tituloTam: 21, gap: 60 });

  // Slide 4 — 10 mais visitados/contatados.
  const s4 = slideBase(pptx, "5. Total de contatos/visitas da A4.6", brasao);
  graficoSimples(pptx, s4, dadosTopGabinetes(registros), { x: 0.398, y: 1.15, w: 12.668, h: 6.057 },
    { horizontal: true, valTam: 16, valNegrito: false, corVal: REF.cinza });

  // Slide 5 — 10 partidos/consultorias/comissões.
  const s5 = slideBase(pptx, "5. Total de contatos por partido/consultoria/comissão", brasao);
  graficoSimples(pptx, s5, dadosTopPartidos(registros), { x: 0.505, y: 1.15, w: 12.179, h: 5.829 },
    { horizontal: true, valTam: 16, valNegrito: false, corVal: REF.cinza });

  // Slides 6+ — alterações em emendas parlamentares (6 por slide).
  slidesAlteracoes(pptx, alteracoes, brasao);

  return salvar(pptx, `Metricas_A4-6_${rotuloAnos(anos)}.pptx`);
}

// ---- Exportação só das alterações em emendas (botão do card no Painel) ----

export async function exportarAlteracoesPptx(alteracoes) {
  const pptxgen = await getPptx();
  const img = await imagensModelo();
  const pptx = novaApresentacao(pptxgen);
  slideCapa(pptx, img.capa.dataUrl, img.brasao.dataUrl);
  slidesAlteracoes(pptx, alteracoes, img.brasao.dataUrl);
  return salvar(pptx, "Alteracoes_em_emendas_A4-6.pptx");
}

// ---- Exportação de UM gráfico individual em PPTX (nativo, mesmo modelo) ----

export async function exportarGraficoPptx({ tipo, titulo, dados }) {
  const pptxgen = await getPptx();
  const img = await imagensModelo();
  const brasao = img.brasao.dataUrl;
  const pptx = novaApresentacao(pptxgen);
  slideCapa(pptx, img.capa.dataUrl, brasao);
  const slide = slideBase(pptx, `5. ${titulo}`, brasao);
  const pos = { x: 0.5, y: 1.25, w: 12.33, h: 5.9 };

  if (tipo === "evolucao") {
    graficoEvolucao(pptx, slide, dados, pos);
  } else if (tipo === "espectro") {
    graficoSimples(pptx, slide, dados, pos, { gap: 60 });
  } else if (tipo === "funcao") {
    graficoSimples(pptx, slide, dados, pos, { horizontal: true });
  } else {
    // top gabinetes / top partidos
    graficoSimples(pptx, slide, dados, pos, { horizontal: true, valTam: 16, valNegrito: false, corVal: REF.cinza });
  }

  const nome = titulo.replace(/[^\w]+/g, "_");
  return salvar(pptx, `${nome}_A4-6.pptx`);
}

// ---- Exportação de UM gráfico como PNG (captura do elemento renderizado) ----

export async function exportarGraficoPng(elemento, nomeArquivo) {
  if (!elemento) return;
  const toPng = await getToPng();
  // Esconde os controles (.no-export) com CSS ANTES da captura, para o layout
  // se recompor sem eles — só filtrá-los na clonagem deixaria buracos, porque
  // as alturas copiadas são as da tela com os botões.
  elemento.classList.add("exportando-png");
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const dataUrl = await toPng(elemento, {
      backgroundColor: "#0f1713",
      pixelRatio: 2,
      filter: (node) => !(node.classList && node.classList.contains("no-export")),
    });
    const link = document.createElement("a");
    link.download = `${nomeArquivo}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    elemento.classList.remove("exportando-png");
  }
}
