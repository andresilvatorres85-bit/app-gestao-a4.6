import { useState } from "react";
import { ChevronDown, ChevronRight, Landmark, UsersRound, Gauge, Settings, ListChecks, KeyRound } from "lucide-react";
import PartidosPanel from "./PartidosPanel.jsx";
import Usuarios from "./Usuarios.jsx";
import EstrategiaConfigPanel from "./EstrategiaConfigPanel.jsx";
import AcessosPanel from "./AcessosPanel.jsx";
import { useAcesso } from "../acessos.js";

// Módulo CONFIGURAÇÕES: reúne os ajustes de todos os módulos, agrupados pelo
// título do módulo a que pertencem. Ajustes do aplicativo como um todo (ex.:
// usuários) ficam em "Geral". Todas as seções iniciam recolhidas.
export default function Configuracoes({ partidos, usuarios, emailAtual }) {
  const [aberta, setAberta] = useState(null); // null = todas retraídas
  const { pode, haAdmin, ehAdmin } = useAcesso();
  const somenteLeitura = haAdmin && !ehAdmin; // só administradores alteram usuários

  const grupos = [
    {
      id: "geral", titulo: "Geral", icone: Settings,
      sub: "Ajustes do aplicativo, válidos para todos os módulos.",
      secoes: [
        { id: "usuarios", titulo: "Usuários", icone: UsersRound, badge: usuarios.length,
          corpo: () => <Usuarios usuarios={usuarios} emailAtual={emailAtual} somenteLeitura={somenteLeitura} /> },
        { id: "acessos", titulo: "Acessos aos módulos, abas, subabas e recursos", icone: KeyRound, admin: true,
          corpo: () => haAdmin
            ? <AcessosPanel usuarios={usuarios} emailAtual={emailAtual} />
            : <p className="config-help">
                Nenhum administrador definido ainda — por enquanto todos têm acesso a tudo. Rode o
                script <code>supabase_acessos.sql</code> no SQL Editor do Supabase e, em seguida, a linha
                do final do script com o seu e-mail de login para se tornar administrador.
              </p> },
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

  // Seções liberadas ao usuário; "Acessos" só para administradores (ou, sem
  // nenhum administrador definido, para mostrar como configurar).
  const visiveis = grupos
    .map(g => ({ ...g, secoes: g.secoes.filter(s => s.admin
      ? (ehAdmin || !haAdmin)
      : pode(`config.${g.id}.${s.id}`)) }))
    .filter(g => g.secoes.length);

  return (
    <div className="view-pad">
      <h1 className="page-title">Configurações</h1>
      <p className="page-sub">Ajustes de todos os módulos, organizados pelo módulo a que pertencem.</p>

      {visiveis.map(g => (
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
