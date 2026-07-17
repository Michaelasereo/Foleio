import { revalidatePath } from 'next/cache';

/** Bust the public creator profile cache after mutations. */
export function revalidatePublicCreator(username: string | null | undefined) {
  if (!username) return;
  revalidatePath(`/creator/${username}`);
}
