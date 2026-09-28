-- RECUPERAÇÃO: remove proposições DUPLICADAS da tabela public.proposicoes.
-- Contexto: ao rodar o script de políticas com o app aberto, houve um instante
-- em que a tabela ficou sem policy de SELECT e a leitura voltou vazia; o app
-- reinseriu a semente inteira, duplicando as proposições. Isso deixou o app
-- lento e fez a edição "não salvar" (você editava uma das várias cópias).
--
-- Rode no Supabase: SQL Editor > New query > Run. Faça isto com o app FECHADO.
-- Mantém, para cada número de proposição, a linha mais antiga (primeira criada)
-- e apaga as demais. Não afeta proposições únicas.

-- (Opcional) Antes: veja quantas duplicatas existem —
--   select proposicao, count(*) from public.proposicoes
--   group by proposicao having count(*) > 1 order by count(*) desc;

delete from public.proposicoes p
using (
  select id,
         row_number() over (
           partition by proposicao
           order by criado_em asc nulls first, id asc
         ) as rn
  from public.proposicoes
) d
where p.id = d.id
  and d.rn > 1;

-- Depois de rodar, recarregue o app: a lista volta ao tamanho normal e a edição
-- passa a salvar (com as políticas de UPDATE já aplicadas).
