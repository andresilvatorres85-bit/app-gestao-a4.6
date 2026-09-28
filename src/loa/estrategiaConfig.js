// ---------------------------------------------------------------------------
// Módulo "Captação de Emendas por Estado" (subaba Estratégia do RESULTADO LEXOR)
// Constantes editáveis, textos fixos e paleta — centralizados aqui para revisão
// sem mexer na lógica (ver estrategia.js) nem na geração de DOCX/PDF
// (estrategiaDoc.js). Espelha a especificação modulo-captacao-emendas-ESPEC.md.
// ---------------------------------------------------------------------------

// Parâmetros de ciclo — mudam a cada PLOA. Mantidos como configuração para não
// ficarem espalhados pelo código (ESPEC §13).
export const ANO_CORRENTE = 2026
export const JANELA_MANDATO = [2024, 2025, 2026] // legislatura 2023–2027 (57ª)
export const PLOA_ALVO = 'PLOA 2027'

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
export const CATEGORIAS = [
  {
    id: 'consolidado',
    rotulo: 'APOIO CONSOLIDADO',
    cor: PALETA.consolidado,
    cabecalho: (n) => `APOIO CONSOLIDADO — apoiaram o Exército em 2026 (${n})`,
    tutulo: 'APOIO CONSOLIDADO',
    tutuloTexto:
      'destinaram emenda impositiva ao Exército em 2026. São a base de apoio da Força — '
      + 'o esforço aqui é de MANUTENÇÃO: agradecer, prestar contas e levar o próximo projeto '
      + 'no formato que já costumam indicar.',
  },
  {
    id: 'recuperar',
    rotulo: 'APOIO A RECUPERAR',
    cor: PALETA.recuperar,
    cabecalho: (n) => `APOIO A RECUPERAR — apoiaram antes, migraram em 2026 (${n})`,
    tutulo: 'APOIO A RECUPERAR',
    tutuloTexto:
      'já apoiaram o Exército em anos anteriores, mas NÃO em 2026 (migraram para a '
      + 'Marinha/Aeronáutica ou pausaram). O relacionamento já existe e é o de menor custo '
      + 'para reativar — abordar lembrando a parceria passada.',
  },
  {
    id: 'conquistar',
    rotulo: 'APOIO A CONQUISTAR',
    cor: PALETA.conquistar,
    cabecalho: (n) => `APOIO A CONQUISTAR — nunca apoiaram o Exército (${n})`,
    tutulo: 'APOIO A CONQUISTAR',
    tutuloTexto:
      'nunca apoiaram o Exército, mas apoiam a Marinha e/ou a Aeronáutica. É o campo de '
      + 'abertura de novas relações — oferecer um projeto do Exército equivalente ao que já '
      + 'emendam para as outras Forças.',
  },
]
export const CATEGORIA_POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]))

// Textos fixos do documento (ESPEC §10). Centralizados para revisão editorial.
export const TITULO = `Ideias para a Captação de Emendas Parlamentares — ${PLOA_ALVO}`

export const META =
  'Base: emendas impositivas (RP6 individual + RP7 bancada) apresentadas ao PLOA, '
  + 'exercícios 2019–2026. Inclui apenas parlamentares com mandato ativo em 2026. '
  + 'Valores em R$ milhares, solicitados na apresentação.'

export const TUTORIAL_TITULO = 'Entenda as categorias deste relatório:'

export const SELOS_LEGENDA =
  '[NOVO] = estreou o apoio ao Exército em 2026, sem histórico anterior (merece consolidação).   '
  + '[ALTA VIABILIDADE] = banca ação que existe idêntica no Exército (transferência direta de UO).   '
  + '[BAIXA VIABILIDADE] = interesse temático específico de outra Força (baixa transferibilidade).'

export const DISCLAIMER =
  'as informações deste relatório são fruto de uma análise unicamente numérica e quantitativa, '
  + 'assim é necessário que o Assessor Parlamentar faça uma análise qualitativa da situação '
  + 'política atual para verificar a viabilidade de aproximação com o gabinete de cada '
  + 'parlamentar, além de realizar as coordenações técnicas com os AsPar EB locais.'

export const ESTADO_VAZIO =
  'Sem registros de emendas individuais (RP6) à Defesa nesta Casa e neste estado no período '
  + 'analisado, entre parlamentares com mandato ativo em 2026. Campo de prospecção a mapear '
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

// Cabeçalho institucional (substitui o banner-imagem header.jpg da referência:
// o app não embarca a imagem, então desenhamos uma faixa equivalente — editável).
export const BANNER = {
  linha1: 'EXÉRCITO BRASILEIRO',
  linha2: 'Ministério da Defesa · Assessoria Parlamentar — Subassessoria A4.6',
  linha3: 'Captação de Emendas Parlamentares',
  cor: PALETA.azulInstitucional,
}
