import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_EMAIL = process.env.SEED_TEST_EMAIL ?? 'test@creator.com';
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD ?? 'password123';

async function main() {
  console.log('🌱 Seeding database...');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure these are set in your environment.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create a test user
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // Skip email confirmation for testing
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Test user already exists');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Created test user:', data.user?.email);
    }

    console.log(`\n🔑 Test login credentials:`);
    console.log(`   Email:    ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}\n`);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }

  console.log('✨ Seeding complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
