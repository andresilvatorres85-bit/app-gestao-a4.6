import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, LabelList,
} from "recharts";
import { Landmark, Users, BookUser, FileDown, Check } from "lucide-react";
import { StatCard } from "./UI.jsx";
import ChartCard from "./ChartCard.jsx";
import PainelObjetoEmendas from "./PainelObjetoEmendas.jsx";
import { MESES, PAPEL_LABEL_CURTO, ESP_LABEL, ESP_COR } from "../constants.js";
import { todayParts } from "../helpers.js";
import {
  exportarPainelPptx,
  dadosEvolucaoMensal, dadosPorFuncao, dadosPorEspectro, dadosTopGabinetes, dadosTopPartidos,
} from "../exportUtils.js";

// Cores para as séries por ano (evolução mensal)
const COR_ANOS = ["#4E9A6B", "#C9A96A", "#5A8FCB", "#D6685F", "#9BA89E", "#B0862E"];

// Detecta se é tela estreita (celular) para ocultar rótulos fixos e evitar poluição
function useIsMobile() {
  const [mobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 680);
  return mobile;
}

export default function Dashboard({ allRecords, novos, objetoEmendas = [] }) {
  const isMobile = useIsMobile();

  const anosDisponiveis = useMemo(() => {
    const s = new Set(allRecords.map(r => r.y));
    return Array.from(s).sort((a, b) => b - a);
  }, [allRecords]);

  // seleção MÚLTIPLA de anos — inicia com o ano mais recente
  const [anosSel, setAnosSel] = useState(() => (anosDisponiveis[0] ? [anosDisponiveis[0]] : []));
  const [exportando, setExportando] = useState(false);

  function toggleAno(ano) {
    setAnosSel(prev => {
      if (prev.includes(ano)) {
        const novo = prev.filter(a => a !== ano);
        return novo.length ? novo : prev; // nunca deixa vazio
      }
      return [...prev, ano].sort((a, b) => a - b);
    });
  }

  const anosOrd = useMemo(() => [...anosSel].sort((a, b) => a - b), [anosSel]);

  // registros dentro dos anos selecionados
  const registrosSel = useMemo(
    () => allRecords.filter(r => anosSel.includes(r.y)),
    [allRecords, anosSel]
  );

  const totalGeral = allRecords.length;
  const totalPeriodo = registrosSel.length;
  const hoje = todayParts();
  const totalMes = allRecords.filter(r => r.y === hoje.y && r.m === hoje.m).length;

  // ---- Evolução mensal: uma série por ano selecionado ----
  const evolucaoMensal = useMemo(() => {
    const arr = [];
    for (let m = 1; m <= 12; m++) {
      const linha = { mes: MESES[m] };
      for (const ano of anosOrd) {
        linha[String(ano)] = registrosSel.filter(r => r.y === ano && r.m === m).length;
      }
      arr.push(linha);
    }
    return arr;
  }, [registrosSel, anosOrd]);

  // ---- Por função (somado no período) ----
  const porPapel = useMemo(() => {
    const ordem = ["S", "AS", "D", "AD", "C", "AE"];
    return ordem.map(code => ({
      papel: PAPEL_LABEL_CURTO[code],
      total: registrosSel.filter(r => r.role === code).length,
    }));
  }, [registrosSel]);

  // ---- Por espectro (somado no período) ----
  const porEspectro = useMemo(() => {
    const ordem = ["E", "D", "C"];
    return ordem.map(code => ({
      espectro: ESP_LABEL[code],
      total: registrosSel.filter(r => r.esp === code).length,
      cor: code,
    }));
  }, [registrosSel]);

  // ---- Top 10 gabinetes/consultor/aspar (somado) ----
  const topGabinetes = useMemo(() => {
    const cont = {};
    for (const r of registrosSel) {
      const chave = r.n || "—";
      cont[chave] = (cont[chave] || 0) + 1;
    }
    return Object.entries(cont)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([nome, total]) => ({ nome, total }));
  }, [registrosSel]);

  // ---- Top 10 partidos (somado) ----
  const topPartidos = useMemo(() => {
    const cont = {};
    for (const r of registrosSel) {
      if (!r.p) continue;
      cont[r.p] = (cont[r.p] || 0) + 1;
    }
    return Object.entries(cont)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([sigla, total]) => ({ sigla, total }));
  }, [registrosSel]);

  const filtros = { anos: anosOrd, mes: "Todos", papel: "Todos" };

  async function exportarPainel() {
    setExportando(true);
    try {
      await exportarPainelPptx({
        registros: registrosSel,
        anos: anosOrd, mes: "Todos", papel: "Todos",
        resumo: { totalGeral, totalPeriodo, totalMes },
      });
    } catch (e) {
      console.error("Falha ao exportar painel:", e);
    }
    setExportando(false);
  }

  // rótulos: fixos no desktop, ocultos no celular (mantém tooltip no hover)
  const mostrarRotulos = !isMobile;

  return (
    <div className="view-pad">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Painel de contatos parlamentares</h1>
          <p className="page-sub">Consolidado de visitas e reuniões da Subassessoria de Orçamento</p>
        </div>
        <button className="btn btn-primary" onClick={exportarPainel} disabled={exportando}>
          <FileDown size={16} /> {exportando ? "Gerando…" : "Exportar PPTX"}
        </button>
      </div>

      {/* Seleção múltipla de anos */}
      <div className="year-selector">
        <span className="year-selector-label">Anos:</span>
        <div className="year-chips">
          {anosDisponiveis.map(a => (
            <button key={a}
              className={`year-chip ${anosSel.includes(a) ? "year-chip-active" : ""}`}
              onClick={() => toggleAno(a)}>
              {anosSel.includes(a) && <Check size={12} />} {a}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid stat-grid-3 stat-grid-painel">
        <StatCard label="Total geral (desde mai/24)" value={totalGeral.toLocaleString("pt-BR")} icon={BookUser} />
        <StatCard label={anosOrd.length > 1 ? "Total no período" : `Total em ${anosOrd[0]}`} value={totalPeriodo.toLocaleString("pt-BR")} icon={Landmark} />
        <StatCard label="Neste mês" value={totalMes.toLocaleString("pt-BR")} icon={Users} />
      </div>

      <ChartCard titulo="Evolução mensal" tipo="evolucao" dadosExport={dadosEvolucaoMensal(registrosSel, anosOrd)} filtros={filtros}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={evolucaoMensal} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#16211B", color: "#EAF0EA" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            {anosOrd.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {anosOrd.map((ano, i) => (
              <Bar key={ano} dataKey={String(ano)} fill={COR_ANOS[i % COR_ANOS.length]} radius={[3, 3, 0, 0]} maxBarSize={anosOrd.length > 2 ? 14 : 22}>
                {mostrarRotulos && anosOrd.length === 1 && (
                  <LabelList dataKey={String(ano)} position="top" fontSize={10} fill="var(--muted)" formatter={v => v || ""} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="two-col">
        <ChartCard titulo="Por função" tipo="funcao" dadosExport={dadosPorFuncao(registrosSel)} filtros={filtros}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porPapel} layout="vertical" margin={{ top: 4, right: 34, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="papel" tick={{ fontSize: 12, fill: "var(--ink)" }} axisLine={false} tickLine={false} width={92} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#16211B", color: "#EAF0EA" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" fill="var(--brand)" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {mostrarRotulos && <LabelList dataKey="total" position="right" fontSize={11} fill="var(--ink)" formatter={v => v || ""} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Por espectro" tipo="espectro" dadosExport={dadosPorEspectro(registrosSel)} filtros={filtros}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porEspectro} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="espectro" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#16211B", color: "#EAF0EA" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={56}>
                {porEspectro.map((entry, i) => <Cell key={i} fill={ESP_COR[entry.cor]} />)}
                {mostrarRotulos && <LabelList dataKey="total" position="top" fontSize={11} fill="var(--ink)" formatter={v => v || ""} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard titulo="10 mais visitados/contatados" tipo="topGabinetes" dadosExport={dadosTopGabinetes(registrosSel)} filtros={filtros}>
        <ResponsiveContainer width="100%" height={Math.max(240, topGabinetes.length * 32)}>
          <BarChart data={topGabinetes} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "var(--ink)" }} axisLine={false} tickLine={false} width={isMobile ? 110 : 170} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#16211B", color: "#EAF0EA" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" fill="var(--brand)" radius={[0, 3, 3, 0]} maxBarSize={20}>
              {mostrarRotulos && <LabelList dataKey="total" position="right" fontSize={11} fill="var(--ink)" formatter={v => v || ""} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard titulo="10 partidos mais visitados/contatados" tipo="topPartidos" dadosExport={dadosTopPartidos(registrosSel)} filtros={filtros}>
        <ResponsiveContainer width="100%" height={Math.max(240, topPartidos.length * 32)}>
          <BarChart data={topPartidos} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="sigla" tick={{ fontSize: 12, fill: "var(--ink)" }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "#16211B", color: "#EAF0EA" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" fill="var(--gold)" radius={[0, 3, 3, 0]} maxBarSize={20}>
              {mostrarRotulos && <LabelList dataKey="total" position="right" fontSize={11} fill="var(--ink)" formatter={v => v || ""} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <PainelObjetoEmendas itens={objetoEmendas} />
    </div>
  );
}
