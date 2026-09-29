// Gera os documentos de "Necessidade de ajuste de emenda parlamentar" para os
// tipos de ajuste "Mudança de Ação Orçamentária (AO)" e "Mudança de GND".
// Ambos seguem o formato dos modelos em anexo — inclusive os recuos e a
// numeração (itens 1–6; sob o item 6, os subitens a./b. e, mais recuados,
// 1) De e 2) Para com as tabelas) — porém com TODO o texto em fonte preta.
// A única diferença entre eles é a(s) tabela(s): AO usa VALOR | PROGRAMÁTICA
// (Função/Subfunção/Programa/Ação/Subtítulo); GND usa VALOR | GND.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlign,
} from "docx";

const PRETO = "000000";

function cargoCurto(cargo) {
  const c = (cargo || "").toLowerCase();
  if (c.startsWith("deputada")) return "Deputada";
  if (c.startsWith("deputado")) return "Deputado";
  if (c.startsWith("senadora")) return "Senadora";
  if (c.startsWith("senador")) return "Senador";
  return "";
}
function nomeParlamentar(d) {
  return [cargoCurto(d.cargo), (d.parlamentar || "").trim()].filter(Boolean).join(" ").trim() || "—";
}

function run(text, opts = {}) {
  return new TextRun({ text: text ?? "", color: PRETO, size: 24, ...opts });
}

function itemNum(n, rotulo, valor) {
  return new Paragraph({
    spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED,
    children: [run(`${n}. `, { bold: true }), run(`${rotulo}: `, { bold: true }), run(valor || "—")],
  });
}

function subItem(marcador, runs, left) {
  return new Paragraph({
    spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED,
    indent: { left, hanging: 360 },
    children: [run(`${marcador} `), ...runs],
  });
}

const BORDA = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

function celula(texto, { bold = false, span = 1, largura } = {}) {
  return new TableCell({
    columnSpan: span,
    verticalAlign: VerticalAlign.CENTER,
    width: largura ? { size: largura, type: WidthType.DXA } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: texto ?? "", bold, color: PRETO, size: 24 })],
    })],
  });
}

function tabelaBase(colunas, cabecalho, dados) {
  const bordas = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA };
  return new Table({
    columnWidths: colunas,
    width: { size: colunas.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    indent: { size: 1080, type: WidthType.DXA },
    borders: bordas,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho }),
      new TableRow({ children: dados }),
    ],
  });
}

// AO: VALOR | PROGRAMÁTICA (Função/Subfunção/Programa/Ação/Subtítulo).
function tabelaProgramatica(valor, prog) {
  const W_VALOR = 2200, W_COD = 1000;
  return tabelaBase(
    [W_VALOR, W_COD, W_COD, W_COD, W_COD, W_COD],
    [celula("VALOR", { bold: true, largura: W_VALOR }), celula("PROGRAMÁTICA", { bold: true, span: 5, largura: W_COD * 5 })],
    [celula(valor, { largura: W_VALOR }), celula(prog.funcao), celula(prog.subfuncao), celula(prog.programa), celula(prog.acao), celula(prog.subtitulo)],
  );
}

// GND: VALOR | GND.
function tabelaGnd(valor, gnd) {
  const W_VALOR = 2200, W_GND = 1600;
  return tabelaBase(
    [W_VALOR, W_GND],
    [celula("VALOR", { bold: true, largura: W_VALOR }), celula("GND", { bold: true, largura: W_GND })],
    [celula(valor, { largura: W_VALOR }), celula(gnd)],
  );
}

// Corpo comum dos dois documentos. `sufixo` = "AO" | "GND"; `tabelaDe`/`tabelaPara`
// são as tabelas específicas de cada tipo.
function montarDoc(d, sufixo, tabelaDe, tabelaPara) {
  const beneficiario = [
    (d.aoOrgaoBenef || "Comando do Exército").trim(),
    d.aoCnpj ? `(CNPJ: ${d.aoCnpj.trim()})` : "",
    d.aoOm ? `– ${d.aoOm.trim()}` : "",
  ].filter(Boolean).join(" ");

  return new Document({
    styles: { default: { document: { run: { font: "Calibri", color: PRETO } } } },
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 240 },
          children: [new TextRun({ text: `Necessidade de ajuste de emenda parlamentar (${sufixo})`, bold: true, color: PRETO, size: 28 })],
        }),
        itemNum(1, "Parlamentar", nomeParlamentar(d)),
        itemNum(2, "Número da emenda", (d.emenda || "").trim()),
        itemNum(3, "Objeto", (d.aoObjeto || "").trim()),
        itemNum(4, "Beneficiário", beneficiario),
        itemNum(5, "Incorreção", (d.aoIncorrecao || "").trim()),
        new Paragraph({
          spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED,
          children: [run("6. ", { bold: true }), run("Ações necessárias:", { bold: true })],
        }),
        subItem("a.", [run("Janela: ", { bold: true }), run((d.aoJanela || "").trim() || "—")], 720),
        subItem("b.", [run("Alterações a serem realizadas no SIOP:")], 720),
        subItem("1)", [run("De", { bold: true })], 1080),
        tabelaDe,
        new Paragraph({ spacing: { after: 120 }, children: [] }),
        subItem("2)", [run("Para", { bold: true })], 1080),
        tabelaPara,
      ],
    }],
  });
}

export function montarDocAo(d) {
  const valor = (d.aoValor || "").trim() || "—";
  const de = { funcao: d.aoDeFuncao, subfuncao: d.aoDeSubfuncao, programa: d.aoDePrograma, acao: d.aoDeAcao, subtitulo: d.aoDeSubtitulo };
  const para = { funcao: d.aoParaFuncao, subfuncao: d.aoParaSubfuncao, programa: d.aoParaPrograma, acao: d.aoParaAcao, subtitulo: d.aoParaSubtitulo };
  return montarDoc(d, "AO", tabelaProgramatica(valor, de), tabelaProgramatica(valor, para));
}

export function montarDocGnd(d) {
  const valor = (d.aoValor || "").trim() || "—";
  return montarDoc(d, "GND", tabelaGnd(valor, (d.gndDe || "").trim() || "—"), tabelaGnd(valor, (d.gndPara || "").trim() || "—"));
}

function baixar(blob, prefixo, d) {
  const slug = (d.parlamentar || "parlamentar")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "parlamentar";
  const nome = `${prefixo}_${(d.emenda || "").trim() || "SN"}_${slug}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function baixarDocAo(d) {
  baixar(await Packer.toBlob(montarDocAo(d)), "Ajuste_AO", d);
}
export async function baixarDocGnd(d) {
  baixar(await Packer.toBlob(montarDocGnd(d)), "Ajuste_GND", d);
}
