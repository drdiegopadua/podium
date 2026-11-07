-- Arena Sports - Fase 1: motor do campeonato
-- Tabela de jogos com rodadas/grupos/chaves, lances (gols e cartoes), classificacao
-- recalculada automaticamente e mata-mata avancando sozinho.
-- Idempotente: pode rodar mais de uma vez.

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
