import { getIronSession, type SessionOptions } from "iron-session";
import { cookies, headers } from "next/headers";

export interface SessionData {
  role?: "admin" | "group";
  groupId?: number;
  groupCode?: string;
}

const fallbackSecret =
  "dev-secret-roulette-review-change-me-please-32";

function resolveSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  if (envSecret && envSecret.length > 0 && envSecret.length < 32) {
    console.warn(
      `[roulette-review] SESSION_SECRET (${envSecret.length} caractères) est inférieur au minimum requis de 32 caractères. Il a été complété automatiquement.`,
    );
    return envSecret.padEnd(32, "x");
  }

  return fallbackSecret;
}

const sessionSecret = resolveSessionSecret();

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "roulette_review_session",
  ttl: 60 * 60 * 12,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  },
};

export async function getSession() {
  const requestHeaders = await headers();
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
  return getIronSession<SessionData>(await cookies(), {
    ...sessionOptions,
    cookieOptions: {
      ...sessionOptions.cookieOptions,
      secure: protocol === "https",
    },
  });
}
