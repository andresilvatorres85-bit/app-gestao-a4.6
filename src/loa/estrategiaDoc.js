// ---------------------------------------------------------------------------
// Módulo "Captação de Emendas por Estado" — EXPORTAÇÃO (DOCX, PDF, ZIP).
// Consome o "modelo de documento" de estrategia.js (gerarDocumento) e reproduz
// o layout da ESPEC §10. DOCX via docx-js (Packer.toBlob); PDF via jsPDF (texto
// vetorial, fiel e leve, adequado ao pacote de 54 documentos); ZIP via JSZip
// com as subpastas Camara_Deputados/ e Senado_Senadores/ (ESPEC §12).
// ---------------------------------------------------------------------------
import {
  Document, Packer, Paragraph, TextRun, Header,
  AlignmentType, BorderStyle, ShadingType,
} from 'docx'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import {
  PALETA, BANNER, TITULO, META, TUTORIAL_TITULO, SELOS_LEGENDA, DISCLAIMER,
  NOTA_FECHAMENTO, CATEGORIAS, CASAS, UFS,
} from './estrategiaConfig.js'
import { gerarDocumento, indicePorUFCasa, montarConfig } from './estrategia.js'

// ==== util =================================================================
const CM = 566.929 // 1 cm em twips
const hexRGB = (h) => {
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const baixarBlob = (blob, nome) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
export const nomeArquivo = (documento) =>
  `${documento.uf}_${CASAS[documento.casa].sufixoArquivo}`

// ==== DOCX =================================================================
// pt → half-points (docx usa half-points no `size`).
const hp = (pt) => Math.round(pt * 2)
const regua = (cor) => ({ bottom: { style: BorderStyle.SINGLE, size: 8, color: cor, space: 2 } })

function bannerHeader() {
  const linha = (texto, size, bold) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: BANNER.cor, color: 'auto' },
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: texto, bold, size: hp(size), color: PALETA.branco })],
    })
  return new Header({
    children: [
      linha(BANNER.linha1, 13, true),
      linha(BANNER.linha2, 8, false),
      linha(BANNER.linha3, 9, true),
      new Paragraph({ spacing: { after: 60 }, children: [] }),
    ],
  })
}

function paragrafoCampo(campo, cor) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 10, after: 10 },
    indent: { left: 0.4 * CM },
    children: [
      new TextRun({ text: `${campo.rotulo}: `, bold: true, size: hp(9.5), color: cor }),
      new TextRun({ text: campo.texto, size: hp(9.5), color: PALETA.preto }),
    ],
  })
}

function ficha(f, cor) {
  const blocos = [
    new Paragraph({
      spacing: { before: 120, after: 0 },
      children: [new TextRun({ text: f.nome, bold: true, size: hp(11.5), color: cor })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 20 },
      children: [new TextRun({ text: f.ident, size: hp(9.5), color: PALETA.cinza })],
    }),
  ]
  for (const c of f.campos) blocos.push(paragrafoCampo(c, cor))
  return blocos
}

function cabecalhoSecao(secao) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: secao.cor, color: 'auto' },
    spacing: { before: 200, after: 40 },
    children: [new TextRun({ text: secao.cabecalho, bold: true, size: hp(12), color: PALETA.branco })],
  })
}

function tutorialDocx() {
  const blocos = [
    new Paragraph({
      spacing: { before: 120, after: 30 },
      children: [new TextRun({ text: TUTORIAL_TITULO, bold: true, size: hp(10), color: PALETA.azulInstitucional })],
    }),
  ]
  for (const cat of CATEGORIAS) {
    blocos.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 10, after: 10 },
      children: [
        new TextRun({ text: `● ${cat.tutulo} `, bold: true, size: hp(9.5), color: cat.cor }),
        new TextRun({ text: `— ${cat.tutuloTexto}`, size: hp(9.5), color: PALETA.preto }),
      ],
    }))
  }
  blocos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 20, after: 10 },
    children: [
      new TextRun({ text: 'Selos: ', bold: true, size: hp(9), color: PALETA.azulInstitucional }),
      new TextRun({ text: SELOS_LEGENDA, size: hp(9), color: PALETA.preto }),
    ],
  }))
  return blocos
}

function disclaimerDocx() {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    shading: { type: ShadingType.CLEAR, fill: PALETA.fundoDisclaimer, color: 'auto' },
    spacing: { before: 120, after: 60 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 2, color: PALETA.recuperar, space: 4 },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: PALETA.recuperar, space: 4 },
      left: { style: BorderStyle.SINGLE, size: 2, color: PALETA.recuperar, space: 4 },
      right: { style: BorderStyle.SINGLE, size: 2, color: PALETA.recuperar, space: 4 },
    },
    children: [
      new TextRun({ text: 'Disclaimer: ', bold: true, size: hp(9), color: PALETA.recuperar }),
      new TextRun({ text: DISCLAIMER, size: hp(9), color: PALETA.preto }),
    ],
  })
}

export function documentoDocx(documento) {
  const filhos = []
  // Título + subtítulo + régua
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: TITULO, bold: true, size: hp(15), color: PALETA.azulInstitucional })],
  }))
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 30 },
    border: regua(PALETA.azulInstitucional),
    children: [new TextRun({ text: documento.subtitulo, bold: true, size: hp(12), color: documento.corSubtitulo })],
  }))
  // Meta
  filhos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: META, italics: true, size: hp(8.5), color: PALETA.cinza })],
  }))
  // Tutorial + disclaimer
  filhos.push(...tutorialDocx())
  filhos.push(disclaimerDocx())

  // Corpo
  if (documento.vazio) {
    filhos.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 160, after: 60 },
      children: [new TextRun({ text: documento.textoVazio, italics: true, size: hp(10), color: PALETA.cinza })],
    }))
  } else {
    for (const secao of documento.secoes) {
      filhos.push(cabecalhoSecao(secao))
      for (const f of secao.fichas) filhos.push(...ficha(f, secao.cor))
    }
  }

  // Nota de fechamento
  filhos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 200, after: 20 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: PALETA.azulInstitucional, space: 6 } },
    children: [
      new TextRun({ text: 'Nota: ', bold: true, size: hp(9.5), color: PALETA.azulInstitucional }),
      new TextRun({ text: NOTA_FECHAMENTO, bold: true, size: hp(9.5), color: PALETA.azulInstitucional }),
    ],
  }))

  return new Document({
    creator: 'Gestão A4.6',
    title: nomeArquivo(documento),
    sections: [{
      properties: { page: { margin: { top: 3.0 * CM, bottom: 1.5 * CM, left: 2.0 * CM, right: 2.0 * CM } } },
      headers: { default: bannerHeader() },
      children: filhos,
    }],
  })
}

export async function blobDocx(documento) {
  return Packer.toBlob(documentoDocx(documento))
}

export async function baixarDocx(documento) {
  const blob = await blobDocx(documento)
  baixarBlob(blob, `${nomeArquivo(documento)}.docx`)
}

// ==== PDF (jsPDF, fluxo de texto em mm) ====================================
const MM = { L: 20, R: 20, T: 32, B: 15, W: 210, H: 297 }
const LARG = MM.W - MM.L - MM.R // largura útil

function novaPdf() {
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true })
}

// Desenha o banner institucional no topo de CADA página.
function bannerPdf(doc) {
  const c = hexRGB(BANNER.cor)
  doc.setFillColor(c.r, c.g, c.b)
  doc.rect(0, 0, MM.W, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text(BANNER.linha1, MM.W / 2, 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text(BANNER.linha2, MM.W / 2, 14.5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text(BANNER.linha3, MM.W / 2, 19.5, { align: 'center' })
}

// Cursor de fluxo: quebra de página desenhando o banner de novo.
function criarFluxo(doc) {
  bannerPdf(doc)
  const st = { y: MM.T }
  const garantir = (h) => {
    if (st.y + h > MM.H - MM.B) { doc.addPage(); bannerPdf(doc); st.y = MM.T }
  }
  return { st, garantir }
}

const setCor = (doc, hex) => { const c = hexRGB(hex); doc.setTextColor(c.r, c.g, c.b) }
const setFill = (doc, hex) => { const c = hexRGB(hex); doc.setFillColor(c.r, c.g, c.b) }
const pt2mm = (pt) => pt * 0.3528

// Escreve um parágrafo (com wrap), devolve a altura consumida.
function escreverPar(doc, fluxo, { texto, size, bold, italic, cor, align = 'left', indent = 0, antes = 0, depois = 1.5, prefixo = null }) {
  const { st, garantir } = fluxo
  st.y += antes
  const x = MM.L + indent
  const larg = LARG - indent
  const lh = pt2mm(size) * 1.32
  doc.setFontSize(size)
  doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal')
  // Prefixo em negrito colorido (rótulo dos campos / etiquetas do tutorial).
  if (prefixo) {
    const linhas = doc.splitTextToSize(prefixo.texto + texto, larg)
    for (let i = 0; i < linhas.length; i++) {
      garantir(lh)
      if (i === 0) {
        doc.setFont('helvetica', 'bold'); setCor(doc, prefixo.cor)
        doc.text(prefixo.texto, x, st.y + lh - 1)
        const w = doc.getTextWidth(prefixo.texto)
        doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal'); setCor(doc, cor)
        const resto = doc.splitTextToSize(linhas[0].slice(prefixo.texto.length), larg - w)
        doc.text(resto[0] || '', x + w, st.y + lh - 1)
        // resto[1..] e demais linhas seguem na margem cheia
        const cont = [...resto.slice(1), ...linhas.slice(1)]
        st.y += lh
        for (const cl of cont) { garantir(lh); doc.text(cl, x, st.y + lh - 1); st.y += lh }
        break
      }
    }
  } else {
    setCor(doc, cor)
    const linhas = doc.splitTextToSize(texto, larg)
    for (const l of linhas) {
      garantir(lh)
      if (align === 'center') doc.text(l, MM.W / 2, st.y + lh - 1, { align: 'center' })
      else doc.text(l, x, st.y + lh - 1)
      st.y += lh
    }
  }
  st.y += depois
}

// Régua horizontal.
function reguaPdf(doc, fluxo, hex, antes = 1) {
  const { st, garantir } = fluxo
  st.y += antes
  garantir(2)
  setFill(doc, hex)
  doc.rect(MM.L, st.y, LARG, 0.4, 'F')
  st.y += 2
}

// Faixa colorida (cabeçalho de seção) com texto branco.
function faixaPdf(doc, fluxo, texto, hex) {
  const { st, garantir } = fluxo
  const size = 11
  const h = pt2mm(size) * 1.6
  st.y += 3
  garantir(h)
  setFill(doc, hex)
  doc.rect(MM.L, st.y, LARG, h, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(size); doc.setTextColor(255, 255, 255)
  doc.text(texto, MM.L + 2, st.y + h - pt2mm(size) * 0.55)
  st.y += h + 1.5
}

// Caixa do disclaimer (fundo âmbar-claro).
function disclaimerPdf(doc, fluxo) {
  const { st, garantir } = fluxo
  const size = 8.5
  const larg = LARG - 4
  doc.setFontSize(size); doc.setFont('helvetica', 'normal')
  const linhas = doc.splitTextToSize('Disclaimer: ' + DISCLAIMER, larg)
  const lh = pt2mm(size) * 1.32
  const h = linhas.length * lh + 4
  st.y += 3
  garantir(h)
  setFill(doc, PALETA.fundoDisclaimer)
  doc.rect(MM.L, st.y, LARG, h, 'F')
  let yy = st.y + 2 + lh - 1
  for (let i = 0; i < linhas.length; i++) {
    if (i === 0) {
      doc.setFont('helvetica', 'bold'); setCor(doc, PALETA.recuperar)
      doc.text('Disclaimer:', MM.L + 2, yy)
      const w = doc.getTextWidth('Disclaimer:')
      doc.setFont('helvetica', 'normal'); setCor(doc, PALETA.preto)
      doc.text(linhas[0].slice('Disclaimer:'.length), MM.L + 2 + w, yy)
    } else {
      doc.text(linhas[i], MM.L + 2, yy)
    }
    yy += lh
  }
  st.y += h + 1.5
}

export function documentoPdf(documento, doc = null) {
  doc = doc || novaPdf()
  const fluxo = criarFluxo(doc)
  // Título (centralizado)
  escreverPar(doc, fluxo, { texto: TITULO, size: 15, bold: true, cor: PALETA.azulInstitucional, align: 'center', depois: 1 })
  escreverPar(doc, fluxo, { texto: documento.subtitulo, size: 12, bold: true, cor: documento.corSubtitulo, align: 'center', depois: 0.5 })
  reguaPdf(doc, fluxo, PALETA.azulInstitucional)
  // Meta
  escreverPar(doc, fluxo, { texto: META, size: 8.5, italic: true, cor: PALETA.cinza, antes: 1, depois: 2 })
  // Tutorial
  escreverPar(doc, fluxo, { texto: TUTORIAL_TITULO, size: 10, bold: true, cor: PALETA.azulInstitucional, depois: 1 })
  for (const cat of CATEGORIAS) {
    escreverPar(doc, fluxo, {
      texto: `— ${cat.tutuloTexto}`, size: 9.5, cor: PALETA.preto,
      prefixo: { texto: `● ${cat.tutulo} `, cor: cat.cor }, depois: 1,
    })
  }
  escreverPar(doc, fluxo, {
    texto: SELOS_LEGENDA, size: 9, cor: PALETA.preto,
    prefixo: { texto: 'Selos: ', cor: PALETA.azulInstitucional }, antes: 1, depois: 1,
  })
  // Disclaimer
  disclaimerPdf(doc, fluxo)
  // Corpo
  if (documento.vazio) {
    escreverPar(doc, fluxo, { texto: documento.textoVazio, size: 10, italic: true, cor: PALETA.cinza, antes: 3, depois: 2 })
  } else {
    for (const secao of documento.secoes) {
      faixaPdf(doc, fluxo, secao.cabecalho, secao.cor)
      for (const f of secao.fichas) {
        escreverPar(doc, fluxo, { texto: f.nome, size: 11.5, bold: true, cor: secao.cor, antes: 1.5, depois: 0 })
        escreverPar(doc, fluxo, { texto: f.ident, size: 9.5, cor: PALETA.cinza, depois: 0.5 })
        for (const c of f.campos) {
          escreverPar(doc, fluxo, {
            texto: c.texto, size: 9.5, cor: PALETA.preto, indent: 3,
            prefixo: { texto: `${c.rotulo}: `, cor: secao.cor }, depois: 0.8,
          })
        }
      }
    }
  }
  // Nota de fechamento
  reguaPdf(doc, fluxo, PALETA.azulInstitucional, 3)
  escreverPar(doc, fluxo, {
    texto: NOTA_FECHAMENTO, size: 9.5, bold: true, cor: PALETA.azulInstitucional,
    prefixo: { texto: 'Nota: ', cor: PALETA.azulInstitucional }, depois: 1,
  })
  return doc
}

export function baixarPdf(documento) {
  documentoPdf(documento).save(`${nomeArquivo(documento)}.pdf`)
}

// ==== ZIP (54 documentos, subpastas por Casa) ==============================
// `onProgresso(feito, total)` opcional para a barra de progresso da tela.
export async function baixarZip(registros, { formato = 'docx', configOver = {}, onProgresso } = {}) {
  const cfg = montarConfig(configOver)
  const zip = new JSZip()
  const combos = []
  for (const casa of ['camara', 'senado']) for (const uf of UFS) combos.push({ uf, casa })
  let feito = 0
  for (const { uf, casa } of combos) {
    const documento = gerarDocumento(registros, { uf, casa, config: cfg })
    const nome = `${CASAS[casa].subpasta}/${nomeArquivo(documento)}.${formato}`
    if (formato === 'docx') {
      zip.file(nome, await blobDocx(documento))
    } else {
      const buf = documentoPdf(documento).output('arraybuffer')
      zip.file(nome, buf)
    }
    feito += 1
    if (onProgresso) onProgresso(feito, combos.length)
    // cede o event-loop para a barra de progresso pintar (54 docx são pesados)
    await new Promise((r) => setTimeout(r, 0))
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const nomeZip = formato === 'docx'
    ? 'Captacao_Emendas_por_Estado_DOCX.zip'
    : 'Captacao_Emendas_por_Estado_PDF.zip'
  baixarBlob(blob, nomeZip)
}

export { indicePorUFCasa, gerarDocumento, montarConfig }
