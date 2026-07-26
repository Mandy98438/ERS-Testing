"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
}

interface Job {
  id: string;
  jobNumber: string;
  reasonForEntry: string;
  status: string;
  currentStage: string;
  createdAt: string;
  motor: Motor;
  testRecords?: { status: string }[];
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  calibrationDueOn: string;
}

interface UserSession {
  userId: string;
  employeeId: string;
  name: string;
  role: "TECHNICIAN" | "ENGINEER" | "ADMIN";
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStage, setFilterStage] = useState("");

  // Admin Forms
  const [eqName, setEqName] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [eqCalDate, setEqCalDate] = useState("");
  const [eqSuccess, setEqSuccess] = useState(false);
  const [eqError, setEqError] = useState<string | null>(null);

  const [uEmployeeId, setUEmployeeId] = useState("");
  const [uName, setUName] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState("TECHNICIAN");
  const [uSuccess, setUSuccess] = useState(false);
  const [uError, setUError] = useState<string | null>(null);

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

        const jobsRes = await fetch("/api/jobs");
        const jobsData = await jobsRes.json();
        setJobs(jobsData);

        const eqRes = await fetch("/api/equipment");
        const eqData = await eqRes.json();
        setEquipment(eqData);
      } catch (err: any) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Handle Equipment Register (Admin)
  async function handleAddEquipment(e: React.FormEvent) {
    e.preventDefault();
    setEqError(null);
    setEqSuccess(false);

    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: eqName, serialNumber: eqSerial, calibrationDueOn: eqCalDate }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEqError(data.error ?? "Failed to add equipment.");
      return;
    }

    const newEq = await res.json();
    setEquipment((prev) => [...prev, newEq]);
    setEqName("");
    setEqSerial("");
    setEqCalDate("");
    setEqSuccess(true);
  }

  // Handle User Creation (Admin)
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setUError(null);
    setUSuccess(false);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: uEmployeeId, name: uName, password: uPassword, role: uRole }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setUError(data.error ?? "Failed to create user.");
      return;
    }

    setUEmployeeId("");
    setUName("");
    setUPassword("");
    setURole("TECHNICIAN");
    setUSuccess(true);
  }

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading Dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>{error}</div>;
  }

  // Filter logic
  const filteredJobs = jobs.filter((job) => {
    const term = search.toLowerCase();
    const matchSearch =
      job.jobNumber.toLowerCase().includes(term) ||
      job.motor.serialNumber.toLowerCase().includes(term) ||
      (job.motor.manufacturer ?? "").toLowerCase().includes(term);

    const matchType = filterType === "" || job.motor.motorType === filterType;
    const matchStage = filterStage === "" || job.currentStage === filterStage;

    return matchSearch && matchType && matchStage;
  });

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
            <Link href="/dashboard" className="sidebar-link active">
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

      {/* Main Dashboard Content */}
      <main className="main-content">
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1>ERS Shop Floor Dashboard</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              Monitor active motor testing jobs, enforce gating stages, and track shop testing equipment.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <ThemeToggle />
            <Link href="/jobs/new" className="btn btn-primary">
              + Intake New Job
            </Link>
          </div>
        </header>

        {/* Jobs Tally / Metrics Overview */}
        <section className="grid-3" style={{ marginBottom: 32 }}>
          <div className="card">
            <h3 style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>
              Jobs In Progress
            </h3>
            <p className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
              {jobs.filter((j) => j.status === "IN_PROGRESS").length}
            </p>
          </div>
          <div className="card" style={{ borderColor: "var(--pending-border)" }}>
            <h3 style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>
              On Hold (Failed Test)
            </h3>
            <p className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--pending-text)" }}>
              {jobs.filter((j) => j.status === "ON_HOLD_FAILED_TEST").length}
            </p>
          </div>
          <div className="card" style={{ borderColor: "var(--pass-border)" }}>
            <h3 style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>
              Cleared / Despatched
            </h3>
            <p className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--pass-text)" }}>
              {jobs.filter((j) => j.status === "CLEARED" || j.status === "DESPATCHED").length}
            </p>
          </div>
        </section>

        {/* Filter Toolbar */}
        <section className="card" style={{ padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search Job # or Motor Serial Number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />
            </div>
            <div style={{ width: 180 }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="select">
                <option value="">All Motor Types</option>
                <option value="DC_SHUNT">D.C. Shunt</option>
                <option value="DC_SERIES">D.C. Series</option>
                <option value="DC_COMPOUND">D.C. Compound</option>
                <option value="AC_SQIM">A.C. Squirrel Cage</option>
                <option value="AC_SRIM">A.C. Slip Ring</option>
              </select>
            </div>
            <div style={{ width: 180 }}>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="select">
                <option value="">All Stages</option>
                <option value="PRE">Pre-Test (De-energised)</option>
                <option value="INTERMEDIATE">Intermediate (No Load)</option>
                <option value="FINAL">Final (Load & Signoff)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Active Jobs Table */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2>Testing Pipelines Queue</h2>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Motor Serial #</th>
                  <th>Motor Type</th>
                  <th>Current Stage</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24 }}>
                      No active jobs match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const statusClass =
                      job.status === "CLEARED" || job.status === "DESPATCHED"
                        ? "badge-pass"
                        : job.status === "ON_HOLD_FAILED_TEST"
                        ? "badge-fail"
                        : "badge-pending";

                    return (
                      <tr key={job.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {job.jobNumber}
                        </td>
                        <td className="mono">
                          <Link href={`/motors/${job.motor.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
                            {job.motor.serialNumber}
                          </Link>
                        </td>
                        <td>{job.motor.motorType.replace(/_/g, " ")}</td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{job.currentStage}</span>
                        </td>
                        <td>
                          <span className={`badge ${statusClass}`}>
                            {job.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Link href={`/jobs/${job.id}`} className="btn" style={{ padding: "4px 8px", fontSize: 11 }}>
                            View Job
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Equipment & Calibration Section */}
        <section style={{ marginBottom: 40 }}>
          <h2>Testing Equipment & Calibration Status</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Instrument Name</th>
                  <th>Serial Number</th>
                  <th>Calibration Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => {
                  const isExpired = new Date(eq.calibrationDueOn) < new Date();
                  const statusClass = isExpired ? "badge-fail" : "badge-pass";
                  const statusLabel = isExpired ? "Expired" : "Calibrated";

                  return (
                    <tr key={eq.id}>
                      <td style={{ fontWeight: 500 }}>{eq.name}</td>
                      <td className="mono">{eq.serialNumber}</td>
                      <td className="mono">{new Date(eq.calibrationDueOn).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Admin Section */}
        {session?.role === "ADMIN" && (
          <section
            style={{
              borderTop: "1px solid var(--border-color)",
              paddingTop: 32,
              marginTop: 48,
            }}
          >
            <h2 style={{ fontSize: 20, marginBottom: 24 }}>System Administration</h2>
            <div className="grid-2">
              {/* Register New Instrument Form */}
              <div className="card">
                <h3>Add Testing Instrument</h3>
                <p className="subtitle" style={{ marginBottom: 16 }}>
                  Register new testing devices (Meggers, Vibration Pens, Multi-meters) and set calibration dates.
                </p>
                <form onSubmit={handleAddEquipment}>
                  <div className="form-group">
                    <label>Instrument Name</label>
                    <input
                      type="text"
                      value={eqName}
                      onChange={(e) => setEqName(e.target.value)}
                      placeholder="e.g. Megger MIT525"
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Serial Number</label>
                    <input
                      type="text"
                      value={eqSerial}
                      onChange={(e) => setEqSerial(e.target.value)}
                      placeholder="e.g. MEG-881273"
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Calibration Due Date</label>
                    <input
                      type="date"
                      value={eqCalDate}
                      onChange={(e) => setEqCalDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                  {eqSuccess && (
                    <p style={{ color: "var(--pass-text)", fontSize: 13, marginBottom: 12 }}>
                      Instrument added successfully!
                    </p>
                  )}
                  {eqError && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>{eqError}</p>}
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    Register Equipment
                  </button>
                </form>
              </div>

              {/* Register User Form */}
              <div className="card">
                <h3>Register Employee Account</h3>
                <p className="subtitle" style={{ marginBottom: 16 }}>
                  Create a new employee profile (Technician, Engineer, or Admin) to log in using Employee ID.
                </p>
                <form onSubmit={handleAddUser}>
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input
                      type="text"
                      value={uEmployeeId}
                      onChange={(e) => setUEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-9921"
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={uName}
                      onChange={(e) => setUName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Default Password</label>
                    <input
                      type="password"
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select value={uRole} onChange={(e) => setURole(e.target.value)} className="select">
                      <option value="TECHNICIAN">Technician (enters data)</option>
                      <option value="ENGINEER">Engineer (reviews & overrides)</option>
                      <option value="ADMIN">Admin (manages equipment & users)</option>
                    </select>
                  </div>
                  {uSuccess && (
                    <p style={{ color: "var(--pass-text)", fontSize: 13, marginBottom: 12 }}>
                      Employee registered successfully!
                    </p>
                  )}
                  {uError && <p style={{ color: "red", fontSize: 13, marginBottom: 12 }}>{uError}</p>}
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    Register Employee
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
