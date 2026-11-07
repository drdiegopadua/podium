-- Arena Sports - Fase 2: divulgacao
-- Mural (noticias, fotos e videos por torneio) e patrocinadores com banner.
-- Idempotente: pode rodar mais de uma vez.

-- ============================================================
-- Mural do torneio
-- ============================================================
create table if not exists publicacoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  tipo text not null default 'noticia' check (tipo in ('noticia','foto','video')),
  titulo text not null,
  texto text,
  imagem_url text,
  video_url text,
  fixada boolean not null default false,
  autor_id uuid references perfis(id) on delete set null,
  criado_em timestamptz default now()
);
create index if not exists idx_publicacoes_evento on publicacoes(evento_id, criado_em desc);

alter table publicacoes enable row level security;
drop policy if exists "leitura publica do mural" on publicacoes;
create policy "leitura publica do mural" on publicacoes for select using (true);
drop policy if exists "gestor publica no mural" on publicacoes;
create policy "gestor publica no mural" on publicacoes for all
  using (pode_gerenciar_evento(evento_id))
  with check (pode_gerenciar_evento(evento_id));

-- ============================================================
-- Patrocinadores (da empresa toda ou de um torneio)
-- ============================================================
create table if not exists patrocinadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  evento_id uuid references eventos(id) on delete cascade,
  nome text not null,
  logo_url text,
  link text,
  chamada text default 'Patrocínio',
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz default now()
);
create index if not exists idx_patrocinadores_empresa on patrocinadores(empresa_id);

alter table patrocinadores enable row level security;
drop policy if exists "leitura publica de patrocinadores" on patrocinadores;
create policy "leitura publica de patrocinadores" on patrocinadores for select using (true);
drop policy if exists "gestor gerencia patrocinadores" on patrocinadores;
create policy "gestor gerencia patrocinadores" on patrocinadores for all
  using (eh_membro(empresa_id, array['dono','admin','gestor']))
  with check (eh_membro(empresa_id, array['dono','admin','gestor']));

-- Busca por nome no app
create index if not exists idx_eventos_nome on eventos (lower(nome));
create index if not exists idx_empresas_nome on empresas (lower(nome));

-- Mural ao vivo no app
do $$
begin
  begin alter publication supabase_realtime add table publicacoes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table lances; exception when duplicate_object then null; end;
end $$;
