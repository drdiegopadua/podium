-- Podium - Sistema de Gestao de Eventos Esportivos
-- Migration inicial: perfis, esportes, eventos, equipes, atletas, jogos, sumulas, classificacao

-- ============================================================
-- 3.1 Autenticacao e perfis
-- ============================================================
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  tipo text not null check (tipo in ('super_admin','gestor_evento','arbitro','capitao_equipe','atleta','publico')),
  criado_em timestamptz default now()
);

-- ============================================================
-- 3.2 Esportes (configuraveis)
-- ============================================================
create table esportes (
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
create table eventos (
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
create table equipes (
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
create table atletas (
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
create table jogos (
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
create table sumulas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid references jogos(id) on delete cascade,
  esporte_id uuid references esportes(id),
  dados jsonb not null,
  status text default 'aberta' check (status in ('aberta','em_andamento','fechada')),
  fechada_por uuid references perfis(id),
  fechada_em timestamptz,
  criado_em timestamptz default now()
);

create table estatisticas_atletas (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid references sumulas(id) on delete cascade,
  atleta_id uuid references atletas(id),
  estatisticas jsonb not null
);

-- ============================================================
-- 3.8 Classificacao (materializada ou calculada via view)
-- ============================================================
create table classificacao (
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
create index idx_eventos_gestor on eventos(gestor_id);
create index idx_equipes_evento on equipes(evento_id);
create index idx_atletas_equipe on atletas(equipe_id);
create index idx_atletas_perfil on atletas(perfil_id);
create index idx_jogos_evento on jogos(evento_id);
create index idx_jogos_arbitro on jogos(arbitro_id);
create index idx_sumulas_jogo on sumulas(jogo_id);
create index idx_estatisticas_sumula on estatisticas_atletas(sumula_id);
create index idx_classificacao_evento on classificacao(evento_id);
