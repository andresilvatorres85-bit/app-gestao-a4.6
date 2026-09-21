import { jsPDF } from "jspdf";
import "jspdf-autotable"; // registra doc.autoTable(...)
import { valorTotal, moeda } from "./lexorUtils.js";
import { ACOES_LEXOR } from "./data/lexor.js";

// Título centralizado conforme o filtro de situação selecionado.
const TITULOS = {
  prospectada: "PROJETOS PROSPECTADOS",
  nao_prospectada: "PROJETOS NÃO PROSPECTADOS",
  pendencia: "PROJETOS COM PENDÊNCIA",
  Todas: "PROJETOS",
};

const VERDE = [78, 154, 107];
const CINZA_CLARO = [235, 240, 236];

function acaoTexto(p) {
  const a = ACOES_LEXOR[p.acao];
  return a?.descricao ? `${p.acao} – ${a.descricao}` : (p.acao || "—");
}
function autorTexto(p) {
  if (!p.parlamentar) return "—";
  return p.partido ? `${p.parlamentar} (${p.partido})` : p.parlamentar;
}
function municipioTexto(p) {
  return [p.cidade, p.uf].filter(Boolean).join(" / ") || "—";
}

// Monta o PDF (paisagem A4) da tabela de projetos filtrados e devolve o doc.
export function construirTabelaLexorPdf(propostas, situacao, { escopo = [], dataGeracao } = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const titulo = TITULOS[situacao] || TITULOS.Todas;

  // Título centralizado.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 30, 25);
  doc.text(titulo, W / 2, 15, { align: "center" });

  // Subtítulo com o recorte (estado/ação/…) e a contagem — ajuda a identificar
  // a tabela sozinha; não cita fonte nem site.
  const subPartes = [...escopo, `${propostas.length} projeto(s)`];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 100, 92);
  doc.text(subPartes.join("  ·  "), W / 2, 21, { align: "center" });

  const body = propostas.map((p, i) => [
    String(i + 1),
    municipioTexto(p),
    p.objeto || "—",
    acaoTexto(p),
    `R$ ${moeda(valorTotal(p))}`,
    autorTexto(p),
  ]);
  const total = propostas.reduce((s, p) => s + valorTotal(p), 0);

  doc.autoTable({
    startY: 25,
    head: [["Nº", "MUNICÍPIO / UF", "OBJETO", "AÇÃO", "VALOR", "AUTOR"]],
    body,
    foot: [[
      { content: "TOTAL", colSpan: 4, styles: { halign: "right" } },
      { content: `R$ ${moeda(total)}`, styles: { halign: "right" } },
      "",
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.6, overflow: "linebreak", valign: "top", lineColor: [200, 210, 202], lineWidth: 0.1, textColor: [30, 40, 34] },
    headStyles: { fillColor: VERDE, textColor: 255, fontStyle: "bold", halign: "center", valign: "middle" },
    footStyles: { fillColor: CINZA_CLARO, textColor: [30, 40, 34], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 249, 246] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 42 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 52 },
      4: { halign: "right", cellWidth: 28 },
      5: { cellWidth: 40 },
    },
    margin: { left: 10, right: 10, bottom: 16 },
  });

  // Rodapé em todas as páginas: só a data de geração (à esquerda) e a paginação.
  const n = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 128, 122);
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.text(`Gerado em ${dataGeracao}`, 10, H - 8);
    doc.text(`Página ${i} de ${n}`, W - 10, H - 8, { align: "right" });
  }
  return doc;
}

// Nome de arquivo por situação: projetos-prospectados-AAAA-MM-DD.pdf
function nomeArquivo(situacao) {
  const slug = { prospectada: "prospectados", nao_prospectada: "nao-prospectados", pendencia: "com-pendencia" }[situacao] || "projetos";
  const hoje = new Date().toISOString().slice(0, 10);
  return `projetos-${slug}-${hoje}.pdf`;
}

// Gera e baixa o PDF no navegador.
export function exportarTabelaLexorPdf(propostas, situacao, { escopo = [] } = {}) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  const doc = construirTabelaLexorPdf(propostas, situacao, { escopo, dataGeracao });
  doc.save(nomeArquivo(situacao));
}
