'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { revalidatePublicCreator } from '@/lib/creator/revalidate-public';
import {
  isAllowedBookingPolicyLink,
  resolveBookingPolicyHref,
} from '@/lib/booking/booking-policy-document';

export type BookingPolicyDocument = {
  bookingPolicyType: 'file' | 'link' | null;
  bookingPolicyFileUrl: string | null;
  bookingPolicyFileName: string | null;
  bookingPolicyLinkUrl: string | null;
};

export { isAllowedBookingPolicyLink, resolveBookingPolicyHref };

const POLICY_SELECT = {
  bookingPolicyType: true,
  bookingPolicyFileUrl: true,
  bookingPolicyFileName: true,
  bookingPolicyLinkUrl: true,
  username: true,
} as const;

function normalizePolicyType(
  value: string | null | undefined
): 'file' | 'link' | null {
  if (value === 'file' || value === 'link') return value;
  return null;
}

function toDocument(creator: {
  bookingPolicyType: string | null;
  bookingPolicyFileUrl: string | null;
  bookingPolicyFileName: string | null;
  bookingPolicyLinkUrl: string | null;
}): BookingPolicyDocument {
  return {
    bookingPolicyType: normalizePolicyType(creator.bookingPolicyType),
    bookingPolicyFileUrl: creator.bookingPolicyFileUrl,
    bookingPolicyFileName: creator.bookingPolicyFileName,
    bookingPolicyLinkUrl: creator.bookingPolicyLinkUrl,
  };
}

async function getAuthedCreator() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' as const };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true, ...POLICY_SELECT },
  });
  if (!creator) return { error: 'Creator not found' as const };
  return { creator };
}

export async function getBookingPolicyDocument() {
  const result = await getAuthedCreator();
  if ('error' in result) return { error: result.error };
  return { success: true, data: toDocument(result.creator) };
}

export async function setBookingPolicyLink(rawUrl: string) {
  const result = await getAuthedCreator();
  if ('error' in result) return { error: result.error };

  const url = rawUrl.trim();
  if (!isAllowedBookingPolicyLink(url)) {
    return {
      error:
        'Use a valid Google Docs or Google Drive https link (docs.google.com / drive.google.com).',
    };
  }

  const updated = await prisma.creator.update({
    where: { id: result.creator.id },
    data: {
      bookingPolicyType: 'link',
      bookingPolicyLinkUrl: url,
      bookingPolicyFileUrl: null,
      bookingPolicyFileName: null,
    },
    select: POLICY_SELECT,
  });

  revalidatePath('/bookings');
  revalidatePublicCreator(updated.username);

  return { success: true, data: toDocument(updated) };
}

export async function clearBookingPolicyDocument() {
  const result = await getAuthedCreator();
  if ('error' in result) return { error: result.error };

  const updated = await prisma.creator.update({
    where: { id: result.creator.id },
    data: {
      bookingPolicyType: null,
      bookingPolicyLinkUrl: null,
      bookingPolicyFileUrl: null,
      bookingPolicyFileName: null,
    },
    select: POLICY_SELECT,
  });

  revalidatePath('/bookings');
  revalidatePublicCreator(updated.username);

  return { success: true, data: toDocument(updated) };
}
