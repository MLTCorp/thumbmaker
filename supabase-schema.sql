-- ============================================================
-- Supabase Database Schema for Thumbmaker
-- Execute isso no Supabase Dashboard (SQL Editor)
-- ============================================================

-- Habilita extensão de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de avatars
CREATE TABLE IF NOT EXISTS avatars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de referências (references é palavra reservada, usar aspas)
CREATE TABLE IF NOT EXISTS "references" (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('thumbnail', 'logo', 'icon', 'background')),
  file_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de thumbnails
CREATE TABLE IF NOT EXISTS thumbnails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  avatar_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  text_idea TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  "references" TEXT[] DEFAULT '{}',
  additional_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_avatars_created_at ON avatars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_references_user_id ON "references"(user_id);
CREATE INDEX IF NOT EXISTS idx_references_type ON "references"(type);
CREATE INDEX IF NOT EXISTS idx_references_created_at ON "references"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thumbnails_user_id ON thumbnails(user_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_created_at ON thumbnails(created_at DESC);

-- Habilita RLS (Row Level Security)
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE "references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usuários só podem ver/editar próprios registros)

-- Policy para avatars
CREATE POLICY avatars_select_policy ON avatars
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY avatars_insert_policy ON avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY avatars_update_policy ON avatars
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY avatars_delete_policy ON avatars
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy para referências
CREATE POLICY references_select_policy ON "references"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY references_insert_policy ON "references"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY references_update_policy ON "references"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY references_delete_policy ON "references"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy para thumbnails
CREATE POLICY thumbnails_select_policy ON thumbnails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY thumbnails_insert_policy ON thumbnails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY thumbnails_update_policy ON thumbnails
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY thumbnails_delete_policy ON thumbnails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Criar bucket de storage para thumbnails (executar separadamente se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('references', 'references', true);
