import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";
import { generateAccessCode } from "@/lib/auth/accessCode";

const nameplateSchema = z.object({
  serialNumber: z.string().min(1),
  manufacturer: z.string().optional(),
  motorType: z.enum(["DC_SHUNT", "DC_SERIES", "DC_COMPOUND", "AC_SQIM", "AC_SRIM"]),
  ratedVoltageV: z.number().positive(),
  ratedCurrentA: z.number().positive(),
  ratedPowerKW: z.number().positive(),
  ratedSpeedRpm: z.number().positive(),
  poles: z.number().int().positive().optional(),
  frequencyHz: z.number().positive().optional(),
  connection: z.string().optional(),
  insulationClass: z.string().optional(),
  location: z.string().optional(),
});

const bodySchema = z.object({
  jobNumber: z.string().min(1),
  reasonForEntry: z.string().min(1),
  // Either reference an existing motor by id (fast path — nameplate
  // already on file, everything auto-fills)...
  motorId: z.string().optional(),
  // ...or hand over freshly read nameplate data for a motor the shop has
  // never seen before. Exactly one of these two must be provided.
  nameplate: nameplateSchema.optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job data.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { jobNumber, reasonForEntry, motorId, nameplate } = parsed.data;

  if (!motorId && !nameplate) {
    return NextResponse.json(
      { error: "Provide either an existing motorId or nameplate data for a new motor." },
      { status: 400 }
    );
  }

  const organizationId = auth.session.organizationId;

  let resolvedMotorId = motorId;

  if (!resolvedMotorId && nameplate) {
    // First-ever visit for this physical motor: check if the serial
    // number is already on file (e.g. someone re-typed it) before
    // creating a duplicate Motor record.
    const existing = await prisma.motor.findUnique({
      where: { organizationId_serialNumber: { organizationId, serialNumber: nameplate.serialNumber } },
    });

    const motor =
      existing ??
      (await prisma.motor.create({
        data: { organizationId, ...nameplate },
      }));

    resolvedMotorId = motor.id;
  }

  const job = await prisma.job.create({
    data: {
      jobNumber,
      organizationId,
      motorId: resolvedMotorId!,
      reasonForEntry,
      accessCode: generateAccessCode(),
    },
    include: { motor: true },
  });

  return NextResponse.json(job, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const jobs = await prisma.job.findMany({
    where: { organizationId: auth.session.organizationId },
    orderBy: { createdAt: "desc" },
    include: { motor: true },
  });

  return NextResponse.json(jobs);
}
