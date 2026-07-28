import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Guest-safe route: returns demo job data for the sample report
// No authentication required - this is for public preview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobNumber = searchParams.get("job");
  const demoAccessCode = "DEMO2026";

  // If no job specified, return list of available demo jobs
  if (!jobNumber) {
    const demoJobs = await prisma.job.findMany({
      where: {
        jobNumber: { in: ["PRJ-2026-001", "PRJ-2026-002"] },
        accessCode: demoAccessCode,
      },
      include: {
        motor: true,
      },
    });

    // Return only the fields we need
    const simplifiedJobs = demoJobs.map((job) => ({
      jobNumber: job.jobNumber,
      status: job.status,
      currentStage: job.currentStage,
      reasonForEntry: job.reasonForEntry,
      motor: {
        serialNumber: job.motor.serialNumber,
        manufacturer: job.motor.manufacturer,
        motorType: job.motor.motorType,
        ratedPowerKW: job.motor.ratedPowerKW,
      },
    }));

    return NextResponse.json(simplifiedJobs);
  }

  // Return specific job data
  const job = await prisma.job.findUnique({
    where: { jobNumber },
    include: {
      motor: true,
      leadEngineer: { select: { id: true, name: true, employeeId: true } },
      testRecords: {
        include: {
          performedBy: { select: { name: true, employeeId: true } },
          reviewedBy: { select: { name: true, employeeId: true } },
          equipment: true,
        },
      },
    },
  });

  if (!job || job.accessCode !== demoAccessCode) {
    return NextResponse.json({ error: "Demo job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
