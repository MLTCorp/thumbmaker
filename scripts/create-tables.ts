import { createClient } from '@supabase/supabase-js'

// Script para criar tabelas no Supabase via API
// Uso: npx tsx scripts/create-tables.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devem estar definidos')
  console.error('Configure essas variáveis em .env.local ou no painel da Vercel')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function executeSQL(sql: string, description: string) {
  console.log(`🔧 ${description}...`)

  const { data, error } = await supabase.rpc('exec_sql', {
    sql,
  })

  if (error) {
    console.error(`❌ Erro ao executar SQL:`, error)
    throw error
  }

  console.log(`✅ ${description} concluído`)
  return data
}

async function main() {
  console.log('🚀 Iniciando criação de tabelas no Supabase...')
  console.log(`📊 Projeto: ${SUPABASE_URL}`)
  console.log('')

  try {
    // Criar tabela de avatars
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS avatars (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        photos TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `, 'Criando tabela avatars')

    // Criar tabela de referências
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS references (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('thumbnail', 'logo', 'icon', 'background')),
        description TEXT,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `, 'Criando tabela references')

    // Criar tabela de thumbnails
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS thumbnails (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
        prompt TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        references TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `, 'Criando tabela thumbnails')

    // Criar índices
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);
      CREATE INDEX IF NOT EXISTS idx_avatars_created_at ON avatars(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_references_user_id ON references(user_id);
      CREATE INDEX IF NOT EXISTS idx_references_type ON references(type);
      CREATE INDEX IF NOT EXISTS idx_references_created_at ON references(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_thumbnails_user_id ON thumbnails(user_id);
      CREATE INDEX IF NOT EXISTS idx_thumbnails_created_at ON thumbnails(created_at DESC)
    `, 'Criando índices para performance')

    // Habilitar RLS
    await executeSQL(`
      ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
      ALTER TABLE references ENABLE ROW LEVEL SECURITY;
      ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY
    `, 'Habilitando Row Level Security')

    // Criar políticas RLS
    await executeSQL(`
      CREATE POLICY avatars_select_policy ON avatars FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY avatars_insert_policy ON avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY avatars_update_policy ON avatars FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY avatars_delete_policy ON avatars FOR DELETE USING (auth.uid() = user_id);

      CREATE POLICY references_select_policy ON references FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY references_insert_policy ON references FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY references_update_policy ON references FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY references_delete_policy ON references FOR DELETE USING (auth.uid() = user_id);

      CREATE POLICY thumbnails_select_policy ON thumbnails FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY thumbnails_insert_policy ON thumbnails FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY thumbnails_update_policy ON thumbnails FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY thumbnails_delete_policy ON thumbnails FOR DELETE USING (auth.uid() = user_id);
    `, 'Criando políticas RLS (Row Level Security)')

    console.log('')
    console.log('✅ Todas as tabelas criadas com sucesso!')
    console.log('')
    console.log('📋 Próximos passos:')
    console.log('1. Configure as variáveis de ambiente no arquivo .env.local:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=')
    console.log('2. Execute `npm run dev` para rodar localmente')
    console.log('3. Configure as mesmas variáveis no painel da Vercel para produção')
    console.log('')

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    process.exit(1)
  }
}

main()
