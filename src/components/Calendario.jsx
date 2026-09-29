import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Save, Clock, MapPin, AlignLeft,
} from "lucide-react";

// ---------------------------------------------------------------- utilidades
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const H_ALTURA = 46; // px por hora nas visões Semana/Dia

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const startOfWeek = (d) => addDays(startOfDay(d), -startOfDay(d).getDay());
const startOfMonth = (d) => { const x = startOfDay(d); x.setDate(1); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const p2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`; };
const hm = (ms) => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
// Junta "yyyy-mm-dd" + "hh:mm" num timestamp (ms) no fuso local.
const combinar = (data, hora) => {
  const [y, m, d] = data.split("-").map(Number);
  const [hh, mm] = (hora || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime();
};

// Paleta de cores dos eventos (rótulo + hex claro/escuro do texto/fundo).
export const CORES = {
  azul:     { nome: "Azul",     bg: "#3B6FB0", chip: "rgba(59,111,176,0.22)",  borda: "#3B6FB0" },
  verde:    { nome: "Verde",    bg: "#3F9D6B", chip: "rgba(63,157,107,0.22)",  borda: "#3F9D6B" },
  vermelho: { nome: "Vermelho", bg: "#C6543F", chip: "rgba(198,84,63,0.22)",   borda: "#C6543F" },
  roxo:     { nome: "Roxo",     bg: "#7A5AC2", chip: "rgba(122,90,194,0.22)",  borda: "#7A5AC2" },
  ambar:    { nome: "Âmbar",    bg: "#C79A3A", chip: "rgba(199,154,58,0.24)",  borda: "#C79A3A" },
  ciano:    { nome: "Ciano",    bg: "#3AA6A6", chip: "rgba(58,166,166,0.22)",  borda: "#3AA6A6" },
  rosa:     { nome: "Rosa",     bg: "#C25A93", chip: "rgba(194,90,147,0.22)",  borda: "#C25A93" },
  cinza:    { nome: "Cinza",    bg: "#6C7A72", chip: "rgba(108,122,114,0.24)", borda: "#6C7A72" },
};
const cor = (c) => CORES[c] || CORES.azul;

// Eventos que ocorrem num dia (all-day ou cruzando o dia).
function eventosDoDia(eventos, dia) {
  const ini = startOfDay(dia).getTime();
  const fim = ini + 86400000;
  return eventos
    .filter((e) => e.inicio != null && (e.fim ?? e.inicio) >= ini && e.inicio < fim)
    .sort((a, b) => (b.diaInteiro - a.diaInteiro) || (a.inicio - b.inicio));
}

// Layout em colunas para eventos com hora que se sobrepõem (Semana/Dia).
function layoutColunas(evs) {
  const ord = [...evs].sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
  const postos = ord.map((e) => ({ e, col: 0, cols: 1 }));
  let grupo = [], fimGrupo = -Infinity;
  const fechar = () => {
    const n = Math.max(...grupo.map((p) => p.col)) + 1;
    grupo.forEach((p) => { p.cols = n; });
    grupo = [];
  };
  for (const p of postos) {
    if (grupo.length && p.e.inicio >= fimGrupo) fechar();
    const usadas = new Set(grupo.filter((q) => (q.e.fim ?? q.e.inicio) > p.e.inicio).map((q) => q.col));
    let c = 0; while (usadas.has(c)) c++;
    p.col = c;
    grupo.push(p);
    fimGrupo = Math.max(fimGrupo, p.e.fim ?? p.e.inicio);
  }
  if (grupo.length) fechar();
  return postos;
}

// =========================================================================
export default function Calendario({ eventos = [], inserir, atualizar, excluir, carregado, erro, vistaInicial = "mes" }) {
  const [vista, setVista] = useState(vistaInicial); // 'mes' | 'semana' | 'dia'
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [modal, setModal] = useState(null); // evento em edição/criação, ou null

  const hoje = startOfDay(new Date());

  function irHoje() { setCursor(startOfDay(new Date())); }
  function passo(dir) {
    if (vista === "mes") setCursor((c) => addMonths(c, dir));
    else if (vista === "semana") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  }

  const titulo = useMemo(() => {
    if (vista === "mes") return cap(`${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`);
    if (vista === "dia") return cap(`${SEMANA[cursor.getDay()]}, ${cursor.getDate()} de ${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`);
    const ini = startOfWeek(cursor), fim = addDays(ini, 6);
    const mesmoMes = ini.getMonth() === fim.getMonth();
    return mesmoMes
      ? `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} de ${ini.getFullYear()}`
      : `${ini.getDate()} de ${MESES_CURTO[ini.getMonth()]} – ${fim.getDate()} de ${MESES_CURTO[fim.getMonth()]} de ${fim.getFullYear()}`;
  }, [vista, cursor]);

  // Abre o modal para um NOVO evento num dia (e hora opcional).
  function novoEvento(dia, hora = null) {
    const base = startOfDay(dia);
    const h = hora != null ? hora : Math.min(new Date().getHours() + 1, 22);
    const ini = new Date(base); ini.setHours(h, 0, 0, 0);
    const fim = new Date(ini); fim.setHours(h + 1, 0, 0, 0);
    setModal({
      id: null, titulo: "", diaInteiro: false,
      dataInicio: ymd(ini), horaInicio: hm(ini.getTime()),
      dataFim: ymd(fim), horaFim: hm(fim.getTime()),
      local: "", descricao: "", cor: "azul",
    });
  }
  function editarEvento(e) {
    setModal({
      id: e.id, titulo: e.titulo, diaInteiro: e.diaInteiro,
      dataInicio: ymd(e.inicio), horaInicio: hm(e.inicio),
      dataFim: ymd(e.fim ?? e.inicio), horaFim: hm(e.fim ?? e.inicio),
      local: e.local || "", descricao: e.descricao || "", cor: e.cor || "azul",
    });
  }
  function abrirDia(dia) { setCursor(startOfDay(dia)); setVista("dia"); }

  return (
    <div className="view-pad cal-wrap">
      <div className="cal-toolbar">
        <div className="cal-toolbar-esq">
          <button className="btn btn-primary btn-sm" onClick={() => novoEvento(cursor)}>
            <Plus size={15} /> Criar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={irHoje}>Hoje</button>
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => passo(-1)} title="Anterior"><ChevronLeft size={18} /></button>
            <button className="icon-btn" onClick={() => passo(1)} title="Próximo"><ChevronRight size={18} /></button>
          </div>
          <h1 className="cal-titulo">{titulo}</h1>
        </div>
        <div className="cal-vistas">
          {[["mes", "Mês"], ["semana", "Semana"], ["dia", "Dia"]].map(([id, rot]) => (
            <button key={id} className={`chip ${vista === id ? "chip-active" : ""}`} onClick={() => setVista(id)}>{rot}</button>
          ))}
        </div>
      </div>

      {erro && (
        <div className="lexor-aviso-erro">
          A agenda não pôde ser lida ou gravada. Rode o script
          <code> supabase_calendario.sql </code> no SQL Editor do Supabase para criar a tabela.
        </div>
      )}

      {!carregado ? (
        <div className="loading-state">Carregando agenda…</div>
      ) : vista === "mes" ? (
        <VistaMes cursor={cursor} hoje={hoje} eventos={eventos}
          aoDia={abrirDia} aoNovo={novoEvento} aoEditar={editarEvento} />
      ) : vista === "semana" ? (
        <VistaTempo dias={7} inicio={startOfWeek(cursor)} hoje={hoje} eventos={eventos}
          aoDia={abrirDia} aoNovoHora={novoEvento} aoNovoDia={novoEvento} aoEditar={editarEvento} />
      ) : (
        <VistaTempo dias={1} inicio={startOfDay(cursor)} hoje={hoje} eventos={eventos}
          aoDia={abrirDia} aoNovoHora={novoEvento} aoNovoDia={novoEvento} aoEditar={editarEvento} />
      )}

      {modal && (
        <ModalEvento
          estado={modal}
          onFechar={() => setModal(null)}
          onSalvar={async (e, dados) => {
            const payload = montarPayload(dados);
            const res = e.id ? await atualizar(e.id, payload) : await inserir(payload);
            if (!res?.error) setModal(null);
            return res;
          }}
          onExcluir={async (id) => { await excluir(id); setModal(null); }}
        />
      )}
    </div>
  );
}

function montarPayload(d) {
  if (d.diaInteiro) {
    const ini = combinar(d.dataInicio, "00:00");
    const fimData = d.dataFim || d.dataInicio;
    const fim = combinar(fimData, "23:59");
    return { titulo: d.titulo, diaInteiro: true, inicio: ini, fim, local: d.local, descricao: d.descricao, cor: d.cor };
  }
  let ini = combinar(d.dataInicio, d.horaInicio);
  let fim = combinar(d.dataFim || d.dataInicio, d.horaFim || d.horaInicio);
  if (fim <= ini) fim = ini + 3600000; // garante duração mínima de 1h
  return { titulo: d.titulo, diaInteiro: false, inicio: ini, fim, local: d.local, descricao: d.descricao, cor: d.cor };
}

// ------------------------------------------------------------- Visão de Mês
function VistaMes({ cursor, hoje, eventos, aoDia, aoNovo, aoEditar }) {
  const ini = startOfWeek(startOfMonth(cursor));
  const dias = Array.from({ length: 42 }, (_, i) => addDays(ini, i));
  const mesAtual = cursor.getMonth();
  const MAX = 3; // eventos visíveis por célula antes do "+N"

  return (
    <div className="cal-mes">
      <div className="cal-mes-cab">
        {SEMANA.map((s) => <div key={s} className="cal-mes-diasem">{s}</div>)}
      </div>
      <div className="cal-mes-grade">
        {dias.map((dia, i) => {
          const doDia = eventosDoDia(eventos, dia);
          const foraMes = dia.getMonth() !== mesAtual;
          const eHoje = sameDay(dia, hoje);
          return (
            <div key={i} className={`cal-cel ${foraMes ? "cal-cel-fora" : ""}`}
              onClick={() => aoNovo(dia)}>
              <button className={`cal-cel-num ${eHoje ? "cal-cel-hoje" : ""}`}
                onClick={(ev) => { ev.stopPropagation(); aoDia(dia); }}>
                {dia.getDate()}
              </button>
              <div className="cal-cel-evs">
                {doDia.slice(0, MAX).map((e) => (
                  <button key={e.id} className={`cal-ev ${e.diaInteiro ? "cal-ev-dia" : ""}`}
                    style={e.diaInteiro
                      ? { background: cor(e.cor).bg, color: "#fff" }
                      : { background: cor(e.cor).chip, borderLeft: `3px solid ${cor(e.cor).borda}` }}
                    title={e.titulo}
                    onClick={(ev) => { ev.stopPropagation(); aoEditar(e); }}>
                    {!e.diaInteiro && <span className="cal-ev-hora">{hm(e.inicio)}</span>}
                    <span className="cal-ev-tit">{e.titulo}</span>
                  </button>
                ))}
                {doDia.length > MAX && (
                  <button className="cal-ev-mais" onClick={(ev) => { ev.stopPropagation(); aoDia(dia); }}>
                    +{doDia.length - MAX} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------ Visão de Semana / Dia (tempo)
function VistaTempo({ dias, inicio, hoje, eventos, aoDia, aoNovoHora, aoEditar }) {
  const colDias = Array.from({ length: dias }, (_, i) => addDays(inicio, i));
  const scrollRef = useRef(null);
  const [agora, setAgora] = useState(Date.now());

  // Rola até ~7h ao montar; atualiza a linha "agora" a cada minuto.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * H_ALTURA - 12;
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, [dias, inicio.getTime()]);

  const minutosAgora = (() => { const d = new Date(agora); return d.getHours() * 60 + d.getMinutes(); })();

  return (
    <div className="cal-tempo">
      {/* cabeçalho dos dias */}
      <div className="cal-tempo-cab">
        <div className="cal-tempo-gutter" />
        {colDias.map((dia, i) => {
          const eHoje = sameDay(dia, hoje);
          const daDia = eventosDoDia(eventos, dia).filter((e) => e.diaInteiro);
          return (
            <div key={i} className="cal-tempo-diacab">
              <button className={`cal-tempo-diabtn ${eHoje ? "cal-cel-hoje" : ""}`} onClick={() => aoDia(dia)}>
                <span className="cal-tempo-sem">{SEMANA[dia.getDay()]}</span>
                <span className="cal-tempo-num">{dia.getDate()}</span>
              </button>
              <div className="cal-tempo-allday">
                {daDia.map((e) => (
                  <button key={e.id} className="cal-ev cal-ev-dia" style={{ background: cor(e.cor).bg, color: "#fff" }}
                    title={e.titulo} onClick={() => aoEditar(e)}>
                    <span className="cal-ev-tit">{e.titulo}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* grade de horas */}
      <div className="cal-tempo-corpo" ref={scrollRef}>
        <div className="cal-tempo-grade" style={{ height: `${24 * H_ALTURA}px` }}>
          <div className="cal-tempo-horas">
            {HORAS.map((h) => (
              <div key={h} className="cal-tempo-hlinha" style={{ height: `${H_ALTURA}px` }}>
                <span className="cal-tempo-hrot">{h > 0 ? `${p2(h)}:00` : ""}</span>
              </div>
            ))}
          </div>
          {colDias.map((dia, i) => {
            const ini = startOfDay(dia).getTime();
            const fimDia = ini + 86400000;
            const timed = eventos.filter((e) => !e.diaInteiro && e.inicio != null
              && (e.fim ?? e.inicio) > ini && e.inicio < fimDia);
            const postos = layoutColunas(timed);
            const eHoje = sameDay(dia, hoje);
            return (
              <div key={i} className="cal-tempo-col"
                onClick={(ev) => {
                  const rect = ev.currentTarget.getBoundingClientRect();
                  const y = ev.clientY - rect.top + ev.currentTarget.scrollTop;
                  const hora = Math.max(0, Math.min(23, Math.floor(y / H_ALTURA)));
                  aoNovoHora(dia, hora);
                }}>
                {HORAS.map((h) => <div key={h} className="cal-tempo-cel" style={{ height: `${H_ALTURA}px` }} />)}
                {eHoje && (
                  <div className="cal-agora" style={{ top: `${(minutosAgora / 60) * H_ALTURA}px` }}>
                    <span className="cal-agora-bola" />
                  </div>
                )}
                {postos.map(({ e, col, cols }) => {
                  const s = Math.max(e.inicio, ini);
                  const f = Math.min(e.fim ?? (e.inicio + 3600000), fimDia);
                  const top = ((s - ini) / 60000 / 60) * H_ALTURA;
                  const alt = Math.max(20, ((f - s) / 60000 / 60) * H_ALTURA - 2);
                  return (
                    <button key={e.id} className="cal-ev-bloco"
                      style={{
                        top: `${top}px`, height: `${alt}px`,
                        left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`,
                        background: cor(e.cor).chip, borderLeft: `3px solid ${cor(e.cor).borda}`,
                      }}
                      title={e.titulo}
                      onClick={(ev) => { ev.stopPropagation(); aoEditar(e); }}>
                      <span className="cal-ev-tit">{e.titulo}</span>
                      <span className="cal-ev-hora2">{hm(e.inicio)}–{hm(e.fim ?? e.inicio)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Modal de evento
function ModalEvento({ estado, onFechar, onSalvar, onExcluir }) {
  const [f, setF] = useState(estado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function salvar(ev) {
    ev.preventDefault();
    if (!f.titulo.trim()) { setErro("Dê um título ao evento."); return; }
    setSalvando(true);
    const res = await onSalvar(estado, f);
    setSalvando(false);
    if (res?.error) setErro("Não foi possível salvar: " + (res.error.message || "erro"));
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <form className="modal-caixa cal-modal" onSubmit={salvar}>
        <div className="modal-cab">
          <h2>{estado.id ? "Editar evento" : "Novo evento"}</h2>
          <button type="button" className="icon-btn" onClick={onFechar}><X size={18} /></button>
        </div>

        <div className="modal-corpo">
          <input className="input cal-modal-titulo" autoFocus placeholder="Adicionar título"
            value={f.titulo} onChange={set("titulo")} />

          <label className="cal-modal-switch">
            <input type="checkbox" checked={f.diaInteiro}
              onChange={(e) => setF((s) => ({ ...s, diaInteiro: e.target.checked }))} />
            <span>Dia inteiro</span>
          </label>

          <div className="cal-modal-datas">
            <label className="field">
              <span className="field-label"><Clock size={13} /> Início</span>
              <div className="cal-dr">
                <input className="input" type="date" value={f.dataInicio} onChange={set("dataInicio")} />
                {!f.diaInteiro && <input className="input" type="time" value={f.horaInicio} onChange={set("horaInicio")} />}
              </div>
            </label>
            <label className="field">
              <span className="field-label">Término</span>
              <div className="cal-dr">
                <input className="input" type="date" value={f.dataFim} onChange={set("dataFim")} />
                {!f.diaInteiro && <input className="input" type="time" value={f.horaFim} onChange={set("horaFim")} />}
              </div>
            </label>
          </div>

          <label className="field">
            <span className="field-label"><MapPin size={13} /> Local</span>
            <input className="input" value={f.local} onChange={set("local")} placeholder="Opcional" />
          </label>

          <label className="field">
            <span className="field-label"><AlignLeft size={13} /> Descrição</span>
            <textarea className="input textarea" rows={3} value={f.descricao} onChange={set("descricao")} placeholder="Opcional" />
          </label>

          <div className="field">
            <span className="field-label">Cor</span>
            <div className="cal-cores">
              {Object.entries(CORES).map(([id, c]) => (
                <button type="button" key={id} className={`cal-cor ${f.cor === id ? "cal-cor-on" : ""}`}
                  style={{ background: c.bg }} title={c.nome} aria-label={c.nome}
                  onClick={() => setF((s) => ({ ...s, cor: id }))} />
              ))}
            </div>
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}
        </div>

        <div className="modal-rodape">
          {estado.id
            ? <button type="button" className="btn btn-ghost cal-excluir" onClick={() => onExcluir(estado.id)}>
                <Trash2 size={15} /> Excluir
              </button>
            : <span />}
          <div className="cal-modal-acoes">
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <Save size={15} /> {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
