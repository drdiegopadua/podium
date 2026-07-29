# Sistema de Gestão de Eventos Esportivos — Estrutura do Projeto

## 1. Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                       │
│  Postgres + Auth + Realtime + Storage + Edge Functions           │
└─────────────────────────────────────────────────────────────────┘
              ▲                    ▲                    ▲
              │                    │                    │
   ┌──────────┴─────────┐  ┌───────┴────────┐  ┌────────┴─────────┐
   │  PAINEL ADMIN (Web)  │  │  PWA (Público/  │  │  PWA (Árbitro/   │
   │  React + Vite        │  │  Equipes/       │  │  Súmula Online)  │
   │  Gestor do evento     │  │  Atletas)       │  │                  │
   └──────────────────────┘  └────────────────┘  └──────────────────┘
```

**Stack sugerida:**
- Frontend: React + Vite (painel admin) + PWA separado ou módulo dentro do mesmo app com rotas por perfil
- Backend: Supabase (Postgres + Auth + Realtime + Storage + Edge Functions em Deno)
- Hospedagem: Vercel ou GitHub Pages (frontend) + Supabase (backend gerenciado)
- QR Code: biblioteca `qrcode` (JS) gerada no client ou via Edge Function
- Animação de sorteio: Canvas/SVG + biblioteca de animação (Framer Motion) — gravável em vídeo para redes sociais

---

## 2. Estrutura de pastas do repositório

```
sistema-eventos-esportivos/
├── apps/
│   ├── admin/                      # Painel administrativo (gestor do evento)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── eventos/
│   │   │   │   │   ├── criar-evento/
│   │   │   │   │   ├── editar-evento/
│   │   │   │   │   ├── sorteio/            # animação de sorteio
│   │   │   │   │   └── configuracoes/       # permissões, esportes customizados
│   │   │   │   ├── equipes/
│   │   │   │   ├── atletas/
│   │   │   │   ├── jogos-agenda/
│   │   │   │   ├── sumulas/                 # visão gestora das súmulas
│   │   │   │   └── classificacao/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/                    # chamadas Supabase
│   │   │   └── lib/supabaseClient.ts
│   │   └── vite.config.ts
│   │
│   └── pwa/                         # App público + equipes + atletas + árbitros
│       ├── src/
│       │   ├── pages/
│       │   │   ├── login-cadastro/
│       │   │   ├── vincular-equipe/         # tela que lê o código exclusivo
│       │   │   ├── perfil-atleta/
│       │   │   ├── jogos/
│       │   │   ├── classificacao/
│       │   │   ├── sumula/                  # interface do árbitro em quadra
│       │   │   │   ├── volei/
│       │   │   │   ├── basquete/
│       │   │   │   ├── handebol/
│       │   │   │   └── generico/            # motor de súmula configurável
│       │   │   └── info-evento/
│       │   ├── components/
│       │   ├── service-worker.ts
│       │   └── manifest.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                     # tipos, validações e regras compartilhadas
│       ├── types/
│       ├── permissions/            # matriz de permissões por perfil
│       └── sumula-schemas/         # definição de campos de súmula por esporte
│
├── supabase/
│   ├── migrations/                 # SQL versionado (schema abaixo)
│   ├── functions/                  # Edge Functions
│   │   ├── gerar-convite-equipe/
│   │   ├── gerar-qrcode-evento/
│   │   ├── realizar-sorteio/
│   │   ├── fechar-sumula/          # valida e trava súmula + gera stats
│   │   └── calcular-classificacao/
│   └── seed.sql
│
└── docs/
    └── estrutura-sistema-eventos-esportivos.md   # este arquivo
```

---

## 3. Modelo de dados (Supabase / Postgres)

### 3.1 Autenticação e perfis
```sql
-- Supabase Auth já cuida de auth.users (email/senha, ou magic link)
-- Tabela de perfil estendido
create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  tipo text not null check (tipo in ('super_admin','gestor_evento','arbitro','capitao_equipe','atleta','publico')),
  criado_em timestamptz default now()
);
```

### 3.2 Esportes (configuráveis)
```sql
create table esportes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,               -- ex: Vôlei, Basquete, Handebol, Jiu-Jitsu...
  padrao boolean default false,     -- true = esporte sugerido pelo sistema
  configuracao_sumula jsonb,        -- estrutura dinâmica da súmula desse esporte
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
);
```
> A ideia do `configuracao_sumula` em JSONB é permitir que cada esporte novo (inclusive os que o usuário cadastrar do zero) defina seus próprios campos de súmula sem precisar alterar o schema do banco — ver seção 6.

### 3.3 Eventos/Campeonatos
```sql
create table eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text not null,
  locais text[],                          -- múltiplos locais/quadras
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
  codigo_evento text unique,              -- usado no link/QR de acesso público
  permissoes jsonb,                       -- matriz de permissões por perfil (seção 5)
  criado_em timestamptz default now()
);
```

### 3.4 Equipes
```sql
create table equipes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  nome text not null,
  codigo_exclusivo text unique not null,   -- código para vincular atletas
  capitao_id uuid references perfis(id),
  posicao_grupo text,                      -- grupo A/B/C ou posição no chaveamento
  logo_url text,
  criado_em timestamptz default now()
);
```

### 3.5 Atletas (vínculo equipe)
```sql
create table atletas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references perfis(id),
  equipe_id uuid references equipes(id) on delete cascade,
  numero_camisa int,
  posicao text,
  data_nascimento date,
  documento text,
  foto_url text,
  aprovado boolean default false,          -- capitão/gestor pode aprovar vínculo
  criado_em timestamptz default now()
);
```

### 3.6 Jogos e agenda
```sql
create table jogos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  fase text,                               -- 'grupos','quartas','semi','final' etc
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
```

### 3.7 Súmulas (estrutura genérica + dados dinâmicos)
```sql
create table sumulas (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid references jogos(id) on delete cascade,
  esporte_id uuid references esportes(id),
  dados jsonb not null,          -- conteúdo da súmula seguindo o schema do esporte
  status text default 'aberta' check (status in ('aberta','em_andamento','fechada')),
  fechada_por uuid references perfis(id),
  fechada_em timestamptz,
  criado_em timestamptz default now()
);

create table estatisticas_atletas (
  id uuid primary key default gen_random_uuid(),
  sumula_id uuid references sumulas(id) on delete cascade,
  atleta_id uuid references atletas(id),
  estatisticas jsonb not null    -- pontos, faltas, cartões, aces, etc — conforme esporte
);
```

### 3.8 Classificação (materializada ou calculada via view)
```sql
create table classificacao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references eventos(id) on delete cascade,
  equipe_id uuid references equipes(id),
  grupo text,
  pontos int default 0,
  vitorias int default 0,
  derrotas int default 0,
  saldo int default 0,
  atualizado_em timestamptz default now()
);
```

### 3.9 Row Level Security (protocolo de segurança essencial)
```sql
alter table eventos enable row level security;
alter table equipes enable row level security;
alter table atletas enable row level security;
alter table sumulas enable row level security;

-- Exemplo: só o gestor do evento (ou super_admin) edita o evento
create policy "gestor edita seu evento"
on eventos for update
using (gestor_id = auth.uid());

-- Exemplo: árbitro só edita súmula de jogo que ele foi designado
create policy "arbitro edita sua sumula"
on sumulas for update
using (
  exists (
    select 1 from jogos j
    where j.id = sumulas.jogo_id and j.arbitro_id = auth.uid()
  )
);

-- Exemplo: atleta só vê/edita seu próprio cadastro
create policy "atleta ve seu proprio registro"
on atletas for select
using (perfil_id = auth.uid());
```
RLS é o que garante, no nível do banco, que ninguém acesse dados fora do que o perfil permite — mesmo que alguém tente manipular requisições diretamente.

---

## 4. Fluxo de criação de evento (painel admin)

**Formulário "Criar Evento":**
1. Nome do evento
2. Cidade
3. Local(is) — campo de múltiplos locais/quadras
4. Esporte — dropdown com sugestões padrão (Vôlei, Basquete, Handebol, Futsal, Jiu-Jitsu...) + opção "Adicionar novo esporte" que leva para Configurações → Esportes
5. Quantidade de equipes
6. Quantidade de atletas por equipe
7. Upload da logo do campeonato (Supabase Storage)
8. Formato: Mata-mata / Fase de grupos + mata-mata / Pontos corridos
9. Sorteio: Manual (gestor posiciona) ou Automático (sistema sorteia)
10. Data(s) do evento
11. **Configuração de permissões do evento** (o que cada perfil pode ver/fazer nesse evento específico — editável depois em Configurações)

**Ao salvar:**
- Gera `codigo_evento` único
- Gera QR Code (aponta para `https://app.../evento/{codigo_evento}`)
- Gera link de convite para equipes
- Evento entra em status `inscricoes_abertas`

---

## 5. Perfis de acesso e matriz de permissões

| Perfil | Pode fazer |
|---|---|
| **super_admin** | Gerencia toda a plataforma, todos os eventos |
| **gestor_evento** | Cria/edita seu evento, gera sorteio, designa árbitros, edita permissões do evento |
| **arbitro** | Acessa súmula dos jogos designados a ele, preenche em tempo real |
| **capitao_equipe** | Vê/gera código para atletas, aprova vínculos, edita dados da equipe |
| **atleta** | Cadastro próprio, vincula-se à equipe pelo código, vê agenda/classificação |
| **publico** | Vê classificação, agenda, informações do campeonato (sem login ou login simples) |

A matriz fica salva em `eventos.permissoes` (JSONB) e é aplicada dinamicamente no frontend (rotas/componentes visíveis) **e** reforçada no backend via RLS — nunca confiar só no frontend para controle de acesso.

Exemplo de estrutura do JSON de permissões:
```json
{
  "atleta": { "ver_classificacao": true, "ver_sumula_propria": true, "editar_perfil": true },
  "publico": { "ver_classificacao": true, "ver_agenda": true, "ver_sumula": false },
  "capitao_equipe": { "gerar_codigo_atleta": true, "aprovar_atleta": true }
}
```

---

## 6. Vínculo de equipe e cadastro de atleta (fluxo)

1. Gestor cria a equipe → sistema gera `codigo_exclusivo` (ex: `AFC-VOLEI-EQP07`)
2. Gestor envia esse código ao capitão (WhatsApp, etc.)
3. Atleta abre o PWA → **Cadastro** (nome, telefone, e-mail/senha ou magic link)
4. Após login, tela **"Vincular à equipe"** → insere o código exclusivo
5. Sistema cria registro em `atletas` vinculado à `equipe_id`, com `aprovado = false`
6. Capitão (ou gestor) aprova o vínculo no app/painel
7. Atleta passa a aparecer na súmula daquela equipe

---

## 7. Súmula online — motor genérico por esporte

Em vez de criar uma tabela rígida por esporte, a `configuracao_sumula` (JSONB em `esportes`) define os campos daquela súmula. O frontend renderiza o formulário dinamicamente a partir desse schema.

Exemplo simplificado para Vôlei:
```json
{
  "sets": { "quantidade_max": 5, "pontos_por_set": 25, "tie_break": 15 },
  "campos_por_atleta": ["pontos", "aces", "bloqueios", "erros_saque"],
  "eventos_jogo": ["substituicao", "tempo_tecnico", "cartao"],
  "ordem_saque": true
}
```

Exemplo para Basquete:
```json
{
  "periodos": 4,
  "duracao_periodo_min": 10,
  "campos_por_atleta": ["pontos", "rebotes", "assistencias", "faltas"],
  "faltas_max_atleta": 5
}
```

Isso permite que, em Configurações, o usuário cadastre um esporte totalmente novo (ex: Jiu-Jitsu, Kickboxing) e defina os campos da súmula sem precisar de alteração de código — só um JSON diferente.

O app do árbitro lê esse schema e monta a interface (tablet-friendly, botões grandes, contadores rápidos). Ao fechar a súmula (`status = 'fechada'`), uma Edge Function:
- Trava edição (RLS bloqueia updates após fechada)
- Calcula/atualiza `classificacao`
- Gera `estatisticas_atletas` consolidadas para os prêmios individuais (artilheiro, MVP etc.)

---

## 8. Sorteio automático com animação

- Edge Function `realizar-sorteio`: recebe `evento_id`, embaralha as equipes (algoritmo Fisher-Yates) respeitando regras (ex: cabeças de chave, times da mesma cidade em grupos diferentes, se configurado)
- Resultado gravado em `equipes.posicao_grupo` / gera os jogos iniciais em `jogos`
- **Frontend da animação**: tela dedicada em `admin/eventos/sorteio`, com:
  - Cards das equipes embaralhando visualmente (Framer Motion / GSAP)
  - Efeito de "roleta" ou "bolinhas saindo do globo" revelando grupo por grupo
  - Tela final em formato vertical/quadrado pronta para print/gravação de tela → postar no Instagram/Stories
- Pode rodar como demonstração pública (compartilhar tela ao vivo) enquanto grava a animação

---

## 9. QR Code e link do evento

- Ao criar o evento, Edge Function `gerar-qrcode-evento` gera:
  - Link único: `https://seu-dominio.app/e/{codigo_evento}`
  - QR Code (PNG/SVG) apontando para esse link, disponível para download no painel
- Esse link abre o PWA já contextualizado no evento certo (tema, logo, esporte, agenda daquele campeonato específico)

---

## 10. Próximos passos sugeridos

1. Criar o projeto no Supabase e rodar as migrations acima
2. Configurar Supabase Auth (email/senha + magic link)
3. Montar o painel admin com o formulário de criação de evento (seção 4)
4. Implementar o motor de súmula genérico (seção 7) começando pelo Vôlei, já que é o mais maduro no que você já construiu
5. Implementar geração de QR Code/link e o fluxo de vínculo equipe → atleta
6. Depois, partir para a animação de sorteio (é a parte mais "show", boa para deixar por último com calma no visual)

---

**Observação sobre segurança:** além do RLS (essencial), recomenda-se: rate limiting nas Edge Functions públicas (evitar spam de cadastro), validação de e-mail/telefone no cadastro de atleta, e nunca expor `service_role key` do Supabase no frontend — apenas a `anon key` com RLS ativo.
