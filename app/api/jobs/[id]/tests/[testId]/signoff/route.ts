import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; testId: string } }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Verify Role: Only ENGINEER and ADMIN can sign off/override
  const userRole = auth.session.role;
  if (userRole !== "ENGINEER" && userRole !== "ADMIN") {
    return NextResponse.json(
      { error: "Access Denied: Only Engineers or Admins can sign off or override test records." },
      { status: 403 }
    );
  }

  const { id: jobId, testId } = params;
  const body = await req.json();
  const { status, notes } = body; // status is optionally overridden

  // 1. Verify that the test record exists
  const existingRecord = await prisma.testRecord.findUnique({
    where: { jobId_testId: { jobId, testId } },
  });

  if (!existingRecord) {
    return NextResponse.json({ error: "Test record does not exist yet. Record data first." }, { status: 400 });
  }

  const updateData: any = {
    signedOff: true,
    reviewedById: auth.session.userId,
  };

  if (status && (status === "PASS" || status === "FAIL")) {
    updateData.status = status;
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const updatedRecord = await prisma.testRecord.update({
    where: { jobId_testId: { jobId, testId } },
    data: updateData,
  });

  // 2. Adjust job status based on the new status
  if (updatedRecord.status === "FAIL") {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "ON_HOLD_FAILED_TEST" },
    });
  } else {
    // If it is now PASS, let's see if there are any remaining failed tests on this job
    const jobWithTests = await prisma.job.findUnique({
      where: { id: jobId },
      include: { testRecords: true },
    });

    const hasFailures = jobWithTests?.testRecords.some((r) => r.status === "FAIL");
    if (!hasFailures && jobWithTests?.status === "ON_HOLD_FAILED_TEST") {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "IN_PROGRESS" },
      });
    }
  }

  return NextResponse.json(updatedRecord);
}
