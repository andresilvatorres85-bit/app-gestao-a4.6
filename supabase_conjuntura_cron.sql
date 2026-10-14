-- Disparo exato do Relatório de Conjuntura às 08:00 de Brasília (seg-sex).
-- O agendamento do GitHub Actions não tem hora garantida; aqui o pg_cron do
-- Supabase chama a Edge Function "disparar-conjuntura", que dispara o workflow.
--
-- Antes: publique a Edge Function supabase/functions/disparar-conjuntura (com
-- "Verify JWT" desligado) e crie o secret CONJUNTURA_CRON_SECRET.
-- Depois: troque os dois valores marcados abaixo e rode no SQL Editor.
-- Pode ser executado de novo (substitui o agendamento).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('conjuntura-0800')
where exists (select 1 from cron.job where jobname = 'conjuntura-0800');

-- pg_cron usa UTC: 11:00 UTC = 08:00 de Brasília.
select cron.schedule(
  'conjuntura-0800',
  '0 11 * * 1-5',
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/disparar-conjuntura',   -- << troque SEU-PROJETO
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', 'O-MESMO-TEXTO-DO-SECRET'                                  -- << troque pelo CONJUNTURA_CRON_SECRET
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Conferir: select * from cron.job;  Histórico: select * from cron.job_run_details order by start_time desc limit 5;
