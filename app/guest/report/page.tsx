"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  performedBy: { name: string; employeeId: string } | null;
  reviewedBy: { name: string; employeeId: string } | null;
  equipment: { name: string; serialNumber: string } | null;
}

interface Job {
  jobNumber: string;
  reasonForEntry: string;
  status: string;
  faultsFound: string | null;
  repairsPerformed: string | null;
  closedAt: string | null;
  leadEngineer: { name: string; employeeId: string } | null;
  motor: Motor;
  testRecords: TestRecord[];
}

export default function GuestReportPage() {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobNumber = params.get("job") || "PRJ-2026-001"; // Default to first demo job

    fetch(`/api/guest/report?job=${jobNumber}`)
      .then((res) => (res.ok ? res.json() : res.json().then((d) => Promise.reject(d.error))))
      .then(setJob)
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load demo report."));
  }, []);

  if (error) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>{error}</div>;
  if (!job) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading sample report…</div>;

  const pipeline = getPipeline(job.motor.motorType);
  if (!pipeline) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>Pipeline config not found.</div>;
  }

  function formatKey(key: string) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: "20px 40px", fontFamily: "sans-serif", color: "var(--text-primary)" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 30, borderBottom: "1px solid var(--border-color)", paddingBottom: 15 }}>
        <button onClick={() => router.push("/guest")} className="btn">
          ← Back to Guest Preview
        </button>
        <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: "8px 20px" }}>
          Print / Save to PDF
        </button>
      </div>

      <div className="no-print" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", padding: "10px 16px", marginBottom: 20, fontSize: 12, borderRadius: 4 }}>
        Sample report — demo data only, viewed without an account.
      </div>

      <header style={{ borderBottom: "3px double var(--border-color)", paddingBottom: 15, marginBottom: 30, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 5px 0", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Electrical Repair Shop (ERS)
        </h1>
        <h2 style={{ fontSize: 16, margin: "0 0 10px 0", color: "var(--text-secondary)", fontWeight: 500, textTransform: "uppercase" }}>
          Motor Qualification & Integrity Test Report — Sample
        </h2>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 15 }}>
          <span>Report Generated: {new Date().toLocaleString()}</span>
          <span>Job ID: <strong className="mono">{job.jobNumber}</strong></span>
        </div>
      </header>

      <section style={{ marginBottom: 30 }}>
        <h3 style={{ borderBottom: "1px solid var(--border-color)", fontSize: 13, textTransform: "uppercase", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>
          1. Nameplate & General Specifications
        </h3>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }} border={0}>
          <tbody>
            <tr>
              <td style={{ width: "25%", padding: "4px 0", color: "var(--text-secondary)" }}>Serial Number:</td>
              <td style={{ width: "25%", padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.serialNumber}</td>
              <td style={{ width: "25%", padding: "4px 0", color: "var(--text-secondary)" }}>Motor Type:</td>
              <td style={{ width: "25%", padding: "4px 0", fontWeight: 600 }}>{job.motor.motorType.replace(/_/g, " ")}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Manufacturer:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.motor.manufacturer ?? "Unknown"}</td>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Operating Location:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.motor.location ?? "N/A"}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Rated Power:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedPowerKW} kW</td>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Rated Speed:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.motor.ratedSpeedRpm} rpm</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Reason for Entry:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }}>{job.reasonForEntry}</td>
              <td style={{ padding: "4px 0", color: "var(--text-secondary)" }}>Qualification Status:</td>
              <td style={{ padding: "4px 0", fontWeight: 600 }} className="mono">{job.status.replace(/_/g, " ")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h3 style={{ borderBottom: "1px solid var(--border-color)", fontSize: 13, textTransform: "uppercase", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>
          2. Pipeline Qualification Tests
        </h3>
        {["PRE", "INTERMEDIATE", "FINAL"].map((stage) => {
          const stageTests = pipeline.tests.filter((t) => t.stage === stage);
          if (stageTests.length === 0) return null;
          return (
            <div key={stage} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, padding: "3px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", marginBottom: 8, fontWeight: 700 }}>
                {stage === "PRE" ? "STAGE 1: PRE-TESTS" : stage === "INTERMEDIATE" ? "STAGE 2: INTERMEDIATE TESTS" : "STAGE 3: FINAL TESTS"}
              </h4>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", border: "1px solid var(--border-color)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: 8, textAlign: "left", width: "35%", borderRight: "1px solid var(--border-color)" }}>Test Title</th>
                    <th style={{ padding: 8, textAlign: "left", width: "45%", borderRight: "1px solid var(--border-color)" }}>Recorded Measurements</th>
                    <th style={{ padding: 8, textAlign: "center", width: "20%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stageTests.map((tDef) => {
                    const rec = job.testRecords.find((r) => r.testId === tDef.id);
                    if (!rec) {
                      return (
                        <tr key={tDef.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: 8, borderRight: "1px solid var(--border-color)", fontWeight: 600 }}>{tDef.title}</td>
                          <td style={{ padding: 8, borderRight: "1px solid var(--border-color)", color: "var(--text-tertiary)", fontStyle: "italic" }}>Not performed / Pending</td>
                          <td style={{ padding: 8, textAlign: "center", fontWeight: 600, color: "var(--text-tertiary)" }}>PENDING</td>
                        </tr>
                      );
                    }
                    const valLines: string[] = [];
                    Object.entries(rec.values ?? {}).forEach(([k, v]) => {
                      const f = tDef.fields.find((fld) => fld.id === k);
                      const unit = f?.unit ? ` ${f.unit}` : "";
                      valLines.push(`${formatKey(k)}: ${v}${unit}`);
                    });
                    return (
                      <tr key={tDef.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: 8, borderRight: "1px solid var(--border-color)", fontWeight: 600 }}>{tDef.title}</td>
                        <td style={{ padding: 8, borderRight: "1px solid var(--border-color)", whiteSpace: "pre-line" }} className="mono">
                          {valLines.join("\n") || "—"}
                        </td>
                        <td style={{ padding: 8, textAlign: "center", fontWeight: 700, color: rec.status === "PASS" ? "var(--success-color)" : rec.status === "FAIL" ? "var(--fail-color)" : "var(--text-tertiary)" }}>
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

      <footer style={{ marginTop: 60, borderTop: "1px solid var(--border-color)", paddingTop: 30, textAlign: "center", fontSize: 10, color: "var(--text-secondary)" }}>
        This is a sample report generated from demo data for preview purposes only.
      </footer>
    </div>
  );
}
