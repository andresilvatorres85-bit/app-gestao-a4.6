import { useState } from "react";
import { ChevronDown, ChevronRight, Landmark, UsersRound, Gauge, Settings, ListChecks } from "lucide-react";
import PartidosPanel from "./PartidosPanel.jsx";
import Usuarios from "./Usuarios.jsx";
import EstrategiaConfigPanel from "./EstrategiaConfigPanel.jsx";

// Módulo CONFIGURAÇÕES: reúne os ajustes de todos os módulos, agrupados pelo
// título do módulo a que pertencem. Ajustes do aplicativo como um todo (ex.:
// usuários) ficam em "Geral". Todas as seções iniciam recolhidas.
export default function Configuracoes({ partidos, usuarios, emailAtual }) {
  const [aberta, setAberta] = useState(null); // null = todas retraídas

  const grupos = [
    {
      id: "geral", titulo: "Geral", icone: Settings,
      sub: "Ajustes do aplicativo, válidos para todos os módulos.",
      secoes: [
        { id: "usuarios", titulo: "Usuários", icone: UsersRound, badge: usuarios.length,
          corpo: () => <Usuarios usuarios={usuarios} emailAtual={emailAtual} /> },
      ],
    },
    {
      id: "metricas", titulo: "MÉTRICAS", icone: Gauge,
      secoes: [
        { id: "partidos", titulo: "Partidos e espectro", icone: Landmark, badge: partidos.length,
          corpo: () => <PartidosPanel partidos={partidos} /> },
      ],
    },
    {
      id: "loa", titulo: "LOA", icone: Landmark,
      secoes: [
        { id: "estrategia", titulo: "Estratégia · listas de mandato e selos eleitorais", icone: ListChecks,
          corpo: () => <EstrategiaConfigPanel /> },
      ],
    },
  ];

  return (
    <div className="view-pad">
      <h1 className="page-title">Configurações</h1>
      <p className="page-sub">Ajustes de todos os módulos, organizados pelo módulo a que pertencem.</p>

      {grupos.map(g => (
        <section key={g.id} className="config-grupo">
          <h2 className="config-grupo-titulo"><g.icone size={16} strokeWidth={1.75} /> {g.titulo}</h2>
          {g.sub && <p className="config-grupo-sub">{g.sub}</p>}
          {g.secoes.map(s => (
            <div key={s.id} className="config-section">
              <button className="config-header" onClick={() => setAberta(p => (p === s.id ? null : s.id))}>
                {aberta === s.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <s.icone size={17} strokeWidth={1.75} />
                <span className="config-title">{s.titulo}</span>
                {s.badge != null && <span className="config-badge">{s.badge}</span>}
              </button>
              {aberta === s.id && <div className="config-body">{s.corpo()}</div>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
