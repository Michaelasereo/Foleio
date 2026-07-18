import { createSupabaseServiceClient, prisma } from '@foleio/database';

export type DeletedCreatorSummary = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  authDeleted: boolean;
};

/**
 * Permanently remove a creator, their user row, related orders/transactions,
 * and the Supabase Auth account. Safe for cleaning e2e / test accounts that
 * skew production analytics.
 */
export async function deleteCreatorById(
  creatorId: string
): Promise<DeletedCreatorSummary> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      username: true,
      displayName: true,
      userId: true,
      user: { select: { email: true } },
    },
  });

  if (!creator) {
    throw new Error('CREATOR_NOT_FOUND');
  }

  const userId = creator.userId;
  const email = creator.user.email;

  await prisma.$transaction(async (tx) => {
    // Break circular intro-video FK before content/creator delete.
    await tx.creator.update({
      where: { id: creatorId },
      data: { introVideoId: null },
    });

    // OrderItem → Product is Restrict; delete orders (cascade items) first.
    await tx.order.deleteMany({ where: { creatorId } });

    // Transactions have no onDelete cascade — remove so analytics stay clean.
    await tx.transaction.deleteMany({
      where: {
        OR: [{ creatorId }, { userId }],
      },
    });

    await tx.creator.delete({ where: { id: creatorId } });
    await tx.user.delete({ where: { id: userId } });
  });

  let authDeleted = false;
  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    authDeleted = !error;
    if (error) {
      console.error(`Failed to delete auth user ${email}:`, error.message);
    }
  } catch (error) {
    console.error(`Failed to delete auth user ${email}:`, error);
  }

  return {
    id: creator.id,
    username: creator.username,
    displayName: creator.displayName,
    email,
    authDeleted,
  };
}

export function isE2eCreator(input: {
  username: string;
  email: string;
}): boolean {
  const username = input.username.toLowerCase();
  const email = input.email.toLowerCase();
  return (
    username.startsWith('e2e') ||
    isE2eEmail(email) ||
    /e2e\d/.test(username)
  );
}

export function isE2eEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return (
    value.includes('+e2e') ||
    value.startsWith('e2e') ||
    /e2e\d/.test(value)
  );
}

export async function findE2eCreatorIds(): Promise<
  Array<{ id: string; username: string; email: string }>
> {
  const creators = await prisma.creator.findMany({
    select: {
      id: true,
      username: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return creators
    .filter((creator) =>
      isE2eCreator({ username: creator.username, email: creator.user.email })
    )
    .map((creator) => ({
      id: creator.id,
      username: creator.username,
      email: creator.user.email,
    }));
}

/** Remove waitlist rows that look like e2e / test invites. */
export async function deleteE2eWaitlistEntries(emails?: string[]): Promise<number> {
  if (emails && emails.length > 0) {
    const normalized = [
      ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    ];
    const result = await prisma.waitlistEntry.deleteMany({
      where: { email: { in: normalized } },
    });
    return result.count;
  }

  const entries = await prisma.waitlistEntry.findMany({
    select: { id: true, email: true },
  });
  const ids = entries
    .filter((entry) => isE2eEmail(entry.email))
    .map((entry) => entry.id);
  if (ids.length === 0) return 0;
  const result = await prisma.waitlistEntry.deleteMany({
    where: { id: { in: ids } },
  });
  return result.count;
}

export async function deleteE2eCreatorByEmail(email: string): Promise<{
  deletedCreator: DeletedCreatorSummary | null;
  waitlistDeleted: number;
}> {
  const normalized = email.trim().toLowerCase();
  if (!isE2eEmail(normalized)) {
    throw new Error('NOT_E2E_EMAIL');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      creator: { select: { id: true } },
    },
  });

  let deletedCreator: DeletedCreatorSummary | null = null;
  if (user?.creator?.id) {
    deletedCreator = await deleteCreatorById(user.creator.id);
  }

  const waitlistDeleted = await deleteE2eWaitlistEntries([normalized]);
  return { deletedCreator, waitlistDeleted };
}
