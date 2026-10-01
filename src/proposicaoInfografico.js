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
    <img src="${banner}" style="display:block;width:100%;height:auto;" crossorigin="anonymous" />
    <div style="background:#123c78;color:#fff;padding:18px 28px;display:flex;align-items:center;gap:16px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:32px;font-weight:800;line-height:1.1;">${esc(titulo)}</div>
        <div style="font-size:15px;font-weight:700;margin-top:5px;opacity:.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ou((p.ementa || "").slice(0, 140))}${(p.ementa || "").length > 140 ? "…" : ""}</div>
        <div style="font-size:13px;margin-top:7px;opacity:.9;"><b>Casa atual:</b> ${ou(rotuloCasa(p.casa))} &nbsp;•&nbsp; <b>Situação:</b> ${ou(si.rotulo)}</div>
      </div>
      <div style="flex:none;background:#fff;color:#123c78;border-radius:22px;padding:8px 20px;font-weight:800;font-size:16px;">${ou(p.tipo)}</div>
    </div>

    <div style="padding:22px 28px 24px;display:flex;flex-wrap:wrap;gap:16px;">
      ${cartao("Ementa:", ou(p.ementa), true)}
      ${cartao("Autor:", ou(p.autor), false)}
      ${cartao("Situação atual:", ou(si.rotulo), false)}
      ${cartao("Impacto:", ou(p.impacto), false)}
      ${cartao("Relator atual:", ou(p.relator), false)}
      ${cartao("Atuação (A4.6):", ou(p.atuacao), true)}
    </div>

    <div style="border-top:1px solid #d7d2bf;padding:11px 28px;display:flex;justify-content:space-between;font-size:11.5px;color:#6a6553;">
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
    const pw = pdf.internal.pageSize.getWidth();
    // ocupa TODA a largura da página (paisagem); a altura acompanha a proporção.
    const w = pw;
    const h = (canvas.height / canvas.width) * pw;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
    const slug = `${(p.tipo || "").trim()}_${(p.proposicao || "SN").trim()}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    pdf.save(`Infografico_${slug || "proposicao"}.pdf`);
  } finally {
    host.remove();
  }
}
