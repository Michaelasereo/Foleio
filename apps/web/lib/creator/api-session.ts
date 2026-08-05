import { prisma } from '@foleio/database';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { getDeveloperSupportSession } from '@/lib/developer-support/session';
import {
  developerSupportBlockedMessage,
  isDeveloperSupportBlockedApi,
} from '@/lib/developer-support/guard';

type CreatorSessionRow = {
  id: string;
  username: string;
  platformPlan: string | null;
  platformSubscriptionActive: boolean;
};

export type CreatorApiAccess =
  | { mode: 'owner'; creator: CreatorSessionRow }
  | { mode: 'support'; creator: CreatorSessionRow; grantId: string };

export async function getCreatorApiAccess(
  request?: Request
): Promise<CreatorApiAccess | null> {
  const support = await getDeveloperSupportSession(request);
  if (support) {
    const creator = await prisma.creator.findUnique({
      where: { id: support.creatorId },
      select: {
        id: true,
        username: true,
        platformPlan: true,
        platformSubscriptionActive: true,
      },
    });
    if (!creator) return null;
    return { mode: 'support', creator, grantId: support.grantId };
  }

  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      platformPlan: true,
      platformSubscriptionActive: true,
    },
  });
  if (!creator) return null;
  return { mode: 'owner', creator };
}

export async function assertCreatorApiAccess(
  request?: Request
): Promise<
  | { ok: true; access: CreatorApiAccess }
  | { ok: false; status: number; error: string }
> {
  const pathname = request ? new URL(request.url).pathname : '';
  const support = await getDeveloperSupportSession(request);

  if (support && pathname && isDeveloperSupportBlockedApi(pathname)) {
    return {
      ok: false,
      status: 403,
      error: developerSupportBlockedMessage(),
    };
  }

  const access = await getCreatorApiAccess(request);
  if (!access) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  return { ok: true, access };
}
