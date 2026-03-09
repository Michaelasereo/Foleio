export * from './supabase';
export { PrismaClient } from '@prisma/client';
export { prisma } from './prisma';

// Re-export Prisma types
export type {
  User,
  Creator,
  CreatorPlan,
  FanSubscription,
  Content,
  Collection,
  Section,
  SectionContent,
  Transaction,
  Payout,
  PlatformSubscription,
  CreatorLink,
  PriceListItem,
  CreatorAvailability,
  Booking,
  EmailSubscription,
  JournalEntry,
  PremiumAccessCode,
  CollectionSubscription,
  TutorialPurchase,
} from '@prisma/client';

