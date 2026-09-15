import JSZip from "jszip";
import { MESES_LONGO } from "./constants.js";
// O modelo é o próprio ofício anexo, com os campos variáveis trocados por
// tokens [[...]] (ver src/modelos). O Vite copia o arquivo e devolve a URL final
// (com o base path correto no GitHub Pages), então basta um fetch.
import modeloUrl from "./modelos/oficio-objeto-emenda.docx?url";

// Escapa o texto do operador para caber com segurança dentro do XML do .docx.
function escXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "da" para cargos femininos (Deputada/Senadora), "do" para os demais — para o
// cabeçalho "Gabinete do/da <cargo> <nome>" concordar em gênero.
function artigo(cargo) {
  return /^\s*(deputada|senadora)\b/i.test(cargo || "") ? "da" : "do";
}

// Nome do mês em minúsculas, aceitando número (1–12) ou já o nome.
function nomeMes(mes) {
  const n = Number(mes);
  if (n >= 1 && n <= 12) return MESES_LONGO[n].toLowerCase();
  return String(mes || "").toLowerCase();
}

// Monta a linha "Objeto" que vai à tabela de consolidação: DE → PARA.
export function resumoObjeto(d) {
  const de = (d.objetoDe || "").trim();
  const para = (d.objetoPara || "").trim();
  if (de && para) return `De “${de}” para “${para}”.`;
  return para ? `Para “${para}”.` : de ? `De “${de}”.` : "—";
}

// Substitui todos os tokens do modelo pelos valores do formulário e devolve um
// Blob .docx pronto para download. Um mesmo token pode aparecer várias vezes
// (o nome sai no cabeçalho e na assinatura, o ano em quatro lugares etc.).
export async function gerarOficioDocx(d) {
  const mapa = {
    "[[PARLAMENTAR]]": d.parlamentar || "",
    "[[CARGO]]": d.cargo || "",
    "[[ART]]": artigo(d.cargo),
    "[[OFICIO_NR]]": (d.oficioNr || "").trim() || "____",
    "[[ANO]]": d.ano || "",
    "[[DIA]]": d.dia || "",
    "[[MES]]": nomeMes(d.mes),
    "[[EMENDA]]": d.emenda || "",
    "[[OBJETO_DE]]": (d.objetoDe || "").trim(),
    "[[OBJETO_PARA]]": (d.objetoPara || "").trim(),
    "[[GABINETE]]": (d.gabinete || "").trim(),
    "[[TELEFONE]]": (d.telefone || "").trim(),
    "[[EMAIL]]": (d.email || "").trim(),
  };

  const buf = await fetch(modeloUrl).then((r) => {
    if (!r.ok) throw new Error("Não foi possível carregar o modelo do ofício.");
    return r.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(buf);

  for (const parte of ["word/document.xml", "word/footer1.xml"]) {
    const arquivo = zip.file(parte);
    if (!arquivo) continue;
    let xml = await arquivo.async("string");
    for (const [token, valor] of Object.entries(mapa)) {
      xml = xml.split(token).join(escXml(valor));
    }
    zip.file(parte, xml);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// Gera o ofício e dispara o download no navegador.
export async function baixarOficioDocx(d) {
  const blob = await gerarOficioDocx(d);
  const slug = (d.parlamentar || "parlamentar")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "parlamentar";
  const nome = `Oficio_Objeto_Emenda_${(d.emenda || "").trim() || "SN"}_${slug}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
