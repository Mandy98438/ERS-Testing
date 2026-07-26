"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPipeline } from "@/lib/pipelines/config";
import ThemeToggle from "@/components/ThemeToggle";

interface Motor {
  id: string;
  serialNumber: string;
  manufacturer: string | null;
  motorType: string;
  ratedVoltageV: number;
  ratedCurrentA: number;
  ratedPowerKW: number;
  ratedSpeedRpm: number;
  location: string | null;
}

interface TestRecord {
  id: string;
  testId: string;
  stage: string;
  status: string;
  signedOff: boolean;
  performedBy: { name: string; employeeId: string } | null;
  reviewedBy: { name: string; employeeId: string } | null;
}

interface Job {
  id: string;
  jobNumber: string;
  reasonForEntry: string;
  status: string;
  currentStage: string;
  faultsFound: string | null;
  repairsPerformed: string | null;
  closedAt: string | null;
  createdAt: string;
  leadEngineerId: string | null;
  leadEngineer: { id: string; name: string; employeeId: string } | null;
  accessCode: string;
  motor: Motor;
  testRecords: TestRecord[];
}

interface UserSession {
  userId: string;
  name: string;
  role: "TECHNICIAN" | "ENGINEER" | "ADMIN";
  employeeId: string;
}

interface StaffUser {
  id: string;
  name: string;
  employeeId: string;
  role: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const { id: jobId } = useParams<{ id: string }>();

  const [session, setSession] = useState<UserSession | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Closeout input fields
  const [faultsFound, setFaultsFound] = useState("");
  const [repairsPerformed, setRepairsPerformed] = useState("");
  const [updatingCloseout, setUpdatingCloseout] = useState(false);
  const [closeoutError, setCloseoutError] = useState<string | null>(null);

  // Lead engineer state
  const [updatingEngineer, setUpdatingEngineer] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const meData = await meRes.json();
        setSession(meData.session);

        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) {
          throw new Error("Job not found.");
        }
        const jobData = await jobRes.json();
        setJob(jobData);
        setFaultsFound(jobData.faultsFound ?? "");
        setRepairsPerformed(jobData.repairsPerformed ?? "");

        const usersRes = await fetch("/api/users");
        const usersData = await usersRes.json();
        setUsers(usersData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Update Lead Engineer
  async function handleEngineerChange(engineerId: string) {
    setUpdatingEngineer(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadEngineerId: engineerId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob((prev) => (prev ? { ...prev, leadEngineer: updated.leadEngineer, leadEngineerId: updated.leadEngineerId } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingEngineer(false);
    }
  }

  // Handle Closeout clearance
  async function handleCloseoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    setUpdatingCloseout(true);
    setCloseoutError(null);

    const isEngineerOrAdmin = session?.role === "ENGINEER" || session?.role === "ADMIN";
    if (!isEngineerOrAdmin) {
      setCloseoutError("Access Denied: Only Engineers or Admins can sign off and clear a job.");
      setUpdatingCloseout(false);
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faultsFound,
          repairsPerformed,
          closed: true, // triggers setting closedAt on backend
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCloseoutError(data.error ?? "Failed to close out job.");
      } else {
        const updated = await res.json();
        setJob(updated);
      }
    } catch (err) {
      setCloseoutError("Network error occurred.");
    } finally {
      setUpdatingCloseout(false);
    }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading Job Details...</div>;
  if (error || !job) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>{error}</div>;

  // Retrieve correct pipeline configuration
  const pipeline = getPipeline(job.motor.motorType);
  if (!pipeline) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>Pipeline configuration not found.</div>;
  }

  const allTests = pipeline.tests;

  // Group tests by stage to calculate progress metrics
  const testsByStage = {
    PRE: allTests.filter((t) => t.stage === "PRE"),
    INTERMEDIATE: allTests.filter((t) => t.stage === "INTERMEDIATE"),
    FINAL: allTests.filter((t) => t.stage === "FINAL"),
  };

  const getStageStats = (stage: "PRE" | "INTERMEDIATE" | "FINAL") => {
    const stageDefs = testsByStage[stage];
    const total = stageDefs.length;
    let passed = 0;
    let completed = 0;

    stageDefs.forEach((tDef) => {
      const rec = job.testRecords.find((r) => r.testId === tDef.id);
      if (rec) {
        completed++;
        if (rec.status === "PASS") passed++;
      }
    });

    return { total, completed, passed, isComplete: passed === total };
  };

  const preStats = getStageStats("PRE");
  const interStats = getStageStats("INTERMEDIATE");
  const finalStats = getStageStats("FINAL");

  // Determine stage lock state based on gate rules:
  // PRE: always unlocked
  // INTERMEDIATE: unlocked if PRE is complete & all passed
  // FINAL: unlocked if PRE and INTERMEDIATE are complete & all passed
  const isInterLocked = !preStats.isComplete;
  const isFinalLocked = isInterLocked || !interStats.isComplete;

  const totalPassed = preStats.passed + interStats.passed + finalStats.passed;
  const totalTests = allTests.length;
  const allTestsPassed = totalPassed === totalTests;

  return (
    <div className="shell-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
              ERS PIPELINE
            </h2>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Continuous Qualification</p>
          </div>
          <nav className="sidebar-nav">
            <Link href="/dashboard" className="sidebar-link">
              Dashboard
            </Link>
            <Link href="/jobs/new" className="sidebar-link">
              Intake New Job
            </Link>
            <Link href="/references" className="sidebar-link">
              Reference Library
            </Link>
          </nav>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{session?.name}</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>
            {session?.role} ({session?.employeeId})
          </p>
          <button onClick={handleLogout} className="btn" style={{ width: "100%", fontSize: 12, padding: "6px" }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header
          style={{
            marginBottom: 32,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.8px" }}>
                {job.jobNumber}
              </span>
              <span className={`badge ${
                job.status === "CLEARED" || job.status === "DESPATCHED"
                  ? "badge-pass"
                  : job.status === "ON_HOLD_FAILED_TEST"
                  ? "badge-fail"
                  : "badge-pending"
              }`}>
                {job.status.replace(/_/g, " ")}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>
              Motor Serial: <strong className="mono">{job.motor.serialNumber}</strong> ({job.motor.motorType.replace(/_/g, " ")})
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "4px 8px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                fontSize: 12,
                borderRadius: 4,
              }}
            >
              Client Access Code: <strong className="mono">{job.accessCode}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <ThemeToggle />
            <Link href={`/jobs/${jobId}/report`} target="_blank" className="btn btn-primary">
              Printable Qualification Report
            </Link>
          </div>
        </header>

        {/* Stepper progress */}
        <section className="stepper">
          <div className={`step completed`}>
            <div>
              <div className="step-title">Stage 1: Pre-Test</div>
              <div className="step-status">De-energised — {preStats.passed}/{preStats.total} Passed</div>
            </div>
            <span>✓</span>
          </div>

          <div className={`step ${!isInterLocked ? "completed" : "locked"} ${job.currentStage === "INTERMEDIATE" ? "active" : ""}`}>
            <div>
              <div className="step-title">
                {isInterLocked ? "🔒 Stage 2: Intermediate" : "Stage 2: Intermediate"}
              </div>
              <div className="step-status">No-Load — {interStats.passed}/{interStats.total} Passed</div>
            </div>
            {isInterLocked ? <span>🔒</span> : interStats.isComplete ? <span>✓</span> : null}
          </div>

          <div className={`step ${!isFinalLocked ? "completed" : "locked"} ${job.currentStage === "FINAL" ? "active" : ""}`}>
            <div>
              <div className="step-title">
                {isFinalLocked ? "🔒 Stage 3: Final" : "Stage 3: Final"}
              </div>
              <div className="step-status">Full-Load & Close — {finalStats.passed}/{finalStats.total} Passed</div>
            </div>
            {isFinalLocked ? <span>🔒</span> : finalStats.isComplete ? <span>✓</span> : null}
          </div>
        </section>

        {/* Metadata Details / Lead Engineer */}
        <section className="grid-3" style={{ marginBottom: 40 }}>
          <div className="card">
            <h3>Nameplate Quick Look</h3>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
              <p><span style={{ color: "var(--text-secondary)" }}>Manufacturer:</span> {job.motor.manufacturer ?? "Unknown"}</p>
              <p><span style={{ color: "var(--text-secondary)" }}>Ratings:</span> {job.motor.ratedPowerKW} kW / {job.motor.ratedVoltageV} V</p>
              <p><span style={{ color: "var(--text-secondary)" }}>Speed:</span> {job.motor.ratedSpeedRpm} rpm</p>
              <p><span style={{ color: "var(--text-secondary)" }}>Location:</span> {job.motor.location ?? "Not specified"}</p>
            </div>
          </div>

          <div className="card">
            <h3>Job Administration</h3>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
              <p><span style={{ color: "var(--text-secondary)" }}>Reason:</span> {job.reasonForEntry}</p>
              <p><span style={{ color: "var(--text-secondary)" }}>Intake Date:</span> {new Date(job.createdAt).toLocaleDateString()}</p>
              {job.closedAt && (
                <p>
                  <span style={{ color: "var(--text-secondary)" }}>Closed Date:</span>{" "}
                  <strong style={{ color: "var(--pass-text)" }}>{new Date(job.closedAt).toLocaleDateString()}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Lead Engineer</h3>
            <div style={{ marginTop: 12 }}>
              <select
                value={job.leadEngineerId ?? ""}
                onChange={(e) => handleEngineerChange(e.target.value)}
                disabled={updatingEngineer || job.closedAt !== null}
                className="select"
              >
                <option value="">-- Assign Lead Engineer --</option>
                {users
                  .filter((u) => u.role === "ENGINEER" || u.role === "ADMIN")
                  .map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.employeeId})
                    </option>
                  ))}
              </select>
              <p className="subtitle" style={{ fontSize: 11, marginTop: 6, margin: 0 }}>
                Only Engineers or Admins can sign off the final clearance report.
              </p>
            </div>
          </div>
        </section>

        {/* Test Stages Lists */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ marginBottom: 24 }}>Qualification Winding & Running Tests</h2>

          {/* STAGE 1: PRE-TEST */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, padding: "8px 0", borderBottom: "2px solid var(--border-color-dark)", display: "flex", justifyContent: "space-between" }}>
              <span>Stage 1: Pre-Test Winding Verification (De-energised)</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {preStats.passed}/{preStats.total} Passed
              </span>
            </h3>
            <div className="table-container" style={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <table className="table">
                <tbody>
                  {testsByStage.PRE.map((test) => {
                    const record = job.testRecords.find((r) => r.testId === test.id);
                    return renderTestRow(test, record, false, job.closedAt !== null);
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* STAGE 2: INTERMEDIATE */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, padding: "8px 0", borderBottom: "2px solid var(--border-color-dark)", display: "flex", justifyContent: "space-between", opacity: isInterLocked ? 0.5 : 1 }}>
              <span>Stage 2: Intermediate Dynamic Verification (No-Load) {isInterLocked && "🔒 (Gated)"}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {interStats.passed}/{interStats.total} Passed
              </span>
            </h3>
            <div className="table-container" style={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0, opacity: isInterLocked ? 0.5 : 1 }}>
              <table className="table">
                <tbody>
                  {testsByStage.INTERMEDIATE.map((test) => {
                    const record = job.testRecords.find((r) => r.testId === test.id);
                    return renderTestRow(test, record, isInterLocked, job.closedAt !== null);
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* STAGE 3: FINAL */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, padding: "8px 0", borderBottom: "2px solid var(--border-color-dark)", display: "flex", justifyContent: "space-between", opacity: isFinalLocked ? 0.5 : 1 }}>
              <span>Stage 3: Final Rated Load Verification & Clearance {isFinalLocked && "🔒 (Gated)"}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {finalStats.passed}/{finalStats.total} Passed
              </span>
            </h3>
            <div className="table-container" style={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0, opacity: isFinalLocked ? 0.5 : 1 }}>
              <table className="table">
                <tbody>
                  {testsByStage.FINAL.map((test) => {
                    const record = job.testRecords.find((r) => r.testId === test.id);
                    return renderTestRow(test, record, isFinalLocked, job.closedAt !== null);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Closeout / Clearance Form */}
        {allTestsPassed && (
          <section className="card" style={{ marginTop: 40, border: "1px solid var(--pass-border)", backgroundColor: "#fcfdfd" }}>
            <h2 style={{ fontSize: 18, color: "var(--pass-text)", marginBottom: 12 }}>
              Job Completion & Clearance Certification
            </h2>
            <p className="subtitle" style={{ marginBottom: 20 }}>
              All {totalTests} pipeline tests have been successfully qualified and marked as PASS. Log final findings to clear the motor.
            </p>

            <form onSubmit={handleCloseoutSubmit}>
              <div className="form-group">
                <label>Found Faults / Incoming Defect Summary (Plain language)</label>
                <textarea
                  value={faultsFound}
                  onChange={(e) => setFaultsFound(e.target.value)}
                  className="textarea"
                  rows={3}
                  placeholder="e.g. Grounded armature coils, high wear on commutator segment 12."
                  disabled={job.closedAt !== null}
                  required
                />
              </div>

              <div className="form-group">
                <label>Repairs Performed / Rectification Details</label>
                <textarea
                  value={repairsPerformed}
                  onChange={(e) => setRepairsPerformed(e.target.value)}
                  className="textarea"
                  rows={3}
                  placeholder="e.g. Rewound armature coils with Class F insulation, turned down commutator on lathe, fit new brushes."
                  disabled={job.closedAt !== null}
                  required
                />
              </div>

              {closeoutError && (
                <p style={{ color: "red", fontSize: 13, marginBottom: 16 }}>{closeoutError}</p>
              )}

              {job.closedAt === null ? (
                <button
                  type="submit"
                  disabled={updatingCloseout || !job.leadEngineerId}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: 13 }}
                >
                  {updatingCloseout ? "Submitting Sign-off..." : "Sign off & Clear Motor for Despatch"}
                </button>
              ) : (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "var(--pass-bg)",
                    border: "1px solid var(--pass-border)",
                    color: "var(--pass-text)",
                    fontWeight: 600,
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  ✓ Job Closed & Certified on {new Date(job.closedAt).toLocaleString()} by Lead Engineer: {job.leadEngineer?.name}
                </div>
              )}

              {!job.leadEngineerId && job.closedAt === null && (
                <p style={{ color: "red", fontSize: 11, marginTop: 8 }}>
                  * Please assign a Lead Engineer to clear this job.
                </p>
              )}
            </form>
          </section>
        )}
      </main>
    </div>
  );

  function renderTestRow(test: any, record: TestRecord | undefined, isLocked: boolean, isJobClosed: boolean) {
    let statusLabel = "PENDING";
    let badgeClass = "badge-pending";

    if (record) {
      statusLabel = record.status;
      badgeClass = record.status === "PASS" ? "badge-pass" : "badge-fail";
    }

    const editUrl = `/jobs/${jobId}/test/${test.id}`;

    return (
      <tr key={test.id} style={{ opacity: isLocked ? 0.5 : 1 }}>
        <td style={{ width: "30%", fontWeight: 600 }}>
          {isLocked ? (
            <span style={{ color: "var(--text-tertiary)" }}>{test.title}</span>
          ) : isJobClosed ? (
            <span>{test.title}</span>
          ) : (
            <Link href={editUrl} style={{ color: "var(--text-primary)", textDecoration: "underline" }}>
              {test.title}
            </Link>
          )}
        </td>
        <td style={{ width: "40%", color: "var(--text-secondary)", fontSize: 12 }}>
          {test.purpose}
        </td>
        <td style={{ width: "15%" }}>
          <span className={`badge ${badgeClass}`}>{statusLabel}</span>
        </td>
        <td style={{ width: "15%", fontSize: 11, color: "var(--text-secondary)" }}>
          {record?.performedBy ? (
            <div>
              By: {record.performedBy.name}
              {record.signedOff && <span style={{ color: "var(--pass-text)", fontWeight: 600, display: "block" }}>✓ Signed Off</span>}
            </div>
          ) : (
            "—"
          )}
        </td>
      </tr>
    );
  }
}
