-- =====================================================================
-- ARENA SPORTS - setup completo do banco (Supabase)
-- Cole tudo no SQL Editor do Supabase e clique em RUN.
-- Pode rodar mais de uma vez: tudo usa "if not exists" / "drop ... if exists".
-- Gerado a partir de supabase/migrations/0001..0003 + seed.
-- =====================================================================

-- ===================== migrations/0001_initial_schema.sql =====================
-- Arena Sports - Sistema de Gestao de Eventos Esportivos
-- Migration inicial: perfis, esportes, eventos, equipes, atletas, jogos, sumulas, classificacao

-- ============================================================
-- 3.1 Autenticacao e perfis
-- ============================================================
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  tipo text not null check (tipo in ('super_admin','gestor_evento','arbitro','capitao_equipe','atleta','publico')),
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.2 Esportes (configuraveis)
-- ============================================================
create table if not exists esportes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  padrao boolean default false,
  configuracao_sumula jsonb,
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.3 Eventos/Campeonatos
-- ============================================================
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  locais text[],
  esporte_id uuid references esportes(id),
  logo_url text,
  formato text not null check (formato in ('mata_mata','grupos_mata_mata','pontos_corridos')),
  qtd_equipes int not null,
  qtd_atletas_por_equipe int not null,
  data_inicio date not null,
  data_fim date,
  sorteio_tipo text check (sorteio_tipo in ('manual','automatico')),
  status text default 'rascunho' check (status in ('rascunho','inscricoes_abertas','sorteio_realizado','em_andamento','encerrado')),
  gestor_id uuid references perfis(id),
  codigo_evento text unique,
  permissoes jsonb,
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.4 Equipes
-- ============================================================
create table if not exists equipes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  nome text not null,
  codigo_exclusivo text unique not null,
  capitao_id uuid references perfis(id),
  posicao_grupo text,
  logo_url text,
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.5 Atletas (vinculo equipe)
-- ============================================================
create table if not exists atletas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references perfis(id),
  equipe_id uuid references equipes(id) on delete cascade,
  numero_camisa int,
  posicao text,
  data_nascimento date,
  documento text,
  foto_url text,
  aprovado boolean default false,
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.6 Jogos e agenda
-- ============================================================
create table if not exists jogos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  fase text,
  equipe_a_id uuid references equipes(id),
  equipe_b_id uuid references equipes(id),
  local text,
  data_hora timestamptz,
  status text default 'agendado' check (status in ('agendado','em_andamento','encerrado','wo')),
  arbitro_id uuid references perfis(id),
  placar_a int,
  placar_b int,
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.7 Sumulas (estrutura generica + dados dinamicos)
-- ============================================================
create table if not exists sumulas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid references jogos(id) on delete cascade,
  esporte_id uuid references esportes(id),
  dados jsonb not null,
  status text default 'aberta' check (status in ('aberta','em_andamento','fechada')),
  fechada_por uuid references perfis(id),
  fechada_em timestamptz,
  criado_em timestamptz default now(),
  unique (jogo_id)
);

create table if not exists estatisticas_atletas (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid references sumulas(id) on delete cascade,
  atleta_id uuid references atletas(id),
  estatisticas jsonb not null,
  unique (sumula_id, atleta_id)
);

-- ============================================================
-- 3.8 Classificacao (materializada ou calculada via view)
-- ============================================================
create table if not exists classificacao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  equipe_id uuid references equipes(id),
  grupo text,
  pontos int default 0,
  vitorias int default 0,
  derrotas int default 0,
  saldo int default 0,
  atualizado_em timestamptz default now(),
  unique (evento_id, equipe_id)
);

-- ============================================================
-- Indices auxiliares
-- ============================================================
create index if not exists idx_eventos_gestor on eventos(gestor_id);
create index if not exists idx_equipes_evento on equipes(evento_id);
create index if not exists idx_atletas_equipe on atletas(equipe_id);
create index if not exists idx_atletas_perfil on atletas(perfil_id);
create index if not exists idx_jogos_evento on jogos(evento_id);
create index if not exists idx_jogos_arbitro on jogos(arbitro_id);
create index if not exists idx_sumulas_jogo on sumulas(jogo_id);
create index if not exists idx_estatisticas_sumula on estatisticas_atletas(sumula_id);
create index if not exists idx_classificacao_evento on classificacao(evento_id);


-- ===================== migrations/0002_row_level_security.sql =====================
-- Arena Sports - Row Level Security
-- RLS eh o que garante, no nivel do banco, que ninguem acesse dados fora
-- do que o perfil permite -- mesmo que alguem tente manipular requisicoes diretamente.

alter table perfis enable row level security;
alter table esportes enable row level security;
alter table eventos enable row level security;
alter table equipes enable row level security;
alter table atletas enable row level security;
alter table jogos enable row level security;
alter table sumulas enable row level security;
alter table estatisticas_atletas enable row level security;
alter table classificacao enable row level security;

-- ------------------------------------------------------------
-- perfis
-- ------------------------------------------------------------
drop policy if exists "usuario ve e edita seu proprio perfil" on perfis;
create policy "usuario ve e edita seu proprio perfil"
on perfis for select
using (id = auth.uid());

drop policy if exists "usuario edita seu proprio perfil" on perfis;
create policy "usuario edita seu proprio perfil"
on perfis for update
using (id = auth.uid());

drop policy if exists "usuario cria seu proprio perfil" on perfis;
create policy "usuario cria seu proprio perfil"
on perfis for insert
with check (id = auth.uid());

-- ------------------------------------------------------------
-- esportes: leitura publica, escrita por gestor/super_admin
-- ------------------------------------------------------------
drop policy if exists "qualquer um le esportes" on esportes;
create policy "qualquer um le esportes"
on esportes for select
using (true);

drop policy if exists "gestor cria esportes" on esportes;
create policy "gestor cria esportes"
on esportes for insert
with check (
  exists (select 1 from perfis p where p.id = auth.uid() and p.tipo in ('gestor_evento','super_admin'))
);

-- ------------------------------------------------------------
-- eventos
-- ------------------------------------------------------------
drop policy if exists "qualquer um le eventos" on eventos;
create policy "qualquer um le eventos"
on eventos for select
using (true);

drop policy if exists "gestor cria evento" on eventos;
create policy "gestor cria evento"
on eventos for insert
with check (gestor_id = auth.uid());

drop policy if exists "gestor edita seu evento" on eventos;
create policy "gestor edita seu evento"
on eventos for update
using (gestor_id = auth.uid());

-- ------------------------------------------------------------
-- equipes
-- ------------------------------------------------------------
drop policy if exists "qualquer um le equipes" on equipes;
create policy "qualquer um le equipes"
on equipes for select
using (true);

drop policy if exists "gestor do evento cria equipe" on equipes;
create policy "gestor do evento cria equipe"
on equipes for insert
with check (
  exists (select 1 from eventos e where e.id = equipes.evento_id and e.gestor_id = auth.uid())
);

drop policy if exists "gestor ou capitao edita a equipe" on equipes;
create policy "gestor ou capitao edita a equipe"
on equipes for update
using (
  capitao_id = auth.uid()
  or exists (select 1 from eventos e where e.id = equipes.evento_id and e.gestor_id = auth.uid())
);

-- ------------------------------------------------------------
-- atletas
-- ------------------------------------------------------------
drop policy if exists "atleta ve seu proprio registro" on atletas;
create policy "atleta ve seu proprio registro"
on atletas for select
using (
  perfil_id = auth.uid()
  or exists (
    select 1 from equipes eq
    join eventos ev on ev.id = eq.evento_id
    where eq.id = atletas.equipe_id
      and (eq.capitao_id = auth.uid() or ev.gestor_id = auth.uid())
  )
);

drop policy if exists "atleta se vincula a uma equipe" on atletas;
create policy "atleta se vincula a uma equipe"
on atletas for insert
with check (perfil_id = auth.uid());

drop policy if exists "capitao ou gestor aprova atleta" on atletas;
create policy "capitao ou gestor aprova atleta"
on atletas for update
using (
  perfil_id = auth.uid()
  or exists (
    select 1 from equipes eq
    join eventos ev on ev.id = eq.evento_id
    where eq.id = atletas.equipe_id
      and (eq.capitao_id = auth.uid() or ev.gestor_id = auth.uid())
  )
);

-- ------------------------------------------------------------
-- jogos
-- ------------------------------------------------------------
drop policy if exists "qualquer um le jogos" on jogos;
create policy "qualquer um le jogos"
on jogos for select
using (true);

drop policy if exists "gestor gerencia jogos do seu evento" on jogos;
create policy "gestor gerencia jogos do seu evento"
on jogos for all
using (
  exists (select 1 from eventos e where e.id = jogos.evento_id and e.gestor_id = auth.uid())
)
with check (
  exists (select 1 from eventos e where e.id = jogos.evento_id and e.gestor_id = auth.uid())
);

-- ------------------------------------------------------------
-- sumulas
-- ------------------------------------------------------------
drop policy if exists "leitura publica de sumulas" on sumulas;
create policy "leitura publica de sumulas"
on sumulas for select
using (true);

drop policy if exists "arbitro edita sua sumula" on sumulas;
create policy "arbitro edita sua sumula"
on sumulas for update
using (
  exists (
    select 1 from jogos j
    where j.id = sumulas.jogo_id and j.arbitro_id = auth.uid()
  )
  and status <> 'fechada'
);

drop policy if exists "arbitro cria sumula do seu jogo" on sumulas;
create policy "arbitro cria sumula do seu jogo"
on sumulas for insert
with check (
  exists (
    select 1 from jogos j
    where j.id = sumulas.jogo_id and j.arbitro_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- estatisticas_atletas
-- ------------------------------------------------------------
drop policy if exists "leitura publica de estatisticas" on estatisticas_atletas;
create policy "leitura publica de estatisticas"
on estatisticas_atletas for select
using (true);

drop policy if exists "arbitro grava estatisticas da sua sumula" on estatisticas_atletas;
create policy "arbitro grava estatisticas da sua sumula"
on estatisticas_atletas for all
using (
  exists (
    select 1 from sumulas s
    join jogos j on j.id = s.jogo_id
    where s.id = estatisticas_atletas.sumula_id and j.arbitro_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from sumulas s
    join jogos j on j.id = s.jogo_id
    where s.id = estatisticas_atletas.sumula_id and j.arbitro_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- classificacao: leitura publica, escrita apenas via service role (Edge Functions)
-- ------------------------------------------------------------
drop policy if exists "leitura publica de classificacao" on classificacao;
create policy "leitura publica de classificacao"
on classificacao for select
using (true);


-- ===================== migrations/0003_multi_empresa.sql =====================
-- Arena Sports - Multi-empresa (SaaS)
-- Cada empresa cliente tem seus proprios torneios, esportes personalizados e equipe
-- de gestores/arbitros. O isolamento entre empresas eh garantido por RLS.

-- ============================================================
-- Empresas (clientes da plataforma)
-- ============================================================
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  logo_url text,
  cor_primaria text default '#0B0B0C',
  cor_secundaria text default '#D4FF3A',
  plano text not null default 'teste' check (plano in ('teste','basico','pro','enterprise')),
  limite_torneios int default 1,
  ativo boolean not null default true,
  criado_em timestamptz default now()
);

create table if not exists membros_empresa (
  empresa_id uuid not null references empresas(id) on delete cascade,
  perfil_id uuid not null references perfis(id) on delete cascade,
  papel text not null check (papel in ('dono','admin','gestor','arbitro')),
  criado_em timestamptz default now(),
  primary key (empresa_id, perfil_id)
);

create index if not exists idx_membros_perfil on membros_empresa(perfil_id);

-- ============================================================
-- Torneios passam a pertencer a uma empresa + regras configuraveis
-- ============================================================
alter table eventos add column if not exists empresa_id uuid references empresas(id) on delete cascade;
alter table eventos add column if not exists descricao text;
alter table eventos add column if not exists regras jsonb not null default '{}'::jsonb;
create index if not exists idx_eventos_empresa on eventos(empresa_id);

alter table eventos drop constraint if exists eventos_formato_check;
alter table eventos add constraint eventos_formato_check check (formato in (
  'mata_mata',
  'grupos_mata_mata',
  'pontos_corridos',
  'pontos_corridos_ida_volta',
  'pontos_corridos_mata_mata'
));

-- Esportes: empresa_id nulo = esporte padrao da plataforma; preenchido = esporte proprio da empresa
alter table esportes add column if not exists empresa_id uuid references empresas(id) on delete cascade;

-- ============================================================
-- Funcoes auxiliares (security definer para evitar recursao de RLS)
-- ============================================================
create or replace function eh_membro(p_empresa uuid, p_papeis text[] default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from membros_empresa m
    where m.empresa_id = p_empresa
      and m.perfil_id = auth.uid()
      and (p_papeis is null or m.papel = any(p_papeis))
  );
$$;

create or replace function pode_gerenciar_evento(p_evento uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from eventos e
    where e.id = p_evento
      and (e.gestor_id = auth.uid() or eh_membro(e.empresa_id, array['dono','admin','gestor']))
  );
$$;

-- Onboarding: cria perfil (se faltar), a empresa e vincula o usuario como dono.
create or replace function criar_empresa(p_nome_empresa text, p_nome_usuario text, p_telefone text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_base text;
  v_slug text;
  v_empresa uuid;
  v_n int := 0;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado';
  end if;

  insert into perfis (id, nome, telefone, tipo)
  values (v_uid, p_nome_usuario, p_telefone, 'gestor_evento')
  on conflict (id) do nothing;

  v_base := trim(both '-' from regexp_replace(lower(p_nome_empresa), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'empresa'; end if;
  v_slug := v_base;
  while exists (select 1 from empresas where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into empresas (nome, slug) values (p_nome_empresa, v_slug) returning id into v_empresa;
  insert into membros_empresa (empresa_id, perfil_id, papel) values (v_empresa, v_uid, 'dono');
  return v_empresa;
end;
$$;

grant execute on function criar_empresa(text, text, text) to authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table empresas enable row level security;
alter table membros_empresa enable row level security;

-- empresas: nome/logo/cores sao publicos (aparecem no app do torcedor)
drop policy if exists "leitura publica de empresas" on empresas;
create policy "leitura publica de empresas" on empresas for select using (true);
drop policy if exists "dono ou admin edita empresa" on empresas;
create policy "dono ou admin edita empresa" on empresas for update
  using (eh_membro(id, array['dono','admin']));

-- membros
drop policy if exists "membro ve a equipe da empresa" on membros_empresa;
create policy "membro ve a equipe da empresa" on membros_empresa for select
  using (perfil_id = auth.uid() or eh_membro(empresa_id));
drop policy if exists "dono ou admin adiciona membro" on membros_empresa;
create policy "dono ou admin adiciona membro" on membros_empresa for insert
  with check (eh_membro(empresa_id, array['dono','admin']));
drop policy if exists "dono ou admin altera membro" on membros_empresa;
create policy "dono ou admin altera membro" on membros_empresa for update
  using (eh_membro(empresa_id, array['dono','admin']));
drop policy if exists "dono ou admin remove membro" on membros_empresa;
create policy "dono ou admin remove membro" on membros_empresa for delete
  using (eh_membro(empresa_id, array['dono','admin']) and papel <> 'dono');

-- perfis: membros da mesma empresa se enxergam (ex.: escolher arbitro do jogo)
drop policy if exists "membros da mesma empresa se veem" on perfis;
create policy "membros da mesma empresa se veem" on perfis for select
  using (exists (
    select 1 from membros_empresa m
    where m.perfil_id = perfis.id and eh_membro(m.empresa_id)
  ));

-- esportes
drop policy if exists "qualquer um le esportes" on esportes;
drop policy if exists "gestor cria esportes" on esportes;
drop policy if exists "le esportes padrao e da propria empresa" on esportes;
create policy "le esportes padrao e da propria empresa" on esportes for select
  using (empresa_id is null or eh_membro(empresa_id));
drop policy if exists "gestor cria esporte da empresa" on esportes;
create policy "gestor cria esporte da empresa" on esportes for insert
  with check (empresa_id is not null and eh_membro(empresa_id, array['dono','admin','gestor']));
drop policy if exists "gestor edita esporte da empresa" on esportes;
create policy "gestor edita esporte da empresa" on esportes for update
  using (empresa_id is not null and eh_membro(empresa_id, array['dono','admin','gestor']));

-- eventos (leitura publica mantida para o PWA)
drop policy if exists "gestor cria evento" on eventos;
drop policy if exists "gestor edita seu evento" on eventos;
drop policy if exists "membro da empresa cria torneio" on eventos;
create policy "membro da empresa cria torneio" on eventos for insert
  with check (gestor_id = auth.uid() and eh_membro(empresa_id, array['dono','admin','gestor']));
drop policy if exists "membro da empresa edita torneio" on eventos;
create policy "membro da empresa edita torneio" on eventos for update
  using (pode_gerenciar_evento(id));
drop policy if exists "dono ou admin exclui torneio" on eventos;
create policy "dono ou admin exclui torneio" on eventos for delete
  using (eh_membro(empresa_id, array['dono','admin']));

-- equipes
drop policy if exists "gestor do evento cria equipe" on equipes;
drop policy if exists "gestor ou capitao edita a equipe" on equipes;
drop policy if exists "gestor do torneio cria equipe" on equipes;
create policy "gestor do torneio cria equipe" on equipes for insert
  with check (pode_gerenciar_evento(evento_id));
drop policy if exists "gestor ou capitao edita equipe" on equipes;
create policy "gestor ou capitao edita equipe" on equipes for update
  using (capitao_id = auth.uid() or pode_gerenciar_evento(evento_id));
drop policy if exists "gestor exclui equipe" on equipes;
create policy "gestor exclui equipe" on equipes for delete
  using (pode_gerenciar_evento(evento_id));

-- atletas
drop policy if exists "atleta ve seu proprio registro" on atletas;
drop policy if exists "capitao ou gestor aprova atleta" on atletas;
drop policy if exists "atleta, capitao ou gestor ve atleta" on atletas;
create policy "atleta, capitao ou gestor ve atleta" on atletas for select
  using (
    perfil_id = auth.uid()
    or exists (
      select 1 from equipes eq
      where eq.id = atletas.equipe_id
        and (eq.capitao_id = auth.uid() or pode_gerenciar_evento(eq.evento_id))
    )
  );
drop policy if exists "atleta, capitao ou gestor edita atleta" on atletas;
create policy "atleta, capitao ou gestor edita atleta" on atletas for update
  using (
    perfil_id = auth.uid()
    or exists (
      select 1 from equipes eq
      where eq.id = atletas.equipe_id
        and (eq.capitao_id = auth.uid() or pode_gerenciar_evento(eq.evento_id))
    )
  );

-- jogos
drop policy if exists "gestor gerencia jogos do seu evento" on jogos;
drop policy if exists "gestor gerencia jogos do torneio" on jogos;
create policy "gestor gerencia jogos do torneio" on jogos for all
  using (pode_gerenciar_evento(evento_id))
  with check (pode_gerenciar_evento(evento_id));


-- ===================== Esportes padrao =====================
insert into esportes (nome, padrao, configuracao_sumula)
select v.nome, true, v.cfg::jsonb
from (values
  ('Volei',    '{"sets":{"quantidade_max":5,"pontos_por_set":25,"tie_break":15},"campos_por_atleta":["pontos","aces","bloqueios","erros_saque"],"eventos_jogo":["substituicao","tempo_tecnico","cartao"],"ordem_saque":true}'),
  ('Basquete', '{"periodos":4,"duracao_periodo_min":10,"campos_por_atleta":["pontos","rebotes","assistencias","faltas"],"faltas_max_atleta":5}'),
  ('Handebol', '{"periodos":2,"duracao_periodo_min":30,"campos_por_atleta":["gols","assistencias","exclusoes"],"faltas_max_atleta":3}'),
  ('Futsal',   '{"periodos":2,"duracao_periodo_min":20,"campos_por_atleta":["gols","assistencias","cartoes"],"faltas_max_atleta":5}'),
  ('Futebol',  '{"periodos":2,"duracao_periodo_min":45,"campos_por_atleta":["gols","assistencias","cartoes"]}'),
  ('Beach Tennis', '{"sets":{"quantidade_max":3,"games_por_set":6},"campos_por_atleta":["pontos","aces"]}')
) as v(nome, cfg)
where not exists (select 1 from esportes e where e.nome = v.nome and e.empresa_id is null);

-- ===================== Storage: logos =====================
insert into storage.buckets (id, name, public)
values ('logos-eventos', 'logos-eventos', true)
on conflict (id) do nothing;

drop policy if exists "logos: leitura publica" on storage.objects;
create policy "logos: leitura publica" on storage.objects for select
  using (bucket_id = 'logos-eventos');

drop policy if exists "logos: upload de usuario logado" on storage.objects;
create policy "logos: upload de usuario logado" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos-eventos');

-- ===================== Realtime (placar ao vivo) =====================
do $$
begin
  begin alter publication supabase_realtime add table jogos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table classificacao; exception when duplicate_object then null; end;
end $$;

-- Pronto! Confira: select nome from esportes;  /  select * from empresas;

-- ===================== migrations/0004_motor_campeonato.sql =====================
-- Arena Sports - Fase 1: motor do campeonato
-- Tabela de jogos com rodadas/grupos/chaves, lances (gols e cartoes), classificacao
-- recalculada automaticamente e mata-mata avancando sozinho.
-- Idempotente: pode rodar mais de uma vez.

-- ============================================================
-- Garante chave primaria em id (bancos com tabela "jogos"/"equipes" antiga podem nao ter)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['jogos','equipes','eventos','atletas'] loop
    if not exists (
      select 1 from pg_index i
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = ('public.' || t)::regclass
        and (i.indisprimary or i.indisunique)
        and i.indnatts = 1 and a.attname = 'id'
    ) then
      if exists (select 1 from pg_constraint where conrelid = ('public.' || t)::regclass and contype = 'p') then
        execute format('alter table public.%I add constraint %I unique (id)', t, t || '_id_unico');
      else
        execute format('alter table public.%I add primary key (id)', t);
      end if;
    end if;
  end loop;
end $$;

-- ============================================================
-- Jogos: estrutura de tabela e chaveamento
-- ============================================================
alter table jogos add column if not exists etapa text not null default 'classificatoria';
alter table jogos drop constraint if exists jogos_etapa_check;
alter table jogos add constraint jogos_etapa_check check (etapa in ('classificatoria','mata_mata'));
alter table jogos add column if not exists rodada int;
alter table jogos add column if not exists grupo text;
alter table jogos add column if not exists ordem int;
alter table jogos add column if not exists proximo_jogo_id uuid references jogos(id) on delete set null;
alter table jogos add column if not exists proximo_lado text;
alter table jogos add column if not exists perdedor_jogo_id uuid references jogos(id) on delete set null;
alter table jogos add column if not exists perdedor_lado text;
alter table jogos add column if not exists penaltis_a int;
alter table jogos add column if not exists penaltis_b int;
alter table jogos add column if not exists vencedor_id uuid references equipes(id) on delete set null;
alter table jogos add column if not exists wo_equipe_id uuid references equipes(id) on delete set null;
alter table jogos add column if not exists atualizado_em timestamptz default now();
create index if not exists idx_jogos_evento_etapa on jogos(evento_id, etapa, rodada);

-- ============================================================
-- Atletas cadastrados pelo organizador (sem conta no app)
-- ============================================================
alter table atletas add column if not exists nome text;
alter table atletas alter column perfil_id drop not null;

drop policy if exists "gestor cadastra atleta" on atletas;
create policy "gestor cadastra atleta" on atletas for insert
  with check (exists (select 1 from equipes eq where eq.id = atletas.equipe_id and pode_gerenciar_evento(eq.evento_id)));
drop policy if exists "gestor remove atleta" on atletas;
create policy "gestor remove atleta" on atletas for delete
  using (exists (select 1 from equipes eq where eq.id = atletas.equipe_id and pode_gerenciar_evento(eq.evento_id)));

-- ============================================================
-- Lances: gols, assistencias e cartoes por jogador
-- (nome do jogador fica gravado no lance para o app publico mostrar artilharia
--  sem expor dados pessoais da tabela de atletas)
-- ============================================================
create table if not exists lances (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references jogos(id) on delete cascade,
  evento_id uuid not null references eventos(id) on delete cascade,
  equipe_id uuid references equipes(id) on delete cascade,
  atleta_id uuid references atletas(id) on delete set null,
  jogador_nome text,
  tipo text not null check (tipo in ('gol','gol_contra','assistencia','amarelo','vermelho')),
  quantidade int not null default 1 check (quantidade > 0),
  minuto text,
  criado_em timestamptz default now()
);
create index if not exists idx_lances_evento on lances(evento_id);
create index if not exists idx_lances_jogo on lances(jogo_id);

alter table lances enable row level security;
drop policy if exists "leitura publica de lances" on lances;
create policy "leitura publica de lances" on lances for select using (true);
drop policy if exists "gestor ou arbitro grava lances" on lances;
create policy "gestor ou arbitro grava lances" on lances for all
  using (
    pode_gerenciar_evento(evento_id)
    or exists (select 1 from jogos j where j.id = lances.jogo_id and j.arbitro_id = auth.uid())
  )
  with check (
    pode_gerenciar_evento(evento_id)
    or exists (select 1 from jogos j where j.id = lances.jogo_id and j.arbitro_id = auth.uid())
  );

-- arbitro designado pode lancar o placar do proprio jogo
drop policy if exists "arbitro atualiza seu jogo" on jogos;
create policy "arbitro atualiza seu jogo" on jogos for update using (arbitro_id = auth.uid());

-- ============================================================
-- Classificacao: colunas completas
-- ============================================================
alter table classificacao add column if not exists jogos int default 0;
alter table classificacao add column if not exists empates int default 0;
alter table classificacao add column if not exists gols_pro int default 0;
alter table classificacao add column if not exists gols_contra int default 0;
alter table classificacao add column if not exists cartoes_amarelos int default 0;
alter table classificacao add column if not exists cartoes_vermelhos int default 0;

-- ============================================================
-- Recalculo da classificacao (fase classificatoria) com as regras do torneio
-- ============================================================
create or replace function recalcular_classificacao(p_evento uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pv int; v_pe int; v_pd int; v_pwo int;
begin
  select coalesce((regras->>'pontos_vitoria')::int, 3),
         coalesce((regras->>'pontos_empate')::int, 1),
         coalesce((regras->>'pontos_derrota')::int, 0),
         coalesce((regras->>'pontos_wo')::int, 0)
    into v_pv, v_pe, v_pd, v_pwo
  from eventos where id = p_evento;

  if not found then return; end if;

  delete from classificacao where evento_id = p_evento;

  insert into classificacao (evento_id, equipe_id, grupo, jogos, vitorias, empates, derrotas,
                             gols_pro, gols_contra, saldo, pontos, cartoes_amarelos, cartoes_vermelhos, atualizado_em)
  with j as (
    select * from jogos
    where evento_id = p_evento and etapa = 'classificatoria'
      and status in ('encerrado','wo')
      and equipe_a_id is not null and equipe_b_id is not null
  ),
  lados as (
    select equipe_a_id as equipe, coalesce(placar_a,0) as gp, coalesce(placar_b,0) as gc, status, wo_equipe_id from j
    union all
    select equipe_b_id, coalesce(placar_b,0), coalesce(placar_a,0), status, wo_equipe_id from j
  ),
  res as (
    select equipe, gp, gc,
      case
        when status = 'wo' and wo_equipe_id = equipe then 'wo'
        when status = 'wo' and wo_equipe_id is not null then 'v'
        when gp > gc then 'v'
        when gp < gc then 'd'
        else 'e'
      end as r
    from lados
  ),
  cartoes as (
    select l.equipe_id,
      sum(l.quantidade) filter (where l.tipo = 'amarelo') as am,
      sum(l.quantidade) filter (where l.tipo = 'vermelho') as vm
    from lances l where l.evento_id = p_evento group by l.equipe_id
  )
  select p_evento, e.id, e.posicao_grupo,
    count(res.equipe),
    count(*) filter (where res.r = 'v'),
    count(*) filter (where res.r = 'e'),
    count(*) filter (where res.r in ('d','wo')),
    coalesce(sum(res.gp),0), coalesce(sum(res.gc),0), coalesce(sum(res.gp - res.gc),0),
    coalesce(sum(case res.r when 'v' then v_pv when 'e' then v_pe when 'd' then v_pd when 'wo' then v_pwo else 0 end),0),
    coalesce(max(c.am),0), coalesce(max(c.vm),0),
    now()
  from equipes e
  left join res on res.equipe = e.id
  left join cartoes c on c.equipe_id = e.id
  where e.evento_id = p_evento
  group by e.id, e.posicao_grupo;
end;
$$;

grant execute on function recalcular_classificacao(uuid) to authenticated;

-- ============================================================
-- Gatilhos: vencedor do jogo, avanco do mata-mata e recalculo
-- ============================================================
create or replace function jogos_definir_vencedor()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  new.vencedor_id := null;
  if new.status = 'wo' and new.wo_equipe_id is not null then
    new.vencedor_id := case when new.wo_equipe_id = new.equipe_a_id then new.equipe_b_id else new.equipe_a_id end;
  elsif new.status = 'encerrado' and new.equipe_a_id is not null and new.equipe_b_id is not null then
    if coalesce(new.placar_a,0) > coalesce(new.placar_b,0) then new.vencedor_id := new.equipe_a_id;
    elsif coalesce(new.placar_a,0) < coalesce(new.placar_b,0) then new.vencedor_id := new.equipe_b_id;
    elsif new.penaltis_a is not null and new.penaltis_b is not null and new.penaltis_a <> new.penaltis_b then
      new.vencedor_id := case when new.penaltis_a > new.penaltis_b then new.equipe_a_id else new.equipe_b_id end;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jogos_vencedor on jogos;
create trigger trg_jogos_vencedor before insert or update on jogos
  for each row execute function jogos_definir_vencedor();

create or replace function jogos_apos_mudanca()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_perdedor uuid;
  v_mudou boolean := false;
begin
  if tg_op = 'DELETE' then
    perform recalcular_classificacao(old.evento_id);
    return old;
  end if;

  if tg_op = 'INSERT' then
    v_mudou := new.vencedor_id is not null;
  else
    v_mudou := new.vencedor_id is distinct from old.vencedor_id;
  end if;

  -- Mata-mata: leva vencedor (e perdedor, para 3o lugar) ao proximo jogo
  if new.etapa = 'mata_mata' and v_mudou then
    if new.proximo_jogo_id is not null and new.vencedor_id is not null then
      if new.proximo_lado = 'a' then
        update jogos set equipe_a_id = new.vencedor_id where id = new.proximo_jogo_id;
      else
        update jogos set equipe_b_id = new.vencedor_id where id = new.proximo_jogo_id;
      end if;
    end if;
    if new.perdedor_jogo_id is not null and new.vencedor_id is not null then
      v_perdedor := case when new.vencedor_id = new.equipe_a_id then new.equipe_b_id else new.equipe_a_id end;
      if new.perdedor_lado = 'a' then
        update jogos set equipe_a_id = v_perdedor where id = new.perdedor_jogo_id;
      else
        update jogos set equipe_b_id = v_perdedor where id = new.perdedor_jogo_id;
      end if;
    end if;
  end if;

  if new.etapa = 'classificatoria' then
    perform recalcular_classificacao(new.evento_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jogos_apos on jogos;
create trigger trg_jogos_apos after insert or update or delete on jogos
  for each row execute function jogos_apos_mudanca();

-- Cartoes entram no desempate: recalcula quando lances mudam
create or replace function lances_apos_mudanca()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform recalcular_classificacao(old.evento_id);
  else
    perform recalcular_classificacao(new.evento_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_lances_apos on lances;
create trigger trg_lances_apos after insert or update or delete on lances
  for each row execute function lances_apos_mudanca();

-- Recalcula torneios que ja tinham jogos
do $$
declare r record;
begin
  for r in select id from eventos loop
    perform recalcular_classificacao(r.id);
  end loop;
end $$;
