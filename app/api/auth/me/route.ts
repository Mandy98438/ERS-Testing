import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ session });
}
