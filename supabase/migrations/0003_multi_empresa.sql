-- Arena Sports - Multi-empresa (SaaS)
-- Cada empresa cliente tem seus proprios torneios, esportes personalizados e equipe
-- de gestores/arbitros. O isolamento entre empresas eh garantido por RLS.

-- ============================================================
-- Empresas (clientes da plataforma)
-- ============================================================
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  logo_url text,
  cor_primaria text default '#0A2342',
  cor_secundaria text default '#D4AF37',
  plano text not null default 'teste' check (plano in ('teste','basico','pro','enterprise')),
  limite_torneios int default 1,
  ativo boolean not null default true,
  criado_em timestamptz default now()
);

create table membros_empresa (
  empresa_id uuid not null references empresas(id) on delete cascade,
  perfil_id uuid not null references perfis(id) on delete cascade,
  papel text not null check (papel in ('dono','admin','gestor','arbitro')),
  criado_em timestamptz default now(),
  primary key (empresa_id, perfil_id)
);

create index idx_membros_perfil on membros_empresa(perfil_id);

-- ============================================================
-- Torneios passam a pertencer a uma empresa + regras configuraveis
-- ============================================================
alter table eventos add column empresa_id uuid references empresas(id) on delete cascade;
alter table eventos add column descricao text;
alter table eventos add column regras jsonb not null default '{}'::jsonb;
create index idx_eventos_empresa on eventos(empresa_id);

alter table eventos drop constraint if exists eventos_formato_check;
alter table eventos add constraint eventos_formato_check check (formato in (
  'mata_mata',
  'grupos_mata_mata',
  'pontos_corridos',
  'pontos_corridos_ida_volta',
  'pontos_corridos_mata_mata'
));

-- Esportes: empresa_id nulo = esporte padrao da plataforma; preenchido = esporte proprio da empresa
alter table esportes add column empresa_id uuid references empresas(id) on delete cascade;

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
create policy "leitura publica de empresas" on empresas for select using (true);
create policy "dono ou admin edita empresa" on empresas for update
  using (eh_membro(id, array['dono','admin']));

-- membros
create policy "membro ve a equipe da empresa" on membros_empresa for select
  using (perfil_id = auth.uid() or eh_membro(empresa_id));
create policy "dono ou admin adiciona membro" on membros_empresa for insert
  with check (eh_membro(empresa_id, array['dono','admin']));
create policy "dono ou admin altera membro" on membros_empresa for update
  using (eh_membro(empresa_id, array['dono','admin']));
create policy "dono ou admin remove membro" on membros_empresa for delete
  using (eh_membro(empresa_id, array['dono','admin']) and papel <> 'dono');

-- perfis: membros da mesma empresa se enxergam (ex.: escolher arbitro do jogo)
create policy "membros da mesma empresa se veem" on perfis for select
  using (exists (
    select 1 from membros_empresa m
    where m.perfil_id = perfis.id and eh_membro(m.empresa_id)
  ));

-- esportes
drop policy if exists "qualquer um le esportes" on esportes;
drop policy if exists "gestor cria esportes" on esportes;
create policy "le esportes padrao e da propria empresa" on esportes for select
  using (empresa_id is null or eh_membro(empresa_id));
create policy "gestor cria esporte da empresa" on esportes for insert
  with check (empresa_id is not null and eh_membro(empresa_id, array['dono','admin','gestor']));
create policy "gestor edita esporte da empresa" on esportes for update
  using (empresa_id is not null and eh_membro(empresa_id, array['dono','admin','gestor']));

-- eventos (leitura publica mantida para o PWA)
drop policy if exists "gestor cria evento" on eventos;
drop policy if exists "gestor edita seu evento" on eventos;
create policy "membro da empresa cria torneio" on eventos for insert
  with check (gestor_id = auth.uid() and eh_membro(empresa_id, array['dono','admin','gestor']));
create policy "membro da empresa edita torneio" on eventos for update
  using (pode_gerenciar_evento(id));
create policy "dono ou admin exclui torneio" on eventos for delete
  using (eh_membro(empresa_id, array['dono','admin']));

-- equipes
drop policy if exists "gestor do evento cria equipe" on equipes;
drop policy if exists "gestor ou capitao edita a equipe" on equipes;
create policy "gestor do torneio cria equipe" on equipes for insert
  with check (pode_gerenciar_evento(evento_id));
create policy "gestor ou capitao edita equipe" on equipes for update
  using (capitao_id = auth.uid() or pode_gerenciar_evento(evento_id));
create policy "gestor exclui equipe" on equipes for delete
  using (pode_gerenciar_evento(evento_id));

-- atletas
drop policy if exists "atleta ve seu proprio registro" on atletas;
drop policy if exists "capitao ou gestor aprova atleta" on atletas;
create policy "atleta, capitao ou gestor ve atleta" on atletas for select
  using (
    perfil_id = auth.uid()
    or exists (
      select 1 from equipes eq
      where eq.id = atletas.equipe_id
        and (eq.capitao_id = auth.uid() or pode_gerenciar_evento(eq.evento_id))
    )
  );
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
create policy "gestor gerencia jogos do torneio" on jogos for all
  using (pode_gerenciar_evento(evento_id))
  with check (pode_gerenciar_evento(evento_id));
