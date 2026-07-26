"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface TestReference {
  id: string;
  category: string;
  machineType: string;
  testStage: string;
  title: string;
  description: string;
  sciencePrinciple: string | null;
  formula: string | null;
  passFailCriteria: string | null;
  source: string | null;
  tags: string[];
}

interface Session {
  userId: string;
  name: string;
  role: string;
  employeeId: string;
}

export default function ReferenceLibraryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [references, setReferences] = useState<TestReference[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  
  // Search and filter states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStage, setSelectedStage] = useState("ALL");

  useEffect(() => {
    // 1. Verify Authentication
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setSession(data);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoadingSession(false));

    // 2. Fetch Reference Data
    fetch("/api/references")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reference library");
        return res.json();
      })
      .then(setReferences)
      .catch((e) => console.error(e))
      .finally(() => setLoadingRefs(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loadingSession || loadingRefs) {
    return <div style={{ padding: 40 }}>Loading Reference Library...</div>;
  }

  // Filter Logic
  const filteredReferences = references.filter((ref) => {
    const matchesSearch =
      ref.title.toLowerCase().includes(search.toLowerCase()) ||
      ref.description.toLowerCase().includes(search.toLowerCase()) ||
      ref.id.toLowerCase().includes(search.toLowerCase()) ||
      ref.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || ref.category.toUpperCase() === selectedCategory;

    const matchesType =
      selectedType === "ALL" || ref.machineType === selectedType;

    const matchesStage =
      selectedStage === "ALL" || ref.testStage === selectedStage;

    return matchesSearch && matchesCategory && matchesType && matchesStage;
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
            <Link href="/dashboard" className="sidebar-link">
              Dashboard
            </Link>
            <Link href="/jobs/new" className="sidebar-link">
              Intake New Job
            </Link>
            <Link href="/references" className="sidebar-link active">
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

      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1>Standards & Reference Library</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              Browse industrial testing procedures, engineering equations, EASA/IEEE failure statistics, and IEC guidelines.
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Search & Filtering Panel */}
        <section className="card" style={{ marginBottom: 32, padding: "20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            {/* Search Input */}
            <div style={{ flex: "1 1 300px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Search Title, Description or Tags
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Megger, IEEE 43, vibration, copper..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Machine Type Filter */}
            <div style={{ width: "150px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Machine Type
              </label>
              <select className="select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="DC">DC Motors</option>
                <option value="AC_SQIM">AC Squirrel Cage</option>
                <option value="AC_SRIM">AC Slip Ring</option>
                <option value="DC_GENERATOR">DC Generator</option>
                <option value="GENERAL">General/Universal</option>
              </select>
            </div>

            {/* Test Stage Filter */}
            <div style={{ width: "150px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Test Stage
              </label>
              <select className="select" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                <option value="ALL">All Stages</option>
                <option value="PRE_TEST">Pre-Test</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="FINAL">Final</option>
                <option value="REFERENCE">General Reference</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-color)", paddingTop: 16, flexWrap: "wrap" }}>
            {["ALL", "TEST_PROCEDURE", "EQUATION", "STANDARD", "RELIABILITY_DATA"].map((cat) => {
              const label = cat.replace(/_/g, " ");
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="btn"
                  style={{
                    fontSize: 12,
                    padding: "6px 12px",
                    background: isActive ? "var(--text-primary)" : "transparent",
                    color: isActive ? "var(--bg-primary)" : "var(--text-primary)",
                    borderColor: isActive ? "var(--text-primary)" : "var(--border-color)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* References List */}
        <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: -8 }}>
            Showing <strong>{filteredReferences.length}</strong> of <strong>{references.length}</strong> entries
          </div>

          {filteredReferences.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              No reference materials found matching your search.
            </div>
          ) : (
            filteredReferences.map((ref) => {
              // Category Color Badge
              let badgeClass = "badge-pending";
              if (ref.category === "test_procedure") badgeClass = "badge-pass";
              if (ref.category === "equation") badgeClass = "badge-fail";

              return (
                <article key={ref.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Card Title & Meta Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 2 }}>
                        {ref.id.toUpperCase()} · {ref.machineType.replace(/_/g, " ")} · {ref.testStage.replace(/_/g, " ")}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Playfair Display, serif" }}>
                        {ref.title}
                      </h3>
                    </div>
                    <span className={`badge ${badgeClass}`}>
                      {ref.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Body Description */}
                  <p style={{ color: "var(--text-primary)", fontSize: 13.5 }}>
                    {ref.description}
                  </p>

                  {/* Science details */}
                  {(ref.sciencePrinciple || ref.formula || ref.passFailCriteria) && (
                    <div
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 4,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        fontSize: 13,
                      }}
                    >
                      {ref.sciencePrinciple && (
                        <p>
                          <strong style={{ color: "var(--text-secondary)" }}>Physics Principle:</strong>{" "}
                          {ref.sciencePrinciple}
                        </p>
                      )}

                      {ref.formula && (
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Winding Wye Formula:</strong>
                          <pre
                            className="mono"
                            style={{
                              marginTop: 6,
                              padding: 10,
                              backgroundColor: "var(--bg-tertiary)",
                              border: "1px solid var(--border-color)",
                              borderRadius: 4,
                              fontSize: 12,
                              color: "var(--text-primary)",
                              overflowX: "auto",
                            }}
                          >
                            {ref.formula}
                          </pre>
                        </div>
                      )}

                      {ref.passFailCriteria && (
                        <p>
                          <strong style={{ color: "var(--text-secondary)" }}>Pass/Fail Threshold:</strong>{" "}
                          <span style={{ fontStyle: "italic" }}>{ref.passFailCriteria}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer Citation & Tags */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: 12,
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span>
                      Source: <strong>{ref.source ?? "EASA Standard / Industrial Practice"}</strong>
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ref.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 12,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
