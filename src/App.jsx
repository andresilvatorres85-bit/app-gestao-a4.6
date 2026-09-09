import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Plus, LayoutDashboard, History, Check, X, LogOut, Settings, Gauge, FileText, Landmark } from "lucide-react";
import { supabase } from "./lib/supabaseClient.js";
import { HISTORICO_DATA } from "./data/historico.js";
import { usePartidos } from "./components/usePartidos.js";
import { useUsuarios, nomePorEmail } from "./components/useUsuarios.js";
import bgImage from "./bg.jpg";
import brasao from "./brasao.png";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import NovoRegistro from "./components/NovoRegistro.jsx";
import Historico from "./components/Historico.jsx";
import Configuracoes from "./components/Configuracoes.jsx";
// A aba LEXOR carrega ~1.200 propostas; só é baixada quando o usuário a abre.
const Lexor = lazy(() => import("./components/Lexor.jsx"));
// A aba LOA embute (ao vivo) o app "Análise LOA"; só é montada quando aberta.
const Loa = lazy(() => import("./components/Loa.jsx"));

// Converte uma linha da tabela "registros" (Supabase) para o formato interno
// enxuto usado pelos componentes (mesmas chaves do histórico da planilha).
function mapDbRow(row) {
  return {
    id: row.id,
    d: row.dia, m: row.mes, y: row.ano,
    f: row.funcao, n: row.nome, p: row.partido, uf: row.uf,
    role: row.papel, esp: row.espectro, assunto: row.assunto,
    autor: row.autor, protocolo: row.protocolo,
    criadoEm: row.criado_em ? new Date(row.criado_em).getTime() : null,
  };
}

// Abas principais do aplicativo
const ABAS = [
  { id: "metricas", label: "MÉTRICAS", icon: Gauge },
  { id: "lexor", label: "LEXOR", icon: FileText },
  { id: "loa", label: "LOA", icon: Landmark },
];

// Seções internas da aba MÉTRICAS
const NAV = [
  { id: "dashboard", label: "Painel", icon: LayoutDashboard },
  { id: "novo", label: "Lançar", icon: Plus },
  { id: "historico", label: "Histórico", icon: History },
  { id: "config", label: "Configurações", icon: Settings },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = deslogado
  const [aba, setAba] = useState("metricas");
  const headerRef = useRef(null);
  const subnavRef = useRef(null);
  const [view, setView] = useState("dashboard");
  const [novos, setNovos] = useState([]);
  const [loadedNovos, setLoadedNovos] = useState(false);
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(true);

  const { partidos, mapaEspectro, carregado: partidosCarregados } = usePartidos(session);
  const { usuarios, carregado: usuariosCarregados } = useUsuarios(session);

  const emailAtual = session?.user?.email || null;
  const autorAtual = nomePorEmail(usuarios, emailAtual);

  // Mede a altura real das barras fixas e publica em --topbar-h / --subnav-h,
  // para que o conteúdo comece exatamente abaixo delas em qualquer tela.
  // A subnav some no celular (display:none), e aí sua altura medida é 0 — o
  // cálculo do padding se ajusta sozinho, sem media query.
  useEffect(() => {
    const raiz = document.documentElement;
    const aplicar = () => {
      raiz.style.setProperty("--topbar-h", `${headerRef.current?.offsetHeight || 94}px`);
      raiz.style.setProperty("--subnav-h", `${subnavRef.current?.offsetHeight || 0}px`);
    };
    aplicar();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", aplicar);
      return () => window.removeEventListener("resize", aplicar);
    }
    const ro = new ResizeObserver(aplicar);
    if (headerRef.current) ro.observe(headerRef.current);
    if (subnavRef.current) ro.observe(subnavRef.current);
    return () => ro.disconnect();
  }, [session, aba]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const carregarNovos = useCallback(async () => {
    const { data, error } = await supabase.from("registros").select("*").order("criado_em", { ascending: true });
    if (error) { setOnline(false); return; }
    setOnline(true);
    setNovos((data || []).map(mapDbRow));
    setLoadedNovos(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    carregarNovos();
    const channel = supabase
      .channel("registros-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "registros" }, () => carregarNovos())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, carregarNovos]);

  const handleSaved = useCallback((row) => {
    setToast({ tipo: "ok", msg: `Contato registrado — protocolo ${row.protocolo}` });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase.from("registros").delete().eq("id", id);
    if (error) {
      setToast({ tipo: "erro", msg: "Não foi possível excluir." });
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const allRecords = useMemo(() => {
    const hist = HISTORICO_DATA.map(r => ({ ...r, origem: "historico" }));
    const nov = novos.map(r => ({ ...r, origem: "novo" }));
    return [...hist, ...nov];
  }, [novos]);

  const nextProtocolo = novos.length + 1;

  if (session === undefined) {
    return <div className="login-loading">Carregando…</div>;
  }
  if (session === null) {
    return <Login bgImage={bgImage} brasao={brasao} />;
  }

  return (
    <div className="app-shell">
      <div className="app-bg" style={{ backgroundImage: `url(${bgImage})` }} />

      <header className="topbar" ref={headerRef}>
        <div className="brand">
          <img src={brasao} className="brand-brasao" alt="Brasão da Assessoria Parlamentar do Gabinete do Comandante do Exército" />
          <div className="brand-text">
            <span className="brand-title">GESTÃO</span>
            <span className="brand-sub">A4.6 - Subassessoria de Orçamento</span>
          </div>
        </div>
        <div className="topbar-right">
          <nav className="abas" aria-label="Abas principais">
            {ABAS.map(a => (
              <button key={a.id} className={`aba-btn ${aba === a.id ? "aba-btn-active" : ""}`} onClick={() => setAba(a.id)}>
                <a.icon size={15} strokeWidth={1.75} /> {a.label}
              </button>
            ))}
          </nav>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()} title="Sair">
            <LogOut size={14} /> <span className="logout-txt">Sair</span>
          </button>
        </div>
      </header>

      {aba === "metricas" && (
        <nav className="subnav" ref={subnavRef} aria-label="Seções de Métricas">
          {NAV.map(n => (
            <button key={n.id} className={`subnav-btn ${view === n.id ? "subnav-btn-active" : ""}`} onClick={() => setView(n.id)}>
              <n.icon size={15} strokeWidth={1.75} /> {n.label}
            </button>
          ))}
        </nav>
      )}

      <main className={`main${aba === "loa" ? " main-loa" : ""}`}>
        {aba === "loa" ? (
          <Suspense fallback={<div className="loading-state">Carregando Análise LOA…</div>}>
            <Loa />
          </Suspense>
        ) : aba === "lexor" ? (
          <Suspense fallback={<div className="loading-state">Carregando propostas…</div>}>
            <Lexor />
          </Suspense>
        ) : !loadedNovos || !partidosCarregados || !usuariosCarregados ? (
          <div className="loading-state">Carregando…</div>
        ) : view === "dashboard" ? (
          <Dashboard allRecords={allRecords} novos={novos} />
        ) : view === "novo" ? (
          <NovoRegistro onSaved={handleSaved} nextProtocolo={nextProtocolo} partidos={partidos} mapaEspectro={mapaEspectro} autorAtual={autorAtual} emailAtual={emailAtual} />
        ) : view === "historico" ? (
          <Historico allRecords={allRecords} onDelete={handleDelete} />
        ) : (
          <Configuracoes partidos={partidos} usuarios={usuarios} emailAtual={emailAtual} />
        )}
      </main>

      {aba === "metricas" && (
        <nav className="bottomnav">
          {NAV.map(n => (
            <button key={n.id} className={`bottomnav-btn ${view === n.id ? "bottomnav-btn-active" : ""}`} onClick={() => setView(n.id)}>
              <n.icon size={19} strokeWidth={1.75} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {toast && (
        <div className={`toast toast-${toast.tipo}`}>
          {toast.tipo === "ok" ? <Check size={15} /> : <X size={15} />} {toast.msg}
        </div>
      )}
      {!online && <div className="toast toast-erro">Sem conexão com o servidor — verifique sua internet.</div>}
    </div>
  );
}
