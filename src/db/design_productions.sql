-- Tabela de apontamentos de produção da designer (espelho do Google Sheets)
-- Execute este SQL no painel SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS design_productions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_row      INTEGER UNIQUE NOT NULL,   -- número da linha no Sheets (chave de upsert)

  designer_name  TEXT,
  client_name    TEXT,
  date           TEXT,                      -- data do apontamento
  urgency        TEXT,                      -- Urgência
  item_type      TEXT,                      -- tipo do item (arte, carrossel, reels, etc.)
  quantity       INTEGER,
  responsible    TEXT,                      -- Responsavel
  briefing       TEXT,
  status                TEXT,               -- Status atual
  approval_responsible  TEXT,               -- Responsável pela aprovação
  delivery_link         TEXT,               -- Link de entrega
  delivery_date  TEXT,                      -- Data de entrega
  needed_revision TEXT,                     -- Precisou de Alteração?
  complexity     TEXT,                      -- Complexidade
  revision_count INTEGER,                   -- Nº de Alterações
  revision_date  TEXT,                      -- Data Alteração

  synced_at      TIMESTAMPTZ DEFAULT now()  -- última sincronização
);

-- Índices para queries do MAX
CREATE INDEX IF NOT EXISTS idx_design_productions_client  ON design_productions (client_name);
CREATE INDEX IF NOT EXISTS idx_design_productions_status  ON design_productions (status);
CREATE INDEX IF NOT EXISTS idx_design_productions_date    ON design_productions (date DESC);

-- Migração: adicionar coluna caso a tabela já exista sem ela
ALTER TABLE design_productions ADD COLUMN IF NOT EXISTS approval_responsible TEXT;

-- RLS
ALTER TABLE design_productions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access" ON design_productions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
