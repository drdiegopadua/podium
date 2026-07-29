-- Podium - Row Level Security
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
create policy "usuario ve e edita seu proprio perfil"
on perfis for select
using (id = auth.uid());

create policy "usuario edita seu proprio perfil"
on perfis for update
using (id = auth.uid());

create policy "usuario cria seu proprio perfil"
on perfis for insert
with check (id = auth.uid());

-- ------------------------------------------------------------
-- esportes: leitura publica, escrita por gestor/super_admin
-- ------------------------------------------------------------
create policy "qualquer um le esportes"
on esportes for select
using (true);

create policy "gestor cria esportes"
on esportes for insert
with check (
  exists (select 1 from perfis p where p.id = auth.uid() and p.tipo in ('gestor_evento','super_admin'))
);

-- ------------------------------------------------------------
-- eventos
-- ------------------------------------------------------------
create policy "qualquer um le eventos"
on eventos for select
using (true);

create policy "gestor cria evento"
on eventos for insert
with check (gestor_id = auth.uid());

create policy "gestor edita seu evento"
on eventos for update
using (gestor_id = auth.uid());

-- ------------------------------------------------------------
-- equipes
-- ------------------------------------------------------------
create policy "qualquer um le equipes"
on equipes for select
using (true);

create policy "gestor do evento cria equipe"
on equipes for insert
with check (
  exists (select 1 from eventos e where e.id = equipes.evento_id and e.gestor_id = auth.uid())
);

create policy "gestor ou capitao edita a equipe"
on equipes for update
using (
  capitao_id = auth.uid()
  or exists (select 1 from eventos e where e.id = equipes.evento_id and e.gestor_id = auth.uid())
);

-- ------------------------------------------------------------
-- atletas
-- ------------------------------------------------------------
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

create policy "atleta se vincula a uma equipe"
on atletas for insert
with check (perfil_id = auth.uid());

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
create policy "qualquer um le jogos"
on jogos for select
using (true);

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
create policy "leitura publica de sumulas"
on sumulas for select
using (true);

create policy "arbitro edita sua sumula"
on sumulas for update
using (
  exists (
    select 1 from jogos j
    where j.id = sumulas.jogo_id and j.arbitro_id = auth.uid()
  )
  and status <> 'fechada'
);

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
create policy "leitura publica de estatisticas"
on estatisticas_atletas for select
using (true);

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
create policy "leitura publica de classificacao"
on classificacao for select
using (true);
