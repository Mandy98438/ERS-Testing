"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

type Tab = "employee" | "client";

interface ClientStatus {
  jobNumber: string;
  status: string;
  currentStage: string;
  reasonForEntry: string;
  motorType: string;
  ratedPowerKW: number;
  ratedVoltageV: number;
  location: string | null;
  progress: { testsPassed: number; testsTotal: number };
  createdAt: string;
  lastUpdated: string;
  closedAt: string | null;
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("employee");

  return (
    <div>
      {/* Top Nav for Login page */}
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
        <span style={{ fontWeight: 700, fontSize: 16, fontFamily: "Playfair Display, serif" }}>
          ERS PIPELINE
        </span>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 420, margin: "60px auto", padding: "0 16px" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Motor Testing Pipeline</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          Select how you're accessing the system.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <TabButton active={tab === "employee"} onClick={() => setTab("employee")}>
            Employee Login
          </TabButton>
          <TabButton active={tab === "client"} onClick={() => setTab("client")}>
            Client — Check Status
          </TabButton>
        </div>

        {tab === "employee" ? <EmployeeLoginForm /> : <ClientStatusForm />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        border: "1px solid var(--border-color)",
        background: active ? "var(--text-primary)" : "var(--bg-primary)",
        color: active ? "var(--bg-primary)" : "var(--text-primary)",
        cursor: "pointer",
        fontSize: 14,
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function EmployeeLoginForm() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
        Employee ID
        <input
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={inputStyle}
          autoComplete="username"
          required
        />
      </label>
      <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function ClientStatusForm() {
  const [jobNumber, setJobNumber] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClientStatus | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    const res = await fetch("/api/client/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobNumber, accessCode }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not find that project.");
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Project ID
          <input
            value={jobNumber}
            onChange={(e) => setJobNumber(e.target.value)}
            style={inputStyle}
            placeholder="e.g. JOB-2026-0143"
            required
          />
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Access Code
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            style={inputStyle}
            placeholder="printed on your intake slip"
            required
          />
        </label>
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Checking…" : "Check status"}
        </button>
      </form>

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            fontSize: 14,
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 8 }} className="mono">
            {result.jobNumber}
          </p>
          <Row label="Status" value={result.status.replace(/_/g, " ")} />
          <Row label="Current stage" value={result.currentStage} />
          <Row label="Reason for entry" value={result.reasonForEntry} />
          <Row label="Motor type" value={result.motorType.replace(/_/g, " ")} />
          <Row label="Rating" value={`${result.ratedPowerKW} kW / ${result.ratedVoltageV} V`} />
          {result.location && <Row label="Location" value={result.location} />}
          <Row label="Tests passed" value={`${result.progress.testsPassed} / ${result.progress.testsTotal}`} />
          <Row label="Last updated" value={new Date(result.lastUpdated).toLocaleString()} />
          {result.closedAt && <Row label="Closed" value={new Date(result.closedAt).toLocaleString()} />}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span>{value}</span>
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  border: "1px solid var(--border-color)",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  outline: "none",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "var(--text-primary)",
  color: "var(--bg-primary)",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
};
