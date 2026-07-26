import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

// This is the "history" view: everything ever recorded against this
// motor's nameplate, across every visit it's ever had — past faults,
// repairs performed, which engineer was behind each one, and a
// pass/fail tally per visit. Nothing here is org-crossed: a motor
// only shows history for the org it belongs to.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const motor = await prisma.motor.findFirst({
    where: { id: params.id, organizationId: auth.session.organizationId },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        include: {
          leadEngineer: { select: { name: true, employeeId: true } },
          testRecords: {
            select: {
              testId: true,
              stage: true,
              status: true,
              performedBy: { select: { name: true, employeeId: true } },
              reviewedBy: { select: { name: true, employeeId: true } },
              signedOff: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!motor) {
    return NextResponse.json({ error: "Motor not found." }, { status: 404 });
  }

  type JobWithTests = (typeof motor.jobs)[number];
  type TestOfJob = JobWithTests["testRecords"][number];

  const history = motor.jobs.map((job: JobWithTests) => ({
    jobNumber: job.jobNumber,
    reasonForEntry: job.reasonForEntry,
    status: job.status,
    currentStage: job.currentStage,
    faultsFound: job.faultsFound,
    repairsPerformed: job.repairsPerformed,
    leadEngineer: job.leadEngineer,
    createdAt: job.createdAt,
    closedAt: job.closedAt,
    tests: job.testRecords.map((t: TestOfJob) => ({
      testId: t.testId,
      stage: t.stage,
      status: t.status,
      performedBy: t.performedBy,
      reviewedBy: t.reviewedBy,
      signedOff: t.signedOff,
      at: t.createdAt,
    })),
  }));

  return NextResponse.json({
    motor: {
      id: motor.id,
      serialNumber: motor.serialNumber,
      manufacturer: motor.manufacturer,
      motorType: motor.motorType,
      ratedVoltageV: motor.ratedVoltageV,
      ratedCurrentA: motor.ratedCurrentA,
      ratedPowerKW: motor.ratedPowerKW,
      ratedSpeedRpm: motor.ratedSpeedRpm,
      location: motor.location,
      firstSeen: motor.createdAt,
    },
    visitCount: history.length,
    history,
  });
}
