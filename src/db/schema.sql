-- ============================================================
-- Grupo Venda IA — Schema Supabase
-- Cole este SQL no SQL Editor do Supabase e execute tudo de uma vez.
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- USUÁRIOS / TIME
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN (
               'ceo','director','manager','designer',
               'video_editor','filmmaker','sdr','traffic',
               'cs','capture_manager','financial','qa'
             )),
  agent_id   TEXT UNIQUE, -- ex: 'AG-01'
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- CLIENTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  segment              TEXT,
  whatsapp_group_ids   TEXT[],
  manager_id           UUID REFERENCES users(id),
  portfolio            TEXT CHECK (portfolio IN ('christian','junior','none')),
  active               BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- TAREFAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  client_id        UUID REFERENCES clients(id),
  area             TEXT NOT NULL CHECK (area IN (
                     'design','video','capture','content',
                     'traffic','commercial','financial','ops'
                   )),
  task_type        TEXT NOT NULL CHECK (task_type IN (
                     'new_demand','doubt','approval','adjustment',
                     'urgency','financial','contract'
                   )),
  priority         TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2')),
  status           TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN (
                     'inbox','triagem','atribuido','em_producao',
                     'revisao_interna','aprovacao_cliente','ajustes',
                     'concluido','pausado_bloqueado'
                   )),
  assigned_to      UUID REFERENCES users(id),
  deadline         TIMESTAMPTZ,
  sla_hours        INTEGER,
  briefing         JSONB,
  deliverables     TEXT[],
  links            TEXT[],
  notion_task_id   TEXT,
  source_group_id  TEXT,
  source_message   TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- HISTÓRICO DE ESTADOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  UUID REFERENCES users(id),
  agent_id    TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- BRIEFINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID REFERENCES tasks(id) ON DELETE CASCADE,
  objective         TEXT,
  format            TEXT,
  deadline_notes    TEXT,
  reference_links   TEXT[],
  cta               TEXT,
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
  is_complete       BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MENSAGENS WHATSAPP
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       TEXT NOT NULL,
  group_name     TEXT,
  sender_phone   TEXT NOT NULL,
  sender_name    TEXT,
  message_type   TEXT CHECK (message_type IN ('text','audio','image','document','link')),
  content        TEXT,
  media_url      TEXT,
  classification TEXT,
  task_id        UUID REFERENCES tasks(id),
  processed      BOOLEAN DEFAULT false,
  received_at    TIMESTAMPTZ NOT NULL,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- LOGS DOS AGENTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  task_id     UUID REFERENCES tasks(id),
  input       JSONB,
  output      JSONB,
  success     BOOLEAN NOT NULL,
  error       TEXT,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- ALERTAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN (
                'sla_warning','sla_critical','approval_overdue',
                'briefing_missing','traffic_anomaly','task_blocked'
              )),
  task_id     UUID REFERENCES tasks(id),
  target_user UUID REFERENCES users(id),
  message     TEXT NOT NULL,
  channel     TEXT CHECK (channel IN ('whatsapp','notion','internal')),
  sent        BOOLEAN DEFAULT false,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- LEADS (CRM)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  segment          TEXT,
  budget_estimate  NUMERIC,
  urgency          TEXT CHECK (urgency IN ('high','medium','low')),
  temperature      TEXT CHECK (temperature IN ('hot','warm','cold')),
  funnel_stage     TEXT NOT NULL DEFAULT 'new' CHECK (funnel_stage IN (
                     'new','contacted','qualified','call_scheduled',
                     'proposal_sent','won','lost'
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

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- FOLLOW-UPS DE LEADS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  message      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- CONFIGURAÇÃO DE SLA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sla_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type  TEXT NOT NULL,
  area       TEXT NOT NULL,
  priority   TEXT NOT NULL CHECK (priority IN ('P0','P1','P2')),
  sla_hours  INTEGER NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (task_type, area, priority)
);

-- Valores iniciais de SLA
INSERT INTO sla_config (task_type, area, priority, sla_hours) VALUES
  ('new_demand', 'design',     'P2', 48),
  ('new_demand', 'design',     'P1', 24),
  ('new_demand', 'design',     'P0', 4),
  ('new_demand', 'video',      'P2', 96),
  ('new_demand', 'video',      'P1', 48),
  ('new_demand', 'content',    'P2', 48),
  ('new_demand', 'content',    'P1', 24),
  ('new_demand', 'traffic',    'P1', 24),
  ('new_demand', 'capture',    'P1', 48),
  ('new_demand', 'commercial', 'P0', 1),
  ('adjustment', 'design',     'P1', 24),
  ('adjustment', 'video',      'P1', 24)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- KPIs DE TRÁFEGO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS traffic_kpis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id),
  platform      TEXT CHECK (platform IN ('meta','google','tiktok')),
  campaign_id   TEXT,
  campaign_name TEXT,
  date          DATE NOT NULL,
  cpl           NUMERIC,
  cpa           NUMERIC,
  ctr           NUMERIC,
  cpc           NUMERIC,
  roas          NUMERIC,
  frequency     NUMERIC,
  cvr           NUMERIC,
  spend         NUMERIC,
  impressions   INTEGER,
  clicks        INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- ASSETS DE DESIGN
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id),
  name       TEXT NOT NULL,
  type       TEXT CHECK (type IN ('template','logo','grid','brand_kit','reference')),
  url        TEXT NOT NULL,
  tags       TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- VERSÕES DE VÍDEO
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  url           TEXT NOT NULL,
  notes         TEXT,
  rework_reason TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- CALENDÁRIO EDITORIAL
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editorial_calendar (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id),
  manager_id UUID REFERENCES users(id),
  week_start DATE NOT NULL,
  content    JSONB,
  status     TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','published')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client     ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline   ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_area       ON tasks(area);
CREATE INDEX IF NOT EXISTS idx_agent_logs       ON agent_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wpp_messages     ON whatsapp_messages(group_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_target    ON alerts(target_user, sent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_funnel     ON leads(funnel_stage, temperature);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Ative após criar os usuários na tabela auth.users do Supabase.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (para os agentes)
-- Usuários comuns veem apenas dados da sua área (expandir conforme necessário)
CREATE POLICY "service_role_all" ON tasks
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON clients
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON briefings
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON whatsapp_messages
  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON leads
  FOR ALL TO service_role USING (true);
