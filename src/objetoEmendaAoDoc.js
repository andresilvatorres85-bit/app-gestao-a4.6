// Gera o documento "Necessidade de ajuste de emenda parlamentar (AO)" para o
// tipo de ajuste "Mudança de Ação Orçamentária (AO)". Segue o mesmo formato do
// modelo em anexo, porém com TODO o texto em fonte preta (o modelo original
// destaca em vermelho os campos variáveis; aqui sai tudo em preto).
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
  const pref = cargoCurto(d.cargo);
  const nome = (d.parlamentar || "").trim();
  return [pref, nome].filter(Boolean).join(" ").trim() || "—";
}

// Um item numerado "n. Rótulo: valor" (rótulo em negrito, valor normal).
function itemNum(n, rotulo, valor) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${n}. `, bold: true, color: PRETO, size: 24 }),
      new TextRun({ text: `${rotulo}: `, bold: true, color: PRETO, size: 24 }),
      new TextRun({ text: valor || "—", color: PRETO, size: 24 }),
    ],
  });
}

function paraSimples(runs, opts = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: runs, ...opts });
}
function run(text, opts = {}) {
  return new TextRun({ text: text ?? "", color: PRETO, size: 24, ...opts });
}

const SEM_BORDA = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDA = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

function celula(texto, { bold = false, span = 1, largura } = {}) {
  return new TableCell({
    columnSpan: span,
    verticalAlign: VerticalAlign.CENTER,
    width: largura ? { size: largura, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: texto ?? "", bold, color: PRETO, size: 24 })],
    })],
  });
}

// Tabela VALOR | PROGRAMÁTICA (Função/Subfunção/Programa/Ação/Subtítulo).
function tabelaProgramatica(valor, prog) {
  const bordas = { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: bordas,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula("VALOR", { bold: true, largura: 28 }),
          celula("PROGRAMÁTICA", { bold: true, span: 5, largura: 72 }),
        ],
      }),
      new TableRow({
        children: [
          celula(valor, { largura: 28 }),
          celula(prog.funcao),
          celula(prog.subfuncao),
          celula(prog.programa),
          celula(prog.acao),
          celula(prog.subtitulo),
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
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: "Necessidade de ajuste de emenda parlamentar (AO)", bold: true, color: PRETO, size: 28 })],
        }),
        itemNum(1, "Parlamentar", nomeParlamentar(d)),
        itemNum(2, "Número da emenda", (d.emenda || "").trim()),
        itemNum(3, "Objeto", (d.aoObjeto || "").trim()),
        itemNum(4, "Beneficiário", beneficiario),
        itemNum(5, "Incorreção", (d.aoIncorrecao || "").trim()),
        paraSimples([run("6. ", { bold: true }), run("Ações necessárias:", { bold: true })]),
        paraSimples([run("Janela: ", { bold: true }), run((d.aoJanela || "").trim() || "—")]),
        paraSimples([run("Alterações a serem realizadas no SIOP:")]),
        paraSimples([run("1) De", { bold: true })]),
        tabelaProgramatica(valor, de),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
        paraSimples([run("2) Para", { bold: true })]),
        tabelaProgramatica(valor, para),
      ],
    }],
  });
}

export async function gerarDocAoBlob(d) {
  const doc = montarDocAo(d);
  return Packer.toBlob(doc);
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
