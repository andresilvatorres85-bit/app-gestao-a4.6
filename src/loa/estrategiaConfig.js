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

// Eleições gerais de 2026 (04/10/2026): parlamentares em exercício que NÃO
// terão mandato no Congresso a partir de 01/02/2027 — perderam a reeleição,
// disputaram outro cargo sem se eleger, ficaram como suplente/vice de chapa ou
// não foram candidatos. Recebem o selo vermelho [NÃO REELEITO]. Não entram:
// reeleitos, eleitos para a outra Casa ou governador, quem ainda disputa o
// 2º turno (governo/Presidência) e senadores com mandato até 2031.
// Fonte: resultados oficiais do TSE (resultados.tse.jus.br — eleições 6257 e
// 6259: Presidente, Governador, Senador e Deputado Federal, inclusive vices e
// suplentes), totalização concluída em 06/10/2026, cruzada com os autores da
// base (nomes de urna diferentes conferidos pelo nome civil). Nomes como
// aparecem no campo Autor (a comparação ignora acentos e caixa). Editável
// também na tela, em "Configuração".
export const SELO_NAO_REELEITO = 'NÃO REELEITO'
export const COR_NAO_REELEITO = 'C00000'

// Quem muda de cargo em 2027 (eleito em 2026 para outro cargo) recebe o selo
// do novo cargo; quem é suplente de senador eleito (sem mandato próprio)
// recebe [SUPLENTE 2027], junto com [NÃO REELEITO]. Mesma fonte (TSE, chapas
// com vice/suplentes). Editável na tela ("NOME = CARGO", um por linha).
export const COR_CARGO_2027 = '1F5FAD'
export const COR_SUPLENTE_2027 = '9C6500'
export const corDoCargo2027 = (txt) => (/^SUPLENTE/i.test(txt) ? COR_SUPLENTE_2027 : COR_CARGO_2027)
export const CARGOS_2027 = {
  // Deputados eleitos senadores
  'LUIZIANNE LINS': 'SENADORA 2027', 'BIA KICIS': 'SENADORA 2027', 'JOSÉ MEDEIROS': 'SENADOR 2027',
  'FILIPE BARROS': 'SENADOR 2027', 'JÚLIO CESAR': 'SENADOR 2027', 'CARLOS JORDY': 'SENADOR 2027',
  'SANDERSON': 'SENADOR 2027', 'NICOLETTI': 'SENADOR 2027', 'GUILHERME DERRITE': 'SENADOR 2027',
  'ALEXANDRE GUIMARÃES': 'SENADOR 2027',
  // Eleitos governadores
  'ZUCCO': 'GOVERNADOR 2027', 'SERGIO MORO': 'GOVERNADOR 2027',
  // Senador eleito deputado federal
  'IZALCI LUCAS': 'DEPUTADO 2027',
  // 1º suplente de senador eleito em 2026
  'LUCIANO BIVAR': 'SUPLENTE 2027', 'DRA. EUDÓCIA': 'SUPLENTE 2027', 'JADER BARBALHO': 'SUPLENTE 2027',
}
export const NAO_REELEITOS = [
  // Senado (mandato encerra em 31/01/2027)
  'ANGELO CORONEL', 'CARLOS VIANA', 'CHICO RODRIGUES', 'DANIELLA RIBEIRO',
  'DRA. EUDÓCIA', 'EDUARDO GIRÃO', 'JADER BARBALHO', 'ELIZIANE GAMA', 'ESPERIDIÃO AMIN',
  'FERNANDO DUEIRE', 'FLÁVIO ARNS', 'GIORDANO', 'IVETE DA SILVEIRA',
  'JAYME CAMPOS', 'LEILA BARROS', 'LUIS CARLOS HEINZE', 'MARCOS DO VAL',
  'MECIAS DE JESUS', 'ORIOVISTO GUIMARÃES', 'RODRIGO PACHECO', 'SORAYA THRONICKE',
  'SÉRGIO PETECÃO', 'VANDERLAN CARDOSO', 'WEVERTON', 'ZENAIDE MAIA',
  'ZEQUINHA MARINHO', 'RENAN CALHEIROS', 'RANDOLFE RODRIGUES', 'FABIANO CONTARATO',
  'CARLOS FÁVARO', 'CIRO NOGUEIRA',
  // Câmara dos Deputados, por UF
  'ANTÔNIA LÚCIA', 'ZEZINHO BARBARY', // AC
  'PAULÃO', // AL
  'CAPITÃO ALBERTO NETO', 'ÁTILA LINS', // AM
  'ANDRÉ ABDON', 'SILVIA WAIÃPI', // AP
  'ALEX SANTANA', 'ARTHUR OLIVEIRA MAIA', 'BACELAR', 'JOSÉ ROCHA', 'JOÃO LEÃO', 'LÍDICE DA MATA', 'ROGÉRIA SANTOS', 'ZÉ NETO', // BA
  'ANDRÉ FIGUEIREDO', 'EDUARDO BISMARCK', 'JOSÉ AIRTON FÉLIX CIRILO', // CE
  'FRED LINHARES', 'PROF. PAULO FERNANDO', // DF
  'DR. VICTOR LINHALIS', 'GILVAN DA FEDERAL', 'HELDER SALOMÃO', // ES
  'DR. ISMAEL ALEXANDRINO', 'JEFERSON RODRIGUES', // GO
  'IGOR TIMO', 'LUIZ FERNANDO FARIA', 'MAURICIO DO VÔLEI', 'MISAEL VARELLA', 'ODAIR CUNHA', 'PEDRO AIHARA', // MG
  'DR. LUIZ OVANDO', 'GERALDO RESENDE', 'VANDER LOUBET', // MS
  'NELSON BARBUDO', 'RODRIGO DA ZAELI', // MT
  'DELEGADO ÉDER MAURO', 'HENDERSON PINTO', // PA
  'LUIZ COUTO', 'MERSINHO LUCENA', 'ROMERO RODRIGUES', // PB
  'ERIBERTO MEDEIROS', 'LUCIANO BIVAR', 'MENDONÇA FILHO', 'PASTOR EURICO', // PE
  'GERALDO MENDES', 'LUIZ CARLOS HAULY', 'PADOVANI', // PR
  'BANDEIRA DE MELLO', 'DANIELA DO WAGUINHO', 'DELEGADO RAMAGEM', 'HELIO LOPES', 'HUGO LEAL', 'JORGE BRAZ', 'JULIO LOPES', 'LAURA CARNEIRO', 'MARCELO CRIVELLA', 'MARCOS SOARES', 'MAX LEMOS', 'MURILLO GOUVEA', 'REIMONT', 'RICARDO ABRÃO', 'ROBERTO MONTEIRO PAI', 'ROSANGELA GOMES', // RJ
  'PASTOR DINIZ', // RR
  'AFONSO MOTTA', 'ALEXANDRE LINDENMEYER', 'DANIEL TRZECIAK', 'FRANCIANE BAYER', // RS
  'FABIO SCHIOCHET', // SC
  'RODRIGO VALADARES', // SE
  'ADILSON BARROSO', 'CEZINHA DE MADUREIRA', 'DAVID SOARES', 'EDUARDO BOLSONARO', 'FAUSTO PINATO', 'GILBERTO NASCIMENTO', 'SIMONE MARQUETTO', 'TIRIRICA', 'VINICIUS CARVALHO', // SP
  'LÁZARO BOTELHO', // TO
]

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
    cabecalho: (n, ac) => `APOIO CONSOLIDADO — apoiaram a instituição em ${ac} (${n})`,
    tutulo: 'APOIO CONSOLIDADO',
    tutuloTexto: (ac) =>
      `destinaram emenda impositiva à instituição em ${ac}. São a base de apoio da instituição — `
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
      `já apoiaram a instituição em anos anteriores, mas NÃO em ${ac} (migraram para a `
      + 'Marinha/Aeronáutica ou pausaram). O relacionamento já existe e é o de menor custo '
      + 'para reativar — abordar lembrando a parceria passada.',
  },
  {
    id: 'conquistar',
    rotulo: 'APOIO A CONQUISTAR',
    cor: PALETA.conquistar,
    cabecalho: (n) => `APOIO A CONQUISTAR — nunca apoiaram a instituição (${n})`,
    tutulo: 'APOIO A CONQUISTAR',
    tutuloTexto: () =>
      'nunca apoiaram a instituição, mas apoiam a Marinha e/ou a Aeronáutica. É o campo de '
      + 'abertura de novas relações — oferecer um projeto da instituição equivalente ao que já '
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
  `[NÃO REELEITO] = não obteve novo mandato no Congresso nas eleições de ${ac} (perdeu, disputou outro cargo ou não concorreu); segue em exercício até 31/01/${ac + 1} e ainda pode indicar emendas ao ${ploaAlvoDe(ac)}.   `
  + `[SENADOR(A)/GOVERNADOR/DEPUTADO ${ac + 1}] = eleito em ${ac} para outro cargo, que assume em ${ac + 1}.   `
  + `[SUPLENTE ${ac + 1}] = sem mandato próprio a partir de ${ac + 1}; é suplente de senador eleito em ${ac}.   `
  + `[NOVO] = estreou o apoio à instituição em ${ac}, sem histórico anterior (merece consolidação).   `
  + '[ALTA VIABILIDADE] = banca ação que existe idêntica na instituição (transferência direta de UO).   '
  + '[BAIXA VIABILIDADE] = interesse temático específico de outra Força (baixa transferibilidade).'

export const DISCLAIMER =
  'as informações deste relatório são fruto de uma análise unicamente numérica e quantitativa, '
  + 'assim é necessário que o Assessor Parlamentar faça uma análise qualitativa da situação '
  + 'política atual para verificar a viabilidade de aproximação com o gabinete de cada '
  + 'parlamentar, além de realizar as coordenações técnicas com as assessorias parlamentares locais da instituição.'

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
