# Arena Sports — Sistema de Gestão de Eventos Esportivos

Monorepo com painel administrativo (gestor de evento), PWA (público/equipes/atletas/árbitros) e backend Supabase.
Estrutura completa em [docs/estrutura-sistema-eventos-esportivos.md](docs/estrutura-sistema-eventos-esportivos.md).

## Estrutura

```
apps/
  admin/    Painel administrativo (React + Vite + Tailwind) — porta 5173
  pwa/      App público/equipes/atletas/árbitro (React + Vite + PWA) — porta 5174
packages/
  shared/   Tipos, matriz de permissões e schemas de súmula compartilhados
supabase/
  migrations/  Schema SQL versionado
  functions/   Edge Functions (Deno)
  seed.sql     Dados de desenvolvimento (esportes padrão)
docs/
  estrutura-sistema-eventos-esportivos.md   Documento de arquitetura original
```

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Identidade visual:** paleta Arena Sports (`#0A2342`, `#132F57`, `#D4AF37`), fonte Montserrat

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o Supabase

Requer o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado.

```bash
supabase start
supabase db reset   # aplica migrations + seed.sql
```

Copie as chaves exibidas por `supabase start` para os arquivos `.env`:

```bash
cp apps/admin/.env.example apps/admin/.env
cp apps/pwa/.env.example apps/pwa/.env
```

### 3. Rodar os apps

```bash
npm run dev:admin   # http://localhost:5173
npm run dev:pwa     # http://localhost:5174
```

### 4. Deploy das Edge Functions

```bash
supabase functions deploy gerar-convite-equipe
supabase functions deploy gerar-qrcode-evento
supabase functions deploy realizar-sorteio
supabase functions deploy fechar-sumula
supabase functions deploy calcular-classificacao
```

## Perfis de acesso

`super_admin`, `gestor_evento`, `arbitro`, `capitao_equipe`, `atleta`, `publico` — ver seção 5 do documento de arquitetura. A matriz de permissões vive em `eventos.permissoes` (JSONB) e é reforçada no banco via RLS (nunca confiar apenas no frontend).

## Próximos passos

Ver seção 10 do documento de arquitetura — o motor de súmula genérico (vôlei/basquete) e a animação de sorteio ainda são stubs (`em construção`) neste scaffold inicial.

## Arena Sports — modelo SaaS multi-empresa

O sistema é vendido para várias empresas/organizadoras. Cada empresa:

- cria a conta no painel (`/login` → "Cadastre sua empresa") e vira **proprietária**;
- convida a equipe em **Minha empresa** (papéis: administrador, gestor de torneios, árbitro) — Edge Function `convidar-membro`;
- cria torneios escolhendo **esporte** (padrão ou personalizado), **formato** (mata-mata, grupos + mata-mata, pontos corridos turno/returno, pontos corridos + playoffs), **qtd. de equipes**, **datas** e **regras** (pontos por vitória/empate/derrota/W.O., grupos, classificados, 3º lugar, critérios de desempate, regulamento);
- define logo e cores, que viram o tema do app PWA nos torneios dela.

O torcedor abre o torneio no PWA pelo link/QR `/e/CODIGO` (ou digitando o código). Jogos e classificação atualizam em tempo real.

Isolamento entre empresas: tabelas `empresas` e `membros_empresa` + RLS (`supabase/migrations/0003_multi_empresa.sql`).
