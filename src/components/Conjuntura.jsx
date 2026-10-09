import { useState } from "react";
import { FileDown, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { SECOES, dataBR, horaBR, quandoBR, partesComRefs, exportarConjunturaDocx, exportarConjunturaPdf } from "../conjunturaDoc.js";

// Aba "Conjuntura" (CONHECIMENTO): relatório diário sobre o Orçamento Público
// Federal, gerado de segunda a sexta às 08:00 pelo workflow conjuntura.yml.
export default function Conjuntura({ conjuntura }) {
  const { relatorios = [], carregado, erro } = conjuntura || {};
  const [escolhida, setEscolhida] = useState(null);
  const [exportando, setExportando] = useState("");
  const rel = relatorios.find((r) => r.data === escolhida) || relatorios[0];

  async function exportar(tipo, fn) {
    setExportando(tipo);
    try { await fn(rel); } catch (e) { console.error("Falha ao exportar a Conjuntura:", e); alert("Não foi possível exportar o relatório."); }
    setExportando("");
  }

  if (erro) {
    return (
      <div className="lexor-aviso-erro">
        Os relatórios de Conjuntura não puderam ser lidos. Rode o script
        <code> supabase_conjuntura.sql </code> no SQL Editor do Supabase para criar a tabela.
      </div>
    );
  }
  if (!carregado) return <div className="loading-state">Carregando relatórios…</div>;
  if (!rel) {
    return (
      <p className="leg-vazio">
        Nenhum relatório gerado ainda. O relatório é gerado automaticamente de segunda a sexta às 8h
        (horário de Brasília).
      </p>
    );
  }

  const c = rel.conteudo || {};
  const fontes = Array.isArray(c.fontes) ? c.fontes : [];
  const temConteudo = !!rel.conteudo;

  return (
    <div className="conj-wrap">
      <div className="conj-topo">
        <div>
          <h2 className="conj-tit">Orçamento Público Federal · notícias do dia</h2>
          <p className="page-sub conj-sub">
            Gerado automaticamente de segunda a sexta às 8h, a partir dos portais de notícias e do Congresso.
            {rel.gerado_em && <> Este relatório foi gerado em {quandoBR(rel.gerado_em)} às {horaBR(rel.gerado_em)}.</>}
          </p>
        </div>
        <div className="conj-acoes">
          <select className="input conj-data" value={rel.data} onChange={(e) => setEscolhida(e.target.value)} title="Relatório de outro dia">
            {relatorios.map((r) => (
              <option key={r.data} value={r.data}>{dataBR(r.data)}{r.status === "erro" ? " (falhou)" : ""}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" disabled={!temConteudo || !!exportando}
            onClick={() => exportar("docx", exportarConjunturaDocx)}>
            <FileText size={15} /> {exportando === "docx" ? "Gerando…" : "DOCX"}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={!temConteudo || !!exportando}
            onClick={() => exportar("pdf", exportarConjunturaPdf)}>
            <FileDown size={15} /> {exportando === "pdf" ? "Gerando…" : "PDF"}
          </button>
        </div>
      </div>

      {rel.status === "erro" && (
        <div className="lexor-aviso-erro conj-falha">
          <AlertTriangle size={15} /> A geração do relatório de {dataBR(rel.data)} falhou: {rel.erro || "erro desconhecido"}.
          {temConteudo && " Abaixo, a última versão gerada com sucesso neste dia."}
        </div>
      )}

      {temConteudo && (
        <article className="conj-rel">
          {c.resumo && <p className="conj-resumo"><Texto texto={c.resumo} fontes={fontes} /></p>}
          {SECOES.map((s) => (
            <section key={s.titulo} className="conj-secao">
              <h3>{s.titulo}</h3>
              {s.itens && <Itens itens={c[s.itens]} fontes={fontes} />}
              {(s.sub || []).map((sub) => (
                <div key={sub.titulo} className="conj-sub-secao">
                  <h4>{sub.titulo}</h4>
                  <Itens itens={c[sub.itens]} fontes={fontes} />
                </div>
              ))}
            </section>
          ))}
          <section className="conj-secao">
            <h3>5. Fontes Consultadas</h3>
            {fontes.length ? (
              <ol className="conj-fontes">
                {fontes.map((f) => (
                  <li key={f.n} id={`conj-fonte-${f.n}`} value={f.n}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">{f.titulo} <ExternalLink size={12} /></a>
                    <span> – Veículo: {f.veiculo} | Data de Publicação: {dataBR(f.data)}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="leg-vazio">Nenhuma fonte.</p>}
          </section>
          {Array.isArray(c.observacoes) && c.observacoes.length > 0 && (
            <section className="conj-secao conj-obs">
              <h4>Observações</h4>
              <Itens itens={c.observacoes} fontes={fontes} />
            </section>
          )}
        </article>
      )}
    </div>
  );
}

function Itens({ itens, fontes }) {
  const arr = Array.isArray(itens) ? itens : [];
  if (!arr.length) return <p className="leg-vazio">Nenhum item.</p>;
  return <ul className="conj-itens">{arr.map((t, i) => <li key={i}><Texto texto={t} fontes={fontes} /></li>)}</ul>;
}

// Texto com as referências "[n]" como links para a matéria.
function Texto({ texto, fontes }) {
  return partesComRefs(texto).map((p, i) => {
    if (p.texto != null) return <span key={i}>{p.texto}</span>;
    const f = fontes.find((x) => x.n === p.ref);
    return f
      ? <a key={i} className="conj-ref" href={f.url} target="_blank" rel="noopener noreferrer" title={`${f.veiculo}: ${f.titulo}`}>[{p.ref}]</a>
      : <span key={i}>[{p.ref}]</span>;
  });
}
