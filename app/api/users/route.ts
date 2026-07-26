import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";
import { hashPassword } from "@/lib/auth/password";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { organizationId: auth.session.organizationId },
    select: {
      id: true,
      employeeId: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Admin-only check
  if (auth.session.role !== "ADMIN") {
    return NextResponse.json({ error: "Access Denied: Admin role required." }, { status: 403 });
  }

  const body = await req.json();
  const { employeeId, password, name, role } = body;

  if (!employeeId || !password || !name || !role) {
    return NextResponse.json({ error: "Missing employeeId, password, name, or role." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { employeeId },
  });

  if (existing) {
    return NextResponse.json({ error: "User with this Employee ID already exists." }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        employeeId,
        passwordHash,
        name,
        role,
        organizationId: auth.session.organizationId,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create user.", details: err.message }, { status: 500 });
  }
}
