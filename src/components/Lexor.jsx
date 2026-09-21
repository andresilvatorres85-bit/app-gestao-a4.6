import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, FileText, Printer, ArrowLeft,
  AlertTriangle, Wallet, ClipboardList, FileDown, UserCheck, Combine,
} from "lucide-react";
import { StatCard } from "./UI.jsx";
import Espelho from "./Espelho.jsx";
import TabelaPropostas from "./TabelaPropostas.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { PROPOSTAS_LEXOR, ACOES_LEXOR } from "../data/lexor.js";
import {
  moeda, valorTotal, exercicioDe, situacaoDe, SITUACOES,
  STATUS_LEXOR_PADRAO, STATUS_DESCONSIDERAR,
} from "../lexorUtils.js";
import {
  podeJuntar, proximoNumero, montarConsolidada, autorSugerido,
} from "../lexorConsolidar.js";
import { exportarWord } from "../lexorExport.js";
import { exportarTabelaLexorPdf } from "../lexorPdf.js";
import { casaDoParlamentar, ROTULO_CASA } from "../lexorCasas.js";

const PAGE_SIZE = 30;

export default function Lexor() {
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("Todas");
  const [acao, setAcao] = useState("Todas");
  const [cmdo, setCmdo] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [situacao, setSituacao] = useState("Todas");
  const [casa, setCasa] = useState("Todas"); // 'Todas' | 'camara' | 'senado'
  const [statusLexor, setStatusLexor] = useState({});   // { nr: 'Confeccionado' }
  const [salvando, setSalvando] = useState(null);
  const [erroStatus, setErroStatus] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [paginaDesc, setPaginaDesc] = useState(1);
  const [selecionadas, setSelecionadas] = useState(() => new Set());
  const [espelhosDe, setEspelhosDe] = useState(null); // array de propostas em exibição
  const [consolidadas, setConsolidadas] = useState([]);  // registros do Supabase
  const [erroJuntar, setErroJuntar] = useState("");

  // exercício sugerido pela numeração das propostas, com ajuste manual
  const exercicioPadrao = useMemo(() => {
    const anos = PROPOSTAS_LEXOR.map(exercicioDe).filter(Boolean);
    return anos.length ? Math.max(...anos) : new Date().getFullYear() + 1;
  }, []);
  const [exercicio, setExercicio] = useState(exercicioPadrao);

  // Status da coluna LEXOR: carregado do Supabase e mantido em tempo real,
  // para que Maj Tiago, Maj Torres e ST Bacchiega vejam a mesma tramitação.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase.from("lexor_status").select("nr,status");
      if (!vivo) return;
      if (error) { setErroStatus(true); return; }
      setStatusLexor(Object.fromEntries(data.map(r => [r.nr, r.status])));
    })();
    const canal = supabase
      .channel("lexor_status_stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "lexor_status" }, payload => {
        const linha = payload.new || payload.old;
        if (!linha) return;
        setStatusLexor(prev => ({ ...prev, [linha.nr]: payload.new?.status || STATUS_LEXOR_PADRAO }));
      })
      .subscribe();
    return () => { vivo = false; supabase.removeChannel(canal); };
  }, []);

  const mudarStatus = useCallback(async (nr, novo) => {
    const anterior = statusLexor[nr] || STATUS_LEXOR_PADRAO;
    setStatusLexor(prev => ({ ...prev, [nr]: novo }));   // resposta imediata na tela
    setSalvando(nr);
    const { data: sessao } = await supabase.auth.getUser();
    const { error } = await supabase.from("lexor_status").upsert({
      nr,
      status: novo,
      atualizado_por: sessao?.user?.email || null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "nr" });
    setSalvando(null);
    if (error) {
      setStatusLexor(prev => ({ ...prev, [nr]: anterior }));   // desfaz se falhou
      setErroStatus(true);
    }
  }, [statusLexor]);

  // Uma proposta marcada como "Desconsiderar" sai da tabela principal e passa
  // para o card das desconsideradas, no fim da página.
  const desconsiderada = useCallback(
    nr => statusLexor[nr] === STATUS_DESCONSIDERAR, [statusLexor]);

  // ---------------------------------------------- propostas consolidadoras
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from("lexor_consolidadas").select("*").order("nr");
      if (!vivo) return;
      if (error) { setErroStatus(true); return; }
      setConsolidadas(data || []);
    })();
    return () => { vivo = false; };
  }, []);

  const indicePropostas = useMemo(
    () => new Map(PROPOSTAS_LEXOR.map(p => [p.nr, p])), []);

  const todasConsolidadas = useMemo(
    () => consolidadas.map(c => montarConsolidada(c, indicePropostas)).filter(Boolean),
    [consolidadas, indicePropostas]);

  const listaConsolidadas = useMemo(
    () => todasConsolidadas.filter(p => !desconsiderada(p.nr)),
    [todasConsolidadas, desconsiderada]);

  // Card das desconsideradas: propostas da planilha e consolidadoras juntas,
  // na ordem em que aparecem na origem.
  const listaDesconsideradas = useMemo(() => [
    ...PROPOSTAS_LEXOR.filter(p => desconsiderada(p.nr)),
    ...todasConsolidadas.filter(p => desconsiderada(p.nr)),
  ], [todasConsolidadas, desconsiderada]);

  const totalPaginasDesc = Math.max(1, Math.ceil(listaDesconsideradas.length / PAGE_SIZE));
  const pageDesc = listaDesconsideradas.slice((paginaDesc - 1) * PAGE_SIZE, paginaDesc * PAGE_SIZE);

  async function juntarSelecionadas() {
    setErroJuntar("");
    const escolhidas = PROPOSTAS_LEXOR.filter(p => selecionadas.has(p.nr));
    const veredito = podeJuntar(escolhidas);
    if (!veredito.ok) { setErroJuntar(veredito.erro); return; }

    const nr = proximoNumero(consolidadas);
    const { parlamentar, partido } = autorSugerido(escolhidas);
    const { data: sessao } = await supabase.auth.getUser();
    const registro = {
      nr,
      acao: escolhidas[0].acao,
      propostas: escolhidas.map(p => p.nr),
      parlamentar, partido,
      criado_por: sessao?.user?.email || null,
    };
    setConsolidadas(prev => [...prev, registro]);   // resposta imediata na tela
    setSelecionadas(new Set());
    const { error } = await supabase.from("lexor_consolidadas").insert(registro);
    if (error) {
      setConsolidadas(prev => prev.filter(c => c.nr !== nr));
      setErroJuntar("Não foi possível salvar a proposta consolidadora. "
        + "Rode o script supabase_lexor_consolidadas.sql no Supabase.");
    }
  }

  async function excluirConsolidada(nr) {
    const anterior = consolidadas;
    setConsolidadas(prev => prev.filter(c => c.nr !== nr));
    const { error } = await supabase.from("lexor_consolidadas").delete().eq("nr", nr);
    if (error) setConsolidadas(anterior);
  }

  const mudarAutorConsolidada = useCallback((nr, parlamentar, partido) => {
    setConsolidadas(prev => prev.map(c => (c.nr === nr ? { ...c, parlamentar } : c)));
    clearTimeout(mudarAutorConsolidada.timer);
    // grava depois que o usuário para de digitar, para não bater no banco a cada tecla
    mudarAutorConsolidada.timer = setTimeout(() => {
      supabase.from("lexor_consolidadas").update({ parlamentar, partido }).eq("nr", nr);
    }, 600);
  }, []);

  const opcoes = useMemo(() => {
    const ufs = new Set(), acoes = new Set(), cmdos = new Set(), tipos = new Set();
    for (const p of PROPOSTAS_LEXOR) {
      if (p.uf) ufs.add(p.uf);
      if (p.acao) acoes.add(p.acao);
      if (p.cmdo) cmdos.add(p.cmdo);
      if (p.tipo) tipos.add(p.tipo);
    }
    return {
      ufs: [...ufs].sort(),
      acoes: [...acoes].sort(),
      cmdos: [...cmdos].sort(),
      tipos: [...tipos].sort(),
    };
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return PROPOSTAS_LEXOR.filter(p => {
      if (desconsiderada(p.nr)) return false;
      if (uf !== "Todas" && p.uf !== uf) return false;
      if (acao !== "Todas" && p.acao !== acao) return false;
      if (cmdo !== "Todos" && p.cmdo !== cmdo) return false;
      if (tipo !== "Todos" && p.tipo !== tipo) return false;
      if (situacao !== "Todas" && situacaoDe(p) !== situacao) return false;
      if (casa !== "Todas" && casaDoParlamentar(p) !== casa) return false;
      if (!termo) return true;
      return [p.nr, p.beneficiario, p.cidade, p.objeto, p.proponente, p.parlamentar, p.acao]
        .some(c => (c || "").toString().toLowerCase().includes(termo));
    });
  }, [busca, uf, acao, cmdo, tipo, situacao, casa, desconsiderada]);

  useEffect(() => { setPagina(1); setPaginaDesc(1); }, [busca, uf, acao, cmdo, tipo, situacao, casa]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageItems = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const somaFiltrada = useMemo(() => filtradas.reduce((s, p) => s + valorTotal(p), 0), [filtradas]);
  const prospectadas = useMemo(
    () => filtradas.filter(p => situacaoDe(p) === "prospectada").length, [filtradas]);

  function exportarPdf() {
    const escopo = [];
    if (uf !== "Todas") escopo.push(`Estado: ${uf}`);
    if (tipo !== "Todos") escopo.push(`Tipo: ${tipo}`);
    if (acao !== "Todas") escopo.push(`Ação: ${acao}`);
    if (cmdo !== "Todos") escopo.push(`C Mil A: ${cmdo}`);
    if (casa !== "Todas") escopo.push(`Casa: ${ROTULO_CASA[casa]}`);
    if (busca.trim()) escopo.push(`Busca: “${busca.trim()}”`);
    exportarTabelaLexorPdf(filtradas, situacao, { escopo });
  }

  function alternar(nr) {
    setSelecionadas(prev => {
      const s = new Set(prev);
      s.has(nr) ? s.delete(nr) : s.add(nr);
      return s;
    });
  }

  function alternarPagina() {
    const todosNaPagina = pageItems.every(p => selecionadas.has(p.nr));
    setSelecionadas(prev => {
      const s = new Set(prev);
      for (const p of pageItems) todosNaPagina ? s.delete(p.nr) : s.add(p.nr);
      return s;
    });
  }

  function abrirSelecionadas() {
    const lista = [...filtradas, ...todasConsolidadas, ...listaDesconsideradas]
      .filter(p => selecionadas.has(p.nr));
    if (lista.length) setEspelhosDe(lista);
  }

  // ---------------------------------------------------------------- espelhos
  if (espelhosDe) {
    const nomeArquivo = espelhosDe.length === 1
      ? `espelho-${espelhosDe[0].nr}`
      : `espelhos-lexor-${exercicio}`;
    return (
      <div className="view-pad lexor-espelhos">
        <div className="espelho-barra no-print">
          <button className="btn btn-ghost btn-sm" onClick={() => setEspelhosDe(null)}>
            <ArrowLeft size={15} /> Voltar à lista
          </button>
          <span className="page-info">
            {espelhosDe.length === 1
              ? `Proposta ${espelhosDe[0].nr}`
              : `${espelhosDe.length} espelhos`} · exercício {exercicio}
          </span>
          <div className="espelho-barra-acoes">
            <button className="btn btn-ghost btn-sm" onClick={() => exportarWord(nomeArquivo)}>
              <FileDown size={15} /> Word
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> PDF
            </button>
          </div>
        </div>

        <div className="espelho-area">
          {espelhosDe.map(p => (
            <Espelho key={p.nr} proposta={p} exercicio={exercicio} />
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- lista
  return (
    <div className="view-pad view-pad-lexor">
      <h1 className="page-title">Espelhos de emenda — LEXOR</h1>
      <p className="page-sub">
        {PROPOSTAS_LEXOR.length.toLocaleString("pt-BR")} propostas do Controle_LEXOR.
        Selecione uma ou várias e gere os espelhos no formato oficial.
      </p>

      <div className="stat-grid stat-grid-3">
        <StatCard label="Propostas no filtro" value={filtradas.length.toLocaleString("pt-BR")}
          sub={`de ${PROPOSTAS_LEXOR.length.toLocaleString("pt-BR")} no total`} icon={ClipboardList} />
        <StatCard label="Valor somado" value={`R$ ${moeda(somaFiltrada)}`}
          sub="GND 3 + GND 4" icon={Wallet} />
        <StatCard label="Prospectadas" value={prospectadas.toLocaleString("pt-BR")}
          sub="com parlamentar autor" icon={UserCheck} />
      </div>

      <div className="lexor-filtros">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input className="input search-input" placeholder="Buscar por OM, cidade, objeto, autor ou nº…"
            value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className={`input ${tipo === "Todos" ? "input-marca" : ""}`}
          value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="Todos">Tipo de Emenda</option>
          {opcoes.tipos.map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={`input ${uf === "Todas" ? "input-marca" : ""}`}
          value={uf} onChange={e => setUf(e.target.value)}>
          <option value="Todas">Estados</option>
          {opcoes.ufs.map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={`input ${acao === "Todas" ? "input-marca" : ""}`}
          value={acao} onChange={e => setAcao(e.target.value)}>
          <option value="Todas">Ação Orçamentária</option>
          {opcoes.acoes.map(v => (
            <option key={v} value={v}>{v}{ACOES_LEXOR[v] ? "" : " (sem cadastro)"}</option>
          ))}
        </select>
        <select className={`input ${cmdo === "Todos" ? "input-marca" : ""}`}
          value={cmdo} onChange={e => setCmdo(e.target.value)}>
          <option value="Todos">C Mil A</option>
          {opcoes.cmdos.map(v => <option key={v}>{v}</option>)}
        </select>
        <select className={`input ${casa === "Todas" ? "input-marca" : ""}`}
          value={casa} onChange={e => setCasa(e.target.value)}>
          <option value="Todas">Casa</option>
          <option value="camara">Deputados</option>
          <option value="senado">Senadores</option>
        </select>
      </div>

      <div className="lexor-acoes">
        <div className="lexor-situacoes">
          {["Todas", "prospectada", "nao_prospectada", "pendencia"].map(chave => (
            <button key={chave}
              className={`chip ${situacao === chave ? "chip-active" : ""}`}
              onClick={() => setSituacao(chave)}>
              {chave === "pendencia" && <AlertTriangle size={13} />}
              {chave === "Todas" ? "Todas" : SITUACOES[chave].rotulo}
            </button>
          ))}
        </div>
        <div className="lexor-acoes-dir">
          <label className="lexor-exercicio">
            Exercício
            <input className="input" type="number" min="2020" max="2099" value={exercicio}
              onChange={e => setExercicio(Number(e.target.value))} />
          </label>
          <button className="btn btn-ghost btn-sm" disabled={filtradas.length === 0}
            onClick={exportarPdf}
            title="Exporta a tabela filtrada em PDF (paisagem), com o título conforme a situação selecionada">
            <FileDown size={15} /> Exportar PDF
          </button>
          <button className="btn btn-primary btn-sm" disabled={selecionadas.size === 0}
            onClick={abrirSelecionadas}>
            <FileText size={15} /> Gerar espelhos
          </button>
          <button className="btn btn-ghost btn-sm" disabled={selecionadas.size < 2}
            onClick={juntarSelecionadas}
            title="Reúne as propostas selecionadas num único espelho (mesma ação orçamentária)">
            <Combine size={15} /> Juntar propostas
          </button>
          <span className="page-info">{selecionadas.size} selecionada(s)</span>
        </div>
      </div>

      {erroJuntar && (
        <div className="lexor-aviso-erro">{erroJuntar}</div>
      )}

      {erroStatus && (
        <div className="lexor-aviso-erro">
          A coluna LEXOR não pôde ser lida ou gravada. Rode o script
          <code> supabase_lexor_status.sql </code> no SQL Editor do Supabase para criar a tabela.
        </div>
      )}

      <TabelaPropostas
        itens={pageItems}
        selecionadas={selecionadas}
        aoAlternar={alternar}
        aoAlternarTodos={alternarPagina}
        aoAbrirEspelho={p => setEspelhosDe([p])}
        statusLexor={statusLexor}
        aoMudarStatus={mudarStatus}
        salvando={salvando}
        erroStatus={erroStatus}
      />

      <div className="pagination">
        <button className="icon-btn" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16} /></button>
        <span className="page-info">Página {pagina} de {totalPaginas} · {filtradas.length.toLocaleString("pt-BR")} propostas</span>
        <button className="icon-btn" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}><ChevronRight size={16} /></button>
      </div>

      <h2 className="lexor-subtitulo">
        Propostas consolidadoras
        <span className="lexor-subtitulo-sub">
          {listaConsolidadas.length === 0
            ? "nenhuma criada até agora"
            : `${listaConsolidadas.length} proposta(s) reunindo várias emendas num só espelho`}
        </span>
      </h2>

      <TabelaPropostas
        consolidadora
        itens={listaConsolidadas}
        selecionadas={selecionadas}
        aoAlternar={alternar}
        aoAlternarTodos={() => {
          const todos = listaConsolidadas.every(p => selecionadas.has(p.nr));
          setSelecionadas(prev => {
            const set = new Set(prev);
            for (const p of listaConsolidadas) todos ? set.delete(p.nr) : set.add(p.nr);
            return set;
          });
        }}
        aoAbrirEspelho={p => setEspelhosDe([p])}
        statusLexor={statusLexor}
        aoMudarStatus={mudarStatus}
        salvando={salvando}
        erroStatus={erroStatus}
        aoMudarAutor={mudarAutorConsolidada}
        aoExcluir={excluirConsolidada}
        vazio="Selecione duas ou mais propostas da mesma ação e use “Juntar propostas”."
      />

      <h2 className="lexor-subtitulo">
        Propostas desconsideradas
        <span className="lexor-subtitulo-sub">
          {listaDesconsideradas.length === 0
            ? "nenhuma proposta marcada"
            : `${listaDesconsideradas.length} proposta(s) fora do lançamento no LEXOR`}
        </span>
      </h2>

      <TabelaPropostas
        consolidadora
        itens={pageDesc}
        selecionadas={selecionadas}
        aoAlternar={alternar}
        aoAlternarTodos={() => {
          const todos = pageDesc.every(p => selecionadas.has(p.nr));
          setSelecionadas(prev => {
            const set = new Set(prev);
            for (const p of pageDesc) todos ? set.delete(p.nr) : set.add(p.nr);
            return set;
          });
        }}
        aoAbrirEspelho={p => setEspelhosDe([p])}
        statusLexor={statusLexor}
        aoMudarStatus={mudarStatus}
        salvando={salvando}
        erroStatus={erroStatus}
        aoMudarAutor={mudarAutorConsolidada}
        aoExcluir={excluirConsolidada}
        vazio="Marque uma proposta como “Desconsiderar” na coluna LEXOR para movê-la para cá."
      />

      {listaDesconsideradas.length > PAGE_SIZE && (
        <div className="pagination">
          <button className="icon-btn" disabled={paginaDesc <= 1}
            onClick={() => setPaginaDesc(p => p - 1)}><ChevronLeft size={16} /></button>
          <span className="page-info">
            Página {paginaDesc} de {totalPaginasDesc} · {listaDesconsideradas.length} desconsideradas
          </span>
          <button className="icon-btn" disabled={paginaDesc >= totalPaginasDesc}
            onClick={() => setPaginaDesc(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
