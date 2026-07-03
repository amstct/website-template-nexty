import 'server-only';

import { auth } from "@/lib/auth";
import { db } from '@/lib/db';
import { tryGetSiteId, getSiteId } from '@/lib/db/site-context';
import { user as userSchema } from '@/lib/db/schema';
import { withTimeout } from '@/lib/timeout';
import { and, eq } from 'drizzle-orm';
import { headers } from "next/headers";
import { redirect } from 'next/navigation';

const SESSION_LOOKUP_TIMEOUT_MS = 3000;

export const getSession = async () => {
  try {
    const siteId = await tryGetSiteId();
    if (!siteId) {
      return null;
    }

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