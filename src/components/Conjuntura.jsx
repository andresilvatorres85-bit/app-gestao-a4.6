import { useState } from "react";
import {
  FileDown, FileText, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Clock,
  Newspaper, TrendingUp, Ban, Landmark, Siren, CalendarClock, Info, Sparkles,
} from "lucide-react";
import { dataBR, horaBR, partesComRefs, exportarConjunturaDocx, exportarConjunturaPdf } from "../conjunturaDoc.js";

// Aba "Conjuntura" (CONHECIMENTO): relatório diário sobre o Orçamento Público
// Federal, gerado de segunda a sexta às 08:00 pelo workflow conjuntura.yml.

// Seções exibidas na tela: cor, ícone e âncora de cada uma. A ordem e os
// títulos seguem o relatório exportado (SECOES em conjunturaDoc.js).
const BLOCOS = [
  { id: "panorama", num: "1", titulo: "Panorama Geral e Meta Fiscal", Icone: TrendingUp, cor: "#5A8FCB" },
  { id: "bloqueios", num: "2", titulo: "Bloqueios, Contingenciamentos e Alocação de Recursos", Icone: Ban, cor: "#D6685F" },
  { id: "congresso", num: "3", titulo: "A Relação Executivo vs. Congresso / CMO", Icone: Landmark, cor: "#C9A96A" },
];
const ANALISE = [
  { id: "atencao", titulo: "Pontos de atenção", Icone: Siren, cor: "#D6A94B" },
  { id: "proximos_passos", titulo: "Próximos passos", Icone: CalendarClock, cor: "#3AA6A6" },
];
const NAV = [
  ["panorama", "Panorama"], ["bloqueios", "Bloqueios"], ["congresso", "Congresso / CMO"],
  ["analise", "Análise do dia"], ["fontes", "Fontes"],
];

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const diaSemana = (iso) => {
  const [a, m, d] = String(iso || "").split("-").map(Number);
  return a ? DIAS[new Date(a, m - 1, d).getDay()] : "";
};
const lista = (v) => (Array.isArray(v) ? v : []);
const irPara = (id) => document.getElementById(`conj-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Conjuntura({ conjuntura }) {
  const { relatorios = [], carregado, erro } = conjuntura || {};
  const [escolhida, setEscolhida] = useState(null);
  const [exportando, setExportando] = useState("");
  const [realce, setRealce] = useState(null); // fonte destacada ao passar o mouse numa referência
  const idx = Math.max(0, relatorios.findIndex((r) => r.data === escolhida));
  const rel = relatorios[idx];

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
      <div className="conj-vazio-geral">
        <Newspaper size={30} />
        <h2>Nenhum relatório gerado ainda</h2>
        <p>O relatório de Conjuntura é gerado automaticamente de segunda a sexta, às 8h (horário de Brasília).</p>
      </div>
    );
  }

  const c = rel.conteudo || {};
  const fontes = lista(c.fontes);
  const veiculos = new Set(fontes.map((f) => f.veiculo)).size;
  const temConteudo = !!rel.conteudo;
  const refs = { fontes, realce, setRealce };
  // relatorios vem do mais novo para o mais antigo.
  const anterior = relatorios[idx + 1];
  const proximo = relatorios[idx - 1];

  return (
    <div className="conj-wrap">
      <header className="conj-cab">
        <div className="conj-cab-tit">
          <span className="conj-kicker">Orçamento Público Federal</span>
          <h2 className="page-title">Conjuntura do dia</h2>
          <div className="conj-meta">
            <span><CalendarDays size={14} /> {dataBR(rel.data)} · {diaSemana(rel.data)}</span>
            {rel.gerado_em && <span><Clock size={14} /> gerado às {horaBR(rel.gerado_em)}</span>}
            {temConteudo && <span><Newspaper size={14} /> {fontes.length} {fontes.length === 1 ? "fonte" : "fontes"} · {veiculos} {veiculos === 1 ? "veículo" : "veículos"}</span>}
          </div>
        </div>
        <div className="conj-cab-acoes">
          <div className="conj-datas">
            <button className="icon-btn" disabled={!anterior} title="Dia anterior" onClick={() => setEscolhida(anterior.data)}><ChevronLeft size={17} /></button>
            <select className="input conj-data" value={rel.data} onChange={(e) => setEscolhida(e.target.value)} title="Escolher outro dia">
              {relatorios.map((r) => (
                <option key={r.data} value={r.data}>{dataBR(r.data)}{r.status === "erro" ? " (falhou)" : ""}</option>
              ))}
            </select>
            <button className="icon-btn" disabled={!proximo} title="Dia seguinte" onClick={() => setEscolhida(proximo.data)}><ChevronRight size={17} /></button>
          </div>
          <div className="conj-exportar">
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
      </header>

      {rel.status === "erro" && (
        <div className="alert alert-error conj-falha">
          <AlertTriangle size={16} />
          <span>
            A geração do relatório de {dataBR(rel.data)} falhou: {rel.erro || "erro desconhecido"}.
            {temConteudo && " Abaixo, a última versão gerada com sucesso neste dia."}
          </span>
        </div>
      )}

      {temConteudo && (
        <>
          <nav className="conj-nav" aria-label="Seções do relatório">
            {NAV.map(([id, rot]) => <button key={id} className="chip" onClick={() => irPara(id)}>{rot}</button>)}
          </nav>

          {c.resumo && (
            <section className="conj-destaque">
              <span className="conj-destaque-rot"><Sparkles size={14} /> Destaque do dia</span>
              <p><Texto texto={c.resumo} {...refs} /></p>
            </section>
          )}

          {BLOCOS.map((b) => (
            <Bloco key={b.id} id={b.id} titulo={b.titulo} num={b.num} Icone={b.Icone} cor={b.cor} itens={c[b.id]} refs={refs} />
          ))}

          <section id="conj-analise" className="conj-analise">
            <h3 className="conj-analise-tit"><span className="conj-num">4</span> Análise Crítica / Tendências do Dia</h3>
            <div className="conj-analise-grid">
              {ANALISE.map((b) => (
                <Bloco key={b.id} id={b.id} titulo={b.titulo} Icone={b.Icone} cor={b.cor} itens={c[b.id]} refs={refs} compacto />
              ))}
            </div>
          </section>

          <section id="conj-fontes" className="conj-fontes">
            <h3 className="conj-analise-tit"><span className="conj-num">5</span> Fontes Consultadas</h3>
            {fontes.length ? (
              <ol className="conj-fontes-grid">
                {fontes.map((f) => (
                  <li key={f.n} id={`conj-fonte-${f.n}`} className={`conj-fonte ${realce === f.n ? "conj-fonte-on" : ""}`}>
                    <span className="conj-fonte-n">{f.n}</span>
                    <div className="conj-fonte-corpo">
                      <span className="conj-fonte-veic">{f.veiculo} · {dataBR(f.data)}</span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="conj-fonte-tit">{f.titulo}</a>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="icon-btn conj-fonte-abrir" title="Abrir a matéria">
                      <ExternalLink size={14} />
                    </a>
                  </li>
                ))}
              </ol>
            ) : <p className="conj-sem-itens">Nenhuma fonte.</p>}
          </section>

          {lista(c.observacoes).length > 0 && (
            <details className="conj-obs">
              <summary><Info size={14} /> Observações sobre as fontes ({lista(c.observacoes).length})</summary>
              <ul>{lista(c.observacoes).map((t, i) => <li key={i}><Texto texto={t} {...refs} /></li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Bloco({ id, num, titulo, Icone, cor, itens, refs, compacto }) {
  const arr = lista(itens);
  return (
    <section id={`conj-${id}`} className={`conj-bloco ${compacto ? "conj-bloco-compacto" : ""}`} style={{ "--conj-cor": cor }}>
      <h3 className="conj-bloco-tit">
        <span className="conj-bloco-ic"><Icone size={16} /></span>
        <span>{num && <span className="conj-bloco-num">{num}.</span>} {titulo}</span>
        {arr.length > 0 && <span className="conj-bloco-cont">{arr.length}</span>}
      </h3>
      {arr.length ? (
        <ul className="conj-itens">{arr.map((t, i) => <li key={i}><Texto texto={t} {...refs} /></li>)}</ul>
      ) : <p className="conj-sem-itens">Nenhuma notícia sobre este tema hoje.</p>}
    </section>
  );
}

// Texto com as referências "[n]" como etiquetas: passar o mouse destaca a
// fonte na lista; clicar abre a matéria.
function Texto({ texto, fontes, setRealce }) {
  return partesComRefs(texto).map((p, i) => {
    if (p.texto != null) return <span key={i}>{p.texto}</span>;
    const f = fontes.find((x) => x.n === p.ref);
    if (!f) return null;
    return (
      <a key={i} className="conj-ref" href={f.url} target="_blank" rel="noopener noreferrer"
        title={`${f.veiculo}: ${f.titulo}`}
        onMouseEnter={() => setRealce(f.n)} onMouseLeave={() => setRealce(null)}
        onFocus={() => setRealce(f.n)} onBlur={() => setRealce(null)}>
        {p.ref}
      </a>
    );
  });
}
