-- Arena Sports - Fase 3: planos e limites
-- Limites por plano aplicados no banco, pedidos de upgrade e painel do dono da plataforma.
-- Idempotente: pode rodar mais de uma vez.
--
-- Planos (codigo -> nome comercial):
--   teste      -> Gratis        : 1 torneio ativo, 12 equipes por torneio, 1 patrocinador
--   basico     -> Organizador   : 5 torneios ativos, 32 equipes, 5 patrocinadores
--   pro        -> Profissional  : ilimitado
--   enterprise -> Sob medida    : ilimitado

alter table empresas add column if not exists plano_valido_ate date;

-- ============================================================
-- Dono da plataforma (super admin)
-- ============================================================
create or replace function eh_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from perfis where id = auth.uid() and tipo = 'super_admin');
$$;

-- Ninguem se promove a super admin pelo app (so via SQL Editor)
create or replace function perfis_proteger_tipo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or eh_super_admin() then return new; end if;
  if tg_op = 'INSERT' and new.tipo = 'super_admin' then
    new.tipo := 'gestor_evento';
  elsif tg_op = 'UPDATE' and new.tipo is distinct from old.tipo and 'super_admin' in (new.tipo, old.tipo) then
    raise exception 'Alteração de perfil não permitida.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_perfis_tipo on perfis;
create trigger trg_perfis_tipo before insert or update on perfis
  for each row execute function perfis_proteger_tipo();

drop policy if exists "super admin edita empresas" on empresas;
create policy "super admin edita empresas" on empresas for update using (eh_super_admin());

-- Empresa nao pode mudar o proprio plano: so o super admin
create or replace function empresas_proteger_plano()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.plano is distinct from old.plano
      or new.limite_torneios is distinct from old.limite_torneios
      or new.plano_valido_ate is distinct from old.plano_valido_ate
      or new.ativo is distinct from old.ativo)
     and not eh_super_admin()
     and auth.uid() is not null then
    raise exception 'Somente a equipe Arena Sports pode alterar o plano.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_empresas_plano on empresas;
create trigger trg_empresas_plano before update on empresas
  for each row execute function empresas_proteger_plano();

-- ============================================================
-- Limites
-- ============================================================
create or replace function plano_efetivo(p_empresa uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when e.plano_valido_ate is not null and e.plano_valido_ate < current_date then 'teste'
    else e.plano
  end
  from empresas e where e.id = p_empresa;
$$;

-- limites: [torneios ativos, equipes por torneio, patrocinadores]  (null = ilimitado)
create or replace function limites_plano(p_plano text)
returns int[]
language sql immutable
as $$
  select case p_plano
    when 'teste' then array[1, 12, 1]
    when 'basico' then array[5, 32, 5]
    else array[null, null, null]::int[]
  end;
$$;

create or replace function verificar_limite_torneios()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_lim int;
  v_uso int;
begin
  if new.empresa_id is null or eh_super_admin() then return new; end if;
  v_lim := (limites_plano(plano_efetivo(new.empresa_id)))[1];
  if v_lim is null then return new; end if;
  select count(*) into v_uso from eventos
   where empresa_id = new.empresa_id and status <> 'encerrado' and id <> new.id;
  if v_uso >= v_lim then
    raise exception 'Seu plano permite % torneio(s) ativo(s). Encerre um torneio ou faça upgrade em "Meu plano".', v_lim;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_limite_torneios on eventos;
create trigger trg_limite_torneios before insert on eventos
  for each row execute function verificar_limite_torneios();

create or replace function verificar_limite_equipes()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa uuid;
  v_lim int;
  v_uso int;
begin
  if eh_super_admin() then return new; end if;
  select empresa_id into v_empresa from eventos where id = new.evento_id;
  if v_empresa is null then return new; end if;
  v_lim := (limites_plano(plano_efetivo(v_empresa)))[2];
  if v_lim is null then return new; end if;
  select count(*) into v_uso from equipes where evento_id = new.evento_id;
  if v_uso >= v_lim then
    raise exception 'Seu plano permite até % equipes por torneio. Faça upgrade em "Meu plano".', v_lim;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_limite_equipes on equipes;
create trigger trg_limite_equipes before insert on equipes
  for each row execute function verificar_limite_equipes();

create or replace function verificar_limite_patrocinadores()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_lim int;
  v_uso int;
begin
  if eh_super_admin() then return new; end if;
  v_lim := (limites_plano(plano_efetivo(new.empresa_id)))[3];
  if v_lim is null then return new; end if;
  select count(*) into v_uso from patrocinadores where empresa_id = new.empresa_id;
  if v_uso >= v_lim then
    raise exception 'Seu plano permite até % patrocinador(es). Faça upgrade em "Meu plano".', v_lim;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_limite_patrocinadores on patrocinadores;
create trigger trg_limite_patrocinadores before insert on patrocinadores
  for each row execute function verificar_limite_patrocinadores();

-- ============================================================
-- Pedidos de upgrade
-- ============================================================
create table if not exists solicitacoes_plano (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  plano text not null check (plano in ('basico','pro','enterprise')),
  periodo text not null default 'mensal' check (periodo in ('mensal','anual')),
  contato text,
  mensagem text,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  solicitado_por uuid references perfis(id) on delete set null,
  criado_em timestamptz default now(),
  respondido_em timestamptz
);
create index if not exists idx_solicitacoes_status on solicitacoes_plano(status, criado_em desc);

alter table solicitacoes_plano enable row level security;
drop policy if exists "empresa ve seus pedidos" on solicitacoes_plano;
create policy "empresa ve seus pedidos" on solicitacoes_plano for select
  using (eh_membro(empresa_id) or eh_super_admin());
drop policy if exists "dono ou admin pede upgrade" on solicitacoes_plano;
create policy "dono ou admin pede upgrade" on solicitacoes_plano for insert
  with check (eh_membro(empresa_id, array['dono','admin']) and status = 'pendente');
drop policy if exists "super admin responde pedidos" on solicitacoes_plano;
create policy "super admin responde pedidos" on solicitacoes_plano for update using (eh_super_admin());

-- Super admin ve todos os perfis (nomes dos responsaveis) e membros
drop policy if exists "super admin ve perfis" on perfis;
create policy "super admin ve perfis" on perfis for select using (eh_super_admin());
drop policy if exists "super admin ve membros" on membros_empresa;
create policy "super admin ve membros" on membros_empresa for select using (eh_super_admin());

-- Visao de uso por empresa (para o painel da plataforma)
create or replace function uso_empresas()
returns table (empresa_id uuid, torneios_ativos bigint, torneios_total bigint, equipes bigint, patrocinadores bigint)
language sql stable security definer set search_path = public
as $$
  select e.id,
    (select count(*) from eventos v where v.empresa_id = e.id and v.status <> 'encerrado'),
    (select count(*) from eventos v where v.empresa_id = e.id),
    (select count(*) from equipes q join eventos v on v.id = q.evento_id where v.empresa_id = e.id),
    (select count(*) from patrocinadores p where p.empresa_id = e.id)
  from empresas e
  where eh_super_admin() or eh_membro(e.id);
$$;
grant execute on function uso_empresas() to authenticated;

-- ============================================================
-- Tornar voce o dono da plataforma (ajuste o e-mail se precisar)
-- ============================================================
update perfis set tipo = 'super_admin'
where id in (select id from auth.users where lower(email) = 'drdiegopadua@gmail.com');
