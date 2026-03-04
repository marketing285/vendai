# PRD — Grupo Venda IA: Plataforma de Agentes Operacionais
**Versão:** 1.0
**Data:** 2026-03-03
**Autor:** Bruno Zanardo
**Status:** Draft

---

## 1. Visão Geral

### 1.1 Contexto

O Grupo Venda é uma agência de marketing digital que opera com múltiplos clientes, times e canais de comunicação simultâneos. Hoje, a operação é coordenada manualmente via grupos de WhatsApp, o que gera perda de informação, retrabalho, falta de SLA e baixa rastreabilidade.

### 1.2 Proposta de Valor

Construir uma plataforma de agentes de IA operacionais que:

- **Captura** mensagens de grupos de WhatsApp e transforma em tarefas estruturadas no Notion.
- **Roteia** automaticamente cada demanda para o agente/time correto.
- **Monitora** SLAs, status e carga de trabalho em tempo real.
- **Reduz retrabalho** via briefing mínimo obrigatório antes de qualquer execução.
- **Auditora** a operação diariamente para garantir higiene do Notion e cumprimento de prazos.

### 1.3 Objetivo do Documento

Definir escopo, requisitos funcionais e não funcionais, modelo de dados, arquitetura e critérios de aceitação para o MVP da plataforma.

---

## 2. Escopo do MVP

### 2.1 Incluso no MVP

- Sistema de agentes com 15 perfis operacionais distintos.
- Integração WhatsApp → Supabase → Notion.
- Painel de gestão de tarefas com estados, SLA e roteamento.
- Briefing mínimo obrigatório com validação automática.
- Sistema de notificações e follow-up automático.
- Logs centralizados de todas as ações dos agentes.
- Controle de capacidade e WIP por área.

### 2.2 Fora do Escopo (fase futura)

- Acesso direto a contas de Meta Ads/Google Ads pelo agente Tráfego Execução.
- App mobile nativo.
- Integração com sistemas de nota fiscal.
- BI avançado com dashboards interativos.

---

## 3. Atores e Agentes

### 3.1 Usuários Humanos

| Pessoa | Papel no Sistema |
|---|---|
| Bruno (CEO) | Escalonamento final, aprovações estratégicas |
| Armando (Diretor) | Ops, SLA, capacidade, auditoria |
| Christian | Gestor de projetos — Carteira A |
| Júnior Monte | Gestor de projetos — Carteira B |
| Bruna | Executora de Design |
| Ana Laura | Executora de Vídeo/Edição |
| Hebert | Filmmaker 1 |
| André | Filmmaker 2 |
| SDR | Comercial |
| Gestor de Captação | Agenda e briefing de captação |

### 3.2 Agentes de IA

| ID | Nome do Agente | Missão Curta |
|---|---|---|
| AG-01 | CS / Atendimento | Captura, protocola e roteia mensagens do WhatsApp |
| AG-02 | Gestor de Projetos (Christian) | PM + estrategista da carteira A |
| AG-03 | Gestor de Projetos (Júnior) | PM + estrategista da carteira B |
| AG-04 | Diretor de Operações (Armando) | SLA, capacidade e remoção de gargalos |
| AG-05 | Designer Ops (Bruna) | Triagem e execução de demandas de design |
| AG-06 | Vídeo Ops (Ana Laura) | Edição eficiente com checklist e versionamento |
| AG-07 | Gestora de Captação | Agenda, shot list e logística de gravação |
| AG-08 | Filmmaker 1 (Hebert) | Execução de captação conforme shot list |
| AG-09 | Filmmaker 2 (André) | Execução de captação conforme shot list |
| AG-10 | SDR Comercial | Qualificação de leads e agendamento de calls |
| AG-11 | Tráfego Insights | Monitoramento de KPIs e alertas de campanha |
| AG-12 | Tráfego Execução | Otimizações aprovadas em Meta/Google |
| AG-13 | Controller | Orquestrador central de roteamento e logs |
| AG-14 | QA / Auditoria | Higiene do Notion e cumprimento de SLA |
| AG-15 | Financeiro/Contratos | Filtro de mensagens financeiras e contratuais |

---

## 4. Requisitos Funcionais

### 4.1 RF-01 — Captura de Mensagens (AG-01 / CS)

- **RF-01.1** O sistema deve monitorar mensagens de até 20 grupos de WhatsApp simultaneamente.
- **RF-01.2** Cada mensagem recebida deve ser classificada automaticamente em: Dúvida, Demanda Nova, Aprovação, Ajuste, Urgência/Incidente, Financeiro/Contrato.
- **RF-01.3** Mensagens classificadas como "Financeiro/Contrato" devem ser redirecionadas para AG-15.
- **RF-01.4** Toda mensagem deve gerar um ID de protocolo único no formato `AAAA-MM-DD-XXXX`.
- **RF-01.5** O agente deve registrar a tarefa no Notion em até 5 minutos após a mensagem.
- **RF-01.6** O agente deve responder no grupo com: protocolo, responsável, prazo e próximo passo.
- **RF-01.7** Quando faltar informação, o agente deve acionar o "Briefing Mínimo" (4 perguntas padrão) com no máximo 3 perguntas por mensagem.

### 4.2 RF-02 — Gestão de Tarefas (Notion)

- **RF-02.1** Toda task criada deve conter os campos mínimos: Cliente, Área, Tipo, Prioridade, Responsável, Prazo, Briefing, Entregáveis Esperados, Link/Contexto, Status.
- **RF-02.2** O sistema deve suportar os seguintes estados de task:

| Estado | Descrição |
|---|---|
| `inbox` | Captado do WhatsApp, sem dono ou briefing |
| `triagem` | CS coletando dados |
| `atribuido` | Tem responsável e prazo |
| `em_producao` | Time executando |
| `revisao_interna` | Gestor revisando antes de enviar ao cliente |
| `aprovacao_cliente` | Aguardando feedback do cliente |
| `ajustes` | Rodada de ajuste pós-aprovação |
| `concluido` | Entregue e aprovado |
| `pausado_bloqueado` | Impedido por dependência externa |

- **RF-02.3** Toda transição de estado deve gerar um log com: timestamp, agente/usuário que fez a transição, estado anterior e novo estado.
- **RF-02.4** A prioridade deve seguir o padrão: `P0` (emergência), `P1` (alta), `P2` (normal).

### 4.3 RF-03 — Roteamento Automático (AG-13 / Controller)

- **RF-03.1** O Controller deve aplicar as seguintes regras de atribuição automática:

| Área | Responsável padrão |
|---|---|
| Conteúdo / Planejamento / Análise | Gestor do cliente (AG-02 ou AG-03) |
| Design | Bruna (AG-05) |
| Edição de Vídeo | Ana Laura (AG-06) |
| Captação | Gestora de Captação (AG-07) |
| Tráfego | AG-11 → AG-12 (após aprovação) |
| Comercial / Lead | AG-10 (SDR) |
| Financeiro / Contrato | AG-15 → CEO/Diretor |

- **RF-03.2** Em caso de conflito de dono, o roteamento deve escalar para o Gestor do cliente.
- **RF-03.3** O Controller deve centralizar logs de todas as decisões de roteamento com: timestamp, tarefa, regra aplicada, destino.

### 4.4 RF-04 — Briefing Mínimo Universal

- **RF-04.1** Qualquer agente pode acionar o Briefing Mínimo quando identificar informação insuficiente.
- **RF-04.2** As 4 perguntas padrão do Briefing Mínimo são:
  1. Qual é o objetivo? (informar / vender / institucional / captar leads)
  2. Qual o formato? (Reels / Story / Carrossel / Anúncio / Landing / etc.)
  3. Qual o prazo ideal e existe alguma data fixa?
  4. Tem referências (1–2 links) e CTA?
- **RF-04.3** O sistema deve bloquear a transição de `triagem` para `atribuido` se o briefing mínimo não estiver preenchido.

### 4.5 RF-05 — SLA e Follow-up Automático

- **RF-05.1** O sistema deve disparar ping interno para o responsável quando:
  - Prazo a 24h (alerta amarelo).
  - Prazo a 4h (alerta vermelho).
  - Task em `revisao_interna` ou `aprovacao_cliente` por mais de 24h sem atualização.
- **RF-05.2** O sistema deve disparar ping no cliente quando:
  - Task em `aprovacao_cliente` por mais de 24h sem resposta.
  - Briefing crítico ausente por mais de 12h após solicitação.
- **RF-05.3** O SLA por tipo de entrega deve ser configurável pelo AG-04 (Diretor de Operações).

### 4.6 RF-06 — Gestão de Projetos por Carteira (AG-02 / AG-03)

- **RF-06.1** Cada gestor deve poder criar e atualizar: linha editorial, calendário de conteúdo, pautas semanais e campanhas sazonais.
- **RF-06.2** O gestor deve gerar briefings completos por área, contendo:
  - **Design:** dimensões, referências, copy, identidade visual.
  - **Vídeo:** roteiro, cenas, CTA, duração, estilo.
  - **Tráfego:** objetivo, público, oferta, criativos.
  - **Captação:** shot list + logística.
- **RF-06.3** O gestor deve aprovar internamente todas as entregas antes de enviar ao cliente.
- **RF-06.4** O sistema deve gerar resumo mensal de performance por carteira.

### 4.7 RF-07 — Designer Ops (AG-05)

- **RF-07.1** Ao receber uma task de design, o agente deve validar: dimensões/formato, copy final e assets disponíveis.
- **RF-07.2** Informações ausentes devem ser sinalizadas via comentário na task (não no WhatsApp).
- **RF-07.3** O sistema deve suportar biblioteca de assets por cliente: templates, capas, grids, brand kits.
- **RF-07.4** O fluxo de revisão de design deve ser: Produção → Revisão Interna (1 rodada) → Aprovação Gestor → Aprovação Cliente.

### 4.8 RF-08 — Vídeo Ops (AG-06)

- **RF-08.1** O agente deve validar insumos antes de iniciar edição: arquivos de captação, roteiro, duração/formato e legendas.
- **RF-08.2** O sistema deve versionar entregas: v1, v2, final.
- **RF-08.3** O agente deve documentar motivos de retrabalho para análise recorrente.

### 4.9 RF-09 — Gestora de Captação (AG-07)

- **RF-09.1** O agente deve manter agenda atualizada de Hebert e André.
- **RF-09.2** O agente deve gerar Shot List obrigatória para toda captação, contendo: objetivo do vídeo, roteiro em bullets, B-roll obrigatório, cenas de CTA.
- **RF-09.3** O agente deve confirmar com cliente: local, horário, participantes, autorização de imagem e tempo estimado.
- **RF-09.4** Após captação, o agente deve verificar o envio dos arquivos e abrir task de edição já com os assets organizados.
- **RF-09.5** Filmmakers (AG-08/AG-09) só recebem briefing via Gestora de Captação.

### 4.10 RF-10 — SDR Comercial (AG-10)

- **RF-10.1** O agente deve qualificar todo lead com: objetivo, segmento, orçamento estimado, urgência e dor principal.
- **RF-10.2** Leads devem ser classificados como: Quente, Morno ou Frio.
- **RF-10.3** O agente deve criar card no CRM (Notion) com: etapa do funil, próxima ação, notas e histórico.
- **RF-10.4** O agente deve executar sequência de follow-up: D+1, D+3, D+7.
- **RF-10.5** Para leads quentes, o agente deve preparar briefing da call para o CEO com: dores, contexto e proposta sugerida.

### 4.11 RF-11 — Tráfego Insights (AG-11)

- **RF-11.1** O agente deve monitorar KPIs configuráveis por cliente: CPL, CPA, CTR, CPC, ROAS, Frequência, CVR.
- **RF-11.2** O agente deve detectar e alertar anomalias: queda súbita de performance, aumento de custo, saturação de criativo.
- **RF-11.3** Alertas devem incluir: métrica afetada, variação percentual, janela de tempo e plano de ação sugerido.
- **RF-11.4** O agente deve abrir task para AG-12 (Execução) com instruções detalhadas.

### 4.12 RF-12 — Tráfego Execução (AG-12)

- **RF-12.1** O agente deve executar: pausa de anúncios, ajuste de orçamento, duplicação de conjuntos vencedores, atualização de criativos e UTMs.
- **RF-12.2** Mudanças acima de `X%` do budget/dia devem exigir aprovação do gestor humano (valor configurável).
- **RF-12.3** Toda ação executada deve ser registrada no log com: o que mudou, por quê, quando e efeito esperado.

### 4.13 RF-13 — QA / Auditoria (AG-14)

- **RF-13.1** O agente deve executar auditoria diária e checar: tasks sem responsável, tasks sem prazo, tasks em `aprovacao_cliente` por mais de 48h, tasks sem atualização por mais de 72h.
- **RF-13.2** O agente deve gerar relatório semanal por área com: backlog por área, idade média das tasks, tarefas bloqueadas.
- **RF-13.3** O agente deve sugerir ações: repriorização e redistribuição de carga.

### 4.14 RF-14 — Financeiro/Contratos (AG-15)

- **RF-14.1** O agente deve identificar mensagens financeiras nos grupos (cobrança, nota fiscal, contrato, pagamento).
- **RF-14.2** O agente deve responder com mensagem padrão e redirecionar para o responsável financeiro.
- **RF-14.3** O agente deve criar task específica com SLA e responsável (CEO/Diretor/Administrativo).

---

## 5. Requisitos Não Funcionais

### 5.1 Performance

- **RNF-01** A captura e classificação de mensagens do WhatsApp deve ocorrer em até **5 segundos** após o recebimento.
- **RNF-02** A criação da task no Notion deve ocorrer em até **60 segundos** após a classificação.
- **RNF-03** O sistema deve suportar até **20 grupos simultâneos** sem degradação.

### 5.2 Disponibilidade

- **RNF-04** A plataforma deve ter disponibilidade mínima de **99,5%** em horário comercial (07h–22h, segunda a sábado).
- **RNF-05** Falhas em integrações externas (Notion, WhatsApp) devem ser tratadas com retry automático (máximo 3 tentativas com backoff exponencial).

### 5.3 Segurança

- **RNF-06** Todos os dados de clientes devem ser armazenados exclusivamente no Supabase, com Row Level Security (RLS) habilitado por padrão.
- **RNF-07** Autenticação de usuários via Supabase Auth (email/senha + MFA opcional).
- **RNF-08** Tokens de integração (WhatsApp, Notion) devem ser armazenados como secrets no Supabase Vault.
- **RNF-09** Logs de auditoria devem ser imutáveis (append-only) e retidos por no mínimo 90 dias.

### 5.4 Escalabilidade

- **RNF-10** A arquitetura de agentes deve ser modular: cada agente pode ser atualizado, pausado ou substituído independentemente.
- **RNF-11** Novos clientes e carteiras devem ser provisionados sem alteração de código.

### 5.5 Observabilidade

- **RNF-12** Todas as ações dos agentes devem gerar eventos registrados no Supabase com: agente, ação, timestamp, tarefa associada, resultado.
- **RNF-13** Erros de integração devem gerar alertas para o AG-04 (Diretor de Operações).

---

## 6. Modelo de Dados (Supabase)

### 6.1 Tabelas Principais

```sql
-- Clientes
CREATE TABLE clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  segment      TEXT,
  whatsapp_group_ids TEXT[], -- IDs dos grupos vinculados
  manager_id   UUID REFERENCES users(id),
  portfolio    TEXT CHECK (portfolio IN ('christian', 'junior', 'none')),
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Usuários / Agentes internos
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  role         TEXT NOT NULL CHECK (role IN (
                  'ceo', 'director', 'manager', 'designer',
                  'video_editor', 'filmmaker', 'sdr', 'traffic',
                  'cs', 'capture_manager', 'financial', 'qa'
               )),
  agent_id     TEXT UNIQUE, -- ex: 'AG-01', 'AG-05'
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Tarefas
CREATE TABLE tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      TEXT UNIQUE NOT NULL, -- ex: '2026-03-03-0042'
  title            TEXT NOT NULL,
  client_id        UUID REFERENCES clients(id),
  area             TEXT NOT NULL CHECK (area IN (
                     'design', 'video', 'capture', 'content',
                     'traffic', 'commercial', 'financial', 'ops'
                   )),
  task_type        TEXT NOT NULL CHECK (task_type IN (
                     'new_demand', 'doubt', 'approval', 'adjustment',
                     'urgency', 'financial', 'contract'
                   )),
  priority         TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2')),
  status           TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN (
                     'inbox', 'triagem', 'atribuido', 'em_producao',
                     'revisao_interna', 'aprovacao_cliente', 'ajustes',
                     'concluido', 'pausado_bloqueado'
                   )),
  assigned_to      UUID REFERENCES users(id),
  deadline         TIMESTAMPTZ,
  sla_hours        INTEGER, -- SLA definido em horas
  briefing         JSONB,   -- { objetivo, formato, prazo, referencias, cta }
  deliverables     TEXT[],
  links            TEXT[],
  notion_task_id   TEXT,    -- ID da task no Notion
  source_group_id  TEXT,    -- ID do grupo WhatsApp de origem
  source_message   TEXT,    -- Texto original da mensagem
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Histórico de estados da task
CREATE TABLE task_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_by   UUID REFERENCES users(id),
  agent_id     TEXT, -- ex: 'AG-01'
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Briefings
CREATE TABLE briefings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID REFERENCES tasks(id) ON DELETE CASCADE,
  objective        TEXT,
  format           TEXT,
  deadline_notes   TEXT,
  references       TEXT[],
  cta              TEXT,
  -- Campos por área
  design_dimensions TEXT,
  design_identity   TEXT,
  video_script      TEXT,
  video_duration    TEXT,
  video_style       TEXT,
  traffic_audience  TEXT,
  traffic_offer     TEXT,
  capture_shot_list JSONB,
  capture_location  TEXT,
  capture_datetime  TIMESTAMPTZ,
  is_complete      BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Mensagens capturadas do WhatsApp
CREATE TABLE whatsapp_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       TEXT NOT NULL,
  group_name     TEXT,
  sender_phone   TEXT NOT NULL,
  sender_name    TEXT,
  message_type   TEXT CHECK (message_type IN ('text', 'audio', 'image', 'document', 'link')),
  content        TEXT,
  media_url      TEXT,
  classification TEXT, -- resultado da classificação do AG-01
  task_id        UUID REFERENCES tasks(id),
  processed      BOOLEAN DEFAULT false,
  received_at    TIMESTAMPTZ NOT NULL,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Logs de ações dos agentes
CREATE TABLE agent_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     TEXT NOT NULL, -- ex: 'AG-01'
  action       TEXT NOT NULL,
  task_id      UUID REFERENCES tasks(id),
  input        JSONB,
  output       JSONB,
  success      BOOLEAN NOT NULL,
  error        TEXT,
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Alertas e notificações
CREATE TABLE alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN (
                 'sla_warning', 'sla_critical', 'approval_overdue',
                 'briefing_missing', 'traffic_anomaly', 'task_blocked'
               )),
  task_id      UUID REFERENCES tasks(id),
  target_user  UUID REFERENCES users(id),
  message      TEXT NOT NULL,
  channel      TEXT CHECK (channel IN ('whatsapp', 'notion', 'internal')),
  sent         BOOLEAN DEFAULT false,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Leads (CRM comercial)
CREATE TABLE leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  segment          TEXT,
  budget_estimate  NUMERIC,
  urgency          TEXT CHECK (urgency IN ('high', 'medium', 'low')),
  temperature      TEXT CHECK (temperature IN ('hot', 'warm', 'cold')),
  funnel_stage     TEXT NOT NULL CHECK (funnel_stage IN (
                     'new', 'contacted', 'qualified', 'call_scheduled',
                     'proposal_sent', 'won', 'lost'
                   )),
  pain_points      TEXT,
  notes            TEXT,
  next_action      TEXT,
  next_action_date TIMESTAMPTZ,
  assigned_to      UUID REFERENCES users(id),
  source_group_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Follow-ups de leads
CREATE TABLE lead_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  message      TEXT,
  status       TEXT CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- KPIs de tráfego por cliente
CREATE TABLE traffic_kpis (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id),
  platform     TEXT CHECK (platform IN ('meta', 'google', 'tiktok')),
  campaign_id  TEXT,
  campaign_name TEXT,
  date         DATE NOT NULL,
  cpl          NUMERIC,
  cpa          NUMERIC,
  ctr          NUMERIC,
  cpc          NUMERIC,
  roas         NUMERIC,
  frequency    NUMERIC,
  cvr          NUMERIC,
  spend        NUMERIC,
  impressions  INTEGER,
  clicks       INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Alertas de tráfego
CREATE TABLE traffic_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id),
  metric          TEXT NOT NULL,
  variation_pct   NUMERIC NOT NULL,
  period_hours    INTEGER,
  description     TEXT NOT NULL,
  action_plan     TEXT,
  task_id         UUID REFERENCES tasks(id),
  resolved        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Capacidade e WIP por área
CREATE TABLE team_capacity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  area         TEXT NOT NULL,
  wip_limit    INTEGER DEFAULT 5,
  current_wip  INTEGER DEFAULT 0,
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- SLAs configuráveis por tipo de entrega
CREATE TABLE sla_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type      TEXT NOT NULL,
  area           TEXT NOT NULL,
  priority       TEXT NOT NULL,
  sla_hours      INTEGER NOT NULL,
  updated_by     UUID REFERENCES users(id),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Assets / biblioteca de design por cliente
CREATE TABLE design_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id),
  name         TEXT NOT NULL,
  type         TEXT CHECK (type IN ('template', 'logo', 'grid', 'brand_kit', 'reference')),
  url          TEXT NOT NULL,
  tags         TEXT[],
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Versões de entregáveis de vídeo
CREATE TABLE video_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  version      TEXT NOT NULL, -- v1, v2, final
  url          TEXT NOT NULL,
  notes        TEXT,
  rework_reason TEXT, -- motivo de retrabalho (para análise)
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Calendário editorial por cliente
CREATE TABLE editorial_calendar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES clients(id),
  manager_id   UUID REFERENCES users(id),
  week_start   DATE NOT NULL,
  content      JSONB, -- pautas, formatos, canais
  status       TEXT CHECK (status IN ('draft', 'approved', 'published')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Índices Recomendados

```sql
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_area ON tasks(area);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id, created_at DESC);
CREATE INDEX idx_whatsapp_messages_group ON whatsapp_messages(group_id, received_at DESC);
CREATE INDEX idx_traffic_kpis_client_date ON traffic_kpis(client_id, date DESC);
CREATE INDEX idx_alerts_target_sent ON alerts(target_user, sent, created_at DESC);
CREATE INDEX idx_leads_funnel ON leads(funnel_stage, temperature);
```

### 6.3 Row Level Security (RLS)

- Cada usuário enxerga apenas tasks da sua área ou carteira.
- Gestores enxergam tasks dos clientes da sua carteira.
- CEO e Diretor têm acesso total.
- Agentes de IA operam com service role key, com acesso restrito por tabela.

---

## 7. Arquitetura do Sistema

### 7.1 Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Banco de dados | Supabase (PostgreSQL + RLS + Realtime) |
| Autenticação | Supabase Auth |
| Storage (assets) | Supabase Storage |
| Agentes de IA | aios-core (npx aios-core) |
| Integração WhatsApp | Evolution API / WPPConnect / Baileys |
| Integração Notion | Notion API REST |
| Orquestração | AG-13 Controller (via aios-core) |
| Notificações | Supabase Realtime + WhatsApp |
| Deploy | Supabase Edge Functions / Node.js server |

### 7.2 Fluxo Principal (Happy Path)

```
WhatsApp (cliente)
    → [AG-01 CS] classifica e cria protocolo
    → [Supabase] task criada no DB
    → [Notion API] task espelhada no Notion
    → [AG-13 Controller] roteia para área correta
    → [Agente da área] valida briefing e executa
    → [AG-14 QA] monitora SLA e higiene
    → [WhatsApp] resposta com protocolo ao cliente
```

### 7.3 Fluxo de Briefing Incompleto

```
Mensagem recebida
    → AG-01 detecta briefing incompleto
    → AG-01 aciona Briefing Mínimo (≤3 perguntas)
    → Task fica em status "triagem"
    → Sistema aguarda resposta (timeout: 12h)
    → Se sem resposta em 12h: alerta para Gestor
    → Após briefing completo: avança para "atribuido"
```

### 7.4 Fluxo de Alertas de SLA

```
Supabase Cron Job (a cada 30 min)
    → Verifica tasks com deadline próximo
    → 24h antes: alerta interno (responsável)
    → 4h antes: alerta crítico (responsável + gestor)
    → SLA vencido: escala para Diretor (AG-04)
```

---

## 8. Definições de SLA (valores iniciais)

| Tipo de Entrega | Prioridade | SLA (horas úteis) |
|---|---|---|
| Resposta ao cliente (WhatsApp) | P0 | 0,5h |
| Criação de protocolo | P0 | 0,08h (5 min) |
| Post feed / Story | P2 | 48h |
| Carrossel | P2 | 72h |
| Reels editado | P2 | 96h |
| Anúncio (criativo) | P1 | 24h |
| Captação agendada | P1 | 48h (para agendar) |
| Landing page | P1 | 120h |
| Relatório de performance | P2 | 72h |
| Qualificação de lead | P0 | 1h |
| Ajuste pós-aprovação | P1 | 24h |

---

## 9. Critérios de Aceitação do MVP

### 9.1 AG-01 (CS)

- [ ] Mensagem recebida → protocolo criado em < 5 min.
- [ ] Task com campos mínimos criada no Supabase e Notion.
- [ ] Resposta automática no grupo com protocolo e responsável.
- [ ] Briefing mínimo acionado quando faltam informações.
- [ ] Mensagens financeiras redirecionadas para AG-15.

### 9.2 AG-13 (Controller)

- [ ] Toda task criada recebe roteamento automático.
- [ ] Log de decisão registrado para cada roteamento.
- [ ] Conflitos de dono escalam para gestor.

### 9.3 Gestão de SLA

- [ ] Alertas disparados em 24h e 4h antes do deadline.
- [ ] Tasks em aprovação por > 24h geram alerta automático.
- [ ] SLA configurável por tipo/prioridade sem alteração de código.

### 9.4 AG-14 (QA)

- [ ] Auditoria diária automática detecta tasks sem dono/prazo.
- [ ] Relatório semanal gerado por área.

### 9.5 AG-10 (SDR)

- [ ] Lead qualificado com score de temperatura.
- [ ] Follow-up automático D+1, D+3, D+7.
- [ ] Briefing de call gerado para leads quentes.

### 9.6 AG-11 (Tráfego Insights)

- [ ] Variação de KPI > threshold configurável gera alerta.
- [ ] Alerta inclui plano de ação e abre task para AG-12.

### 9.7 Dados e Segurança

- [ ] RLS ativo em todas as tabelas com dados de clientes.
- [ ] Tokens de integração armazenados no Supabase Vault.
- [ ] Logs de auditoria append-only com retenção de 90 dias.

---

## 10. Fases de Entrega

### Fase 1 — Fundação (Semana 1–2)

- Setup Supabase: tabelas, RLS, índices.
- Configuração do aios-core.
- AG-01 (CS) + AG-13 (Controller) básico.
- Integração WhatsApp → Supabase → Notion.
- Sistema de protocolos e status de task.

### Fase 2 — Gestão de Projetos (Semana 3–4)

- AG-02 e AG-03 (Gestores de Projeto).
- AG-04 (Diretor de Operações) — SLA e capacidade.
- AG-14 (QA) — auditoria automática.
- Sistema de alertas e follow-up automático.

### Fase 3 — Execução Operacional (Semana 5–6)

- AG-05 (Designer Ops) com biblioteca de assets.
- AG-06 (Vídeo Ops) com versionamento.
- AG-07 (Gestora de Captação) com shot list.
- AG-08/AG-09 (Filmmakers) — recebimento de briefings.

### Fase 4 — Comercial e Tráfego (Semana 7–8)

- AG-10 (SDR) com CRM e follow-up.
- AG-11 (Tráfego Insights) com monitoramento de KPIs.
- AG-12 (Tráfego Execução) com regras de governança.
- AG-15 (Financeiro) com filtro de mensagens.

### Fase 5 — Estabilização e Escala (Semana 9–10)

- Testes integrados ponta a ponta.
- Refinamento de thresholds de SLA.
- Painel de capacidade e WIP.
- Documentação de operação dos agentes.

---

## 11. Integrações Externas

| Sistema | Uso | Autenticação |
|---|---|---|
| WhatsApp (Evolution API) | Leitura e envio de mensagens | API Key |
| Notion API | Criação e atualização de tasks | OAuth / Integration Token |
| Meta Ads API | Leitura de KPIs de campanha | OAuth Token |
| Google Ads API | Leitura de KPIs de campanha | OAuth Token |
| Google Drive | Upload de assets e entregáveis | Service Account |
| Supabase Storage | Assets internos, logos, templates | Supabase Key |

---

## 12. Glossário

| Termo | Definição |
|---|---|
| Task | Unidade de trabalho criada a partir de uma demanda |
| Protocolo | ID único da task no formato `AAAA-MM-DD-XXXX` |
| Briefing Mínimo | Conjunto de 4 perguntas padrão para qualquer demanda |
| Carteira | Conjunto de clientes gerenciados por um GP |
| Shot List | Lista objetiva de takes para uma captação |
| WIP | Work in Progress — tarefas abertas simultâneas por pessoa |
| SLA | Service Level Agreement — prazo contratual de entrega |
| P0/P1/P2 | Níveis de prioridade: emergência / alta / normal |
| AG-XX | Identificador único de cada agente de IA |
| RLS | Row Level Security — controle de acesso por linha no Supabase |

---

*Documento gerado em 2026-03-03. Próxima revisão prevista após Fase 1.*
