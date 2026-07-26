import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";
import { getPipeline } from "@/lib/pipelines/config";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; testId: string } }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id: jobId, testId } = params;

  // 1. Get the Job to know its motorType
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: auth.session.organizationId },
    include: { motor: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // 2. Find the test definition in the pipeline config
  const pipeline = getPipeline(job.motor.motorType);
  const testDef = pipeline?.tests.find((t) => t.id === testId);

  if (!testDef) {
    return NextResponse.json({ error: "Test definition not found." }, { status: 404 });
  }

  // 3. Get the existing TestRecord (if any)
  const testRecord = await prisma.testRecord.findUnique({
    where: { jobId_testId: { jobId, testId } },
    include: {
      equipment: true,
      performedBy: { select: { id: true, name: true, employeeId: true } },
      reviewedBy: { select: { id: true, name: true, employeeId: true } },
    },
  });

  // 4. Get the TestReference from the database
  const testReference = await prisma.testReference.findUnique({
    where: { id: testId },
  });

  return NextResponse.json({
    testDef,
    testRecord,
    testReference,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; testId: string } }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id: jobId, testId } = params;
  const body = await req.json();
  const { values, notes, equipmentId } = body;

  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "Invalid values object." }, { status: 400 });
  }

  // 1. Fetch the Job and all its existing test records to evaluate gating
  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: auth.session.organizationId },
    include: {
      motor: true,
      testRecords: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // 2. Find the pipeline config and the target test definition
  const pipeline = getPipeline(job.motor.motorType);
  if (!pipeline) {
    return NextResponse.json({ error: "Pipeline config not found for motor type." }, { status: 404 });
  }

  const testDef = pipeline.tests.find((t) => t.id === testId);
  if (!testDef) {
    return NextResponse.json({ error: "Test definition not found." }, { status: 404 });
  }

  // 3. ENFORCE GATING LOGIC:
  // Identify if any tests in previous stages are incomplete or failed.
  // Stage order: PRE -> INTERMEDIATE -> FINAL
  const stagePriority = { PRE: 1, INTERMEDIATE: 2, FINAL: 3 };
  const targetStagePriority = stagePriority[testDef.stage];

  if (targetStagePriority > 1) {
    // Collect all tests in previous stages
    const prevStageTests = pipeline.tests.filter(
      (t) => stagePriority[t.stage] < targetStagePriority
    );

    // Check if any of these previous tests is not PASS
    for (const tDef of prevStageTests) {
      const record = job.testRecords.find((r) => r.testId === tDef.id);
      if (!record || record.status !== "PASS") {
        return NextResponse.json(
          {
            error: `Stage Gate Locked: Cannot record or edit tests in the ${testDef.stage} stage because test "${tDef.title}" in the previous stage is not passed.`,
          },
          { status: 403 }
        );
      }
    }
  }

  // 4. Equipment calibration verification
  if (equipmentId) {
    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, organizationId: auth.session.organizationId },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found." }, { status: 404 });
    }
    const today = new Date();
    if (new Date(equipment.calibrationDueOn) < today) {
      return NextResponse.json(
        {
          error: `Calibration Expired: The selected instrument "${equipment.name}" (S/N: ${equipment.serialNumber}) was due for calibration on ${new Date(equipment.calibrationDueOn).toLocaleDateString()}. Please select a calibrated instrument.`,
        },
        { status: 400 }
      );
    }
  }

  // 5. Run auto-computations and auto-evaluation
  const computed = testDef.compute ? testDef.compute(values) : {};
  const passed = testDef.evaluate ? testDef.evaluate(values, computed) : true;
  const initialStatus = passed ? "PASS" : "FAIL";

  // 6. Save or update the TestRecord
  const record = await prisma.testRecord.upsert({
    where: { jobId_testId: { jobId, testId } },
    update: {
      values,
      computed,
      notes: notes ?? null,
      equipmentId: equipmentId ?? null,
      status: initialStatus,
      performedById: auth.session.userId,
      signedOff: false, // Reset signoff on edit
      reviewedById: null, // Reset review on edit
    },
    create: {
      jobId,
      testId,
      stage: testDef.stage,
      values,
      computed,
      notes: notes ?? null,
      equipmentId: equipmentId ?? null,
      status: initialStatus,
      performedById: auth.session.userId,
    },
  });

  // 7. If the test is a FAIL, put the job ON_HOLD_FAILED_TEST.
  if (initialStatus === "FAIL") {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "ON_HOLD_FAILED_TEST" },
    });
  } else {
    // If it passed, and the job was on hold, let's see if all tests are now passing
    // to put it back IN_PROGRESS.
    const updatedJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: { testRecords: true },
    });
    const hasFailures = updatedJob?.testRecords.some((r) => r.status === "FAIL");
    if (!hasFailures && job.status === "ON_HOLD_FAILED_TEST") {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "IN_PROGRESS" },
      });
    }
  }

  return NextResponse.json({ record, passed });
}
