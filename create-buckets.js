const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qudijuifvkqccoejiwli.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZGlqdWlmdmtxY2NvZWppd2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY1MjE2MiwiZXhwIjoyMDg2MjI4MTYyfQ.aXd56-lNK-vG7-3mu63t1hqPR66-fcYLAKKrzv-V6DQ';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createBuckets() {
  const buckets = ['avatars', 'thumbnails', 'references'];

  for (const bucket of buckets) {
    try {
      console.log(`Checking bucket: ${bucket}`);
      const { data, error } = await supabaseAdmin.storage.listBuckets();

      if (error) {
        console.error(`Error listing buckets: ${error.message}`);
        continue;
      }

      const existing = data?.find(b => b.name === bucket);
      if (existing) {
        console.log(`Bucket ${bucket} already exists (public: ${existing.public})`);
        if (!existing.public) {
          console.log(`Updating bucket ${bucket} to public...`);
          const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucket, {
            public: true,
            fileSizeLimit: 10485760,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          });
          if (updateError) {
            console.error(`Error updating bucket ${bucket}: ${updateError.message}`);
          } else {
            console.log(`Bucket ${bucket} updated to public`);
          }
        }
      } else {
        console.log(`Creating bucket: ${bucket}`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });

        if (createError) {
          console.error(`Error creating bucket ${bucket}: ${createError.message}`);
        } else {
          console.log(`Bucket ${bucket} created successfully`);
        }
      }
    } catch (err) {
      console.error(`Error processing bucket ${bucket}:`, err);
    }
  }
}

createBuckets().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
