require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

const SAMPLES = [
  {
    customerName: 'Ada Okafor',
    location: 'Lagos',
    quote:
      'Booking was smooth and the session exceeded my expectations. Highly recommend.',
    orderIndex: 0,
  },
  {
    customerName: 'Chinedu Eze',
    location: 'Abuja',
    quote:
      'Ordered from the shop — packaging was lovely and delivery was on time.',
    orderIndex: 1,
  },
];

async function main() {
  const creator = await prisma.creator.findFirst({
    where: { username: 'quietbrand' },
    select: { id: true, username: true },
  });
  if (!creator) throw new Error('Creator not found');
  console.log('creator', creator.username);

  for (const sample of SAMPLES) {
    const existing = await prisma.creatorReview.findFirst({
      where: {
        creatorId: creator.id,
        customerName: sample.customerName,
      },
      select: { id: true, location: true },
    });
    if (existing) {
      if (!existing.location && sample.location) {
        await prisma.creatorReview.update({
          where: { id: existing.id },
          data: { location: sample.location },
        });
        console.log('updated location', sample.customerName, sample.location);
      } else {
        console.log('skip', sample.customerName);
      }
      continue;
    }
    await prisma.creatorReview.create({
      data: {
        id: randomUUID(),
        creatorId: creator.id,
        customerName: sample.customerName,
        location: sample.location,
        quote: sample.quote,
        orderIndex: sample.orderIndex,
        isActive: true,
      },
    });
    console.log('created', sample.customerName);
  }
  console.log('done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
