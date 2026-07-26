"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPipeline } from "@/lib/pipelines/config";
import ThemeToggle from "@/components/ThemeToggle";

interface FieldDef {
  id: string;
  label: string;
  type: "number" | "text" | "select" | "boolean";
  unit?: string;
  options?: string[];
  required?: boolean;
}

interface TestDef {
  id: string;
  stage: string;
  title: string;
  purpose: string;
  fields: FieldDef[];
  passCriteriaNote: string;
}

interface TestRecord {
  id: string;
  values: Record<string, any>;
  computed: Record<string, any> | null;
  status: string;
  notes: string | null;
  equipmentId: string | null;
  signedOff: boolean;
  performedBy: { name: string; employeeId: string } | null;
  reviewedBy: { name: string; employeeId: string } | null;
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  calibrationDueOn: string;
}

interface UserSession {
  userId: string;
  name: string;
  role: "TECHNICIAN" | "ENGINEER" | "ADMIN";
  employeeId: string;
}

export default function TestEntryPage() {
  const router = useRouter();
  const { id: jobId, testId } = useParams<{ id: string; testId: string }>();

  const [session, setSession] = useState<UserSession | null>(null);
  const [testDef, setTestDef] = useState<TestDef | null>(null);
  const [record, setRecord] = useState<TestRecord | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [selectedEqId, setSelectedEqId] = useState("");
  const [isEqExpired, setIsEqExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sign-off / Override State
  const [overrideStatus, setOverrideStatus] = useState<"PASS" | "FAIL" | "">("");
  const [signOffNotes, setSignOffNotes] = useState("");
  const [signingOff, setSigningOff] = useState(false);
  const [signOffError, setSignOffError] = useState<string | null>(null);

  // Database reference state
  const [testReference, setTestReference] = useState<any>(null);

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

        // Load test definition and test record
        const testRes = await fetch(`/api/jobs/${jobId}/tests/${testId}`);
        if (!testRes.ok) {
          throw new Error("Test details could not be retrieved.");
        }
        const data = await testRes.json();
        setTestDef(data.testDef);
        setTestReference(data.testReference ?? null);
        if (data.testRecord) {
          setRecord(data.testRecord);
          setValues(data.testRecord.values);
          setNotes(data.testRecord.notes ?? "");
          setSelectedEqId(data.testRecord.equipmentId ?? "");
        } else {
          // Initialize values with defaults if empty
          const initialValues: Record<string, any> = {};
          data.testDef.fields.forEach((f: FieldDef) => {
            if (f.type === "boolean") initialValues[f.id] = false;
            else if (f.type === "select") initialValues[f.id] = f.options?.[0] ?? "";
            else initialValues[f.id] = "";
          });
          setValues(initialValues);
        }

        // Load Equipment list
        const eqRes = await fetch("/api/equipment");
        const eqData = await eqRes.json();
        setEquipmentList(eqData);
      } catch (err: any) {
        setError(err.message ?? "An error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId, testId, router]);

  // Check calibration on selection change
  useEffect(() => {
    if (!selectedEqId) {
      setIsEqExpired(false);
      return;
    }
    const eq = equipmentList.find((e) => e.id === selectedEqId);
    if (eq) {
      const expired = new Date(eq.calibrationDueOn) < new Date();
      setIsEqExpired(expired);
    }
  }, [selectedEqId, equipmentList]);

  // Retrieve pipeline configs for client-side compute/evaluate
  const activePipeline = testDef ? getPipeline("DC_SHUNT") : null; // Temp holder to resolve types
  // Let's resolve the actual compute function from import
  const currentPipeline = record ? null : null; // we lookup the correct one dynamically

  // Safe helper to run dynamic calculations client-side
  const getLiveComputations = () => {
    if (!testDef) return {};
    // Load config from our pipelines
    const jobRes = fetch(`/api/jobs/${jobId}`).then(r => r.json());
    // To make it simple and synchronous, let's look up the compute function directly
    // since we know the motorType is in the page path or loaded. Let's find it by scanning config pipelines.
    const allPipes = ["DC_SHUNT", "DC_SERIES", "DC_COMPOUND", "AC_SQIM", "AC_SRIM"];
    let computeFn: any = null;
    for (const pType of allPipes) {
      const config = getPipeline(pType);
      const matchedTest = config?.tests.find((t) => t.id === testDef.id);
      if (matchedTest?.compute) {
        computeFn = matchedTest.compute;
        break;
      }
    }

    if (computeFn) {
      try {
        return computeFn(values);
      } catch (e) {
        return {};
      }
    }
    return {};
  };

  const liveComputed = getLiveComputations();

  // Submit test values (Technician / Engineer save)
  async function handleSaveValues(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    if (isEqExpired) {
      setSaveError("Blocked: Selected equipment is out of calibration. Please use a calibrated instrument.");
      setSaving(false);
      return;
    }

    // Cast numbers properly
    const castedValues: Record<string, any> = {};
    if (testDef) {
      testDef.fields.forEach((f) => {
        const val = values[f.id];
        if (f.type === "number") {
          castedValues[f.id] = val === "" ? 0 : parseFloat(val);
        } else {
          castedValues[f.id] = val;
        }
      });
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}/tests/${testId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: castedValues,
          notes,
          equipmentId: selectedEqId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save test details.");
      } else {
        router.push(`/jobs/${jobId}`);
      }
    } catch (err) {
      setSaveError("Network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // Engineer Sign-off & Status Override
  async function handleSignOff(e: React.FormEvent) {
    e.preventDefault();
    setSignOffError(null);
    setSigningOff(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}/tests/${testId}/signoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus || undefined,
          notes: signOffNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSignOffError(data.error ?? "Failed to complete sign-off.");
      } else {
        router.push(`/jobs/${jobId}`);
      }
    } catch (err) {
      setSignOffError("Network error occurred.");
    } finally {
      setSigningOff(false);
    }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading Test Form...</div>;
  if (error || !testDef) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "red" }}>{error}</div>;

  const isTechnician = session?.role === "TECHNICIAN";
  const isWindingLocked = record?.signedOff && isTechnician; // Tech cannot edit once signed off

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
          <button onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"))} className="btn" style={{ width: "100%", fontSize: 12, padding: "6px" }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Link href={`/jobs/${jobId}`} style={{ fontSize: 12, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 8, display: "inline-block" }}>
              ← Back to Job Pipeline
            </Link>
            <h1>Record Test: {testDef.title}</h1>
            <p className="subtitle" style={{ margin: 0 }}>{testDef.purpose}</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid-2">
          {/* Form Side */}
          <div>
            <form onSubmit={handleSaveValues} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ fontSize: 15, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
                Test Measurement Inputs
              </h2>

              {isWindingLocked && (
                <div style={{ padding: 12, backgroundColor: "var(--pass-bg)", border: "1px solid var(--pass-border)", color: "var(--pass-text)", borderRadius: 4, fontSize: 13, marginBottom: 10 }}>
                  🔒 Locked: This test record has been reviewed and signed off by an engineer. Technicians are blocked from modifications.
                </div>
              )}

              {/* Render dynamic fields */}
              {testDef.fields.map((f) => {
                return (
                  <div className="form-group" key={f.id}>
                    <label>
                      {f.label} {f.required && "*"}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {f.type === "number" && (
                        <>
                          <input
                            type="number"
                            step="any"
                            value={values[f.id] ?? ""}
                            onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                            disabled={isWindingLocked}
                            className="input mono"
                            required={f.required}
                          />
                          {f.unit && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.unit}</span>}
                        </>
                      )}
                      {f.type === "text" && (
                        <input
                          type="text"
                          value={values[f.id] ?? ""}
                          onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                          disabled={isWindingLocked}
                          className="input"
                          required={f.required}
                        />
                      )}
                      {f.type === "boolean" && (
                        <input
                          type="checkbox"
                          checked={!!values[f.id]}
                          onChange={(e) => setValues({ ...values, [f.id]: e.target.checked })}
                          disabled={isWindingLocked}
                          style={{ width: 20, height: 20 }}
                        />
                      )}
                      {f.type === "select" && (
                        <select
                          value={values[f.id] ?? ""}
                          onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                          disabled={isWindingLocked}
                          className="select"
                          required={f.required}
                        >
                          {f.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Equipment Selector */}
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Testing Instrument Used</label>
                <select
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  disabled={isWindingLocked}
                  className="select"
                >
                  <option value="">-- Choose Equipment (Optional) --</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} (S/N: {eq.serialNumber})
                    </option>
                  ))}
                </select>

                {selectedEqId && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    {isEqExpired ? (
                      <span style={{ color: "red", fontWeight: 600 }}>
                        ⚠️ Out of Calibration: This equipment has expired and is BLOCKED from database entry.
                      </span>
                    ) : (
                      <span style={{ color: "var(--pass-text)", fontWeight: 600 }}>
                        ✓ Instrument is calibrated and active.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Technician Field Remarks / Internal Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isWindingLocked}
                  className="textarea"
                  rows={2}
                />
              </div>

              {saveError && <p style={{ color: "red", fontSize: 13 }}>{saveError}</p>}

              {!isWindingLocked && (
                <button
                  type="submit"
                  disabled={saving || isEqExpired}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: 10 }}
                >
                  {saving ? "Saving Winding Values..." : "Record Test Values & Auto-Evaluate"}
                </button>
              )}
            </form>
          </div>

          {/* Context / Auto-calc & Sign-off Side */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Database-backed Acceptance Criteria & Physics Reference */}
            {testReference ? (
              <div className="card" style={{ borderColor: "var(--border-color-dark)", backgroundColor: "var(--bg-secondary)" }}>
                <h3 style={{ fontSize: 13, marginBottom: 8, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                  Acceptance Criteria Reference
                </h3>
                <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 12 }}>
                  {testReference.passFailCriteria || testDef.passCriteriaNote}
                </p>

                {testReference.sciencePrinciple && (
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: 10, fontSize: 12.5 }}>
                    <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                      <strong>Scientific Principle:</strong>
                    </p>
                    <p style={{ color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                      {testReference.sciencePrinciple}
                    </p>
                  </div>
                )}

                {testReference.formula && (
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: 10, fontSize: 12.5 }}>
                    <p style={{ color: "var(--text-secondary)", marginBottom: 6 }}>
                      <strong>Reference Formula:</strong>
                    </p>
                    <pre className="mono" style={{ padding: 8, backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 4, fontSize: 11.5, color: "var(--text-primary)", overflowX: "auto" }}>
                      {testReference.formula}
                    </pre>
                  </div>
                )}

                {testReference.source && (
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, marginTop: 10, fontSize: 11, color: "var(--text-tertiary)" }}>
                    Source Citation: {testReference.source}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ borderColor: "var(--border-color-dark)", backgroundColor: "var(--bg-secondary)" }}>
                <h3 style={{ fontSize: 13, marginBottom: 8, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                  Acceptance Criteria Reference
                </h3>
                <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                  {testDef.passCriteriaNote}
                </p>
              </div>
            )}

            {/* Live Calculations Card */}
            {Object.keys(liveComputed).length > 0 && (
              <div className="card">
                <h3>Live Mathematical Formula Outputs</h3>
                <p className="subtitle" style={{ fontSize: 11, marginBottom: 12 }}>
                  Calculated automatically on typing.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(liveComputed).map(([key, val]) => {
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          backgroundColor: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: 4,
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <strong className="mono" style={{ fontSize: 13 }}>
                          {String(val)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Engineer Sign-off / Override card */}
            {record && (session?.role === "ENGINEER" || session?.role === "ADMIN") && (
              <div className="card" style={{ border: "1px solid var(--pending-border)", backgroundColor: "#fffefb" }}>
                <h3>Engineer Review & Status Override</h3>
                <p className="subtitle" style={{ fontSize: 11, marginBottom: 12 }}>
                  Review recorded readings. You can sign off as-is or manually override a failed test if required.
                </p>

                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, marginBottom: 4 }}>
                    Auto-Evaluated Status:{" "}
                    <span className={`badge ${record.status === "PASS" ? "badge-pass" : "badge-fail"}`}>
                      {record.status}
                    </span>
                  </p>
                  {record.reviewedBy && (
                    <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      Currently reviewed by {record.reviewedBy.name}
                    </p>
                  )}
                </div>

                <form onSubmit={handleSignOff} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-group">
                    <label>Manual Status Override (Optional)</label>
                    <select
                      value={overrideStatus}
                      onChange={(e: any) => setOverrideStatus(e.target.value)}
                      className="select"
                    >
                      <option value="">-- Keep Current Status --</option>
                      <option value="PASS">Force PASS (Override)</option>
                      <option value="FAIL">Force FAIL (Override)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Review Notes / Decision Rationale</label>
                    <textarea
                      value={signOffNotes}
                      onChange={(e) => setSignOffNotes(e.target.value)}
                      placeholder="Explain override or add verification notes"
                      className="textarea"
                      rows={2}
                    />
                  </div>

                  {signOffError && <p style={{ color: "red", fontSize: 12 }}>{signOffError}</p>}

                  <button
                    type="submit"
                    disabled={signingOff}
                    className="btn btn-primary"
                    style={{ backgroundColor: "#996600", borderColor: "#996600" }}
                  >
                    {signingOff ? "Signing..." : "Complete Sign-off & Lock"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
