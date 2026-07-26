import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  jobNumber: z.string().min(1),
  accessCode: z.string().min(1),
});

// Deliberately thin: a client should be able to check "where is my motor
// in the process" without ever seeing raw test readings, internal notes,
// or who's working on it. That's employee-only, behind the real login.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Project ID and access code are required." }, { status: 400 });
  }

  const { jobNumber, accessCode } = parsed.data;

  const job = await prisma.job.findUnique({
    where: { jobNumber },
    select: {
      jobNumber: true,
      accessCode: true,
      status: true,
      currentStage: true,
      reasonForEntry: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      motor: {
        select: { motorType: true, ratedPowerKW: true, ratedVoltageV: true, location: true },
      },
      testRecords: {
        select: { stage: true, status: true },
      },
    },
  });

  // Same generic error whether the job doesn't exist or the code is wrong.
  if (!job || job.accessCode !== accessCode) {
    return NextResponse.json({ error: "No matching project found for that ID and access code." }, { status: 404 });
  }

  const testsTotal = job.testRecords.length;
  const testsPassed = job.testRecords.filter((t: { status: string }) => t.status === "PASS").length;

  return NextResponse.json({
    jobNumber: job.jobNumber,
    status: job.status,
    currentStage: job.currentStage,
    reasonForEntry: job.reasonForEntry,
    motorType: job.motor.motorType,
    ratedPowerKW: job.motor.ratedPowerKW,
    ratedVoltageV: job.motor.ratedVoltageV,
    location: job.motor.location,
    progress: { testsPassed, testsTotal },
    createdAt: job.createdAt,
    lastUpdated: job.updatedAt,
    closedAt: job.closedAt,
  });
}
