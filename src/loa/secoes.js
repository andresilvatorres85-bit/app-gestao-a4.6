// Navegação em dois níveis. Cada seção responde por UMA base de dados:
// "Resultado LEXOR" pelas emendas apresentadas (`Historico_emendas_apresentadas
// .xlsx`) e "PLOA" pelas despesas por fase de elaboração
// (`PLOA_Despesas_Elaboracao.xlsx`).
//
// O id da SUBABA continua sendo o único valor escrito na URL (`?aba=…`), e a
// seção é deduzida dele. Isso preserva todos os links já compartilhados —
// `?aba=historico` continua abrindo o Histórico das emendas — sem precisar de
// um parâmetro novo nem de migração.
export const SECOES = [
  {
    id: 'lexor',
    rotulo: 'Resultado LEXOR',
    descricao: 'Emendas parlamentares apresentadas ao PLOA',
    subabas: [
      { id: 'dashboard', rotulo: 'Dashboard' },
      { id: 'emendas', rotulo: 'Emendas' },
      { id: 'estrategia', rotulo: 'Estratégia' },
      { id: 'historico', rotulo: 'Histórico' },
      { id: 'inconsistencias', rotulo: 'Inconsistências' },
    ],
  },
  {
    id: 'ploa',
    rotulo: 'PLOA',
    descricao: 'Despesas do órgão 52000 por fase de elaboração',
    subabas: [
      { id: 'ploa-dashboard', rotulo: 'Dashboard PLOA' },
      { id: 'ploa-historico', rotulo: 'Histórico PLOA' },
    ],
  },
  {
    id: 'execucao',
    rotulo: 'EXECUÇÃO LOA',
    descricao: 'Despesa por execução do órgão 52000 (LOA)',
    subabas: [
      { id: 'exec-dashboard', rotulo: 'Dashboard LOA' },
      { id: 'exec-historico', rotulo: 'Histórico LOA' },
      { id: 'exec-emendas-dashboard', rotulo: 'Dashboard Emendas' },
      { id: 'exec-emendas', rotulo: 'Emendas LOA' },
      { id: 'exec-emendas-historico', rotulo: 'Histórico Emendas' },
    ],
  },
]
