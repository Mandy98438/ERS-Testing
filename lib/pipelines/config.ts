import { PipelineConfig, TestDefinition } from "./types";

// Helper function to safely parse numbers
function num(val: any): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ─── D.C. MOTOR TEST PIPELINE (15 tests) ──────────────────────────────────
const dcTests: TestDefinition[] = [
  // --- PRE-TEST STAGE ---
  {
    id: "dc-pre-01",
    stage: "PRE",
    order: 1,
    title: "Visual Inspection & Nameplate Documentation",
    purpose: "Physical examination of the stationary motor and recording of nameplate data before any other test is performed.",
    fields: [
      { id: "inspected", label: "Inspected and verified nameplate", type: "boolean", required: true },
      { id: "visualDefects", label: "Visual defects or damage notes", type: "text", required: false },
    ],
    evaluate: (values) => !!values.inspected,
    passCriteriaNote: "Complete, legible nameplate record with no visible fatal defects.",
  },
  {
    id: "dc-pre-02",
    stage: "PRE",
    order: 2,
    title: "Mechanical Inspection — Air Gap, Commutator, Bearings, Brush Pressure",
    purpose: "Checks air gap uniformity, commutator run-out, mica undercut depth, and brush spring pressure on the stationary motor.",
    fields: [
      { id: "shaftTurnsFreely", label: "Shaft rotates freely by hand", type: "boolean", required: true },
      { id: "airGapUniform", label: "Air gap balanced across 4 quadrants", type: "boolean", required: true },
      { id: "commutatorRunoutMm", label: "Commutator run-out (must be < 0.025mm)", type: "number", unit: "mm", required: true },
      { id: "micaUndercutMm", label: "Mica undercut depth (must be 0.5-1.5mm)", type: "number", unit: "mm", required: true },
      { id: "brushSpringForceG", label: "Brush spring force (must be 150-250 g/cm^2)", type: "number", unit: "g/cm^2", required: true },
    ],
    evaluate: (values) => {
      const runout = num(values.commutatorRunoutMm);
      const undercut = num(values.micaUndercutMm);
      const force = num(values.brushSpringForceG);
      return (
        !!values.shaftTurnsFreely &&
        !!values.airGapUniform &&
        runout < 0.025 &&
        undercut >= 0.5 &&
        undercut <= 1.5 &&
        force >= 150 &&
        force <= 250
      );
    },
    passCriteriaNote: "Air gap balanced across 4 quadrants; commutator run-out < 0.025mm; mica undercut 0.5-1.5mm; brush spring force 150-250 g/cm^2.",
  },
  {
    id: "dc-pre-03",
    stage: "PRE",
    order: 3,
    title: "Continuity Test & Cold Winding Resistance",
    purpose: "Measures resistance of armature, shunt field, series field, and interpole windings at ambient temperature to confirm electrical completeness.",
    fields: [
      { id: "armatureResist", label: "Armature Winding (A1-A2)", type: "number", unit: "Ω", required: true },
      { id: "shuntResist", label: "Shunt Field Winding (F1-F2)", type: "number", unit: "Ω", required: true },
      { id: "seriesResist", label: "Series Field Winding (S1-S2) - optional", type: "number", unit: "Ω", required: false },
      { id: "ambientTempC", label: "Ambient Temperature", type: "number", unit: "°C", required: true },
    ],
    evaluate: (values) => {
      return num(values.armatureResist) > 0 && num(values.shuntResist) > 0;
    },
    passCriteriaNote: "Each winding within ~10% of design resistance; no open/short; parallel-path imbalance below ~5%.",
  },
  {
    id: "dc-pre-04",
    stage: "PRE",
    order: 4,
    title: "Commutator Segment-to-Segment (Differential) Test",
    purpose: "Measures resistance between every adjacent pair of commutator segments to check integrity of each individual armature coil.",
    fields: [
      { id: "maxDeviationPercent", label: "Maximum Segment Resistance Deviation", type: "number", unit: "%", required: true },
    ],
    evaluate: (values) => num(values.maxDeviationPercent) <= 5.0,
    passCriteriaNote: "All segment-to-segment readings approximately equal around the full commutator (deviation ≤ 5%).",
  },
  {
    id: "dc-pre-05",
    stage: "PRE",
    order: 5,
    title: "Polarity Test — Field Pole Sequence Verification",
    purpose: "Confirms main poles alternate N-S-N-S and interpoles carry correct relative polarity, via Ampere's Right-Hand Rule.",
    fields: [
      { id: "polesAlternating", label: "Main poles alternate N-S-N-S", type: "boolean", required: true },
      { id: "interpoleCorrect", label: "Interpole polarity correct relative to rotation", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.polesAlternating && !!values.interpoleCorrect,
    passCriteriaNote: "Correct N-S-N-S pole-by-pole map at the terminal board; interpole polarity correct relative to rotation direction.",
  },
  {
    id: "dc-pre-06",
    stage: "PRE",
    order: 6,
    title: "Megger Test — Insulation Resistance (IR)",
    purpose: "Applies a known DC test voltage between winding and frame and measures leakage current to determine insulation resistance.",
    fields: [
      { id: "appliedVoltageV", label: "Applied DC Megger Voltage", type: "number", unit: "V", required: true },
      { id: "ir1MinGigaOhms", label: "1-Minute Winding IR", type: "number", unit: "GΩ", required: true },
      { id: "ir10MinGigaOhms", label: "10-Minute Winding IR", type: "number", unit: "GΩ", required: true },
    ],
    compute: (values) => {
      const ir1 = num(values.ir1MinGigaOhms);
      const ir10 = num(values.ir10MinGigaOhms);
      const pi = ir1 > 0 ? ir10 / ir1 : 0;
      return {
        polarizationIndex: parseFloat(pi.toFixed(2)),
      };
    },
    evaluate: (values, computed) => {
      const ir1 = num(values.ir1MinGigaOhms);
      const pi = num(computed.polarizationIndex);
      return ir1 >= 0.1 && pi >= 1.5; // >= 100 MΩ and PI >= 1.5
    },
    passCriteriaNote: "Absolute minimum IR_min = V_rated(kV)+1 MΩ; workshop practice typically demands >100 MΩ (0.1 GΩ) and PI ≥ 1.5.",
  },
  {
    id: "dc-pre-07",
    stage: "PRE",
    order: 7,
    title: "High Voltage (HV) Withstand Test",
    purpose: "Applies elevated DC test voltage for 60 seconds to confirm insulation safety margin against real-service overvoltage transients.",
    fields: [
      { id: "appliedVoltageKV", label: "Applied DC Voltage", type: "number", unit: "kV", required: true },
      { id: "durationSeconds", label: "Test Duration (must be 60s)", type: "number", unit: "sec", required: true },
      { id: "withstood", label: "Winding withstood without flashover/puncture", type: "boolean", required: true },
      { id: "leakageCurrentMA", label: "Leakage Current", type: "number", unit: "mA", required: true },
    ],
    evaluate: (values) => !!values.withstood && num(values.leakageCurrentMA) <= 10 && num(values.durationSeconds) >= 60,
    passCriteriaNote: "No breakdown, rising leakage trend, audible discharge, or protection-relay trip during 60s hold. Must only be attempted after a passed Megger test.",
  },
  {
    id: "dc-pre-08",
    stage: "PRE",
    order: 8,
    title: "Impulse / Surge Test — Inter-Turn Insulation",
    purpose: "Applies a fast-rising voltage impulse and compares the resulting ring-down waveform across identical coil groups.",
    fields: [
      { id: "waveformDiffPercent", label: "Waveform Difference Index (must be < 15-20%)", type: "number", unit: "%", required: true },
    ],
    evaluate: (values) => num(values.waveformDiffPercent) <= 15.0,
    passCriteriaNote: "Waveform difference between any pair of coil groups below ~15-20% of full scale.",
  },

  // --- INTERMEDIATE STAGE ---
  {
    id: "dc-int-01",
    stage: "INTERMEDIATE",
    order: 9,
    title: "No-Load DOL Start & Run Test",
    purpose: "First application of power to the assembled motor with the shaft free of load; checks speed, current, and direction.",
    fields: [
      { id: "noLoadVoltageV", label: "No-Load Applied Voltage", type: "number", unit: "V", required: true },
      { id: "noLoadCurrentA", label: "No-Load Armature Current", type: "number", unit: "A", required: true },
      { id: "noLoadSpeedRpm", label: "Measured No-Load Speed", type: "number", unit: "rpm", required: true },
      { id: "directionCorrect", label: "Rotation direction correct", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.directionCorrect && num(values.noLoadSpeedRpm) > 0,
    passCriteriaNote: "Correct direction, no-load speed close to nameplate, current settles to low steady value, no abnormal sparking/vibration/noise.",
  },
  {
    id: "dc-int-02",
    stage: "INTERMEDIATE",
    order: 10,
    title: "Brush Gear / Magnetic Neutral Axis (MNA) Setting",
    purpose: "Rotates the brush rocker in small steps while observing sparking, and locks it at the position of minimum sparking.",
    fields: [
      { id: "sparkingGrade", label: "Sparking Grade (1 is minimum, 4 is severe)", type: "number", required: true },
      { id: "mnaLocked", label: "MNA verified and rocker locked", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.mnaLocked && num(values.sparkingGrade) === 1,
    passCriteriaNote: "Sparking rated 1 (minimum) on a standard 1-4 sparking scale at the locked brush rocker position.",
  },
  {
    id: "dc-int-03",
    stage: "INTERMEDIATE",
    order: 11,
    title: "Vibration Analysis (No-Load)",
    purpose: "Measures vibration velocity (RMS) at Drive End and Non-Drive End bearings, in vertical/horizontal/axial directions.",
    fields: [
      { id: "vibrationRmsMmS", label: "Max RMS Vibration Velocity (must be < 2.8 mm/s)", type: "number", unit: "mm/s", required: true },
    ],
    evaluate: (values) => num(values.vibrationRmsMmS) <= 2.8,
    passCriteriaNote: "v_RMS < 2.8 mm/s (ISO 10816-3 Zone A, rigid mounting, >15kW).",
  },
  {
    id: "dc-int-04",
    stage: "INTERMEDIATE",
    order: 12,
    title: "Bearing & Body Temperature Monitoring (No-Load)",
    purpose: "Records bearing (DE/NDE) and frame/winding temperature at 15, 30, 60 minutes after starting.",
    fields: [
      { id: "bearingTempDriveEndC", label: "Drive End Bearing Temp", type: "number", unit: "°C", required: true },
      { id: "bearingTempNonDriveEndC", label: "Non-Drive End Bearing Temp", type: "number", unit: "°C", required: true },
      { id: "frameTempC", label: "Motor Frame Temp", type: "number", unit: "°C", required: true },
    ],
    evaluate: (values) => num(values.bearingTempDriveEndC) <= 80 && num(values.bearingTempNonDriveEndC) <= 80 && num(values.frameTempC) <= 90,
    passCriteriaNote: "Temperatures reach thermal equilibrium within a reasonable time rather than continuing to climb, max bearing < 80°C.",
  },

  // --- FINAL STAGE ---
  {
    id: "dc-fin-01",
    stage: "FINAL",
    order: 13,
    title: "Over-Voltage Test (130% Rated Voltage)",
    purpose: "Sustained no-load over-voltage run to verify dielectric and commutation stability.",
    fields: [
      { id: "appliedVoltageV", label: "Applied Voltage (130% Rated)", type: "number", unit: "V", required: true },
      { id: "durationMinutes", label: "Hold Duration (must be ≥2 min)", type: "number", unit: "min", required: true },
      { id: "noFlashover", label: "No flashover, breakdown, or worsening arcing", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.noFlashover && num(values.durationMinutes) >= 2,
    passCriteriaNote: "No flashover, dielectric failure, or sharply worsening sparking; motor returns cleanly to normal at rated voltage.",
  },
  {
    id: "dc-fin-02",
    stage: "FINAL",
    order: 14,
    title: "Load Test — Full-Load Performance",
    purpose: "Runs the motor at load steps, recording current, speed, and calculating efficiency and speed regulation.",
    fields: [
      { id: "loadVoltageV", label: "Load Terminal Voltage", type: "number", unit: "V", required: true },
      { id: "loadCurrentA", label: "Load Line Current", type: "number", unit: "A", required: true },
      { id: "loadSpeedRpm", label: "Full-Load Speed", type: "number", unit: "rpm", required: true },
      { id: "powerInputKW", label: "Input Electrical Power", type: "number", unit: "kW", required: true },
      { id: "powerOutputKW", label: "Output Mechanical Power", type: "number", unit: "kW", required: true },
      { id: "noLoadSpeedRpm", label: "Reference No-Load Speed", type: "number", unit: "rpm", required: true },
    ],
    compute: (values) => {
      const vLoad = num(values.loadVoltageV);
      const iLoad = num(values.loadCurrentA);
      const sLoad = num(values.loadSpeedRpm);
      const sNoLoad = num(values.noLoadSpeedRpm);
      const pIn = num(values.powerInputKW);
      const pOut = num(values.powerOutputKW);

      const regulation = sLoad > 0 ? ((sNoLoad - sLoad) / sLoad) * 100 : 0;
      const efficiency = pIn > 0 ? (pOut / pIn) * 100 : 0;

      return {
        speedRegulationPercent: parseFloat(regulation.toFixed(2)),
        efficiencyPercent: parseFloat(efficiency.toFixed(2)),
      };
    },
    evaluate: (values, computed) => {
      const eff = num(computed.efficiencyPercent);
      const reg = num(computed.speedRegulationPercent);
      return eff >= 70.0 && reg <= 15.0;
    },
    passCriteriaNote: "All nameplate parameters (current, speed, efficiency, sparking grade) within tolerance at rated load.",
  },
  {
    id: "dc-fin-03",
    stage: "FINAL",
    order: 15,
    title: "Final Megger Test (Post-Run IR Check)",
    purpose: "Repeats the insulation resistance test within 5 minutes of shutdown, at operating temperature.",
    fields: [
      { id: "irHotGigaOhms", label: "Hot Insulation Resistance (Phase-Earth)", type: "number", unit: "GΩ", required: true },
      { id: "windingHotTempC", label: "Hot Winding Temperature", type: "number", unit: "°C", required: true },
    ],
    evaluate: (values) => num(values.irHotGigaOhms) >= 0.1,
    passCriteriaNote: "Post-run IR at or above an acceptable fraction (commonly >=50%) of the pre-test value, absolute min > 100 MΩ.",
  },
];

// ─── A.C. SQUIRREL CAGE TEST PIPELINE (13 tests) ──────────────────────────
const acSqimTests: TestDefinition[] = [
  // --- PRE-TEST STAGE ---
  {
    id: "ac-pre-01",
    stage: "PRE",
    order: 1,
    title: "Physical Status Recording & Visual Inspection",
    purpose: "Records nameplate data and inspects windings and terminal leads condition.",
    fields: [
      { id: "inspected", label: "Inspected and verified nameplate", type: "boolean", required: true },
      { id: "visualDefects", label: "Visual defects or damage notes", type: "text", required: false },
    ],
    evaluate: (values) => !!values.inspected,
    passCriteriaNote: "Complete, accurate nameplate record with no fatal cracks or defects.",
  },
  {
    id: "ac-pre-02",
    stage: "PRE",
    order: 2,
    title: "Megger Test — Phase-to-Earth and Phase-to-Phase",
    purpose: "Extends the IR test to three phases: 3 phase-to-earth plus 3 phase-to-phase.",
    fields: [
      { id: "appliedVoltageV", label: "Applied DC Megger Voltage", type: "number", unit: "V", required: true },
      { id: "irRToEarthGigaOhms", label: "Phase R to Earth IR", type: "number", unit: "GΩ", required: true },
      { id: "irYToEarthGigaOhms", label: "Phase Y to Earth IR", type: "number", unit: "GΩ", required: true },
      { id: "irBToEarthGigaOhms", label: "Phase B to Earth IR", type: "number", unit: "GΩ", required: true },
      { id: "irRYGigaOhms", label: "Phase R-Y Winding IR", type: "number", unit: "GΩ", required: true },
      { id: "irYBGigaOhms", label: "Phase Y-B Winding IR", type: "number", unit: "GΩ", required: true },
      { id: "irBRGigaOhms", label: "Phase B-R Winding IR", type: "number", unit: "GΩ", required: true },
    ],
    evaluate: (values) => {
      return (
        num(values.irRToEarthGigaOhms) >= 0.1 &&
        num(values.irYToEarthGigaOhms) >= 0.1 &&
        num(values.irBToEarthGigaOhms) >= 0.1 &&
        num(values.irRYGigaOhms) >= 0.1 &&
        num(values.irYBGigaOhms) >= 0.1 &&
        num(values.irBRGigaOhms) >= 0.1
      );
    },
    passCriteriaNote: "All six insulation readings must be above minimum standard (≥ 0.1 GΩ / 100 MΩ).",
  },
  {
    id: "ac-pre-03",
    stage: "PRE",
    order: 3,
    title: "Continuity Test — Phase Windings",
    purpose: "Checks continuity and resistance of each of the 3 phase windings, comparing them.",
    fields: [
      { id: "u_resist", label: "Phase U Cold Resistance (U1-U2)", type: "number", unit: "Ω", required: true },
      { id: "v_resist", label: "Phase V Cold Resistance (V1-V2)", type: "number", unit: "Ω", required: true },
      { id: "w_resist", label: "Phase W Cold Resistance (W1-W2)", type: "number", unit: "Ω", required: true },
    ],
    compute: (values) => {
      const u = num(values.u_resist);
      const v = num(values.v_resist);
      const w = num(values.w_resist);
      const avg = (u + v + w) / 3;
      if (avg === 0) return { maxUnbalancePercent: 0 };
      const maxDev = Math.max(Math.abs(u - avg), Math.abs(v - avg), Math.abs(w - avg));
      const unbalance = (maxDev / avg) * 100;
      return {
        maxUnbalancePercent: parseFloat(unbalance.toFixed(2)),
      };
    },
    evaluate: (values, computed) => {
      const u = num(values.u_resist);
      const v = num(values.v_resist);
      const w = num(values.w_resist);
      const unbalance = num(computed.maxUnbalancePercent);
      return u > 0 && v > 0 && w > 0 && unbalance <= 2.0;
    },
    passCriteriaNote: "All 3 phase resistances continuous and equal within 2.0% deviation.",
  },
  {
    id: "ac-pre-04",
    stage: "PRE",
    order: 4,
    title: "Connection Test — Star/Delta Verification",
    purpose: "Physically traces terminal-box connections against the nameplate configuration.",
    fields: [
      { id: "connectionMatches", label: "Terminal connection matches nameplate configuration", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.connectionMatches,
    passCriteriaNote: "Terminal box connection matches nameplate configuration (Star/Delta) exactly.",
  },
  {
    id: "ac-pre-05",
    stage: "PRE",
    order: 5,
    title: "High Voltage (HV) Test — 50Hz AC, 1 Minute",
    purpose: "Applies an elevated 50Hz AC test voltage for 60s to check dielectric safety margin.",
    fields: [
      { id: "appliedVoltageKV", label: "Applied AC Voltage", type: "number", unit: "kV", required: true },
      { id: "durationSeconds", label: "Test Duration (must be 60s)", type: "number", unit: "sec", required: true },
      { id: "withstood", label: "Winding withstood without flashover/puncture", type: "boolean", required: true },
      { id: "leakageCurrentMA", label: "Leakage Current", type: "number", unit: "mA", required: true },
    ],
    evaluate: (values) => !!values.withstood && num(values.leakageCurrentMA) <= 10 && num(values.durationSeconds) >= 60,
    passCriteriaNote: "No breakdown; performed only after a satisfactory Megger result.",
  },
  {
    id: "ac-pre-06",
    stage: "PRE",
    order: 6,
    title: "Impulse Test — Inter-Turn Insulation",
    purpose: "Applies a fast-rising impulse between phases and compares ring-down waveforms.",
    fields: [
      { id: "waveformDiffPercent", label: "Max Waveform Difference Index", type: "number", unit: "%", required: true },
    ],
    evaluate: (values) => num(values.waveformDiffPercent) <= 15.0,
    passCriteriaNote: "Difference index between any two phase waveforms must be below 15.0%.",
  },
  {
    id: "ac-pre-07",
    stage: "PRE",
    order: 7,
    title: "Three-Phase Supply Voltage Balance Check",
    purpose: "Measures three-phase line voltages and supply frequency at input source.",
    fields: [
      { id: "voltageUV", label: "Voltage U-V", type: "number", unit: "V", required: true },
      { id: "voltageVW", label: "Voltage V-W", type: "number", unit: "V", required: true },
      { id: "voltageWU", label: "Voltage W-U", type: "number", unit: "V", required: true },
      { id: "frequencyHz", label: "Supply Frequency", type: "number", unit: "Hz", required: true },
    ],
    compute: (values) => {
      const uv = num(values.voltageUV);
      const vw = num(values.voltageVW);
      const wu = num(values.voltageWU);
      const avg = (uv + vw + wu) / 3;
      if (avg === 0) return { voltageUnbalancePercent: 0 };
      const maxDev = Math.max(Math.abs(uv - avg), Math.abs(vw - avg), Math.abs(wu - avg));
      const unbalance = (maxDev / avg) * 100;
      return {
        voltageUnbalancePercent: parseFloat(unbalance.toFixed(2)),
      };
    },
    evaluate: (values, computed) => {
      const uv = num(values.voltageUV);
      const vw = num(values.voltageVW);
      const wu = num(values.voltageWU);
      const unbalance = num(computed.voltageUnbalancePercent);
      return uv > 0 && vw > 0 && wu > 0 && unbalance <= 2.0;
    },
    passCriteriaNote: "Supply voltages must be symmetrical with unbalance ≤ 2% per NEMA MG1.",
  },

  // --- INTERMEDIATE STAGE ---
  {
    id: "ac-int-01",
    stage: "INTERMEDIATE",
    order: 8,
    title: "No-Load Run — Current Balance, Speed & Direction",
    purpose: "First power-on to verify rotation direction, speed, and no-load current balance.",
    fields: [
      { id: "currentU", label: "No-Load Current Phase U", type: "number", unit: "A", required: true },
      { id: "currentV", label: "No-Load Current Phase V", type: "number", unit: "A", required: true },
      { id: "currentW", label: "No-Load Current Phase W", type: "number", unit: "A", required: true },
      { id: "speedRpm", label: "No-Load Speed", type: "number", unit: "rpm", required: true },
      { id: "directionCorrect", label: "Rotation direction correct", type: "boolean", required: true },
    ],
    compute: (values) => {
      const u = num(values.currentU);
      const v = num(values.currentV);
      const w = num(values.currentW);
      const avg = (u + v + w) / 3;
      if (avg === 0) return { currentUnbalancePercent: 0 };
      const maxDev = Math.max(Math.abs(u - avg), Math.abs(v - avg), Math.abs(w - avg));
      const unbalance = (maxDev / avg) * 100;
      return {
        currentUnbalancePercent: parseFloat(unbalance.toFixed(2)),
      };
    },
    evaluate: (values, computed) => {
      const unbalance = num(computed.currentUnbalancePercent);
      return !!values.directionCorrect && unbalance <= 10.0;
    },
    passCriteriaNote: "Correct direction, near-balanced 3-phase current (unbalance < 10%).",
  },
  {
    id: "ac-int-02",
    stage: "INTERMEDIATE",
    order: 9,
    title: "Number of Poles Verification",
    purpose: "Back-calculates pole count from measured no-load speed and supply frequency.",
    fields: [
      { id: "nameplatePoles", label: "Nameplate Pole Count", type: "number", required: true },
      { id: "frequencyHz", label: "Frequency", type: "number", unit: "Hz", required: true },
      { id: "speedRpm", label: "Measured No-Load Speed", type: "number", unit: "rpm", required: true },
    ],
    compute: (values) => {
      const f = num(values.frequencyHz);
      const speed = num(values.speedRpm);
      if (speed === 0) return { computedPoles: 0 };
      const rawPoles = (120 * f) / speed;
      let poles = Math.round(rawPoles);
      if (poles % 2 !== 0) {
        poles = poles + (rawPoles - poles > 0 ? 1 : -1);
      }
      return {
        computedPoles: Math.max(2, poles),
      };
    },
    evaluate: (values, computed) => {
      return num(values.nameplatePoles) === num(computed.computedPoles);
    },
    passCriteriaNote: "Calculated poles (120f / Nr rounded to even) must match nameplate value exactly.",
  },
  {
    id: "ac-int-03",
    stage: "INTERMEDIATE",
    order: 10,
    title: "Vibration Analysis — No-Load (DE & NDE, 3 axes)",
    purpose: "Measures mechanical vibration on bearings, checking for unbalance or stator slot forces.",
    fields: [
      { id: "vibrationRmsMmS", label: "Max RMS Vibration Velocity (must be < 2.8 mm/s)", type: "number", unit: "mm/s", required: true },
    ],
    evaluate: (values) => num(values.vibrationRmsMmS) <= 2.8,
    passCriteriaNote: "Within ISO 10816-3 Zone A limit (< 2.8 mm/s RMS) for rigid mounting.",
  },

  // --- FINAL STAGE ---
  {
    id: "ac-fin-01",
    stage: "FINAL",
    order: 11,
    title: "Over-Voltage Test (130% Rated Voltage, No-Load)",
    purpose: "Raises supply voltage to 130% of rated at no-load to test stator core saturation safety.",
    fields: [
      { id: "testVoltageV", label: "Applied Voltage (130% Rated)", type: "number", unit: "V", required: true },
      { id: "durationMinutes", label: "Duration (must be ≥2 min)", type: "number", unit: "min", required: true },
      { id: "stableRunning", label: "No saturation flashover, insulation remained intact", type: "boolean", required: true },
    ],
    evaluate: (values) => !!values.stableRunning && num(values.durationMinutes) >= 2,
    passCriteriaNote: "No insulation failure; stable run at 130% rated voltage.",
  },
  {
    id: "ac-fin-02",
    stage: "FINAL",
    order: 12,
    title: "Final Bearing & Winding Temperature Check (Under Load)",
    purpose: "Records stator winding and bearing temperatures at thermal equilibrium under rated load.",
    fields: [
      { id: "bearingTempDriveEndC", label: "Drive End Bearing Temp", type: "number", unit: "°C", required: true },
      { id: "bearingTempNonDriveEndC", label: "Non-Drive End Bearing Temp", type: "number", unit: "°C", required: true },
      { id: "windingTempC", label: "Hot Stator Winding Temp", type: "number", unit: "°C", required: true },
      { id: "ambientTempC", label: "Ambient Temperature", type: "number", unit: "°C", required: true },
    ],
    compute: (values) => {
      const winding = num(values.windingTempC);
      const ambient = num(values.ambientTempC);
      return {
        deltaT: parseFloat((winding - ambient).toFixed(1)),
      };
    },
    evaluate: (values, computed) => {
      const dt = num(computed.deltaT);
      const de = num(values.bearingTempDriveEndC);
      const nde = num(values.bearingTempNonDriveEndC);
      return de <= 80 && nde <= 80 && dt <= 80.0;
    },
    passCriteriaNote: "Temperatures stabilise and stay within insulation class limit (max bearings < 80°C, rise < 80°C).",
  },
  {
    id: "ac-fin-03",
    stage: "FINAL",
    order: 13,
    title: "Final Megger Test (Post-Run)",
    purpose: "Repeats phase IR test immediately after shutdown at operating hot temperature.",
    fields: [
      { id: "irRToEarthGigaOhms", label: "Hot Phase R-Earth IR", type: "number", unit: "GΩ", required: true },
      { id: "windingHotTempC", label: "Hot Winding Temp", type: "number", unit: "°C", required: true },
    ],
    evaluate: (values) => num(values.irRToEarthGigaOhms) >= 0.1,
    passCriteriaNote: "Hot insulation resistance must remain ≥ 0.1 GΩ (100 MΩ).",
  },
];

// ─── A.C. SLIP RING TEST PIPELINE (19 tests total) ──────────────────────────────
const acSrimTests: TestDefinition[] = [
  // 1. ac-pre-01
  acSqimTests[0],
  // 2. ac-pre-02
  acSqimTests[1],
  // 3. ac-pre-03
  acSqimTests[2],
  // 4. ac-pre-04
  acSqimTests[3],
  // 5. ac-pre-05
  acSqimTests[4],
  // 6. ac-pre-06
  acSqimTests[5],
  // 7. ac-pre-07
  acSqimTests[6],
  // 8. srim-01 (Rotor winding tests SR-1 to SR-4)
  {
    id: "srim-01",
    stage: "PRE",
    order: 8,
    title: "Rotor Winding Tests (SR-1 to SR-4)",
    purpose: "Additional pre-tests exclusive to Slip Ring rotors: rotor Megger to earth and inter-phase, rotor continuity, and rotor HV.",
    fields: [
      { id: "rotorAppliedVoltageV", label: "Rotor Megger Volt", type: "number", unit: "V", required: true },
      { id: "rotorIrEarthGigaOhms", label: "Rotor Winding-Earth IR", type: "number", unit: "GΩ", required: true },
      { id: "rotorIrInterPhaseGigaOhms", label: "Rotor Inter-Phase IR", type: "number", unit: "GΩ", required: true },
      { id: "rotorResistancesBalanced", label: "3 Rotor phase resistances equal (within 2%)", type: "boolean", required: true },
      { id: "rotorHvPassed", label: "Rotor winding HV withstood", type: "boolean", required: true },
    ],
    evaluate: (values) => {
      return (
        num(values.rotorIrEarthGigaOhms) >= 0.1 &&
        num(values.rotorIrInterPhaseGigaOhms) >= 0.1 &&
        !!values.rotorResistancesBalanced &&
        !!values.rotorHvPassed
      );
    },
    passCriteriaNote: "IR ≥ 0.1 GΩ (100 MΩ); rotor phase resistances balanced; no HV breakdown.",
  },
  // 9. srim-02 (Slip ring assembly tests SR-5, SR-6)
  {
    id: "srim-02",
    stage: "PRE",
    order: 9,
    title: "Slip Ring Assembly Tests (SR-5, SR-6)",
    purpose: "Individual ring-to-earth and ring-to-ring insulation Megger and HV testing.",
    fields: [
      { id: "appliedVoltageV", label: "Applied DC Megger Volt", type: "number", unit: "V", required: true },
      { id: "ringEarthMegaOhms", label: "Ring-to-Earth IR (must be ≥ 100 MΩ)", type: "number", unit: "MΩ", required: true },
      { id: "ringRingMegaOhms", label: "Ring-to-Ring IR (must be ≥ 100 MΩ)", type: "number", unit: "MΩ", required: true },
      { id: "ringHvPassed", label: "HV test withstood without flashover", type: "boolean", required: true },
    ],
    evaluate: (values) => {
      return (
        num(values.ringEarthMegaOhms) >= 100 &&
        num(values.ringRingMegaOhms) >= 100 &&
        !!values.ringHvPassed
      );
    },
    passCriteriaNote: "All Megger readings ≥ 100 MΩ; HV test passed with no breakdown.",
  },
  // 10. srim-03 (Brush rocker assembly tests SR-7, SR-8)
  {
    id: "srim-03",
    stage: "PRE",
    order: 10,
    title: "Brush Rocker Assembly Tests (SR-7, SR-8)",
    purpose: "Insulation testing (to earth and between brush arms) and HV test of the brush rocker structure.",
    fields: [
      { id: "rockerIrMegaOhms", label: "Rocker-Earth IR (must be ≥ 100 MΩ)", type: "number", unit: "MΩ", required: true },
      { id: "rockerHvPassed", label: "Rocker structure HV test passed", type: "boolean", required: true },
    ],
    evaluate: (values) => num(values.rockerIrMegaOhms) >= 100 && !!values.rockerHvPassed,
    passCriteriaNote: "Insulation resistance ≥ 100 MΩ; HV test passed with no breakdown.",
  },
  // 11. ac-int-01
  { ...acSqimTests[7], order: 11 },
  // 12. ac-int-02
  { ...acSqimTests[8], order: 12 },
  // 13. ac-int-03
  { ...acSqimTests[9], order: 13 },
  // 14. srim-04 (Transformation ratio test SR-9)
  {
    id: "srim-04",
    stage: "INTERMEDIATE",
    order: 14,
    title: "Transformation Ratio Test (SR-9)",
    purpose: "Measures open-circuit rotor voltage at slip rings with stator energized to determine turns ratio.",
    fields: [
      { id: "appliedStatorVoltageV", label: "Stator Applied Voltage", type: "number", unit: "V", required: true },
      { id: "openRotorVoltageV", label: "Open-Circuit Rotor Voltage", type: "number", unit: "V", required: true },
    ],
    compute: (values) => {
      const stator = num(values.appliedStatorVoltageV);
      const rotor = num(values.openRotorVoltageV);
      return {
        transformationRatio: rotor > 0 ? parseFloat((stator / rotor).toFixed(3)) : 0,
      };
    },
    evaluate: (values) => num(values.openRotorVoltageV) > 0,
    passCriteriaNote: "Transformation ratio successfully measured with valid rotor voltage.",
  },
  // 15. srim-05 (No-load tests rotor shorted/open SR-10, SR-11)
  {
    id: "srim-05",
    stage: "INTERMEDIATE",
    order: 15,
    title: "No-Load Tests, Rotor Shorted / Rotor Open (SR-10, SR-11)",
    purpose: "DOL start with rotor shorted at slip rings, and checking starting configuration with external resistance.",
    fields: [
      { id: "runShortedOk", label: "Motor runs stable with slip rings shorted", type: "boolean", required: true },
      { id: "runWithResistanceOk", label: "Motor starting resistance configuration correct", type: "boolean", required: true },
      { id: "noLoadStatorCurrentA", label: "Measured No-Load Stator Current", type: "number", unit: "A", required: true },
    ],
    evaluate: (values) => !!values.runShortedOk && !!values.runWithResistanceOk,
    passCriteriaNote: "Normal starting and running behavior observed in both rotor configurations.",
  },
  // 16. ac-fin-01
  { ...acSqimTests[10], order: 16 },
  // 17. ac-fin-02
  { ...acSqimTests[11], order: 17 },
  // 18. srim-06 (Over-Voltage, Vibration, Bearing & Final Clearance SR-12 to SR-14)
  {
    id: "srim-06",
    stage: "FINAL",
    order: 18,
    title: "Over-Voltage, Vibration, Bearing & Final Clearance (SR-12 to SR-14)",
    purpose: "Overvoltage run, vibration check of slip rings, bearing temp stabilization, and brush contact verification.",
    fields: [
      { id: "overVoltagePassed", label: "No insulation flashover or breakdown", type: "boolean", required: true },
      { id: "maxVibrationMmS", label: "Max RMS Vibration Velocity (must be ≤ 2.8 mm/s)", type: "number", unit: "mm/s", required: true },
      { id: "bearingTempRiseC", label: "Max Bearing Temperature Rise (must be ≤ 80°C)", type: "number", unit: "°C", required: true },
      { id: "slipRingSurfaceOk", label: "Slip ring surface condition verified smooth and clean", type: "boolean", required: true },
      { id: "brushContactOk", label: "Brush contact quality verified satisfactory", type: "boolean", required: true },
    ],
    evaluate: (values) => {
      return (
        !!values.overVoltagePassed &&
        num(values.maxVibrationMmS) <= 2.8 &&
        num(values.bearingTempRiseC) <= 80 &&
        !!values.slipRingSurfaceOk &&
        !!values.brushContactOk
      );
    },
    passCriteriaNote: "All final clearances satisfactory; bearing rise ≤ 80°C; vibration ≤ 2.8 mm/s RMS; visual surfaces clean.",
  },
  // 19. ac-fin-03
  { ...acSqimTests[12], order: 19 },
];

export const pipelines: Record<string, PipelineConfig> = {
  DC_SHUNT: {
    motorType: "DC_SHUNT",
    label: "D.C. Shunt Motor Pipeline",
    tests: dcTests,
  },
  DC_SERIES: {
    motorType: "DC_SERIES",
    label: "D.C. Series Motor Pipeline",
    tests: dcTests,
  },
  DC_COMPOUND: {
    motorType: "DC_COMPOUND",
    label: "D.C. Compound Motor Pipeline",
    tests: dcTests,
  },
  AC_SQIM: {
    motorType: "AC_SQIM",
    label: "A.C. Squirrel Cage Motor Pipeline",
    tests: acSqimTests,
  },
  AC_SRIM: {
    motorType: "AC_SRIM",
    label: "A.C. Slip Ring Motor Pipeline",
    tests: acSrimTests,
  },
};

export function getPipeline(motorType: string): PipelineConfig | undefined {
  return pipelines[motorType];
}
