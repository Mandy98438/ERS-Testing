"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPipeline } from "@/lib/pipelines/config";

interface Motor {
  serialNumber: string;
  manufacturer: string | null;
  motorType: string;
  ratedVoltageV: number;
  ratedCurrentA: number;
  ratedPowerKW: number;
  ratedSpeedRpm: number;
  poles: number | null;
  frequencyHz: number | null;
  connection: string | null;
  insulationClass: string | null;
  location: string | null;
}

interface TestRecord {
  id: string;
  testId: string;
  stage: string;
  status: string;
  values: any;
  computed: any;
  notes: string | null;
  signedOff: boolean;
  performedBy: { name: string; employeeId: string } | null;
  reviewedBy: { name: string; employeeId: string } | null;
  equipment: { name: string; serialNumber: string } | null;
  createdAt: string;
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
  leadEngineer: { name: string; employeeId: string } | null;
  motor: Motor;
  testRecords: TestRecord[];
}

export default function ReportPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) {
          throw new Error("Job not found.");
        }
        const jobData = await jobRes.json();
        setJob(jobData);
      } catch (err: any) {
        setError(err.message ?? "Failed to load report data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId]);

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Generating report preview...</div>;
  if (error || !job) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>{error}</div>;

  const pipeline = getPipeline(job.motor.motorType);
  if (!pipeline) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>Pipeline config not found.</div>;
  }

  // Format keys for reporting
  function formatKey(key: string) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: "20px 40px", fontFamily: "sans-serif", color: "#000" }}>
      {/* Action buttons (hidden on print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 30, borderBottom: "1px solid #eaeaea", paddingBottom: 15 }}>
        <button onClick={() => router.push(`/jobs/${jobId}`)} className="btn">
          ← Back to Job Details
        </button>
        <button onClick={handlePrint} className="btn btn-primary" style={{ padding: "8px 20px" }}>
          Print / Save to PDF
        </button>
      </div>

      {/* Report Header */}
      <header style={{ borderBottom: "3px double #000", paddingBottom: 15, marginBottom: 30, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 5px 0", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Electrical Repair Shop (ERS)
        </h1>
        <h2 style={{ fontSize: 16, margin: "0 0 10px 0", color: "#444", fontWeight: 500, textTransform: "uppercase" }}>
          Motor Qualification & Integrity Test Report
        </h2>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 15 }}>
          <span>Report Generated: {new Date().toLocaleString()}</span>
          <span>Job ID: <strong className="mono">{job.jobNumber}</strong></span>
        </div>
      </header>

      {/* Section 1: Motor & Job specifications */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ borderBottom: "1px solid #333", fontSize: 13, textTransform: "uppercase", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>
          1. Nameplate & General Specifications
        </h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }} border={0}>
          <tbody>
            <tr>
              <td style={{ width: "25%", padding: "4px 0", color: "#666" }}>Serial Number:</td>
              <td style={{ width: "25%", padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.serialNumber}</td>
              <td style={{ width: "25%", padding: "4px 0", color: "#666" }}>Motor Type:</td>
              <td style={{ width: "25%", padding: "4px 0", fontWeight: 600 }}>{job.motor.motorType.replace(/_/g, " ")}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#666" }}>Manufacturer:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.motor.manufacturer ?? "Unknown"}</td>
              <td style={{ padding: "4px 0", color: "#666" }}>Operating Location:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.motor.location ?? "N/A"}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#666" }}>Rated Power:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedPowerKW} kW</td>
              <td style={{ padding: "4px 0", color: "#666" }}>Rated Speed:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedSpeedRpm} rpm</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#666" }}>Rated Voltage:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedVoltageV} V</td>
              <td style={{ padding: "4px 0", color: "#666" }}>Rated Current:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedCurrentA} A</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "#666" }}>Poles count:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.poles ?? "N/A"}</td>
              <td style={{ padding: "4px 0", color: "#666" }}>Insulation Class:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.insulationClass ?? "N/A"}</td>
            </tr>
            {(job.motor.motorType === "AC_SQIM" || job.motor.motorType === "AC_SRIM") && (
              <tr>
                <td style={{ padding: "4px 0", color: "#666" }}>Frequency:</td>
                <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.frequencyHz ?? "50"} Hz</td>
                <td style={{ padding: "4px 0", color: "#666" }}>Connection:</td>
                <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.motor.connection ?? "Star"}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "4px 0", color: "#666" }}>Reason for Entry:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.reasonForEntry}</td>
              <td style={{ padding: "4px 0", color: "#666" }}>Qualification Status:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.status.replace(/_/g, " ")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Section 2: Closeout summary */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ borderBottom: "1px solid #333", fontSize: 13, textTransform: "uppercase", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>
          2. Fault Diagnostics & Repair Clearance
        </h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ width: "30%", padding: 10, background: "#f9f9f9", fontWeight: 600 }}>Found Faults / incoming defects:</td>
              <td style={{ padding: 10 }}>{job.faultsFound ?? "None logged"}</td>
            </tr>
            <tr>
              <td style={{ padding: 10, background: "#f9f9f9", fontWeight: 600 }}>Repairs & Rectification performed:</td>
              <td style={{ padding: 10 }}>{job.repairsPerformed ?? "None logged"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Section 3: Test Logs */}
      <section style={{ marginBottom: 30 }}>
        <h3 style={{ borderBottom: "1px solid #333", fontSize: 13, textTransform: "uppercase", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>
          3. Pipeline Qualification Winding & Running Tests
        </h3>

        {["PRE", "INTERMEDIATE", "FINAL"].map((stage) => {
          const stageTests = pipeline.tests.filter((t) => t.stage === stage);
          if (stageTests.length === 0) return null;

          return (
            <div key={stage} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, padding: "3px 8px", background: "#eaeaea", border: "1px solid #ccc", marginBottom: 8, fontWeight: 700 }}>
                {stage === "PRE" ? "STAGE 1: PRE-TESTS (DE-ENERGISED)" : stage === "INTERMEDIATE" ? "STAGE 2: INTERMEDIATE DYNAMIC TESTS (NO-LOAD)" : "STAGE 3: FINAL RATED LOAD TESTS"}
              </h4>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", border: "1px solid #ccc" }}>
                <thead>
                  <tr style={{ background: "#f2f2f2", borderBottom: "1px solid #ccc" }}>
                    <th style={{ padding: 8, textAlign: "left", width: "25%", borderRight: "1px solid #ccc" }}>Test Title</th>
                    <th style={{ padding: 8, textAlign: "left", width: "35%", borderRight: "1px solid #ccc" }}>Recorded Measurements</th>
                    <th style={{ padding: 8, textAlign: "left", width: "20%", borderRight: "1px solid #ccc" }}>Instrument S/N</th>
                    <th style={{ padding: 8, textAlign: "left", width: "12%", borderRight: "1px solid #ccc" }}>Signed Off By</th>
                    <th style={{ padding: 8, textAlign: "center", width: "8%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stageTests.map((tDef) => {
                    const rec = job.testRecords.find((r) => r.testId === tDef.id);
                    if (!rec) {
                      return (
                        <tr key={tDef.id} style={{ borderBottom: "1px solid #ccc" }}>
                          <td style={{ padding: 8, borderRight: "1px solid #ccc", fontWeight: 600 }}>{tDef.title}</td>
                          <td colSpan={3} style={{ padding: 8, borderRight: "1px solid #ccc", color: "#666", fontStyle: "italic" }}>Not performed / Pending</td>
                          <td style={{ padding: 8, textAlign: "center", fontWeight: 600, color: "#888" }}>PENDING</td>
                        </tr>
                      );
                    }

                    // Render values and computed nicely
                    const valLines: string[] = [];
                    Object.entries(rec.values).forEach(([k, v]) => {
                      const f = tDef.fields.find((fld) => fld.id === k);
                      const unit = f?.unit ? ` ${f.unit}` : "";
                      valLines.push(`${formatKey(k)}: ${v}${unit}`);
                    });
                    if (rec.computed && Object.keys(rec.computed).length > 0) {
                      Object.entries(rec.computed).forEach(([k, v]) => {
                        valLines.push(`[Calc] ${formatKey(k)}: ${v}`);
                      });
                    }

                    return (
                      <tr key={tDef.id} style={{ borderBottom: "1px solid #ccc" }}>
                        <td style={{ padding: 8, borderRight: "1px solid #ccc", fontWeight: 600 }}>{tDef.title}</td>
                        <td style={{ padding: 8, borderRight: "1px solid #ccc", whiteSpace: "pre-line" }} className="mono">
                          {valLines.join("\n")}
                          {rec.notes && <div style={{ fontSize: 10, color: "#666", marginTop: 4, fontStyle: "italic" }}>Note: {rec.notes}</div>}
                        </td>
                        <td style={{ padding: 8, borderRight: "1px solid #ccc" }}>
                          {rec.equipment ? `${rec.equipment.name} (${rec.equipment.serialNumber})` : "N/A"}
                        </td>
                        <td style={{ padding: 8, borderRight: "1px solid #ccc" }}>
                          {rec.reviewedBy?.name ?? rec.performedBy?.name ?? "N/A"}
                        </td>
                        <td style={{ padding: 8, textAlign: "center", fontWeight: 700, color: rec.status === "PASS" ? "green" : "red" }}>
                          {rec.status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      {/* Signature blocks */}
      <footer style={{ marginTop: 60, borderTop: "1px solid #000", paddingTop: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <div style={{ width: "40%", textAlign: "center" }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderBottom: "1px solid #000", marginBottom: 5 }}></div>
            <strong>Lead Engineer Signature</strong>
            <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
              Name: {job.leadEngineer?.name ?? "__________________"}
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Date: {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "__________________"}
            </div>
          </div>

          <div style={{ width: "40%", textAlign: "center" }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderBottom: "1px solid #000", marginBottom: 5 }}></div>
            <strong>ERS Shop Manager Approval</strong>
            <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
              Authorized Signatory: __________________
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Approval Date: __________________
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: "#666", marginTop: 40, borderTop: "1px solid #eee", paddingTop: 10 }}>
          This certificate qualifies that the described machine has been audited and tested under gated conditions.
        </div>
      </footer>
    </div>
  );
}
