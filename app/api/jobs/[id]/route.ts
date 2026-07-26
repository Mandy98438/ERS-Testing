import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const job = await prisma.job.findFirst({
    where: {
      id: params.id,
      organizationId: auth.session.organizationId,
    },
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

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { status, currentStage, faultsFound, repairsPerformed, leadEngineerId, closed } = body;

  // Let's verify job exists and belongs to organization
  const existingJob = await prisma.job.findFirst({
    where: {
      id: params.id,
      organizationId: auth.session.organizationId,
    },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (currentStage !== undefined) updateData.currentStage = currentStage;
  if (faultsFound !== undefined) updateData.faultsFound = faultsFound;
  if (repairsPerformed !== undefined) updateData.repairsPerformed = repairsPerformed;
  if (leadEngineerId !== undefined) updateData.leadEngineerId = leadEngineerId || null;

  if (closed === true) {
    updateData.closedAt = new Date();
    // Mark status as CLEARED or DESPATCHED if not already set to closed-like status
    if (existingJob.status === "IN_PROGRESS" || existingJob.status === "ON_HOLD_FAILED_TEST") {
      updateData.status = "CLEARED";
    }
  } else if (closed === false) {
    updateData.closedAt = null;
  }

  const updatedJob = await prisma.job.update({
    where: { id: params.id },
    data: updateData,
    include: {
      motor: true,
      leadEngineer: { select: { id: true, name: true, employeeId: true } },
    },
  });

  return NextResponse.json(updatedJob);
}
