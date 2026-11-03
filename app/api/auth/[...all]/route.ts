import { isDatabaseEnabled } from "@/lib/db";
import { toNextJsHandler } from "better-auth/next-js";

function databaseUnavailable() {
  return Response.json(
    {
      error:
        "Database is not configured. Auth is unavailable in frontend-only mode.",
    },
    { status: 503 }
  );
}

async function getHandlers() {
  const { auth } = await import("@/lib/auth");
  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  if (!isDatabaseEnabled) {
    return databaseUnavailable();
  }
  const { GET: handler } = await getHandlers();
  return handler(request);
}

export async function POST(request: Request) {
  if (!isDatabaseEnabled) {
    return databaseUnavailable();
  }
  const { POST: handler } = await getHandlers();
  return handler(request);
}
