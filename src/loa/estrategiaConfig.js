// ---------------------------------------------------------------------------
// Módulo "Captação de Emendas por Estado" (subaba Estratégia do RESULTADO LEXOR)
// Constantes editáveis, textos fixos e paleta — centralizados aqui para revisão
// sem mexer na lógica (ver estrategia.js) nem na geração de DOCX/PDF
// (estrategiaDoc.js). Espelha a especificação modulo-captacao-emendas-ESPEC.md.
// ---------------------------------------------------------------------------

// Parâmetros de ciclo — mudam a cada PLOA. O ano-corrente é DERIVADO da base
// (o maior exercício presente no RESULTADO LEXOR): quando 2027 entrar na
// planilha, o módulo passa a analisar 2027 sozinho (janela, categorias e o PLOA
// alvo acompanham). Estes ficam apenas como reserva se a base vier sem anos.
export const ANO_CORRENTE_PADRAO = 2026
// Janela de mandato = o ano-corrente e os dois anteriores (legislatura de 4 anos).
export const janelaDe = (ac) => [ac - 2, ac - 1, ac]
// PLOA alvo = próximo exercício a elaborar.
export const ploaAlvoDe = (ac) => `PLOA ${ac + 1}`

// Remoções manuais: parlamentares que aparecem em 2024–2026 mas NÃO estão mais
// em exercício (suplentes que retornaram, eleitos para o Executivo, ministros
// licenciados) — conferidos na lista oficial da Câmara (ESPEC §4). Editável.
export const REMOVIDOS_MANDATO = [
  'ABILIO BRUNINI', 'ALBERTO MOURÃO', 'ALLAN GARCÊS', 'AUGUSTO PUPPIO',
  'CORONEL TELHADA', 'GILVAN MAXIMO', 'JOSÉ GUIMARÃES',
]

// Whitelist: senador em exercício desde antes de 2024, sem emenda recente à
// Defesa, confirmado na lista oficial do Senado (ESPEC §4). Editável.
export const WHITELIST_SEN_ATIVOS = ['MARCOS DO VAL']

// Áreas temáticas "quentes" — existem idênticas no Exército, então uma ação
// dessas bancada em outra Força vira troca direta de UO (ESPEC §6). Editável.
export const GEN_QUENTE = new Set([
  'Saúde das FA', 'Adequação de infraestrutura', 'Infraestrutura',
  'Administração da Unidade', 'Aprestamento (prontidão)', 'Ensino militar',
  'Modernização Estratégica', 'Comando e Controle / TI',
])

// Mapa ação → área temática (ESPEC §8). A PRIMEIRA regra que casa vence, nesta
// ordem. `precisa` é uma lista de termos que TODOS têm de aparecer; `qualquer`
// casa se QUALQUER um aparecer. Comparação em CAIXA ALTA e sem acentos.
export const MAPA_AREA = [
  { qualquer: ['UNIDADES DE SA', 'SAUDE'], area: 'Saúde das FA' },
  { precisa: ['ADEQUA', 'INFRA'], area: 'Adequação de infraestrutura' },
  { qualquer: ['INFRAESTRUTURA'], area: 'Infraestrutura' },
  { qualquer: ['ADMINISTRA'], area: 'Administração da Unidade' },
  { qualquer: ['APRESTAMENTO'], area: 'Aprestamento (prontidão)' },
  { qualquer: ['COMANDO E CONTROLE'], area: 'Comando e Controle / TI' },
  { qualquer: ['EDUCACAO BASICA', 'ENSINO'], area: 'Ensino militar' },
  { qualquer: ['MODERNIZACAO', 'TRANSFORMACAO ESTRAT', 'ESTRATEGIC'], area: 'Modernização Estratégica' },
  { qualquer: ['ANTARTICA'], area: 'PROANTAR/Antártica (perfil Marinha)' },
  { qualquer: ['NAVEGACAO', 'AQUAVI'], area: 'Fiscalização naval (perfil Marinha)' },
  { qualquer: ['AEROESPACIAL', 'AEREO'], area: 'Setor aeroespacial (perfil Aeronáutica)' },
]

// Paleta institucional (ESPEC §10.9). Hex sem "#": docx-js e jsPDF pedem assim
// em alguns pontos; a UI acrescenta o "#".
export const PALETA = {
  azulInstitucional: '1A3A5C', // título, régua, nota
  consolidado: '1B7A3D',       // verde — APOIO CONSOLIDADO
  recuperar: 'B56A00',         // âmbar — APOIO A RECUPERAR
  conquistar: '2A63A6',        // azul — APOIO A CONQUISTAR
  verdeCamara: '009640',       // subtítulo Câmara
  azulSenado: '00305C',        // subtítulo Senado
  cinza: '555555',             // identificação, meta
  preto: '1A1A1A',             // texto
  fundoDisclaimer: 'F2ECDD',   // fundo do disclaimer
  branco: 'FFFFFF',
}

// Metadados das três categorias, na ordem de impressão (ESPEC §5/§10.6).
// `cabecalho(n, ac)` e `tutuloTexto(ac)` recebem o ano-corrente derivado da base.
export const CATEGORIAS = [
  {
    id: 'consolidado',
    rotulo: 'APOIO CONSOLIDADO',
    cor: PALETA.consolidado,
    cabecalho: (n, ac) => `APOIO CONSOLIDADO — apoiaram o Exército em ${ac} (${n})`,
    tutulo: 'APOIO CONSOLIDADO',
    tutuloTexto: (ac) =>
      `destinaram emenda impositiva ao Exército em ${ac}. São a base de apoio da Força — `
      + 'o esforço aqui é de MANUTENÇÃO: agradecer, prestar contas e levar o próximo projeto '
      + 'no formato que já costumam indicar.',
  },
  {
    id: 'recuperar',
    rotulo: 'APOIO A RECUPERAR',
    cor: PALETA.recuperar,
    cabecalho: (n, ac) => `APOIO A RECUPERAR — apoiaram antes, migraram em ${ac} (${n})`,
    tutulo: 'APOIO A RECUPERAR',
    tutuloTexto: (ac) =>
      `já apoiaram o Exército em anos anteriores, mas NÃO em ${ac} (migraram para a `
      + 'Marinha/Aeronáutica ou pausaram). O relacionamento já existe e é o de menor custo '
      + 'para reativar — abordar lembrando a parceria passada.',
  },
  {
    id: 'conquistar',
    rotulo: 'APOIO A CONQUISTAR',
    cor: PALETA.conquistar,
    cabecalho: (n) => `APOIO A CONQUISTAR — nunca apoiaram o Exército (${n})`,
    tutulo: 'APOIO A CONQUISTAR',
    tutuloTexto: () =>
      'nunca apoiaram o Exército, mas apoiam a Marinha e/ou a Aeronáutica. É o campo de '
      + 'abertura de novas relações — oferecer um projeto do Exército equivalente ao que já '
      + 'emendam para as outras Forças.',
  },
]
export const CATEGORIA_POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]))

// Textos do documento (ESPEC §10). Parametrizados pelo ano-corrente (`ac`) e
// pela janela histórica (`anoIni`–`anoFim`) derivados da base.
export const tituloDe = (ac) => `Ideias para a Captação de Emendas Parlamentares — ${ploaAlvoDe(ac)}`

export const metaDe = (ac, anoIni, anoFim) =>
  'Base: emendas impositivas (RP6 individual + RP7 bancada) apresentadas ao PLOA, '
  + `exercícios ${anoIni}–${anoFim}. Inclui apenas parlamentares com mandato ativo em ${ac}. `
  + 'Valores em R$ milhares, solicitados na apresentação.'

export const TUTORIAL_TITULO = 'Entenda as categorias deste relatório:'

export const selosLegendaDe = (ac) =>
  `[NOVO] = estreou o apoio ao Exército em ${ac}, sem histórico anterior (merece consolidação).   `
  + '[ALTA VIABILIDADE] = banca ação que existe idêntica no Exército (transferência direta de UO).   '
  + '[BAIXA VIABILIDADE] = interesse temático específico de outra Força (baixa transferibilidade).'

export const DISCLAIMER =
  'as informações deste relatório são fruto de uma análise unicamente numérica e quantitativa, '
  + 'assim é necessário que o Assessor Parlamentar faça uma análise qualitativa da situação '
  + 'política atual para verificar a viabilidade de aproximação com o gabinete de cada '
  + 'parlamentar, além de realizar as coordenações técnicas com os AsPar EB locais.'

export const estadoVazioDe = (ac) =>
  'Sem registros de emendas individuais (RP6) à Defesa nesta Casa e neste estado no período '
  + `analisado, entre parlamentares com mandato ativo em ${ac}. Campo de prospecção a mapear `
  + 'presencialmente.'

export const NOTA_FECHAMENTO =
  'Os parlamentares que não aparecem neste relatório não indicaram emendas para nenhuma das '
  + 'Forças. Entretanto, nada impede a futura captação de recursos junto a esses representantes.'

// Limitações conhecidas — exibidas na tela do módulo (ESPEC §14).
export const LIMITACOES = [
  'A base é só da função Defesa: um parlamentar reeleito que deixou de emendar para a Defesa '
  + 'após 2023 não é recapturado automaticamente — só entram exceções manuais confirmadas.',
  'Os alertas são numéricos/quantitativos; a leitura qualitativa (viabilidade política, '
  + 'coordenação com AsPar EB) é do Assessor Parlamentar — daí o disclaimer fixo.',
  'UF do autor ≠ local de execução da emenda; emenda apresentada ≠ executada. '
  + 'Manter essa ressalva visível.',
  'As listas de mandato precisam ser reconferidas a cada ciclo do PLOA e a cada troca de '
  + 'gabinete (lista oficial da Câmara e do Senado).',
]

// Cada Casa (documento): rótulo, subtítulo, cor e sufixo do arquivo (ESPEC §1/§10.2).
export const CASAS = {
  camara: {
    id: 'camara',
    tipoAutor: 'DEPUTADO FEDERAL',
    rotulo: 'Câmara dos Deputados',
    cargo: 'Deputado Federal',
    corSubtitulo: PALETA.verdeCamara,
    sufixoArquivo: 'Deputados_Captacao_Emendas',
    subpasta: 'Camara_Deputados',
  },
  senado: {
    id: 'senado',
    tipoAutor: 'SENADOR',
    rotulo: 'Senado Federal',
    cargo: 'Senador',
    corSubtitulo: PALETA.azulSenado,
    sufixoArquivo: 'Senadores_Captacao_Emendas',
    subpasta: 'Senado_Senadores',
  },
}

// UF por extenso (as 27 unidades da federação).
export const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
}
// Ordem das 27 UF (mesma do IBGE, por região) — a lista do seletor e do pacote.
export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// Banner institucional (header.jpg): imagem em src/loa/assets/header-banner.jpg,
// inserida em sangria total no topo de cada página (ESPEC §10.1). A proporção é
// usada para calcular a altura quando a largura = largura da página.
export const BANNER = {
  aspecto: 2000 / 378, // largura / altura da imagem
  alt: 'Subassessoria de Orçamento (A4.6)',
}
