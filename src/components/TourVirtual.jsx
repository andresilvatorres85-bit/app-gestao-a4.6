import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Compass } from "lucide-react";

// Roteiro do tour: uma etapa por módulo (aba do cabeçalho), com as abas
// internas de cada um. `aba` abre o módulo correspondente ao avançar.
const ETAPAS = [
  {
    titulo: "Bem-vindo ao GESTÃO A4.6",
    texto:
      "Este tour apresenta cada módulo do aplicativo e as abas internas de cada um. " +
      "Use Próximo/Anterior (ou as setas do teclado) para navegar; o módulo correspondente " +
      "é aberto automaticamente e destacado no cabeçalho. Esc encerra o tour.",
    itens: [
      ["Cabeçalho", "Botões dos módulos: CALENDÁRIO, MÉTRICAS, LEXOR, LOA, Proposições, Cartilhas e CONHECIMENTO."],
      ["Tour", "Este botão reabre o tutorial sempre que precisar."],
      ["Sair", "Encerra a sessão no dispositivo."],
    ],
  },
  {
    aba: "calendario",
    titulo: "CALENDÁRIO",
    texto: "Agenda compartilhada da Subassessoria, sincronizada em tempo real entre todos os usuários.",
    itens: [
      ["Mês / Semana / Dia", "Alterna a visualização da agenda; as setas avançam ou voltam o período."],
      ["Criar evento", "Clique em um dia ou horário. Permite recorrência; ao editar ou excluir, escolha “somente este” ou “todos”."],
      ["Meus calendários", "Crie, renomeie, exclua, reordene e filtre agendas, cada uma com sua cor."],
      ["PENDÊNCIAS", "Checklist compartilhado de pendências da equipe."],
      ["ASSUNTOS BRIEFING", "Checklist dos assuntos a levar ao briefing."],
    ],
  },
  {
    aba: "metricas",
    view: "dashboard",
    titulo: "MÉTRICAS",
    texto: "Registro e acompanhamento dos atendimentos/emendas, com indicadores por partido e espectro político.",
    itens: [
      ["Painel", "Indicadores, gráficos e totais consolidados dos registros."],
      ["Lançar", "Formulário para cadastrar um novo registro (protocolo gerado automaticamente)."],
      ["Alteração emenda", "Pedidos de alteração de objeto de emenda, com geração dos documentos (ofício, AO, GND)."],
      ["Histórico", "Lista completa dos registros, com busca, filtros e exclusão."],
      ["Configurações", "Cadastro de partidos/espectro e de usuários."],
    ],
  },
  {
    aba: "lexor",
    titulo: "LEXOR",
    texto: "Propostas de emendas captadas do sistema LEXOR, atualizadas diariamente.",
    itens: [
      ["Lista e filtros", "Busque e filtre as propostas por autor, situação, área e outros campos."],
      ["Espelhos", "Gere o espelho da proposta em Word ou PDF."],
      ["Juntar propostas", "Agrupe propostas semelhantes em uma consolidada."],
      ["Status / desconsiderar", "Marque o andamento da análise ou retire propostas da contagem."],
      ["Atualizar dados", "Dispara a atualização imediata a partir do LEXOR."],
    ],
  },
  {
    aba: "loa",
    titulo: "LOA",
    texto: "Análise da Lei Orçamentária Anual, organizada em três seções no menu lateral.",
    itens: [
      ["Resultado LEXOR", "Dashboard, Emendas, Estratégia, Histórico e Inconsistências das propostas analisadas."],
      ["PLOA", "Dashboard PLOA e Histórico PLOA do projeto de lei orçamentária."],
      ["EXECUÇÃO LOA", "Dashboard LOA, Histórico LOA, Dashboard Emendas, Emendas LOA e Histórico Emendas — acompanhamento da execução."],
    ],
  },
  {
    aba: "proposicoes",
    titulo: "Proposições",
    texto: "Acompanhamento das proposições legislativas de interesse da Força.",
    itens: [
      ["Em tramitação", "Tabela das proposições ativas, com casa, situação, relator e impacto."],
      ["Arquivadas e concluídas", "Proposições encerradas, separadas das ativas."],
      ["Busca e filtros", "Localize por tipo, número, autor ou situação."],
      ["Editar", "Atualize os dados; a tramitação pode ser buscada no site oficial."],
      ["Infográfico", "Exporta a proposição em PDF no layout do Infográfico Legislativo (A4.6)."],
    ],
  },
  {
    aba: "cartilhas",
    titulo: "Cartilhas",
    texto: "Banco de Projetos de Emendas incorporado ao aplicativo e atualizado diariamente.",
    itens: [
      ["Banco de Projetos", "Consulte os projetos disponíveis para indicação de emendas, com filtros e detalhes."],
    ],
  },
  {
    aba: "conhecimento",
    titulo: "CONHECIMENTO",
    texto: "Base de conhecimento da Subassessoria, compartilhada por toda a equipe.",
    itens: [
      ["Legislação", "Normas e referências de orçamento, com links."],
      ["Recebimento Função", "Roteiro para quem assume a função: o que receber e verificar."],
      ["Rotina Asse Orç", "Rotina Diária e atividades (PPA, PLDO, PLOA, PLN, MPV, CMO…) com tarefas e subtarefas reordenáveis."],
      ["Contatos", "Agenda de contatos institucionais."],
    ],
  },
  {
    titulo: "Pronto!",
    texto: "Você conheceu todos os módulos. Para rever este tutorial, clique em “Tour” no cabeçalho a qualquer momento.",
    itens: [],
  },
];

export default function TourVirtual({ aberto, onFechar, setAba, setView }) {
  const [i, setI] = useState(0);
  const etapa = ETAPAS[i];
  const ultima = i === ETAPAS.length - 1;

  useEffect(() => { if (aberto) setI(0); }, [aberto]);

  // Abre o módulo da etapa e destaca o botão correspondente no cabeçalho.
  useEffect(() => {
    if (!aberto) return;
    if (etapa.aba) setAba(etapa.aba);
    if (etapa.view) setView(etapa.view);
    const btn = etapa.aba ? document.querySelector(`[data-tour="${etapa.aba}"]`) : document.querySelector("[data-tour=\"tour\"]");
    btn?.classList.add("tour-destaque");
    return () => btn?.classList.remove("tour-destaque");
  }, [aberto, i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => {
      if (e.key === "Escape") onFechar();
      else if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, ETAPAS.length - 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="tour-card" role="dialog" aria-label="Tour virtual">
      <div className="tour-topo">
        <span className="tour-passo"><Compass size={13} /> Tour virtual · {i + 1} de {ETAPAS.length}</span>
        <button className="icon-btn" title="Encerrar tour (Esc)" onClick={onFechar}><X size={15} /></button>
      </div>
      <h3 className="tour-titulo">{etapa.titulo}</h3>
      <p className="tour-texto">{etapa.texto}</p>
      {etapa.itens.length > 0 && (
        <>
          {etapa.aba && <div className="tour-sub">Abas e recursos</div>}
          <ul className="tour-itens">
            {etapa.itens.map(([nome, desc]) => (
              <li key={nome}><b>{nome}</b><span>{desc}</span></li>
            ))}
          </ul>
        </>
      )}
      <div className="tour-pontos">
        {ETAPAS.map((_, k) => (
          <button key={k} className={`tour-ponto${k === i ? " tour-ponto-on" : ""}`}
            aria-label={`Ir para etapa ${k + 1}`} onClick={() => setI(k)} />
        ))}
      </div>
      <div className="tour-nav">
        <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft size={15} /> Anterior
        </button>
        {ultima ? (
          <button className="btn btn-primary btn-sm" onClick={onFechar}><Check size={15} /> Concluir</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setI(i + 1)}>Próximo <ChevronRight size={15} /></button>
        )}
      </div>
    </div>
  );
}
