import { prisma } from '@foleio/database';
import { createSupabaseServiceClient } from '@foleio/database';

async function clearAllData() {
  try {
    console.log('🗑️  Starting database cleanup...\n');

    // Get Supabase service client for auth operations
    const supabaseAdmin = createSupabaseServiceClient();

    // Step 1: Delete all child records first (in reverse dependency order)
    console.log('📦 Deleting child records...');

    // Tutorial purchases
    const tutorialPurchasesDeleted = await prisma.tutorialPurchase.deleteMany({});
    console.log(`   ✓ Deleted ${tutorialPurchasesDeleted.count} tutorial purchases`);

    // Collection subscriptions
    const collectionSubscriptionsDeleted = await prisma.collectionSubscription.deleteMany({});
    console.log(`   ✓ Deleted ${collectionSubscriptionsDeleted.count} collection subscriptions`);

    // Premium access codes
    const premiumAccessCodesDeleted = await prisma.premiumAccessCode.deleteMany({});
    console.log(`   ✓ Deleted ${premiumAccessCodesDeleted.count} premium access codes`);

    // Email subscriptions
    const emailSubscriptionsDeleted = await prisma.emailSubscription.deleteMany({});
    console.log(`   ✓ Deleted ${emailSubscriptionsDeleted.count} email subscriptions`);

    // Bookings
    const bookingsDeleted = await prisma.booking.deleteMany({});
    console.log(`   ✓ Deleted ${bookingsDeleted.count} bookings`);

    // Creator availability
    const availabilityDeleted = await prisma.creatorAvailability.deleteMany({});
    console.log(`   ✓ Deleted ${availabilityDeleted.count} availability records`);

    // Price list items
    const priceListItemsDeleted = await prisma.priceListItem.deleteMany({});
    console.log(`   ✓ Deleted ${priceListItemsDeleted.count} price list items`);

    // Creator links
    const creatorLinksDeleted = await prisma.creatorLink.deleteMany({});
    console.log(`   ✓ Deleted ${creatorLinksDeleted.count} creator links`);

    // Section contents (junction table)
    const sectionContentsDeleted = await prisma.sectionContent.deleteMany({});
    console.log(`   ✓ Deleted ${sectionContentsDeleted.count} section contents`);

    // Sections
    const sectionsDeleted = await prisma.section.deleteMany({});
    console.log(`   ✓ Deleted ${sectionsDeleted.count} sections`);

    // Content (videos, tutorials, etc.)
    const contentDeleted = await prisma.content.deleteMany({});
    console.log(`   ✓ Deleted ${contentDeleted.count} content items`);

    // Collections
    const collectionsDeleted = await prisma.collection.deleteMany({});
    console.log(`   ✓ Deleted ${collectionsDeleted.count} collections`);

    // Platform subscriptions
    const platformSubscriptionsDeleted = await prisma.platformSubscription.deleteMany({});
    console.log(`   ✓ Deleted ${platformSubscriptionsDeleted.count} platform subscriptions`);

    // Payouts
    const payoutsDeleted = await prisma.payout.deleteMany({});
    console.log(`   ✓ Deleted ${payoutsDeleted.count} payouts`);

    // Transactions
    const transactionsDeleted = await prisma.transaction.deleteMany({});
    console.log(`   ✓ Deleted ${transactionsDeleted.count} transactions`);

    // Fan subscriptions
    const fanSubscriptionsDeleted = await prisma.fanSubscription.deleteMany({});
    console.log(`   ✓ Deleted ${fanSubscriptionsDeleted.count} fan subscriptions`);

    // Creator plans
    const creatorPlansDeleted = await prisma.creatorPlan.deleteMany({});
    console.log(`   ✓ Deleted ${creatorPlansDeleted.count} creator plans`);

    // Step 2: Delete creators (will cascade from users, but being explicit)
    const creatorsDeleted = await prisma.creator.deleteMany({});
    console.log(`\n👥 Deleted ${creatorsDeleted.count} creators`);

    // Step 3: Get all users before deleting (for auth cleanup)
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    console.log(`\n👤 Found ${users.length} users in database`);

    // Step 4: Delete users from database
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`   ✓ Deleted ${usersDeleted.count} users from database`);

    // Step 5: Delete Supabase Auth users
    console.log('\n🔐 Deleting Supabase Auth users...');
    let authUsersDeleted = 0;
    let authUsersFailed = 0;

    for (const user of users) {
      try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (error) {
          console.error(`   ✗ Failed to delete auth user ${user.email}: ${error.message}`);
          authUsersFailed++;
        } else {
          authUsersDeleted++;
        }
      } catch (error) {
        console.error(`   ✗ Error deleting auth user ${user.email}:`, error);
        authUsersFailed++;
      }
    }

    if (authUsersDeleted > 0) {
      console.log(`   ✓ Deleted ${authUsersDeleted} auth users`);
    }
    if (authUsersFailed > 0) {
      console.log(`   ✗ Failed to delete ${authUsersFailed} auth users`);
    }

    console.log('\n✅ Database cleanup completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Tutorial Purchases: ${tutorialPurchasesDeleted.count}`);
    console.log(`   - Collection Subscriptions: ${collectionSubscriptionsDeleted.count}`);
    console.log(`   - Premium Access Codes: ${premiumAccessCodesDeleted.count}`);
    console.log(`   - Email Subscriptions: ${emailSubscriptionsDeleted.count}`);
    console.log(`   - Bookings: ${bookingsDeleted.count}`);
    console.log(`   - Availability Records: ${availabilityDeleted.count}`);
    console.log(`   - Price List Items: ${priceListItemsDeleted.count}`);
    console.log(`   - Creator Links: ${creatorLinksDeleted.count}`);
    console.log(`   - Sections: ${sectionsDeleted.count}`);
    console.log(`   - Content Items: ${contentDeleted.count}`);
    console.log(`   - Collections: ${collectionsDeleted.count}`);
    console.log(`   - Platform Subscriptions: ${platformSubscriptionsDeleted.count}`);
    console.log(`   - Payouts: ${payoutsDeleted.count}`);
    console.log(`   - Transactions: ${transactionsDeleted.count}`);
    console.log(`   - Fan Subscriptions: ${fanSubscriptionsDeleted.count}`);
    console.log(`   - Creator Plans: ${creatorPlansDeleted.count}`);
    console.log(`   - Creators: ${creatorsDeleted.count}`);
    console.log(`   - Users (Database): ${usersDeleted.count}`);
    console.log(`   - Users (Auth): ${authUsersDeleted} deleted, ${authUsersFailed} failed`);
    console.log('\n🎉 Your database is now clean and ready for testing!');
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();

