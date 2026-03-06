#!/usr/bin/env node

/**
 * Delete User Script
 * Deletes a user account and all associated data
 */

import { prisma } from './packages/database/src/prisma.js';

async function deleteUser(email) {

  try {
    console.log(`🔍 Finding user with email: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        creator: {
          include: {
            creatorPlans: true,
            priceListItems: true,
            content: true,
            collections: true,
            bookings: true,
            transactions: true,
            payouts: true,
          }
        }
      }
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    if (user.creator) {
      console.log(`🗑️  Deleting creator account and all associated data...`);

      // Delete in reverse dependency order to avoid foreign key constraints

      // Delete creator links
      const deletedLinks = await prisma.creatorLink.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedLinks.count} creator links`);

      // Delete collection subscriptions
      const deletedSubscriptions = await prisma.collectionSubscription.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedSubscriptions.count} collection subscriptions`);

      // Delete email subscriptions
      const deletedEmails = await prisma.emailSubscription.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedEmails.count} email subscriptions`);

      // Delete content access codes
      const deletedCodes = await prisma.premiumAccessCode.deleteMany({
        where: { content: { creatorId: user.creator.id } }
      });
      console.log(`  - Deleted ${deletedCodes.count} access codes`);

      // Delete tutorial purchases
      const deletedPurchases = await prisma.tutorialPurchase.deleteMany({
        where: { content: { creatorId: user.creator.id } }
      });
      console.log(`  - Deleted ${deletedPurchases.count} tutorial purchases`);

      // Delete fan subscriptions
      const deletedFanSubs = await prisma.fanSubscription.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedFanSubs.count} fan subscriptions`);

      // Delete bookings
      const deletedBookings = await prisma.booking.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedBookings.count} bookings`);

      // Delete payouts
      const deletedPayouts = await prisma.payout.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedPayouts.count} payouts`);

      // Delete transactions
      const deletedTransactions = await prisma.transaction.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedTransactions.count} transactions`);

      // Delete content sections
      for (const content of user.creator.content) {
        await prisma.sectionContent.deleteMany({
          where: { contentId: content.id }
        });
      }
      console.log(`  - Deleted content sections`);

      // Delete content
      const deletedContent = await prisma.content.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedContent.count} content items`);

      // Delete collections
      const deletedCollections = await prisma.collection.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedCollections.count} collections`);

      // Delete price list items
      const deletedPrices = await prisma.priceListItem.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedPrices.count} price list items`);

      // Delete creator plans
      const deletedPlans = await prisma.creatorPlan.deleteMany({
        where: { creatorId: user.creator.id }
      });
      console.log(`  - Deleted ${deletedPlans.count} creator plans`);

      // Finally delete the creator
      await prisma.creator.delete({
        where: { id: user.creator.id }
      });
      console.log(`  - Deleted creator profile`);
    }

    // Delete the user account
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log(`\n🎉 Successfully deleted user account: ${email}`);
    console.log(`📊 Summary:`);
    console.log(`  - User account: Deleted`);
    if (user.creator) {
      console.log(`  - Creator profile: Deleted`);
      console.log(`  - All associated data: Deleted`);
    }

  } catch (error) {
    console.error('❌ Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Usage: node delete-user.js <email>');
  console.log('📝 Example: node delete-user.js michaelasereoo@gmail.com');
  process.exit(1);
}

console.log('🗑️  Foleio User Deletion Script');
console.log('================================\n');

deleteUser(email).then(() => {
  console.log('\n✅ User deletion completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ User deletion failed:', error);
  process.exit(1);
});
