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
function estagios(casa) {
  const base = [
    { nome: "Câmara dos Deputados", papel: "Casa iniciadora / revisora", chave: "CD" },
    { nome: "Senado Federal", papel: "Casa iniciadora / revisora", chave: "SF" },
    { nome: "Presidência da República", papel: "Sanção / Veto", chave: "PR" },
  ];
  let ativo = base.findIndex((e) => e.chave === casa);
  if (ativo < 0) ativo = casa === "CN" ? 1 : 0; // Congresso → destaca etapa central
  return { base, ativo };
}

function cartao(titulo, valor, largo) {
  return `<div style="flex:${largo ? "1 1 100%" : "1 1 calc(50% - 7px)"};box-sizing:border-box;border:1px solid #d7d2bf;border-radius:8px;padding:12px 15px;background:#fbfaf5;">
    <div style="color:#123c78;font-weight:800;font-size:15px;margin-bottom:5px;">${esc(titulo)}</div>
    <div style="color:#1c1c1c;font-size:13px;line-height:1.4;white-space:pre-wrap;">${valor}</div>
  </div>`;
}

function montarHtml(p) {
  const si = statusInfo(p.status);
  const titulo = `${(p.tipo || "").trim()} ${(p.proposicao || "").trim()}`.trim() || "Proposição";
  const { base, ativo } = estagios(p.casa);
  const pct = Math.round(((ativo + 0.5) / base.length) * 100);

  const caixas = base.map((e, i) => {
    const on = i === ativo;
    return `<div style="flex:1;border-radius:8px;padding:10px 8px;text-align:center;background:${on ? "#2f5aa0" : "#c9c3ae"};color:${on ? "#fff" : "#5a5647"};">
      <div style="font-weight:800;font-size:13px;">${esc(e.nome)}</div>
      <div style="font-size:10.5px;font-weight:700;opacity:.9;">${on ? "Casa atual" : esc(e.papel)}</div>
    </div>`;
  }).join("");

  return `<div style="width:1123px;background:#f3f1e7;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <img src="${banner}" style="display:block;width:100%;height:auto;" crossorigin="anonymous" />
    <div style="background:#123c78;color:#fff;padding:16px 26px;display:flex;align-items:center;gap:16px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:30px;font-weight:800;line-height:1.1;">${esc(titulo)}</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px;opacity:.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ou((p.ementa || "").slice(0, 120))}${(p.ementa || "").length > 120 ? "…" : ""}</div>
        <div style="font-size:12.5px;margin-top:6px;opacity:.9;"><b>Casa atual:</b> ${ou(rotuloCasa(p.casa))} &nbsp;•&nbsp; <b>Situação:</b> ${ou(si.rotulo)}</div>
      </div>
      <div style="flex:none;background:#fff;color:#123c78;border-radius:20px;padding:6px 16px;font-weight:800;font-size:14px;">${ou(p.tipo)}</div>
    </div>

    <div style="padding:18px 26px 8px;">
      <div style="display:flex;gap:10px;">${caixas}</div>
      <div style="margin-top:10px;height:14px;border-radius:8px;background:#d9d3bf;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:#E8912A;"></div>
      </div>
    </div>

    <div style="padding:8px 26px 20px;display:flex;flex-wrap:wrap;gap:14px;">
      ${cartao("Ementa:", ou(p.ementa), false)}
      ${cartao("Autor:", ou(p.autor), false)}
      ${cartao("Impacto:", ou(p.impacto), true)}
      ${cartao("Situação atual:", ou(si.rotulo), false)}
      ${cartao("Relator atual:", ou(p.relator), false)}
      ${cartao("Atuação (A4.6):", ou(p.atuacao), true)}
      ${p.tramitacao ? cartao("Tramitação:", ou(p.tramitacao), true) : ""}
    </div>

    <div style="border-top:1px solid #d7d2bf;padding:10px 26px;display:flex;justify-content:space-between;font-size:11px;color:#6a6553;">
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
    const ph = pdf.internal.pageSize.getHeight();
    // ajusta a imagem à página mantendo a proporção
    const razao = Math.min(pw / canvas.width, ph / canvas.height);
    const w = canvas.width * razao, h = canvas.height * razao;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w) / 2, 0, w, h);
    const slug = `${(p.tipo || "").trim()}_${(p.proposicao || "SN").trim()}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    pdf.save(`Infografico_${slug || "proposicao"}.pdf`);
  } finally {
    host.remove();
  }
}
