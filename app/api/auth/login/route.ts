import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Employee ID and password are required." }, { status: 400 });
  }

  const { employeeId, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { employeeId } });
  // Same generic error whether the ID doesn't exist or the password is
  // wrong — don't leak which one it was.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid employee ID or password." }, { status: 401 });
  }

  await createSession({
    userId: user.id,
    employeeId: user.employeeId,
    organizationId: user.organizationId,
    role: user.role,
    name: user.name,
  });

  return NextResponse.json({ ok: true, role: user.role, name: user.name });
}
