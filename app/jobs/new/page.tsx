"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface MotorData {
  id: string;
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

interface UserSession {
  name: string;
  role: string;
  employeeId: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Job fields
  const [jobNumber, setJobNumber] = useState("");
  const [reasonForEntry, setReasonForEntry] = useState("routine overhaul");

  // Motor fields
  const [serialNumber, setSerialNumber] = useState("");
  const [searchingMotor, setSearchingMotor] = useState(false);
  const [existingMotor, setExistingMotor] = useState<MotorData | null>(null);
  const [checkedSerialNumber, setCheckedSerialNumber] = useState("");

  // New Motor fields
  const [manufacturer, setManufacturer] = useState("");
  const [motorType, setMotorType] = useState("DC_SHUNT");
  const [ratedVoltage, setRatedVoltage] = useState("");
  const [ratedCurrent, setRatedCurrent] = useState("");
  const [ratedPower, setRatedPower] = useState("");
  const [ratedSpeed, setRatedSpeed] = useState("");
  const [poles, setPoles] = useState("");
  const [frequency, setFrequency] = useState("50");
  const [connection, setConnection] = useState("Delta");
  const [insulationClass, setInsulationClass] = useState("F");
  const [location, setLocation] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setLoading(false);

      // Auto-suggest a Job Number prefix based on year
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      setJobNumber(`JOB-${year}-${rand}`);
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Trigger motor nameplate lookup
  async function lookupMotor() {
    if (!serialNumber.trim()) return;
    setSearchingMotor(true);
    setExistingMotor(null);
    setFormError(null);

    try {
      const res = await fetch(`/api/motors?serialNumber=${encodeURIComponent(serialNumber.trim())}`);
      const data = await res.json();
      setCheckedSerialNumber(serialNumber.trim());

      if (res.ok && data.motor) {
        setExistingMotor(data.motor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingMotor(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload: any = {
      jobNumber: jobNumber.trim(),
      reasonForEntry: reasonForEntry.trim(),
    };

    if (existingMotor) {
      payload.motorId = existingMotor.id;
    } else {
      // Validate new motor inputs
      if (
        !serialNumber ||
        !ratedVoltage ||
        !ratedCurrent ||
        !ratedPower ||
        !ratedSpeed
      ) {
        setFormError("All starred (*) nameplate fields are required for a new motor.");
        setSubmitting(false);
        return;
      }

      payload.nameplate = {
        serialNumber: serialNumber.trim(),
        manufacturer: manufacturer.trim() || undefined,
        motorType,
        ratedVoltageV: parseFloat(ratedVoltage),
        ratedCurrentA: parseFloat(ratedCurrent),
        ratedPowerKW: parseFloat(ratedPower),
        ratedSpeedRpm: parseFloat(ratedSpeed),
        poles: poles ? parseInt(poles) : undefined,
        frequencyHz: frequency ? parseFloat(frequency) : undefined,
        connection: connection.trim() || undefined,
        insulationClass: insulationClass.trim() || undefined,
        location: location.trim() || undefined,
      };
    }

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to create job.");
      } else {
        router.push(`/jobs/${data.id}`);
      }
    } catch (err) {
      setFormError("A network error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading Intake Form...</div>;
  }

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
            <Link href="/jobs/new" className="sidebar-link active">
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
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Link href="/dashboard" style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 8, display: "inline-block" }}>
              ← Back to Dashboard
            </Link>
            <h1>Motor Intake & Job Initialization</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              Log in a motor for testing. If the motor has visited this shop before, its nameplate details will be retrieved automatically.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <form onSubmit={onSubmit} style={{ maxWidth: 680 }}>
          {/* Section 1: Job metadata */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, marginBottom: 16 }}>1. Job Identifiers & Context</h2>
            <div className="grid-2">
              <div className="form-group">
                <label>Job Number / Project ID *</label>
                <input
                  type="text"
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  className="input mono"
                  required
                />
              </div>
              <div className="form-group">
                <label>Reason for Intake *</label>
                <select
                  value={reasonForEntry}
                  onChange={(e) => setReasonForEntry(e.target.value)}
                  className="select"
                >
                  <option value="routine overhaul">Routine Overhaul</option>
                  <option value="new winding">Rewinding / New Winding</option>
                  <option value="repair">Mechanical Repair</option>
                  <option value="rectification">Rectification / Troubleshooting</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Motor Serial Lookup */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>2. Motor Identification</h2>
            <p className="subtitle" style={{ fontSize: 12, marginBottom: 16 }}>
              Enter the nameplate serial number to check service logs.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Nameplate Serial Number / Asset Tag *</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => {
                    setSerialNumber(e.target.value);
                    setExistingMotor(null);
                    setCheckedSerialNumber("");
                  }}
                  placeholder="e.g. SN-998273"
                  className="input mono"
                  required
                />
              </div>
              <button
                type="button"
                onClick={lookupMotor}
                disabled={searchingMotor || !serialNumber.trim()}
                className="btn"
                style={{ height: 38 }}
              >
                {searchingMotor ? "Searching..." : "Lookup Serial"}
              </button>
            </div>

            {/* Check Results */}
            {checkedSerialNumber && existingMotor && (
              <div
                style={{
                  padding: 16,
                  backgroundColor: "var(--pass-bg)",
                  border: "1px solid var(--pass-border)",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <strong style={{ color: "var(--pass-text)" }}>✓ Match Found! Reusing Existing Nameplate</strong>
                <div className="grid-2" style={{ marginTop: 12, gap: "8px 16px" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Manufacturer:</span>{" "}
                    <strong>{existingMotor.manufacturer ?? "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Motor Type:</span>{" "}
                    <strong>{existingMotor.motorType.replace(/_/g, " ")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Ratings:</span>{" "}
                    <strong>{existingMotor.ratedPowerKW} kW / {existingMotor.ratedVoltageV} V</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Speed:</span>{" "}
                    <strong>{existingMotor.ratedSpeedRpm} rpm</strong>
                  </div>
                  {existingMotor.location && (
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Original Location:</span>{" "}
                      <strong>{existingMotor.location}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {checkedSerialNumber && !existingMotor && (
              <div
                style={{
                  padding: 16,
                  backgroundColor: "var(--pending-bg)",
                  border: "1px solid var(--pending-border)",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--pending-text)", fontWeight: 600 }}>
                  ✦ New Motor: Please record nameplate details below.
                </span>
              </div>
            )}
          </div>

          {/* Section 3: New Motor Fields (only if no existing motor matched) */}
          {!existingMotor && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, marginBottom: 16 }}>3. Nameplate Specifications</h2>
              <div className="grid-2">
                <div className="form-group">
                  <label>Motor Classification Type *</label>
                  <select
                    value={motorType}
                    onChange={(e) => setMotorType(e.target.value)}
                    className="select"
                  >
                    <option value="DC_SHUNT">D.C. Shunt Motor</option>
                    <option value="DC_SERIES">D.C. Series Motor</option>
                    <option value="DC_COMPOUND">D.C. Compound Motor</option>
                    <option value="AC_SQIM">A.C. Squirrel Cage (SQIM)</option>
                    <option value="AC_SRIM">A.C. Slip Ring (SRIM)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manufacturer / Make</label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Siemens, ABB"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Rated Power (kW) *</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedPower}
                    onChange={(e) => setRatedPower(e.target.value)}
                    className="input mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rated Voltage (V) *</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedVoltage}
                    onChange={(e) => setRatedVoltage(e.target.value)}
                    className="input mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rated Current (A) *</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedCurrent}
                    onChange={(e) => setRatedCurrent(e.target.value)}
                    className="input mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rated Speed (rpm) *</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedSpeed}
                    onChange={(e) => setRatedSpeed(e.target.value)}
                    className="input mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Poles Count</label>
                  <input
                    type="number"
                    value={poles}
                    onChange={(e) => setPoles(e.target.value)}
                    placeholder="e.g. 4"
                    className="input mono"
                  />
                </div>
                <div className="form-group">
                  <label>Insulation Class</label>
                  <input
                    type="text"
                    value={insulationClass}
                    onChange={(e) => setInsulationClass(e.target.value)}
                    placeholder="e.g. F, H"
                    className="input mono"
                  />
                </div>
                {(motorType === "AC_SQIM" || motorType === "AC_SRIM") && (
                  <>
                    <div className="form-group">
                      <label>Frequency (Hz)</label>
                      <input
                        type="number"
                        step="any"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="input mono"
                      />
                    </div>
                    <div className="form-group">
                      <label>Connection Layout</label>
                      <input
                        type="text"
                        value={connection}
                        onChange={(e) => setConnection(e.target.value)}
                        placeholder="e.g. Star / Delta"
                        className="input"
                      />
                    </div>
                  </>
                )}
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Shop/Plant Location context (Operating area)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Blast Furnace - Conveyor 3"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {formError && (
            <p style={{ color: "red", fontSize: 13, marginBottom: 16 }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: 12, fontSize: 14 }}
          >
            {submitting ? "Creating Job..." : "Register Intake & Open Pipeline"}
          </button>
        </form>
      </main>
    </div>
  );
}
