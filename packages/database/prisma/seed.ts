import { createClient } from '@supabase/supabase-js';

// Load environment variables directly
const supabaseUrl = 'https://xdwocaugiyjtbbzwpbid.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkd29jYXVnaXlqdGJiendwYmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzODkwNCwiZXhwIjoyMDgzMDE0OTA0fQ.8LY924Gg8tYmC-AvDNcOraxIpOdkEHD5nKkywfFrn-I';

async function main() {
  console.log('🌱 Seeding database...');

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create a test user
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@creator.com',
      password: 'password123',
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
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }

  console.log('✨ Seeding complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
