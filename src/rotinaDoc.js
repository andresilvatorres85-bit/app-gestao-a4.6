// Exporta um card da "Rotina Asse Orç" (CONHECIMENTO) em DOCX: título na cor
// do card, data de emissão e as tarefas como lista com marcadores, um nível de
// recuo por subtarefa. URLs no texto viram hiperlinks clicáveis.
import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, AlignmentType, LevelFormat,
} from "docx";

const FONTE = "Calibri";
const NIVEIS = 9; // o Word aceita até 9 níveis de lista

function runsComLinks(texto) {
  return String(texto || "").split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((p) =>
    /^https?:\/\//.test(p)
      ? new ExternalHyperlink({ link: p, children: [new TextRun({ text: p, style: "Hyperlink", font: FONTE, size: 22 })] })
      : new TextRun({ text: p, font: FONTE, size: 22 })
  );
}

// Percorre a árvore (tarefas e subtarefas em qualquer profundidade), na ordem
// da tela, gerando um parágrafo de lista por item.
function paragrafos(itens, card) {
  const filhosDe = (pid) => itens
    .filter((i) => i.card === card && (i.parentId || null) === pid)
    .sort((a, b) => a.pos - b.pos);
  const out = [];
  const visitar = (pid, nivel) => {
    for (const it of filhosDe(pid)) {
      out.push(new Paragraph({
        numbering: { reference: "rotina", level: Math.min(nivel, NIVEIS - 1) },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 60 },
        children: runsComLinks(it.texto),
      }));
      visitar(it.id, nivel + 1);
    }
  };
  visitar(null, 0);
  return out;
}

const MARCADORES = ["●", "○", "■", "●", "○", "■", "●", "○", "■"];

export async function exportarCardDocx({ card, itens }) {
  const cor = String(card.cor || "#1F3864").replace("#", "").toUpperCase();
  const corpo = paragrafos(itens, card.id);
  const doc = new Document({
    creator: "A4.6 - Subassessoria de Orçamento",
    title: card.titulo,
    numbering: {
      config: [{
        reference: "rotina",
        levels: MARCADORES.map((m, n) => ({
          level: n, format: LevelFormat.BULLET, text: m, alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360 + n * 360, hanging: 260 } } },
        })),
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: [
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: "Rotina do Assessor de Orçamento · A4.6", font: FONTE, size: 18, color: "6B7568" })],
        }),
        new Paragraph({
          spacing: { after: 80 },
          border: { bottom: { style: "single", size: 12, color: cor, space: 4 } },
          children: [new TextRun({ text: card.titulo, font: FONTE, size: 32, bold: true, color: cor })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [new TextRun({ text: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`, font: FONTE, size: 18, color: "6B7568" })],
        }),
        ...(corpo.length ? corpo : [new Paragraph({
          children: [new TextRun({ text: "Nenhuma tarefa cadastrada.", font: FONTE, size: 22, italics: true, color: "6B7568" })],
        })]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const nome = `Rotina_${card.titulo}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  if (typeof document === "undefined") return blob; // testes fora do navegador
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nome}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return blob;
}
