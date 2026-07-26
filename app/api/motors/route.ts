import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const serialNumber = req.nextUrl.searchParams.get("serialNumber");
  if (!serialNumber) {
    return NextResponse.json({ error: "serialNumber query param is required." }, { status: 400 });
  }

  const motor = await prisma.motor.findUnique({
    where: {
      organizationId_serialNumber: {
        organizationId: auth.session.organizationId,
        serialNumber,
      },
    },
  });

  // Not an error — "not found" just means this is a new motor and the
  // intake form should ask for nameplate data instead of auto-filling.
  return NextResponse.json({ motor });
}
