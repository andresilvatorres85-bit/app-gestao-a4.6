// Gera o documento "Necessidade de ajuste de emenda parlamentar (AO)" para o
// tipo de ajuste "Mudança de Ação Orçamentária (AO)". Segue o formato do modelo
// em anexo — inclusive os recuos e a numeração (itens 1–6; sob o item 6, os
// subitens a./b. e, mais recuados, 1) De e 2) Para com as tabelas) — porém com
// TODO o texto em fonte preta.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, VerticalAlign,
} from "docx";

const PRETO = "000000";

// Cargo curto para o nome do parlamentar (Deputado Federal → Deputado).
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

// Item numerado "n. Rótulo: valor" no nível da margem (itens 1 a 6).
function itemNum(n, rotulo, valor) {
  return new Paragraph({
    spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED,
    children: [
      run(`${n}. `, { bold: true }),
      run(`${rotulo}: `, { bold: true }),
      run(valor || "—"),
    ],
  });
}

// Subitem recuado com marcador manual ("a.", "b.", "1)", "2)") e recuo pendente.
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

// Tabela VALOR | PROGRAMÁTICA (Função/Subfunção/Programa/Ação/Subtítulo),
// recuada para acompanhar o subitem "1) De" / "2) Para".
function tabelaProgramatica(valor, prog) {
  const bordas = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA };
  const W_VALOR = 2200, W_COD = 1000;
  return new Table({
    columnWidths: [W_VALOR, W_COD, W_COD, W_COD, W_COD, W_COD],
    width: { size: W_VALOR + W_COD * 5, type: WidthType.DXA },
    indent: { size: 1080, type: WidthType.DXA },
    borders: bordas,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula("VALOR", { bold: true, largura: W_VALOR }),
          celula("PROGRAMÁTICA", { bold: true, span: 5, largura: W_COD * 5 }),
        ],
      }),
      new TableRow({
        children: [
          celula(valor, { largura: W_VALOR }),
          celula(prog.funcao), celula(prog.subfuncao), celula(prog.programa),
          celula(prog.acao), celula(prog.subtitulo),
        ],
      }),
    ],
  });
}

export function montarDocAo(d) {
  const beneficiario = [
    (d.aoOrgaoBenef || "Comando do Exército").trim(),
    d.aoCnpj ? `(CNPJ: ${d.aoCnpj.trim()})` : "",
    d.aoOm ? `– ${d.aoOm.trim()}` : "",
  ].filter(Boolean).join(" ");

  const valor = (d.aoValor || "").trim() || "—";
  const de = { funcao: d.aoDeFuncao, subfuncao: d.aoDeSubfuncao, programa: d.aoDePrograma, acao: d.aoDeAcao, subtitulo: d.aoDeSubtitulo };
  const para = { funcao: d.aoParaFuncao, subfuncao: d.aoParaSubfuncao, programa: d.aoParaPrograma, acao: d.aoParaAcao, subtitulo: d.aoParaSubtitulo };

  return new Document({
    styles: { default: { document: { run: { font: "Calibri", color: PRETO } } } },
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 240 },
          children: [new TextRun({ text: "Necessidade de ajuste de emenda parlamentar (AO)", bold: true, color: PRETO, size: 28 })],
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
        tabelaProgramatica(valor, de),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
        subItem("2)", [run("Para", { bold: true })], 1080),
        tabelaProgramatica(valor, para),
      ],
    }],
  });
}

export async function gerarDocAoBlob(d) {
  return Packer.toBlob(montarDocAo(d));
}

export async function baixarDocAo(d) {
  const blob = await gerarDocAoBlob(d);
  const slug = (d.parlamentar || "parlamentar")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "parlamentar";
  const nome = `Ajuste_AO_${(d.emenda || "").trim() || "SN"}_${slug}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
