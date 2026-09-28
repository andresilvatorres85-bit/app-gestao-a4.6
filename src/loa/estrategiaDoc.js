// ---------------------------------------------------------------------------
// Módulo "Captação de Emendas por Estado" — EXPORTAÇÃO (DOCX, PDF, ZIP).
// Consome o "modelo de documento" de estrategia.js (gerarDocumento) e reproduz
// o layout da ESPEC §10. DOCX via docx-js (Packer.toBlob); PDF via jsPDF (texto
// vetorial, fiel e leve, adequado ao pacote de 54 documentos); ZIP via JSZip
// com as subpastas Camara_Deputados/ e Senado_Senadores/ (ESPEC §12).
// O banner institucional (header.jpg) entra em sangria total no topo de cada
// página (ESPEC §10.1).
// ---------------------------------------------------------------------------
import {
  Document, Packer, Paragraph, TextRun, Header, ImageRun,
  AlignmentType, BorderStyle, ShadingType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
} from 'docx'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import bannerUrl from './assets/header-banner.jpg'
import { PALETA, BANNER, CASAS, UFS } from './estrategiaConfig.js'
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

// Banner carregado uma vez: bytes (docx) + dataURL (jsPDF).
let _bannerPromise = null
function carregarBanner() {
  if (!_bannerPromise) {
    _bannerPromise = fetch(bannerUrl).then((r) => r.arrayBuffer()).then((ab) => {
      const bytes = new Uint8Array(ab)
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
      }
      const dataUrl = 'data:image/jpeg;base64,' + btoa(bin)
      return { bytes, dataUrl }
    })
  }
  return _bannerPromise
}

// ==== DOCX =================================================================
// pt → half-points (docx usa half-points no `size`).
const hp = (pt) => Math.round(pt * 2)
const regua = (cor) => ({ bottom: { style: BorderStyle.SINGLE, size: 8, color: cor, space: 2 } })

// Largura da página A4 em px (96 dpi) para a imagem de sangria total.
const PAG_W_PX = Math.round((21.0 / 2.54) * 96) // 794
const BANNER_H_PX = Math.round(PAG_W_PX / BANNER.aspecto) // ~150

function bannerHeader(banner) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            data: banner.bytes,
            type: 'jpg',
            transformation: { width: PAG_W_PX, height: BANNER_H_PX },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
              allowOverlap: true,
              behindDocument: false,
              wrap: { type: TextWrappingType.NONE },
            },
          }),
        ],
      }),
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

function tutorialDocx(documento) {
  const blocos = [
    new Paragraph({
      spacing: { before: 120, after: 30 },
      children: [new TextRun({ text: documento.tutorialTitulo, bold: true, size: hp(10), color: PALETA.azulInstitucional })],
    }),
  ]
  for (const item of documento.tutorialItens) {
    blocos.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 10, after: 10 },
      children: [
        new TextRun({ text: `● ${item.tutulo} `, bold: true, size: hp(9.5), color: item.cor }),
        new TextRun({ text: `— ${item.texto}`, size: hp(9.5), color: PALETA.preto }),
      ],
    }))
  }
  blocos.push(new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 20, after: 10 },
    children: [
      new TextRun({ text: 'Selos: ', bold: true, size: hp(9), color: PALETA.azulInstitucional }),
      new TextRun({ text: documento.selosLegenda, size: hp(9), color: PALETA.preto }),
    ],
  }))
  return blocos
}

function disclaimerDocx(documento) {
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
      new TextRun({ text: documento.disclaimer, size: hp(9), color: PALETA.preto }),
    ],
  })
}

export function documentoDocx(documento, banner) {
  const filhos = []
  // Título + subtítulo + régua
  filhos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: documento.titulo, bold: true, size: hp(15), color: PALETA.azulInstitucional })],
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
    children: [new TextRun({ text: documento.meta, italics: true, size: hp(8.5), color: PALETA.cinza })],
  }))
  // Tutorial + disclaimer
  filhos.push(...tutorialDocx(documento))
  filhos.push(disclaimerDocx(documento))

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
      new TextRun({ text: documento.notaFechamento, bold: true, size: hp(9.5), color: PALETA.azulInstitucional }),
    ],
  }))

  return new Document({
    creator: 'Gestão A4.6',
    title: nomeArquivo(documento),
    sections: [{
      // Margem superior = altura do banner (~4,0cm) + 0,25cm de folga (ESPEC §10).
      properties: { page: { margin: { top: 4.25 * CM, bottom: 1.5 * CM, left: 2.0 * CM, right: 2.0 * CM } } },
      headers: { default: bannerHeader(banner) },
      children: filhos,
    }],
  })
}

export async function blobDocx(documento, banner) {
  return Packer.toBlob(documentoDocx(documento, banner || (await carregarBanner())))
}

export async function baixarDocx(documento) {
  const blob = await blobDocx(documento, await carregarBanner())
  baixarBlob(blob, `${nomeArquivo(documento)}.docx`)
}

// ==== PDF (jsPDF, fluxo de texto em mm) ====================================
const MM = { L: 20, R: 20, T: 43, B: 15, W: 210, H: 297 }
const LARG = MM.W - MM.L - MM.R // largura útil
const BANNER_H_MM = MM.W / BANNER.aspecto // ~39,7mm (sangria total)

function novaPdf() {
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true })
}

// Desenha o banner institucional (imagem) no topo de CADA página.
function bannerPdf(doc, banner) {
  if (banner?.dataUrl) doc.addImage(banner.dataUrl, 'JPEG', 0, 0, MM.W, BANNER_H_MM)
}

// Cursor de fluxo: quebra de página desenhando o banner de novo.
function criarFluxo(doc, banner) {
  bannerPdf(doc, banner)
  const st = { y: MM.T }
  const garantir = (h) => {
    if (st.y + h > MM.H - MM.B) { doc.addPage(); bannerPdf(doc, banner); st.y = MM.T }
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
  if (prefixo) {
    const linhas = doc.splitTextToSize(prefixo.texto + texto, larg)
    garantir(lh)
    doc.setFont('helvetica', 'bold'); setCor(doc, prefixo.cor)
    doc.text(prefixo.texto, x, st.y + lh - 1)
    const w = doc.getTextWidth(prefixo.texto)
    doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal'); setCor(doc, cor)
    const resto = doc.splitTextToSize(linhas[0].slice(prefixo.texto.length), larg - w)
    doc.text(resto[0] || '', x + w, st.y + lh - 1)
    st.y += lh
    for (const cl of [...resto.slice(1), ...linhas.slice(1)]) { garantir(lh); doc.text(cl, x, st.y + lh - 1); st.y += lh }
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
function disclaimerPdf(doc, fluxo, documento) {
  const { st, garantir } = fluxo
  const size = 8.5
  const larg = LARG - 4
  doc.setFontSize(size); doc.setFont('helvetica', 'normal')
  const linhas = doc.splitTextToSize('Disclaimer: ' + documento.disclaimer, larg)
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

export function documentoPdf(documento, banner, doc = null) {
  doc = doc || novaPdf()
  const fluxo = criarFluxo(doc, banner)
  escreverPar(doc, fluxo, { texto: documento.titulo, size: 15, bold: true, cor: PALETA.azulInstitucional, align: 'center', depois: 1 })
  escreverPar(doc, fluxo, { texto: documento.subtitulo, size: 12, bold: true, cor: documento.corSubtitulo, align: 'center', depois: 0.5 })
  reguaPdf(doc, fluxo, PALETA.azulInstitucional)
  escreverPar(doc, fluxo, { texto: documento.meta, size: 8.5, italic: true, cor: PALETA.cinza, antes: 1, depois: 2 })
  escreverPar(doc, fluxo, { texto: documento.tutorialTitulo, size: 10, bold: true, cor: PALETA.azulInstitucional, depois: 1 })
  for (const item of documento.tutorialItens) {
    escreverPar(doc, fluxo, {
      texto: `— ${item.texto}`, size: 9.5, cor: PALETA.preto,
      prefixo: { texto: `● ${item.tutulo} `, cor: item.cor }, depois: 1,
    })
  }
  escreverPar(doc, fluxo, {
    texto: documento.selosLegenda, size: 9, cor: PALETA.preto,
    prefixo: { texto: 'Selos: ', cor: PALETA.azulInstitucional }, antes: 1, depois: 1,
  })
  disclaimerPdf(doc, fluxo, documento)
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
  reguaPdf(doc, fluxo, PALETA.azulInstitucional, 3)
  escreverPar(doc, fluxo, {
    texto: documento.notaFechamento, size: 9.5, bold: true, cor: PALETA.azulInstitucional,
    prefixo: { texto: 'Nota: ', cor: PALETA.azulInstitucional }, depois: 1,
  })
  return doc
}

export async function baixarPdf(documento) {
  const banner = await carregarBanner()
  documentoPdf(documento, banner).save(`${nomeArquivo(documento)}.pdf`)
}

// ==== ZIP (54 documentos, subpastas por Casa) ==============================
// `onProgresso(feito, total)` opcional para a barra de progresso da tela.
export async function baixarZip(registros, { formato = 'docx', configOver = {}, onProgresso } = {}) {
  const cfg = montarConfig(configOver)
  const banner = await carregarBanner()
  const zip = new JSZip()
  const combos = []
  for (const casa of ['camara', 'senado']) for (const uf of UFS) combos.push({ uf, casa })
  let feito = 0
  for (const { uf, casa } of combos) {
    const documento = gerarDocumento(registros, { uf, casa, config: cfg })
    const nome = `${CASAS[casa].subpasta}/${nomeArquivo(documento)}.${formato}`
    if (formato === 'docx') {
      zip.file(nome, await blobDocx(documento, banner))
    } else {
      const buf = documentoPdf(documento, banner).output('arraybuffer')
      zip.file(nome, buf)
    }
    feito += 1
    if (onProgresso) onProgresso(feito, combos.length)
    await new Promise((r) => setTimeout(r, 0))
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const nomeZip = formato === 'docx'
    ? 'Captacao_Emendas_por_Estado_DOCX.zip'
    : 'Captacao_Emendas_por_Estado_PDF.zip'
  baixarBlob(blob, nomeZip)
}

export { indicePorUFCasa, gerarDocumento, montarConfig }
