# Gestão A4.6 — Subassessoria Parlamentar de Orçamento

Aplicativo web com duas frentes de trabalho da subassessoria, organizadas em
duas abas no cabeçalho:

- **MÉTRICAS** — registro e consulta de contatos com senadores, deputados, seus
  assessores e consultores legislativos de orçamento. Reúne as seções Painel,
  Lançar, Histórico e Configurações. Já vem com o histórico da planilha
  (1.471 registros, maio/2024 a agosto/2026) carregado.
- **LEXOR** — geração dos espelhos de emenda no formato oficial, a partir do
  `Controle_LEXOR.xlsx`, substituindo a mala direta do Word.

Feito para ser hospedado de graça no **GitHub Pages**, com os dados novos
(lançados pela equipe) guardados num banco de dados gratuito no **Supabase**.

---

## ⚠️ Leia antes de publicar: sobre privacidade

O GitHub Pages, no plano gratuito, só publica sites **públicos** — qualquer
pessoa com o link consegue abrir a página. Não existe, no plano gratuito, uma
forma de deixar o link restrito a você. Por isso este app tem uma **tela de
login**: mesmo que alguém encontre o endereço do site, sem uma conta válida
não consegue ver nem lançar nenhum contato — os dados ficam protegidos no
banco (Supabase), não só escondidos atrás de uma senha na tela.

Se isso não for proteção suficiente para o seu caso de uso, as alternativas
são: (a) usar GitHub Enterprise Cloud, que permite Pages privado; ou (b)
hospedar em outro serviço com controle de acesso nativo (Vercel, Netlify,
etc. — nesse caso me avise que eu adapto o projeto).

---



## Suas atualizações preservam o histórico

Os lançamentos ficam no banco de dados (Supabase), **separados do código**. Quando
você atualiza o aplicativo no GitHub, apenas o código é substituído — o banco nunca
é tocado. Portanto **todo o histórico de lançamentos é preservado automaticamente**
a cada atualização, sem que você precise fazer backup ou qualquer passo extra.

## Recursos do aplicativo

- **Tela de login** protegendo o acesso (contas criadas no Supabase).
- **Painel** com total geral, comparativo mês a mês entre anos, e distribuição por função e por espectro.
- **Lançar** um contato: quatro tipos — Senador, Deputado, Consultor e **AsPar EB** (Assessor Parlamentar do Exército).
  - Para Senador/Deputado, o **espectro é preenchido automaticamente** a partir do partido.
  - Para **AsPar EB**, há seleção do **estado** do assessor e do **assunto** (Cartilha, Dúvida ou Ajuste de emenda).
  - O campo **Registrado por** é uma lista fixa: Maj Tiago Felix, Maj Torres, ST Bacchiega.
- **Histórico**: 1.471 registros da planilha + todos os lançamentos do app, pesquisáveis e filtráveis.
- **Configurações** (aba do cabeçalho), com duas seções recolhíveis:
  - **Partidos e espectro**: cadastro, edição e exclusão de partidos, direto no app.
  - **Usuários**: cadastro dos nomes que aparecem no app e associação ao e-mail de login.
- **"Registrado por" automático**: preenchido pelo nome vinculado ao e-mail que fez login.
- **Imagem da assessoria** como plano de fundo, e o **brasão institucional** no login e no cabeçalho.
- **Comparação de múltiplos anos** no painel: selecione um ou vários anos para consolidar os gráficos.
- **Exportação para PowerPoint** (PPTX) com **gráficos nativos editáveis**: o painel inteiro ou cada gráfico individualmente, respeitando os filtros aplicados.
- **Exportação de gráficos em PNG**.
- **Dois novos gráficos**: os 10 mais visitados/contatados e os 10 partidos mais contatados.
- **Rótulos de dados** nos gráficos (ocultos automaticamente no celular para não poluir; aparecem ao tocar/passar o cursor).


## Passo a passo para publicar

### 1. Criar o banco de dados (Supabase — grátis)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New project**. Escolha um nome (ex.: `controle-visitas`) e uma
   senha de banco de dados (guarde essa senha, mas ela não será usada no app).
3. Espere o projeto terminar de ser criado (cerca de 2 minutos).
4. No menu lateral, abra **SQL Editor** → **New query**.
5. Abra o arquivo `supabase_setup.sql` (nesta pasta), copie todo o conteúdo,
   cole no editor e clique em **Run**. Isso cria a tabela `registros` já com
   as permissões de segurança corretas.
6. Ainda no Supabase, vá em **Authentication** → **Users** → **Add user** →
   **Create new user**. Crie um e-mail e senha para o primeiro acesso da
   equipe (pode ser um e-mail/senha único, compartilhado pelo grupo, ou um
   por pessoa — veja a seção "Adicionar mais pessoas" abaixo).
7. Vá em **Settings** → **API**. Anote dois valores que vai usar no passo 3:
   - **Project URL**
   - **anon public** key (a chave "anônima" — não é secreta, foi feita para
     ficar no código do site; quem protege os dados é a regra de segurança
     que o SQL do passo 5 já criou, exigindo login).

### 2. Colocar o código no GitHub

1. Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. Crie um repositório novo, **público**, com o nome que preferir (ex.:
   `controle-visitas`).
3. Suba o conteúdo desta pasta para o repositório. Pelo navegador: arraste
   todos os arquivos e pastas na página inicial do repositório vazio
   ("uploading an existing file"). Ou, pelo terminal:
   ```bash
   cd controle-visitas
   git init
   git add .
   git commit -m "Primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

### 3. Configurar as chaves do Supabase no GitHub

1. No repositório do GitHub, vá em **Settings** → **Secrets and variables**
   → **Actions** → **New repository secret**.
2. Crie dois secrets:
   - Nome `VITE_SUPABASE_URL`, valor = a **Project URL** anotada no passo 1.7
   - Nome `VITE_SUPABASE_ANON_KEY`, valor = a **anon public key** anotada no
     passo 1.7

### 4. Ativar o GitHub Pages

1. No repositório, vá em **Settings** → **Pages**.
2. Em **Source**, selecione **GitHub Actions**.
3. Pronto. O workflow em `.github/workflows/deploy.yml` já publica o site
   automaticamente a cada `git push` na branch `main`. Acompanhe o progresso
   na aba **Actions** do repositório — quando o ícone ficar verde, o site
   está no ar.
4. O endereço final aparece em **Settings** → **Pages**, algo como
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

Compartilhe esse link com a equipe, junto com o e-mail e senha criados no
passo 1.6.

---

## Testar no seu computador antes de publicar (opcional)

Requer [Node.js](https://nodejs.org) instalado.

```bash
npm install
cp .env.example .env      # depois edite o .env com sua URL e chave do Supabase
npm run dev
```

Abre em `http://localhost:5173`.

---

## Adicionar mais pessoas à equipe

No painel do Supabase: **Authentication** → **Users** → **Add user**. Cada
novo e-mail/senha criado ali já consegue entrar no app imediatamente, sem
precisar mexer em nada no código ou no GitHub.

## Atualizar os dados do LEXOR

[#atualizar-os-dados-do-lexor](#atualizar-os-dados-do-lexor)

As propostas ficam embutidas no código (arquivo `src/data/lexor.js`), gerado a
partir da planilha. Para carregar uma nova safra:

1. Substitua o `Controle_LEXOR.xlsx` na raiz do repositório.
2. Rode `python3 gerar_lexor.py` (requer `pip install openpyxl`).
3. Faça `git push` — o site republica sozinho.

O script imprime um resumo de consistência (propostas sem ação cadastrada, UO
divergente, sem valor, sem autor) que serve de checagem antes da exportação.

## Relatório diário de Conjuntura (CONHECIMENTO › Conjuntura)

De segunda a sexta, às 8h (horário de Brasília), o workflow **Relatório de
Conjuntura** (`.github/workflows/conjuntura.yml`) roda `scripts/conjuntura.py`:

1. busca no **Tavily** as notícias do dia sobre o Orçamento Federal, só nos
   portais da lista `FONTES` do script (G1, O Globo, CNN, Poder360, Metrópoles,
   Valor, InfoMoney, Gazeta do Povo, Estadão, Folha, Veja, Jovem Pan, Oeste e
   Congresso Nacional/CMO);
2. o **Claude** redige o relatório (panorama e meta fiscal; bloqueios e
   alocação; Executivo x Congresso/CMO; pontos de atenção e próximos passos;
   fontes), descartando o que não foi publicado no dia;
3. o resultado é gravado na tabela `conjuntura_relatorios` do Supabase e
   aparece na aba **Conjuntura**, com seletor de data e exportação em DOCX e PDF.

Configuração (uma vez):

1. No Supabase, rode `supabase_conjuntura.sql` no **SQL Editor**.
2. No GitHub, em **Settings → Secrets and variables → Actions**, crie:
   - `TAVILY_API_KEY` — chave do Tavily (app.tavily.com → API Keys);
   - `ANTHROPIC_API_KEY` — chave da API do Claude (platform.claude.com);
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → **Project Settings → API** →
     chave `service_role` (só o workflow usa; nunca vai para o site).
   A URL do Supabase vem do secret `VITE_SUPABASE_URL`, que já existe.
3. Para testar sem esperar o horário: **Actions → Relatório de Conjuntura →
   Run workflow** (dá para informar outra data no formato AAAA-MM-DD).

Custos aproximados por dia útil: ~34 créditos do Tavily (~750 por mês; o
plano gratuito tem 1.000) e uma chamada ao Claude (alguns centavos de dólar).
Se a geração falhar, a aba mostra o motivo no relatório daquele dia.

## Atualizações futuras

Qualquer alteração no código (`git push` na branch `main`) republica o site
automaticamente em 1–2 minutos, via GitHub Actions — não precisa repetir os
passos de configuração.

## Estrutura do projeto

```
src/
  App.jsx                 # tela principal, login e roteamento entre abas
  components/
    Login.jsx              # tela de login (Supabase Auth)
    Dashboard.jsx           # painel com gráficos
    NovoRegistro.jsx        # formulário de lançamento
    Historico.jsx           # tabela filtrável com todos os registros
    Lexor.jsx               # aba LEXOR: lista de propostas e geração em lote
    Espelho.jsx             # desenho de uma folha de espelho de emenda
    TabelaPropostas.jsx     # tabela usada pelos dois cards do módulo LEXOR
    UI.jsx                  # componentes visuais reutilizáveis
  data/
    historico.js            # os 1.471 registros da planilha (somente leitura)
    partidos.js              # tabela de partidos e espectro ideológico
    lexor.js                 # propostas e tabela de ações (gerado por gerar_lexor.py)
  lib/supabaseClient.js     # conexão com o Supabase
  constants.js / helpers.js
  lexorUtils.js             # monta o espelho a partir da proposta
  lexorExport.js            # exportação dos espelhos para o Word
  lexorConsolidar.js        # junta várias propostas numa consolidadora
gerar_lexor.py              # converte Controle_LEXOR.xlsx em src/data/lexor.js
supabase_lexor_status.sql   # cria a tabela da coluna LEXOR (rodar uma vez)
supabase_lexor_consolidadas.sql # cria a tabela das consolidadoras (rodar uma vez)
supabase_setup.sql          # script para criar a tabela e as permissões
.github/workflows/deploy.yml # publica automaticamente no GitHub Pages
```

O histórico da planilha fica fixo no código (não é editável pelo app, para
preservar a integridade dos dados originais). Os lançamentos feitos pela
equipe ficam no Supabase e podem ser excluídos pela própria pessoa que
lançou (ou qualquer pessoa logada), na aba Histórico.
