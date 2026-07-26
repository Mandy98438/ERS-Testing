"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface HistoryEntry {
  jobNumber: string;
  reasonForEntry: string;
  status: string;
  currentStage: string;
  faultsFound: string | null;
  repairsPerformed: string | null;
  leadEngineer: { name: string; employeeId: string } | null;
  createdAt: string;
  closedAt: string | null;
  tests: {
    testId: string;
    stage: string;
    status: string;
    performedBy: { name: string; employeeId: string };
    reviewedBy: { name: string; employeeId: string } | null;
    signedOff: boolean;
    at: string;
  }[];
}

interface MotorHistoryResponse {
  motor: {
    serialNumber: string;
    manufacturer: string | null;
    motorType: string;
    ratedVoltageV: number;
    ratedCurrentA: number;
    ratedPowerKW: number;
    ratedSpeedRpm: number;
    location: string | null;
    firstSeen: string;
  };
  visitCount: number;
  history: HistoryEntry[];
}

export default function MotorHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<MotorHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/motors/${id}/history`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load.");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main style={{ padding: 40, color: "red" }}>
        {error}
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 40 }}>
        Loading Motor History...
      </main>
    );
  }

  const { motor, visitCount, history } = data;

  return (
    <div>
      {/* Top Nav for History Page */}
      <header
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <Link href="/dashboard" style={{ fontWeight: 700, fontSize: 16, fontFamily: "Playfair Display, serif", color: "inherit", textDecoration: "none" }}>
          ERS PIPELINE
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/dashboard" className="btn" style={{ fontSize: 12, padding: "6px 12px" }}>
            ← Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
        <h1>Motor {motor.serialNumber}</h1>
        <p className="subtitle" style={{ marginBottom: 12 }}>
          {motor.manufacturer ?? "Unknown manufacturer"} · {motor.motorType.replace(/_/g, " ")} ·{" "}
          {motor.ratedPowerKW} kW / {motor.ratedVoltageV} V / {motor.ratedSpeedRpm} rpm
          {motor.location && <> · {motor.location}</>}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 32 }}>
          On file since {new Date(motor.firstSeen).toLocaleDateString()} · {visitCount} visit
          {visitCount === 1 ? "" : "s"} recorded
        </p>

        <h2>Service Visit History</h2>

        {history.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>No jobs recorded yet.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {history.map((entry) => {
            const statusClass =
              entry.status === "CLEARED" || entry.status === "DESPATCHED"
                ? "badge-pass"
                : entry.status === "ON_HOLD_FAILED_TEST"
                ? "badge-fail"
                : "badge-pending";

            return (
              <div
                key={entry.jobNumber}
                className="card"
                style={{ padding: 20 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                  <span style={{ fontWeight: 700 }} className="mono">
                    {entry.jobNumber}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {new Date(entry.createdAt).toLocaleDateString()}
                    {entry.closedAt && ` — closed ${new Date(entry.closedAt).toLocaleDateString()}`}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <p>
                    <span style={{ color: "var(--text-secondary)" }}>Reason:</span>{" "}
                    <strong>{entry.reasonForEntry}</strong>
                  </p>
                  <p style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Status:</span>
                    <span className={`badge ${statusClass}`}>{entry.status.replace(/_/g, " ")}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>({entry.currentStage})</span>
                  </p>
                  {entry.faultsFound && (
                    <p>
                      <span style={{ color: "var(--text-secondary)" }}>Faults found:</span>{" "}
                      {entry.faultsFound}
                    </p>
                  )}
                  {entry.repairsPerformed && (
                    <p>
                      <span style={{ color: "var(--text-secondary)" }}>Repairs performed:</span>{" "}
                      {entry.repairsPerformed}
                    </p>
                  )}
                  {entry.leadEngineer && (
                    <p>
                      <span style={{ color: "var(--text-secondary)" }}>Certified Engineer:</span>{" "}
                      {entry.leadEngineer.name} ({entry.leadEngineer.employeeId})
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
                    {entry.tests.length} test{entry.tests.length === 1 ? "" : "s"} recorded ·{" "}
                    {entry.tests.filter((t) => t.status === "PASS").length} passed
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
