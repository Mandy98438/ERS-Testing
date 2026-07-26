import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const equipment = await prisma.equipment.findMany({
    where: { organizationId: auth.session.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(equipment);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Admin-only check
  if (auth.session.role !== "ADMIN") {
    return NextResponse.json({ error: "Access Denied: Admin role required." }, { status: 403 });
  }

  const body = await req.json();
  const { name, serialNumber, calibrationDueOn } = body;

  if (!name || !serialNumber || !calibrationDueOn) {
    return NextResponse.json({ error: "Missing name, serialNumber, or calibrationDueOn." }, { status: 400 });
  }

  try {
    const created = await prisma.equipment.create({
      data: {
        name,
        serialNumber,
        calibrationDueOn: new Date(calibrationDueOn),
        organizationId: auth.session.organizationId,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create equipment.", details: err.message }, { status: 500 });
  }
}
