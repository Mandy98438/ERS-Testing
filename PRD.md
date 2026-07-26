# Motor Testing Pipeline — Product Requirements Document

**Owner:** Mayank
**Status:** Phase 1 in development
**Origin:** Derived from an industrial project report ("Analysis of Failure in D.C. & A.C. Motor," SAIL Bhilai, June 2026) documenting the gated test sequence used by an industrial Electrical Repair Shop (ERS) to qualify D.C. and A.C. motors before they're returned to service.

---

## 1. Problem

The original report is a static PDF: a fixed, one-time snapshot of a test sequence, tied to one plant, with a named submitter and guide. It has no way to:
- Track a specific motor's job through the sequence in real time
- Enforce the gating logic (a motor must pass every test in a stage before the next stage starts) — currently enforced only by procedure/discipline, not by a system
- Auto-calculate the derived values (ΔT, IR minimum, efficiency, speed regulation, pole count) — currently done by hand
- Log which instrument/equipment was used, or catch an expired calibration before a bad reading gets recorded
- Produce a clean, reusable report without manually stripping personal/plant-specific info each time

## 2. Vision

A multi-user, production-ready web app that any electrical repair shop can run to:
1. Log motors in for testing
2. Walk each motor through its correct test pipeline (motor-type-specific, staged, gated)
3. Auto-calculate and flag out-of-tolerance results as they're entered
4. Track the equipment used and its calibration status
5. Generate a clean, de-identified (of the original SAIL branding) sign-off report per motor
6. Give a dashboard view of everything currently in progress across the shop

This replaces "a report someone writes at the end" with "a system that runs continuously and produces the report as a byproduct."

## 3. Users & Roles

| Role | Can do |
|---|---|
| Technician | Log jobs, enter test data |
| Engineer | Everything Technician can, + review/sign off tests, override pass/fail |
| Admin | Everything above, + manage equipment master list, manage users, org settings |

Login is by **Employee ID + password** (not email) — matches how shop-floor staff are actually identified. No personal identity, employer branding, or plant-specific info is baked into the app itself; it's all org-configurable.

## 4. Core Concepts

- **Job** — one motor's journey through testing. Has nameplate data (voltage, current, power, speed, poles, insulation class), motor type, and reason for entry (new winding / repair / rectification / routine overhaul).
- **Pipeline** — the ordered list of tests for a given motor type (DC Shunt/Series/Compound, AC Squirrel Cage, AC Slip Ring), split into three **stages**: Pre-Test (de-energised), Intermediate (energised, no load), Final (rated load + sign-off).
- **Gate** — a job cannot advance to the next stage until every test in the current stage is marked Pass. A Fail puts the job **On Hold** and blocks progression.
- **Test Record** — one instance of one test performed on one job: raw entered values, auto-computed values, pass/fail status, equipment used, who performed it, who reviewed/signed off.
- **Equipment** — testing instruments (Megger, HV test set, vibration analyzer, dynamometer) with serial numbers and calibration due dates. A test using an out-of-calibration instrument should be flagged/blocked.

## 5. Pipeline Engine Design

Config-driven, not hardcoded pages. Each motor type maps to a `PipelineConfig`: an ordered array of `TestDefinition` objects, each with:
- id, stage, order
- title + one-line purpose (why this test exists at this point)
- form field definitions (label, type, unit)
- optional `compute()` — auto-calculates derived values (e.g. ΔT from cold/hot resistance, efficiency from P_out/P_in)
- optional `evaluate()` — auto-suggests pass/fail against the acceptance criteria, technician/engineer can override
- human-readable pass criteria note

A single dynamic form component renders any `TestDefinition`. Adding a new test, or a whole new motor-type pipeline, is a config change — not new UI code. This is the piece that makes the system "adapt easily" rather than being a one-off project.

## 6. Test Inventory (from the source report)

### D.C. Motor — 15 tests total
**Pre-Test (8):** Visual/nameplate inspection · Mechanical inspection (air gap, commutator, brush pressure) · Continuity & cold resistance · Commutator segment-to-segment test · Polarity test (field poles) · Megger/IR test · HV withstand test · Impulse/surge test
**Intermediate (4):** No-load DOL start & run · Brush gear/MNA setting · Vibration analysis (no-load) · Bearing/winding temperature (no-load)
**Final (3):** Over-voltage test (130% rated) · Full-load performance test · Final Megger (post-run)

### A.C. Squirrel Cage Motor — 13 tests total
**Pre-Test (6):** Visual/nameplate inspection · Megger (phase-earth & phase-phase) · Continuity (phase windings) · Star/Delta connection verification · HV withstand test · Impulse/surge test
**Intermediate (4):** Three-phase voltage balance check · No-load run (current balance/speed/direction) · Pole count verification · Vibration analysis (no-load)
**Final (3):** Over-voltage test · Final bearing/winding temperature (under load) · Final Megger (post-run)

### A.C. Slip Ring Motor
SQIM pipeline in full, plus SR-1 through SR-14 (rotor winding tests, slip-ring assembly tests, brush rocker tests, transformation ratio, no-load with rotor shorted/open, etc.) inserted at the corresponding pre-test/intermediate/final points. — **Phase 2.**

### D.C. Generator (reference only, not in scope for Phase 1/2)
Shares the D.C. motor pre-test and mechanical stages; differs only in OCC/SCC characteristic curves and voltage regulation. Noted for potential Phase 3.

## 7. Data Model (Prisma / Postgres)

- `Organization` — the repair shop/company using the system
- `User` — employeeId, passwordHash, name, role, org
- `Job` — nameplate data, motor type, reason for entry, current stage, status
- `TestRecord` — jobId, testId (references pipeline config), stage, values (JSON), computed (JSON), status, equipment used, performedBy, reviewedBy, signedOff
- `Equipment` — name, serial number, calibration due date, org

## 8. Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router), TypeScript
- **Database:** Postgres (Supabase/Neon free tier for dev; any managed Postgres in prod), Prisma ORM
- **Auth:** Custom credentials (employee ID + bcrypt password hash), signed session cookie via `jose`
- **Validation:** Zod
- **Reports:** Server-rendered printable report page → PDF via browser print / headless render (library TBD at report-gen step)

## 9. Phasing & Estimates

| Phase | Scope | Est. time (solo, part-time) |
|---|---|---|
| **1 — MVP** | Auth, job intake, D.C. pipeline only (15 tests), gate logic, dynamic test forms w/ auto-calc, basic report generation | ~3–3.5 weeks |
| **2 — Full system** | A.C. SQIM + SRIM pipelines, equipment/calibration log + blocking, roles/permissions, dashboard, audit trail + immutable sign-off, optional multi-org support | ~3–4 weeks (5–6 with multi-tenant) |
| 3 — Future (not scoped) | D.C. Generator pipeline (OCC/SCC), analytics across jobs, mobile-friendly shop-floor entry, offline mode | TBD |

**Infra needs:** none beyond free-tier Vercel + free-tier Postgres until there are real paying/using organizations on it.

## 10. Non-Goals (for now)

- No mobile app (responsive web only)
- No integration with plant SCADA/PLC systems
- No billing/multi-tenant subscription logic in Phase 1 or 2
- No offline-first support

## 11. Open Questions (revisit later)

- PDF report library choice — browser-print-to-PDF (zero dependency) vs. a rendering library (more control, more setup)
- Whether "signed off" test records should be truly immutable at the DB level (append-only) or just UI-locked
- Multi-tenant data isolation strategy if/when this is offered to more than one org
