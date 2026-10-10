import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { seedAll } from '../src/lib/seed-db';
import { DEMO_PASSWORD } from '../src/config/demo';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await seedAll(admin);
  console.log(`Seed complete. Sign in with any demo email and password ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
