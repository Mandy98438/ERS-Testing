import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "mtp_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-secret-change-me"
);

export interface SessionPayload {
  userId: string;
  employeeId: string;
  organizationId: string;
  role: "TECHNICIAN" | "ENGINEER" | "ADMIN";
  name: string;
}

// Employee-side session only. The client portal never gets one of these —
// it's a separate, unauthenticated, read-only lookup (see lib/auth/client.ts).
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
