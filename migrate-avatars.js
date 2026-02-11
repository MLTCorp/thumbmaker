const { supabaseAdmin } = require('./lib/supabase');

async function migrateAvatarsTable() {
  console.log('=== Migrating avatars table ===');
  
  const { data: avatars, error } = await supabaseAdmin
    .from('avatars')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching avatars:', error);
    return;
  }
  
  console.log('Current avatars:', avatars);
  
  // Update all avatars to fix JSON serialization
  for (const avatar of avatars) {
    console.log('Updating avatar:', avatar.id, '- photos:', avatar.photos?.length || 0);
    
    const { error: updateError } = await supabaseAdmin
      .from('avatars')
      .update({
        photos: avatar.photos || [],
        name: avatar.name || ''
      })
      .eq('id', avatar.id)
      .select();
    
    if (updateError) {
      console.error('Error updating avatar:', avatar.id, updateError.message);
      continue;
    }
  }
  
  console.log('Migration completed');
}

migrateAvatarsTable();
