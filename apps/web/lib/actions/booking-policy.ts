'use server';

import { prisma } from '@foleio/database';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { parseCancellationPolicy } from '@/lib/booking/cancellation-policy';

const policySchema = z.object({
  balanceDueDaysBefore: z.number().int().min(0).max(365),
  cancellationPolicy: z
    .array(
      z.object({
        minDaysBefore: z.number().int().min(0),
        maxDaysBefore: z.number().int().min(0).nullable(),
        refundPercent: z.number().int().min(0).max(100),
      })
    )
    .min(1),
});

export async function getBookingPaymentPolicy() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: {
      balanceDueDaysBefore: true,
      cancellationPolicy: true,
    },
  });
  if (!creator) return { error: 'Creator not found' };

  return {
    success: true,
    data: {
      balanceDueDaysBefore: creator.balanceDueDaysBefore ?? 7,
      cancellationPolicy: parseCancellationPolicy(creator.cancellationPolicy),
    },
  };
}

export async function updateBookingPaymentPolicy(input: z.infer<typeof policySchema>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const creator = await prisma.creator.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!creator) return { error: 'Creator not found' };

  const validation = policySchema.safeParse(input);
  if (!validation.success) {
    return { error: validation.error.errors[0]?.message || 'Invalid policy' };
  }

  await prisma.creator.update({
    where: { id: creator.id },
    data: {
      balanceDueDaysBefore: validation.data.balanceDueDaysBefore,
      cancellationPolicy: validation.data.cancellationPolicy,
    },
  });

  revalidatePath('/bookings');
  revalidatePath('/settings');
  revalidatePath(`/creator/${creator.username}`);
  return {
    success: true,
    data: {
      balanceDueDaysBefore: validation.data.balanceDueDaysBefore,
      cancellationPolicy: validation.data.cancellationPolicy,
    },
  };
}
