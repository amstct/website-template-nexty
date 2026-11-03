import 'server-only';

import { db, isDatabaseEnabled } from '@/lib/db';
import { tryGetSiteId, getSiteId } from '@/lib/db/site-context';
import { user as userSchema } from '@/lib/db/schema';
import { withTimeout } from '@/lib/timeout';
import { and, eq } from 'drizzle-orm';
import { headers } from "next/headers";
import { redirect } from 'next/navigation';

const SESSION_LOOKUP_TIMEOUT_MS = 3000;

export const getSession = async () => {
  try {
    if (!isDatabaseEnabled) {
      return null;
    }

    const siteId = await tryGetSiteId();
    if (!siteId) {
      return null;
    }

    // Lazy-load auth so frontend-only mode does not require BETTER_AUTH_SECRET
    const { auth } = await import("@/lib/auth");

    return await withTimeout(
      auth.api.getSession({ headers: await headers() }),
      SESSION_LOOKUP_TIMEOUT_MS,
      'Session lookup timed out'
    );
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

export const isAdmin = async (): Promise<boolean> => {
  const session = await getSession()
  const user = session?.user;
  if (!user) {
    redirect('/login');
  }

  const siteId = await getSiteId();

  const userDataResults = await db
    .select({ role: userSchema.role })
    .from(userSchema)
    .where(and(eq(userSchema.id, user.id), eq(userSchema.siteId, siteId)))
    .limit(1);

  const userData = userDataResults[0];
  return !!userData && userData.role === 'admin';
}
