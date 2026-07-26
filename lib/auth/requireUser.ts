import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth/session";

export async function requireUser(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { ok: true, session };
}
