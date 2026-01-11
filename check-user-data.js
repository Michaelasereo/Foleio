// Script to check what data a specific user has
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserData(userId = null) {
  try {
    console.log('🔍 Checking user data in database...\n');

    // If no userId provided, check all users
    if (!userId) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true }
      });
      console.log('👥 All users in database:');
      users.forEach((user, i) => {
        console.log(`${i+1}. ${user.email} (ID: ${user.id})`);
      });
      console.log();
    }

    // Check creators
    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        userId: true,
        username: true,
        displayName: true
      }
    });

    console.log('🎨 Creators in database:');
    if (creators.length === 0) {
      console.log('No creators found.');
    } else {
      creators.forEach((creator, i) => {
        console.log(`${i+1}. ${creator.displayName} (@${creator.username}) - User ID: ${creator.userId}`);
      });
    }
    console.log();

    // Check bookings
    const allBookings = await prisma.booking.findMany({
      include: {
        priceListItem: {
          select: { name: true, price: true }
        },
        creator: {
          select: { displayName: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📅 All bookings in database:');
    if (allBookings.length === 0) {
      console.log('❌ No bookings found in database.');
      console.log('💡 This means the data you see in the browser might be:');
      console.log('   - Cached/old data from previous sessions');
      console.log('   - Test data from development scripts');
      console.log('   - Data from a different environment/database');
    } else {
      console.log(`✅ Found ${allBookings.length} bookings:`);
      allBookings.forEach((booking, i) => {
        console.log(`${i+1}. ${booking.customerName} - ${booking.priceListItem?.name || 'Unknown service'}`);
        console.log(`   Status: ${booking.status}, Amount: ₦${(booking.totalAmount/100).toFixed(2)}`);
        console.log(`   Creator: ${booking.creator?.displayName || 'Unknown'}`);
        console.log(`   Date: ${booking.bookingDate}, Created: ${booking.createdAt}`);
        console.log();
      });
    }

    // Check services
    const services = await prisma.priceListItem.count();
    const content = await prisma.content.count();

    console.log('📊 Summary:');
    console.log(`- Creators: ${creators.length}`);
    console.log(`- Bookings: ${allBookings.length}`);
    console.log(`- Services: ${services}`);
    console.log(`- Content: ${content}`);

  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUserData();
