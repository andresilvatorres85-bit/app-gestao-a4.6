import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Save, Clock, MapPin, AlignLeft, Repeat, Pencil, Check, ChevronDown, GripVertical,
} from "lucide-react";
import ChecklistCard from "./ChecklistCard.jsx";
import { useAcesso } from "../acessos.js";

// ---------------------------------------------------------------- utilidades
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const H_ALTURA = 46;

const RECORRENCIAS = [
  ["nao", "Não se repete"],
  ["diaria", "Todos os dias"],
  ["semanal", "Toda semana"],
  ["mensal", "Todo mês"],
  ["anual", "Todo ano"],
];

// Paleta oferecida ao CRIAR um calendário novo.
const PALETA_NOVO = [
  "#3B6FB0", "#3F9D6B", "#C6543F", "#7A5AC2", "#C79A3A", "#3AA6A6", "#C25A93", "#6C7A72",
  "#2E8B99", "#8E44AD", "#D2691E", "#4CAF50", "#E5484D", "#5C6BC0", "#00897B", "#AD1457",
];
const NEUTRO = "#6C7A72"; // fallback de calendário removido

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
const combinar = (data, hora) => {
  const [y, m, d] = data.split("-").map(Number);
  const [hh, mm] = (hora || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime();
};
const chipDe = (hex) => `${hex}38`; // ~22% alpha

function eventosDoDia(eventos, dia) {
  const ini = startOfDay(dia).getTime();
  const fim = ini + 86400000;
  return eventos
    .filter((e) => e.inicio != null && (e.fim ?? e.inicio) >= ini && e.inicio < fim)
    .sort((a, b) => (b.diaInteiro - a.diaInteiro) || (a.inicio - b.inicio));
}

function layoutColunas(evs) {
  const ord = [...evs].sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
  const postos = ord.map((e) => ({ e, col: 0, cols: 1 }));
  let grupo = [], fimGrupo = -Infinity;
  const fechar = () => { const n = Math.max(...grupo.map((p) => p.col)) + 1; grupo.forEach((p) => { p.cols = n; }); grupo = []; };
  for (const p of postos) {
    if (grupo.length && p.e.inicio >= fimGrupo) fechar();
    const usadas = new Set(grupo.filter((q) => (q.e.fim ?? q.e.inicio) > p.e.inicio).map((q) => q.col));
    let c = 0; while (usadas.has(c)) c++;
    p.col = c; grupo.push(p); fimGrupo = Math.max(fimGrupo, p.e.fim ?? p.e.inicio);
  }
  if (grupo.length) fechar();
  return postos;
}

function expandir(eventos, rIni, rFim) {
  const passo = (d, rec) => {
    const x = new Date(d);
    if (rec === "diaria") x.setDate(x.getDate() + 1);
    else if (rec === "semanal") x.setDate(x.getDate() + 7);
    else if (rec === "mensal") x.setMonth(x.getMonth() + 1);
    else if (rec === "anual") x.setFullYear(x.getFullYear() + 1);
    else x.setDate(x.getDate() + 1);
    return x;
  };
  const out = [];
  for (const e of eventos) {
    if (e.inicio == null) continue;
    const rec = e.recorrencia || "nao";
    const dur = (e.fim ?? e.inicio) - e.inicio;
    const exc = Array.isArray(e.excecoes) ? e.excecoes : [];
    if (rec === "nao") {
      if ((e.fim ?? e.inicio) >= rIni && e.inicio <= rFim) out.push({ ...e, _base: e });
      continue;
    }
    let cur = new Date(e.inicio), g = 0;
    while (cur.getTime() + dur < rIni && g < 4000) { cur = passo(cur, rec); g++; }
    while (cur.getTime() <= rFim && g < 4000) {
      const ini = cur.getTime();
      if (!exc.includes(ymd(ini))) out.push({ ...e, inicio: ini, fim: ini + dur, _base: e });
      cur = passo(cur, rec); g++;
    }
  }
  return out;
}

// =========================================================================
export default function Calendario({
  eventos = [], calendarios = [], inserir, atualizar, excluir,
  excluirOcorrencia, atualizarOcorrencia,
  criarAgenda, renomearAgenda, excluirAgenda, reordenarAgendas,
  checklists = {}, carregado, erro, vistaInicial = "semana",
}) {
  const [vista, setVista] = useState(vistaInicial);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [modal, setModal] = useState(null);
  const [ocultos, setOcultos] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("cal.ocultos") || "[]")); } catch { return new Set(); }
  });

  const hoje = startOfDay(new Date());
  const calMap = useMemo(() => Object.fromEntries(calendarios.map((c) => [c.id, c])), [calendarios]);
  const nomeCal = (id) => calMap[id]?.nome || "(sem calendário)";
  const estilo = (id) => {
    const c = calMap[id]; const hex = c?.cor || NEUTRO;
    return { bg: hex, chip: chipDe(hex), borda: hex };
  };
  const primeiroCal = calendarios[0]?.id || "azul";

  function toggleCal(id) {
    setOcultos((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      try { localStorage.setItem("cal.ocultos", JSON.stringify([...s])); } catch { /* ignore */ }
      return s;
    });
  }

  function irHoje() { setCursor(startOfDay(new Date())); }
  function passo(dir) {
    if (vista === "mes") setCursor((c) => addMonths(c, dir));
    else if (vista === "semana") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  }

  const [rIni, rFim] = useMemo(() => {
    if (vista === "mes") { const ini = startOfWeek(startOfMonth(cursor)).getTime(); return [ini, ini + 42 * 86400000]; }
    if (vista === "semana") { const ini = startOfWeek(cursor).getTime(); return [ini, ini + 7 * 86400000]; }
    const ini = startOfDay(cursor).getTime(); return [ini, ini + 86400000];
  }, [vista, cursor]);

  const visiveis = useMemo(() => {
    const filtrados = eventos.filter((e) => !ocultos.has(e.cor));
    return expandir(filtrados, rIni, rFim);
  }, [eventos, ocultos, rIni, rFim]);

  const titulo = useMemo(() => {
    if (vista === "mes") return cap(`${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`);
    if (vista === "dia") return cap(`${SEMANA[cursor.getDay()]}, ${cursor.getDate()} de ${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`);
    const ini = startOfWeek(cursor), fim = addDays(ini, 6);
    const mesmoMes = ini.getMonth() === fim.getMonth();
    return mesmoMes
      ? `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} de ${ini.getFullYear()}`
      : `${ini.getDate()} de ${MESES_CURTO[ini.getMonth()]} – ${fim.getDate()} de ${MESES_CURTO[fim.getMonth()]} de ${fim.getFullYear()}`;
  }, [vista, cursor]);

  function novoEvento(dia, hora = null) {
    const base = startOfDay(dia);
    const h = hora != null ? hora : Math.min(new Date().getHours() + 1, 22);
    const ini = new Date(base); ini.setHours(h, 0, 0, 0);
    const fim = new Date(ini); fim.setHours(h + 1, 0, 0, 0);
    setModal({
      id: null, titulo: "", diaInteiro: false, recorrencia: "nao",
      dataInicio: ymd(ini), horaInicio: hm(ini.getTime()),
      dataFim: ymd(fim), horaFim: hm(fim.getTime()),
      local: "", descricao: "", cor: primeiroCal,
    });
  }
  function editarEvento(oc) {
    const e = oc._base || oc;
    const recorrente = (e.recorrencia || "nao") !== "nao";
    // usa a data/hora DESTA ocorrência (para editar "somente este" fazer sentido).
    const ini = recorrente ? oc.inicio : e.inicio;
    const fim = recorrente ? (oc.fim ?? oc.inicio) : (e.fim ?? e.inicio);
    setModal({
      id: e.id, baseId: e.id, recorrente, ocData: ymd(ini),
      baseInicio: e.inicio, baseFim: e.fim ?? e.inicio,
      titulo: e.titulo, diaInteiro: e.diaInteiro, recorrencia: e.recorrencia || "nao",
      dataInicio: ymd(ini), horaInicio: hm(ini),
      dataFim: ymd(fim), horaFim: hm(fim),
      local: e.local || "", descricao: e.descricao || "", cor: e.cor || primeiroCal,
    });
  }
  function abrirDia(dia) { setCursor(startOfDay(dia)); setVista("dia"); }

  // Partes liberadas para o usuário (CONFIGURAÇÕES › Acessos).
  const { pode } = useAcesso();
  const verAgenda = pode("calendario.agenda");

  return (
    <div className="view-pad cal-wrap">
      {verAgenda && <div className="cal-toolbar">
        <div className="cal-toolbar-esq">
          <button className="btn btn-primary btn-sm" onClick={() => novoEvento(cursor)}><Plus size={15} /> Criar</button>
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
      </div>}

      {verAgenda && erro && (
        <div className="lexor-aviso-erro">
          A agenda não pôde ser lida ou gravada. Rode o script
          <code> supabase_calendario.sql </code> no SQL Editor do Supabase para criar a tabela.
        </div>
      )}

      <div className={`cal-corpo${verAgenda ? "" : " cal-corpo-sem-agenda"}`}>
        <div className="cal-lateral">
          {verAgenda && <BarraCalendarios
            calendarios={calendarios} ocultos={ocultos} onToggle={toggleCal}
            onRenomear={renomearAgenda} onExcluir={excluirAgenda} onCriar={criarAgenda}
            onReordenar={reordenarAgendas} />}

          {pode("calendario.pendencias") && <ChecklistCard titulo="PENDÊNCIAS" lista="pendencias" tom="vermelho"
            itens={(checklists.itens || []).filter((i) => i.lista === "pendencias")}
            adicionar={checklists.adicionar} alternar={checklists.alternar}
            editar={checklists.editar} remover={checklists.remover} />}

          {pode("calendario.briefing") && <ChecklistCard titulo="ASSUNTOS BRIEFING" lista="briefing" tom="azul"
            itens={(checklists.itens || []).filter((i) => i.lista === "briefing")}
            adicionar={checklists.adicionar} alternar={checklists.alternar}
            editar={checklists.editar} remover={checklists.remover} />}
        </div>

        {verAgenda && <div className="cal-principal">
          {!carregado ? (
            <div className="loading-state">Carregando agenda…</div>
          ) : vista === "mes" ? (
            <VistaMes cursor={cursor} hoje={hoje} eventos={visiveis} estilo={estilo}
              aoDia={abrirDia} aoNovo={novoEvento} aoEditar={editarEvento} />
          ) : (
            <VistaTempo dias={vista === "semana" ? 7 : 1}
              inicio={vista === "semana" ? startOfWeek(cursor) : startOfDay(cursor)}
              hoje={hoje} eventos={visiveis} estilo={estilo}
              aoDia={abrirDia} aoNovoHora={novoEvento} aoEditar={editarEvento} />
          )}
        </div>}
      </div>

      {modal && (
        <ModalEvento
          estado={modal} calendarios={calendarios} estilo={estilo} nomeCal={nomeCal}
          onFechar={() => setModal(null)}
          onSalvar={async (e, dados, escopo) => {
            let res;
            if (!e.id) res = await inserir(montarPayload(dados));
            else if (e.recorrente && escopo === "este") res = await atualizarOcorrencia(e.baseId, e.ocData, montarPayload(dados));
            else if (e.recorrente) res = await atualizar(e.id, montarPayloadSerie(dados, e));
            else res = await atualizar(e.id, montarPayload(dados));
            if (!res?.error) setModal(null);
            return res;
          }}
          onExcluir={async (e, escopo) => {
            const res = (e.recorrente && escopo === "este")
              ? await excluirOcorrencia(e.baseId, e.ocData)
              : await excluir(e.id);
            if (!res?.error) setModal(null);
            return res;
          }}
        />
      )}
    </div>
  );
}

function montarPayload(d) {
  const comum = { titulo: d.titulo, local: d.local, descricao: d.descricao, cor: d.cor, recorrencia: d.recorrencia || "nao" };
  if (d.diaInteiro) {
    return { ...comum, diaInteiro: true, inicio: combinar(d.dataInicio, "00:00"), fim: combinar(d.dataFim || d.dataInicio, "23:59") };
  }
  let ini = combinar(d.dataInicio, d.horaInicio);
  let fim = combinar(d.dataFim || d.dataInicio, d.horaFim || d.horaInicio);
  if (fim <= ini) fim = ini + 3600000;
  return { ...comum, diaInteiro: false, inicio: ini, fim };
}

// Editar a série INTEIRA a partir de uma ocorrência: aplica os campos do form,
// mas mantém a DATA de início/fim originais (a âncora da recorrência), para não
// apagar as ocorrências anteriores. O horário do dia, sim, é atualizado.
function montarPayloadSerie(d, estado) {
  const dataInicio = ymd(estado.baseInicio);
  const dataFim = ymd(estado.baseFim ?? estado.baseInicio);
  return montarPayload({ ...d, dataInicio, dataFim });
}

// ---------------------------------------------------- Barra de calendários
function BarraCalendarios({ calendarios, ocultos, onToggle, onRenomear, onExcluir, onCriar, onReordenar }) {
  const [editando, setEditando] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(PALETA_NOVO[0]);
  const [arrastando, setArrastando] = useState(null); // id sendo arrastado
  const [alvo, setAlvo] = useState(null);             // id sob o cursor

  function criar() {
    if (!novoNome.trim()) return;
    onCriar?.({ nome: novoNome.trim(), cor: novaCor });
    setNovoNome(""); setNovaCor(PALETA_NOVO[0]); setCriando(false);
  }

  function soltar(alvoId) {
    const de = arrastando;
    setArrastando(null); setAlvo(null);
    if (!de || de === alvoId) return;
    const ids = calendarios.map((c) => c.id);
    const iDe = ids.indexOf(de), iAlvo = ids.indexOf(alvoId);
    if (iDe < 0 || iAlvo < 0) return;
    ids.splice(iAlvo, 0, ids.splice(iDe, 1)[0]);
    onReordenar?.(ids);
  }

  return (
    <aside className="cal-cals">
      <p className="cal-cals-tit">Meus calendários</p>
      <ul className="cal-cals-lista">
        {calendarios.map((c) => {
          const visivel = !ocultos.has(c.id);
          const arrastavel = editando !== c.id && !!onReordenar;
          return (
            <li key={c.id}
              className={`cal-cals-item${arrastando === c.id ? " cal-cals-arrastando" : ""}${alvo === c.id && arrastando && arrastando !== c.id ? " cal-cals-alvo" : ""}`}
              draggable={arrastavel}
              onDragStart={(e) => { if (!arrastavel) return; setArrastando(c.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setArrastando(null); setAlvo(null); }}
              onDragOver={(e) => { if (arrastando) { e.preventDefault(); setAlvo(c.id); } }}
              onDrop={(e) => { e.preventDefault(); soltar(c.id); }}>
              {arrastavel && <span className="cal-cals-grip" title="Arraste para reordenar"><GripVertical size={13} /></span>}
              <label className="cal-cals-chk" style={{ "--cc": c.cor }}>
                <input type="checkbox" checked={visivel} onChange={() => onToggle(c.id)} />
                <span className="cal-cals-caixa" />
              </label>
              {editando === c.id ? (
                <input className="input cal-cals-input" autoFocus value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  onBlur={() => { onRenomear?.(c.id, rascunho); setEditando(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditando(null); }} />
              ) : (
                <>
                  <button className="cal-cals-nome" title="Renomear" onClick={() => { setEditando(c.id); setRascunho(c.nome); }}>
                    <span className="cal-cals-txt">{c.nome}</span>
                  </button>
                  <button className="icon-btn cal-cals-acao" title="Renomear" onClick={() => { setEditando(c.id); setRascunho(c.nome); }}><Pencil size={13} /></button>
                  <button className="icon-btn cal-cals-acao" title="Excluir calendário"
                    onClick={() => { if (confirm(`Excluir o calendário "${c.nome}"? Os eventos ficam sem calendário.`)) onExcluir?.(c.id); }}>
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {criando ? (
        <div className="cal-cals-novo">
          <input className="input" autoFocus placeholder="Nome do calendário" value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") setCriando(false); }} />
          <div className="cal-cores cal-cores-novo">
            {PALETA_NOVO.map((hex) => (
              <button type="button" key={hex} className={`cal-cor ${novaCor === hex ? "cal-cor-on" : ""}`}
                style={{ background: hex }} onClick={() => setNovaCor(hex)} aria-label={hex} />
            ))}
          </div>
          <div className="cal-cals-novo-acoes">
            <button className="btn btn-ghost btn-sm" onClick={() => setCriando(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={criar}><Check size={14} /> Criar</button>
          </div>
        </div>
      ) : (
        <button className="cal-cals-add" onClick={() => setCriando(true)}><Plus size={15} /> Novo calendário</button>
      )}
    </aside>
  );
}

// ------------------------------------------------------------- Visão de Mês
function VistaMes({ cursor, hoje, eventos, estilo, aoDia, aoNovo, aoEditar }) {
  const ini = startOfWeek(startOfMonth(cursor));
  const dias = Array.from({ length: 42 }, (_, i) => addDays(ini, i));
  const mesAtual = cursor.getMonth();
  const MAX = 3;
  return (
    <div className="cal-mes">
      <div className="cal-mes-cab">{SEMANA.map((s) => <div key={s} className="cal-mes-diasem">{s}</div>)}</div>
      <div className="cal-mes-grade">
        {dias.map((dia, i) => {
          const doDia = eventosDoDia(eventos, dia);
          const foraMes = dia.getMonth() !== mesAtual;
          const eHoje = sameDay(dia, hoje);
          return (
            <div key={i} className={`cal-cel ${foraMes ? "cal-cel-fora" : ""}`} onClick={() => aoNovo(dia)}>
              <button className={`cal-cel-num ${eHoje ? "cal-cel-hoje" : ""}`}
                onClick={(ev) => { ev.stopPropagation(); aoDia(dia); }}>{dia.getDate()}</button>
              <div className="cal-cel-evs">
                {doDia.slice(0, MAX).map((e, k) => {
                  const st = estilo(e.cor);
                  return (
                    <button key={k} className={`cal-ev ${e.diaInteiro ? "cal-ev-dia" : ""}`}
                      style={e.diaInteiro ? { background: st.bg, color: "#fff" } : { background: st.chip, borderLeft: `3px solid ${st.borda}` }}
                      title={e.titulo} onClick={(ev) => { ev.stopPropagation(); aoEditar(e); }}>
                      {!e.diaInteiro && <span className="cal-ev-hora">{hm(e.inicio)}</span>}
                      <span className="cal-ev-tit">{e.titulo}</span>
                    </button>
                  );
                })}
                {doDia.length > MAX && (
                  <button className="cal-ev-mais" onClick={(ev) => { ev.stopPropagation(); aoDia(dia); }}>+{doDia.length - MAX} mais</button>
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
function VistaTempo({ dias, inicio, hoje, eventos, estilo, aoDia, aoNovoHora, aoEditar }) {
  const colDias = Array.from({ length: dias }, (_, i) => addDays(inicio, i));
  const scrollRef = useRef(null);
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * H_ALTURA - 12;
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, [dias, inicio.getTime()]);
  const minutosAgora = (() => { const d = new Date(agora); return d.getHours() * 60 + d.getMinutes(); })();

  return (
    <div className="cal-tempo">
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
                {daDia.map((e, k) => (
                  <button key={k} className="cal-ev cal-ev-dia" style={{ background: estilo(e.cor).bg, color: "#fff" }}
                    title={e.titulo} onClick={() => aoEditar(e)}><span className="cal-ev-tit">{e.titulo}</span></button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
            const timed = eventos.filter((e) => !e.diaInteiro && e.inicio != null && (e.fim ?? e.inicio) > ini && e.inicio < fimDia);
            const postos = layoutColunas(timed);
            const eHoje = sameDay(dia, hoje);
            return (
              <div key={i} className="cal-tempo-col"
                onClick={(ev) => {
                  const rect = ev.currentTarget.getBoundingClientRect();
                  const hora = Math.max(0, Math.min(23, Math.floor((ev.clientY - rect.top) / H_ALTURA)));
                  aoNovoHora(dia, hora);
                }}>
                {HORAS.map((h) => <div key={h} className="cal-tempo-cel" style={{ height: `${H_ALTURA}px` }} />)}
                {eHoje && <div className="cal-agora" style={{ top: `${(minutosAgora / 60) * H_ALTURA}px` }}><span className="cal-agora-bola" /></div>}
                {postos.map(({ e, col, cols }, k) => {
                  const s = Math.max(e.inicio, ini);
                  const f = Math.min(e.fim ?? (e.inicio + 3600000), fimDia);
                  const top = ((s - ini) / 60000 / 60) * H_ALTURA;
                  const alt = Math.max(20, ((f - s) / 60000 / 60) * H_ALTURA - 2);
                  const st = estilo(e.cor);
                  return (
                    <button key={k} className="cal-ev-bloco"
                      style={{ top: `${top}px`, height: `${alt}px`, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, background: st.chip, borderLeft: `3px solid ${st.borda}` }}
                      title={e.titulo} onClick={(ev) => { ev.stopPropagation(); aoEditar(e); }}>
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

// ------------------------------------------------------ Seletor de calendário
function SeletorCalendario({ calendarios, valor, estilo, nomeCal, onChange }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  return (
    <div className={`cal-sel ${aberto ? "cal-sel-aberto" : ""}`} ref={ref}>
      <button type="button" className="input cal-sel-btn" onClick={() => setAberto((a) => !a)} aria-haspopup="listbox" aria-expanded={aberto}>
        <span className="cal-sel-dot" style={{ background: estilo(valor).bg }} />
        <span className="cal-sel-nome">{nomeCal(valor)}</span>
        <ChevronDown size={16} className="cal-sel-seta" />
      </button>
      {aberto && (
        <div className="cal-sel-menu" role="listbox">
          {calendarios.map((c) => (
            <button type="button" key={c.id} role="option" aria-selected={valor === c.id}
              className={`cal-sel-item ${valor === c.id ? "on" : ""}`}
              onClick={() => { onChange(c.id); setAberto(false); }}>
              <span className="cal-sel-dot" style={{ background: c.cor }} />
              <span className="cal-sel-nome">{c.nome}</span>
              {valor === c.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- Modal de evento
function ModalEvento({ estado, calendarios, estilo, nomeCal, onFechar, onSalvar, onExcluir }) {
  const [f, setF] = useState(estado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  // "este" = só esta ocorrência; "todos" = a série inteira (só p/ recorrentes).
  const [escopo, setEscopo] = useState("este");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function salvar(ev) {
    ev.preventDefault();
    if (!f.titulo.trim()) { setErro("Dê um título ao evento."); return; }
    setSalvando(true);
    const res = await onSalvar(estado, f, escopo);
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

        <div className="modal-corpo cal-modal-corpo">
          <input className="input cal-modal-titulo" autoFocus placeholder="Adicionar título" value={f.titulo} onChange={set("titulo")} />

          <label className="cal-modal-switch">
            <input type="checkbox" checked={f.diaInteiro} onChange={(e) => setF((s) => ({ ...s, diaInteiro: e.target.checked }))} />
            <span>Dia inteiro</span>
          </label>

          <div className="cal-campo">
            <span className="cal-campo-rot"><Clock size={13} /> Início</span>
            <div className="cal-campo-lin">
              <input className="input cal-in-data" type="date" value={f.dataInicio} onChange={set("dataInicio")} />
              {!f.diaInteiro && <input className="input cal-in-hora" type="time" value={f.horaInicio} onChange={set("horaInicio")} />}
            </div>
          </div>

          <div className="cal-campo">
            <span className="cal-campo-rot">Término</span>
            <div className="cal-campo-lin">
              <input className="input cal-in-data" type="date" value={f.dataFim} onChange={set("dataFim")} />
              {!f.diaInteiro && <input className="input cal-in-hora" type="time" value={f.horaFim} onChange={set("horaFim")} />}
            </div>
          </div>

          <div className="cal-campo">
            <span className="cal-campo-rot"><Repeat size={13} /> Repetir</span>
            <select className="input" value={f.recorrencia} onChange={set("recorrencia")}>
              {RECORRENCIAS.map(([id, rot]) => <option key={id} value={id}>{rot}</option>)}
            </select>
          </div>

          {estado.recorrente && (
            <div className="cal-campo">
              <span className="cal-campo-rot"><Repeat size={13} /> Aplicar em</span>
              <div className="cal-escopo">
                <button type="button" className={`chip ${escopo === "este" ? "chip-active" : ""}`}
                  onClick={() => setEscopo("este")}>Somente este evento</button>
                <button type="button" className={`chip ${escopo === "todos" ? "chip-active" : ""}`}
                  onClick={() => setEscopo("todos")}>Todos os eventos</button>
              </div>
            </div>
          )}

          <div className="cal-campo">
            <span className="cal-campo-rot">Calendário</span>
            <SeletorCalendario calendarios={calendarios} valor={f.cor} estilo={estilo} nomeCal={nomeCal}
              onChange={(id) => setF((s) => ({ ...s, cor: id }))} />
          </div>

          <div className="cal-campo">
            <span className="cal-campo-rot"><MapPin size={13} /> Local</span>
            <input className="input" value={f.local} onChange={set("local")} placeholder="Opcional" />
          </div>

          <div className="cal-campo">
            <span className="cal-campo-rot"><AlignLeft size={13} /> Descrição</span>
            <textarea className="input textarea" rows={3} value={f.descricao} onChange={set("descricao")} placeholder="Opcional" />
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}
        </div>

        <div className="modal-rodape">
          {estado.id
            ? <button type="button" className="btn btn-ghost cal-excluir" onClick={async () => {
                const res = await onExcluir(estado, escopo);
                if (res?.error) setErro("Não foi possível excluir: " + (res.error.message || "erro"));
              }}><Trash2 size={15} /> {estado.recorrente && escopo === "este" ? "Excluir este" : "Excluir"}</button>
            : <span />}
          <div className="cal-modal-acoes">
            <button type="button" className="btn btn-ghost" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}><Save size={15} /> {salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
