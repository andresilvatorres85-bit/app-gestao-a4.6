// Relatório diário de Conjuntura (CONHECIMENTO › Conjuntura): estrutura das
// seções e exportação em DOCX e PDF. O conteúdo é gerado por
// scripts/conjuntura.py e lido da tabela `conjuntura_relatorios`.
import {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, AlignmentType, LevelFormat,
} from "docx";
import { jsPDF } from "jspdf";

export const TITULO = "Conjuntura · Orçamento Público Federal";

// Seções na ordem do relatório. `itens` aponta para a chave do conteúdo.
export const SECOES = [
  { titulo: "1. Panorama Geral e Meta Fiscal", itens: "panorama" },
  { titulo: "2. Bloqueios, Contingenciamentos e Alocação de Recursos", itens: "bloqueios" },
  { titulo: "3. A Relação Executivo vs. Congresso / CMO", itens: "congresso" },
  { titulo: "4. Análise Crítica / Tendências do Dia", sub: [
    { titulo: "Pontos de atenção", itens: "atencao" },
    { titulo: "Próximos passos", itens: "proximos_passos" },
  ] },
];

export const dataBR = (iso) => {
  const [a, m, d] = String(iso || "").slice(0, 10).split("-");
  return d ? `${d}/${m}/${a}` : "";
};

// Data e hora em Brasília de um timestamp (o Supabase devolve em UTC).
export const quandoBR = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

export const horaBR = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
};

// Divide o texto nas referências "[n]" → [{ texto } | { ref: n }].
export function partesComRefs(texto) {
  return String(texto || "").split(/(\[\d+\])/g).filter(Boolean).map((p) => {
    const m = p.match(/^\[(\d+)\]$/);
    return m ? { ref: Number(m[1]) } : { texto: p };
  });
}

const lista = (v) => (Array.isArray(v) ? v : []);
const nomeArquivo = (rel, ext) => `Conjuntura_${String(rel.data || "").slice(0, 10)}.${ext}`;

function baixar(blob, nome) {
  if (typeof document === "undefined") return blob; // testes fora do navegador
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return blob;
}

// ===== DOCX =====
const FONTE = "Calibri";
const AZUL = "1F3864";
const CINZA = "6B7568";

const run = (text, extra = {}) => new TextRun({ text, font: FONTE, size: 22, ...extra });

function runsDoItem(texto, fontes) {
  return partesComRefs(texto).map((p) => {
    if (p.texto != null) return run(p.texto);
    const f = fontes.find((x) => x.n === p.ref);
    return f?.url
      ? new ExternalHyperlink({ link: f.url, children: [run(`[${p.ref}]`, { style: "Hyperlink" })] })
      : run(`[${p.ref}]`);
  });
}

const tituloSecao = (text, nivel = 1) => new Paragraph({
  spacing: { before: nivel === 1 ? 280 : 160, after: 100 },
  children: [run(text, { bold: true, size: nivel === 1 ? 26 : 23, color: AZUL })],
});

const marcador = (children) => new Paragraph({
  numbering: { reference: "conj", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 }, children,
});

const vazio = () => new Paragraph({ children: [run("Nenhum item.", { italics: true, color: CINZA })] });

export async function exportarConjunturaDocx(rel) {
  const c = rel.conteudo || {};
  const fontes = lista(c.fontes);
  const itens = (chave) => lista(c[chave]).length ? lista(c[chave]).map((t) => marcador(runsDoItem(t, fontes))) : [vazio()];

  const corpo = [];
  for (const s of SECOES) {
    corpo.push(tituloSecao(s.titulo));
    if (s.itens) corpo.push(...itens(s.itens));
    for (const sub of s.sub || []) { corpo.push(tituloSecao(sub.titulo, 2)); corpo.push(...itens(sub.itens)); }
  }
  corpo.push(tituloSecao("5. Fontes Consultadas"));
  if (!fontes.length) corpo.push(vazio());
  for (const f of fontes) {
    corpo.push(new Paragraph({
      spacing: { after: 80 },
      children: [
        run(`${f.n}. `),
        new ExternalHyperlink({ link: f.url, children: [run(f.titulo, { style: "Hyperlink" })] }),
        run(` – Veículo: ${f.veiculo} | Data de Publicação: ${dataBR(f.data)}`),
      ],
    }));
  }
  if (lista(c.observacoes).length) {
    corpo.push(tituloSecao("Observações", 2));
    corpo.push(...lista(c.observacoes).map((t) => marcador(runsDoItem(t, fontes))));
  }

  const doc = new Document({
    creator: "A4.6 - Subassessoria de Orçamento",
    title: `${TITULO} - ${dataBR(rel.data)}`,
    numbering: { config: [{ reference: "conj", levels: [{
      level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360, hanging: 260 } } },
    }] }] },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: [
        new Paragraph({ spacing: { after: 40 }, children: [run("Subassessoria Parlamentar de Orçamento · A4.6", { size: 18, color: CINZA })] }),
        new Paragraph({
          spacing: { after: 80 },
          border: { bottom: { style: "single", size: 12, color: AZUL, space: 4 } },
          children: [run(TITULO, { size: 32, bold: true, color: AZUL })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [run(`Notícias de ${dataBR(rel.data)} · gerado às ${horaBR(rel.gerado_em)}`, { size: 18, color: CINZA })],
        }),
        ...(c.resumo ? [new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: runsDoItem(c.resumo, fontes) })] : []),
        ...corpo,
      ],
    }],
  });
  return baixar(await Packer.toBlob(doc), nomeArquivo(rel, "docx"));
}

// ===== PDF =====
// A fonte padrão do jsPDF (Helvetica, WinAnsi) não tem alguns caracteres.
const pdfTexto = (t) => String(t || "")
  .replace(/[‐‑‒]/g, "-").replace(/[  ]/g, " ").replace(/[^\x00-\xff–—‘’“”•…€]/g, "");

export function construirConjunturaPdf(rel) {
  const c = rel.conteudo || {};
  const fontes = lista(c.fontes);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 18, L = 210 - 2 * M, FIM = 297 - 16;
  let y = M;

  const espaco = (h) => { if (y + h > FIM) { doc.addPage(); y = M; } };
  const escrever = (texto, { tam = 10.5, cor = [30, 30, 30], estilo = "normal", recuo = 0, apos = 1.5, link } = {}) => {
    doc.setFont("helvetica", estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(pdfTexto(texto), L - recuo);
    const h = tam * 0.42;
    for (const l of linhas) {
      espaco(h);
      if (link) doc.textWithLink(l, M + recuo, y, { url: link }); else doc.text(l, M + recuo, y);
      y += h;
    }
    y += apos;
  };
  const titulo = (t, nivel = 1) => { espaco(14); y += nivel === 1 ? 3 : 1; escrever(t, { tam: nivel === 1 ? 12.5 : 11, cor: [31, 56, 100], estilo: "bold", apos: 1.5 }); };
  const itens = (chave) => {
    const arr = lista(c[chave]);
    if (!arr.length) { escrever("Nenhum item.", { estilo: "italic", cor: [107, 117, 104] }); return; }
    for (const t of arr) {
      espaco(5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(30, 30, 30);
      doc.text("•", M + 1, y);
      escrever(t, { recuo: 5, apos: 1.8 });
    }
  };

  escrever("Subassessoria Parlamentar de Orçamento · A4.6", { tam: 9, cor: [107, 117, 104], apos: 3 });
  escrever(TITULO, { tam: 16, cor: [31, 56, 100], estilo: "bold", apos: 0 });
  doc.setDrawColor(31, 56, 100); doc.setLineWidth(0.6); doc.line(M, y, M + L, y); y += 5;
  escrever(`Notícias de ${dataBR(rel.data)} · gerado às ${horaBR(rel.gerado_em)}`, { tam: 9, cor: [107, 117, 104], apos: 4 });
  if (c.resumo) escrever(c.resumo, { apos: 3 });

  for (const s of SECOES) {
    titulo(s.titulo);
    if (s.itens) itens(s.itens);
    for (const sub of s.sub || []) { titulo(sub.titulo, 2); itens(sub.itens); }
  }
  titulo("5. Fontes Consultadas");
  if (!fontes.length) escrever("Nenhuma fonte.", { estilo: "italic", cor: [107, 117, 104] });
  for (const f of fontes) {
    escrever(`${f.n}. ${f.titulo}`, { cor: [31, 78, 160], link: f.url, apos: 0.3 });
    escrever(`Veículo: ${f.veiculo} | Data de Publicação: ${dataBR(f.data)}`, { tam: 9, cor: [107, 117, 104], recuo: 4, apos: 0.3 });
    escrever(f.url, { tam: 8, cor: [107, 117, 104], recuo: 4, link: f.url, apos: 2 });
  }
  if (lista(c.observacoes).length) { titulo("Observações", 2); itens("observacoes"); }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140, 140, 140);
    doc.text(`${TITULO} · ${dataBR(rel.data)}`, M, 297 - 8);
    doc.text(`${i}/${total}`, 210 - M, 297 - 8, { align: "right" });
  }
  return doc;
}

export function exportarConjunturaPdf(rel) {
  const doc = construirConjunturaPdf(rel);
  if (typeof document === "undefined") return doc.output("arraybuffer");
  doc.save(nomeArquivo(rel, "pdf"));
}
