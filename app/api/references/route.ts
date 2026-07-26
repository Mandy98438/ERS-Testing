import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const references = await prisma.testReference.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(references);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
