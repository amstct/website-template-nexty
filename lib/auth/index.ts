import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { getSiteId } from "@/lib/db/site-context";
import { account, session, user, verification } from "@/lib/db/schema";
import { isResendEnabled } from "@/lib/resend";
import {
  buildUserSourceData,
  parseTrackingCookie,
  saveUserSource,
  TRACKING_COOKIE_NAME,
} from "@/lib/tracking/server";
import { isTrackingEnabled } from "@/lib/tracking/shared";
import { redis } from "@/lib/upstash";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, anonymous, captcha, emailOTP, lastLoginMethod, magicLink, oneTap } from "better-auth/plugins";
import { cookies } from "next/headers";

const isEmailAuthEnabled = isResendEnabled();

/**
 * Wraps a better-auth adapter instance to inject site_id into all operations.
 * This ensures user/session/account/verification queries are scoped to the current site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function siteScopedAdapter(adapterInstance: any) {
  return {
    ...adapterInstance,
    create: async (params: { model: string; data: Record<string, unknown> }) => {
      params.data.siteId = await getSiteId();
      return adapterInstance.create(params);
    },
    findOne: async (params: { model: string; where: Array<{ field: string; value: unknown; connector?: string }>; join?: unknown }) => {
      params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      return adapterInstance.findOne(params);
    },
    findMany: async (params: { model: string; where?: Array<{ field: string; value: unknown; connector?: string }>; sortBy?: unknown; limit?: number; offset?: number; join?: unknown }) => {
      if (params.where) {
        params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      } else {
        params.where = [{ field: 'siteId', value: await getSiteId(), connector: 'AND' }];
      }
      return adapterInstance.findMany(params);
    },
    update: async (params: { model: string; where: Array<{ field: string; value: unknown; connector?: string }>; update: Record<string, unknown> }) => {
      params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      return adapterInstance.update(params);
    },
    updateMany: async (params: { model: string; where: Array<{ field: string; value: unknown; connector?: string }>; update: Record<string, unknown> }) => {
      params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      return adapterInstance.updateMany(params);
    },
    delete: async (params: { model: string; where: Array<{ field: string; value: unknown; connector?: string }> }) => {
      params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      return adapterInstance.delete(params);
    },
    deleteMany: async (params: { model: string; where: Array<{ field: string; value: unknown; connector?: string }> }) => {
      params.where.push({ field: 'siteId', value: await getSiteId(), connector: 'AND' });
      return adapterInstance.deleteMany(params);
    },
  };
}

function getEmailAuthPlugins() {
  if (!isEmailAuthEnabled) {
    return [];
  }

  return [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const [{ sendEmail }, { default: MagicLinkEmail }] = await Promise.all([
          import("@/actions/resend"),
          import("@/emails/magic-link-email"),
        ]);

        await sendEmail({
          email,
          subject: `Sign in to ${siteConfig.name}`,
          react: MagicLinkEmail,
          reactProps: {
            url,
          },
        });
      },
      expiresIn: 60 * 5,
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const [{ sendEmail }, { default: OTPCodeEmail }] = await Promise.all([
          import("@/actions/resend"),
          import("@/emails/otp-code-email"),
        ]);

        await sendEmail({
          email,
          subject: `Your ${siteConfig.name} verification code: ${otp}`,
          react: OTPCodeEmail,
          reactProps: {
            otp,
            type,
          },
        });
      },
    }),
  ];
}

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    // Use Cloudflare IP header for accurate IP detection
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
    },
  },
  // IP-based rate limiting configuration
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_RATE_LIMIT_ENABLED === 'true',
    window: 60, // 60 seconds default window
    max: 100, // 100 requests per window (global default)
    customRules: {
      "/get-session": false,
      "/sign-in/magic-link": {
        window: 60, // 60 seconds
        max: 3, // Max 3 magic link requests per 60 seconds
      },
      "/email-otp/send-verification-otp": {
        window: 60,
        max: 3,
      },
      "/sign-in/email-otp": {
        window: 60,
        max: 5,
      },
    },
    // Use Upstash Redis for rate limit storage (works with serverless)
    ...(redis && {
      customStorage: {
        get: async (key: string) => {
          const data = await redis!.get<{ key: string; count: number; lastRequest: number }>(key);
          return data || undefined;
        },
        set: async (key: string, value: { key: string; count: number; lastRequest: number }) => {
          // TTL of 2 minutes (120 seconds) - enough for rate limit windows
          await redis!.set(key, value, { ex: 120 });
        },
      },
    }),
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60, // Cache duration in seconds
    },
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // freshAge: 0
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  database: (options: any) => {
    const adapter = drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: user,
        session: session,
        account: account,
        verification: verification,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })(options as any);
    return siteScopedAdapter(adapter);
  },
  socialProviders: {
    github: {
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const cookieStore = await cookies();

          // Only track user source if enabled via environment variable
          const isTrackingEnabledValue = await isTrackingEnabled()
          if (isTrackingEnabledValue) {
            try {
              const trackingCookie = cookieStore.get(TRACKING_COOKIE_NAME);
              const clientData = parseTrackingCookie(trackingCookie?.value);

              const sourceData = await buildUserSourceData(createdUser.id, clientData || undefined);
              await saveUserSource(sourceData);

              cookieStore.delete(TRACKING_COOKIE_NAME);
            } catch (error) {
              console.error('Failed to save user source data:', error);
            }
          }

          // Send welcome email
          if (createdUser.email && isEmailAuthEnabled) {
            try {
              const [{ sendEmail }, { UserWelcomeEmail }] = await Promise.all([
                import("@/actions/resend"),
                import("@/emails/user-welcome"),
              ]);

              const unsubscribeToken = Buffer.from(createdUser.email).toString('base64');
              const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/newsletter?token=${unsubscribeToken}`;

              await sendEmail({
                email: createdUser.email,
                subject: `Welcome to ${siteConfig.name}!`,
                react: UserWelcomeEmail,
                reactProps: {
                  name: createdUser.name,
                  email: createdUser.email,
                  unsubscribeLink: unsubscribeLink,
                },
                isAddContacts: true
              });
              console.log(`Welcome email sent to ${createdUser.email}`);
            } catch (error) {
              console.error('Failed to send welcome email:', error);
            }
          }
        },
      },
    },
  },
  trustedOrigins: process.env.NODE_ENV === 'development' ? [process.env.NEXT_PUBLIC_SITE_URL!, 'http://localhost:3000'] : [process.env.NEXT_PUBLIC_SITE_URL!],
  plugins: [
    ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? [oneTap()] : []),
    ...(process.env.TURNSTILE_SECRET_KEY ? [captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY,
    })] : []),
    ...getEmailAuthPlugins(),
    lastLoginMethod(),
    admin(),
    anonymous(),
    nextCookies() // make sure this is the last plugin in the array
  ]
});
