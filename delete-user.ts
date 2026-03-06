#!/usr/bin/env tsx

/**
 * Delete User Script
 * Deletes a user account and all associated data
 */

import { prisma } from './packages/database/src/prisma';

async function deleteUser(email) {

  try {
    console.log(`🔍 Finding user with email: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        creatorProfile: {
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

    if (user.creatorProfile) {
      console.log(`🗑️  Deleting creator account...`);

      // Simple deletion - let database handle cascading deletes
      await prisma.creator.delete({
        where: { id: user.creatorProfile.id }
      });
      console.log(`  - Deleted creator profile and all associated data`);
    }

    // Delete the user account
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log(`\n🎉 Successfully deleted user account: ${email}`);
    console.log(`📊 Summary:`);
    console.log(`  - User account: Deleted`);
    if (user.creatorProfile) {
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
