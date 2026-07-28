"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPipeline } from "@/lib/pipelines/config";

interface DemoJob {
  jobNumber: string;
  status: string;
  currentStage: string;
  reasonForEntry: string;
  motor: {
    serialNumber: string;
    manufacturer: string | null;
    motorType: string;
    ratedPowerKW: number;
  };
}

const STAGE_LABEL: Record<string, string> = {
  PRE: "Pre-Test (de-energised)",
  INTERMEDIATE: "Intermediate (no-load)",
  FINAL: "Final (rated load)",
};

export default function GuestPage() {
  const router = useRouter();
  const [demoJobs, setDemoJobs] = useState<DemoJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guest/report")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setDemoJobs)
      .catch(() => setError("Demo data isn't seeded yet — run `npm run db:seed`."));
  }, []);

  const dcPipeline = getPipeline("DC_SHUNT");
  const acPipeline = getPipeline("AC_SQIM");

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/background-pattern.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}>
      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>What's inside the Motor Testing Pipeline</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32, maxWidth: 620 }}>
          You're browsing without an account. Everything here is read-only, built from the same
          config-driven pipeline the real Employee and Client portals use.
        </p>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <FeatureCard
            title="Config-driven test pipeline"
            body={`${dcPipeline?.tests.length ?? 0} DC tests, ${acPipeline?.tests.length ?? 0} AC tests, each gated across three inspection stages.`}
          />
          <FeatureCard
            title="Pass/fail auto-evaluation"
            body="Every test carries its own acceptance criteria, evaluated automatically as readings come in."
          />
          <FeatureCard
            title="Client status tracking"
            body="Customers check their job's stage and progress with a Project ID + access code — no login needed."
          />
          <FeatureCard
            title="Signed, printable reports"
            body="Every job compiles into a formatted qualification certificate ready to print or save as PDF."
          />
        </div>

        {/* Stage flowchart */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
            Testing stage flow
          </h2>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
            {(["PRE", "INTERMEDIATE", "FINAL"] as const).map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    padding: "14px 18px",
                    minWidth: 160,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{STAGE_LABEL[stage]}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
                    {acPipeline?.tests.filter((t) => t.stage === stage).length ?? 0} AC ·{" "}
                    {dcPipeline?.tests.filter((t) => t.stage === stage).length ?? 0} DC tests
                  </div>
                </div>
                {i < 2 && <span style={{ color: "var(--text-tertiary)" }}>→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Live demo jobs */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
            Sample jobs — browse demo reports
          </h2>
          {error && <p style={{ color: "var(--fail-text)" }}>{error}</p>}
          {!error && demoJobs.length === 0 && <p style={{ color: "var(--text-secondary)" }}>Loading…</p>}
          {demoJobs.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {demoJobs.map((job) => (
                <div key={job.jobNumber} style={{ border: "1px solid var(--border-color)", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <strong className="mono">{job.jobNumber}</strong>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: job.status === "IN_PROGRESS" ? "var(--pending-bg)" : job.status.includes("FAIL") ? "var(--fail-bg)" : "var(--pass-bg)",
                      color: job.status === "IN_PROGRESS" ? "var(--pending-text)" : job.status.includes("FAIL") ? "var(--fail-text)" : "var(--pass-text)",
                    }}>
                      {job.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {job.motor.manufacturer ?? "Unknown"} {job.motor.motorType.replace(/_/g, " ")} · {job.motor.ratedPowerKW} kW
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                    {job.reasonForEntry}
                  </p>
                  <p style={{ fontSize: 13, marginBottom: 16 }}>
                    Stage: <strong>{STAGE_LABEL[job.currentStage] ?? job.currentStage}</strong>
                  </p>
                  <button className="btn btn-primary" onClick={() => router.push(`/guest/report?job=${job.jobNumber}`)}>
                    View sample report →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ border: "1px solid var(--border-color)", padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{body}</div>
    </div>
  );
}
