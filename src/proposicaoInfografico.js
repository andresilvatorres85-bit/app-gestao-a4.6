// Exporta uma proposição no layout do "Infográfico Legislativo", mas com o
// cabeçalho trocado pela faixa (banner) da Subassessoria de Orçamento (A4.6).
// Monta o layout como um DOM fora da tela, captura com html2canvas e salva um
// PDF A4 paisagem (uma página) via jsPDF.
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import banner from "./bannerA46.jpg";
import { statusInfo, rotuloCasa } from "./proposicoes.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ou = (s) => (String(s ?? "").trim() ? esc(s) : "—");

// Estágios da tramitação (faixa de 3 caixas + barra de progresso). Destaca a
// casa atual da proposição.
function cartao(titulo, valor, largo) {
  return `<div style="flex:${largo ? "1 1 100%" : "1 1 calc(50% - 7px)"};box-sizing:border-box;border:1px solid #d7d2bf;border-radius:8px;padding:12px 15px;background:#fbfaf5;">
    <div style="color:#123c78;font-weight:800;font-size:15px;margin-bottom:5px;">${esc(titulo)}</div>
    <div style="color:#1c1c1c;font-size:13px;line-height:1.4;white-space:pre-wrap;">${valor}</div>
  </div>`;
}

function montarHtml(p) {
  const si = statusInfo(p.status);
  const titulo = `${(p.tipo || "").trim()} ${(p.proposicao || "").trim()}`.trim() || "Proposição";

  return `<div style="width:1123px;background:#f3f1e7;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <div style="text-align:center;padding:12px 0 6px;">
      <img src="${banner}" style="display:inline-block;height:92px;width:auto;" crossorigin="anonymous" />
    </div>
    <div style="background:#123c78;color:#fff;margin:0 28px;border-radius:10px;padding:14px 22px;display:flex;align-items:center;gap:16px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:28px;font-weight:800;line-height:1.1;">${esc(titulo)}</div>
        <div style="font-size:13px;margin-top:6px;opacity:.9;"><b>Casa atual:</b> ${ou(rotuloCasa(p.casa))} &nbsp;•&nbsp; <b>Situação:</b> ${ou(si.rotulo)}</div>
      </div>
      <div style="flex:none;background:#fff;color:#123c78;border-radius:22px;padding:8px 20px;font-weight:800;font-size:16px;">${ou(p.tipo)}</div>
    </div>

    <div style="padding:16px 28px 20px;display:flex;flex-wrap:wrap;gap:14px;">
      ${cartao("Ementa:", ou(p.ementa), false)}
      ${cartao("Autor:", ou(p.autor), false)}
      ${cartao("Impacto:", ou(p.impacto), true)}
      ${cartao("Situação atual:", ou(si.rotulo), false)}
      ${cartao("Relator atual:", ou(p.relator), false)}
      ${cartao("Atuação (A4.6):", ou(p.atuacao), true)}
      ${p.tramitacao ? cartao("Tramitação:", ou(p.tramitacao), true) : ""}
    </div>

    <div style="border-top:1px solid #d7d2bf;margin:0 28px;padding:11px 0;display:flex;justify-content:space-between;font-size:11.5px;color:#6a6553;">
      <span>Infográfico Legislativo${p.link ? " · Tramitação oficial" : ""}</span>
      <span>Subassessoria de Orçamento (A4.6)</span>
    </div>
  </div>`;
}

export async function exportarInfografico(p) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-11000px;top:0;z-index:-1;";
  host.innerHTML = montarHtml(p);
  document.body.appendChild(host);
  const alvo = host.firstElementChild;
  try {
    // garante que o banner terminou de carregar antes da captura
    const img = alvo.querySelector("img");
    if (img && !img.complete) {
      await new Promise((res) => { img.onload = res; img.onerror = res; });
    }
    const canvas = await html2canvas(alvo, { scale: 2, backgroundColor: "#f3f1e7", useCORS: true, logging: false });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();   // 297 mm
    const ph = pdf.internal.pageSize.getHeight();  // 210 mm
    // largura total da página; altura total do conteúdo proporcional.
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const totalH = (canvas.height / canvas.width) * pw;
    // pagina: se o conteúdo não cabe em uma página, abre novas páginas.
    let restante = totalH, y = 0;
    pdf.addImage(imgData, "JPEG", 0, y, pw, totalH);
    restante -= ph;
    while (restante > 0.5) {
      y -= ph;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, y, pw, totalH);
      restante -= ph;
    }
    const slug = `${(p.tipo || "").trim()}_${(p.proposicao || "SN").trim()}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    pdf.save(`Infografico_${slug || "proposicao"}.pdf`);
  } finally {
    host.remove();
  }
}
