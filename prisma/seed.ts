import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const referencesData = [
  {
    id: "dc-pre-01",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Visual Inspection & Nameplate Documentation",
    description: "Physical examination of the stationary motor and recording of nameplate data before any other test is performed.",
    sciencePrinciple: "No electrical principle involved; nameplate data defines every numerical threshold used in later tests.",
    formula: null,
    passFailCriteria: "Complete, legible nameplate record with no visible fatal defects.",
    source: "SAIL Bhilai Industrial Report §4.1.1",
    tags: ["nameplate", "visual", "dc", "pre-test"]
  },
  {
    id: "dc-pre-02",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Mechanical Inspection — Air Gap, Commutator, Bearings, Brush Pressure",
    description: "Checks air gap uniformity, commutator run-out, mica undercut depth, and brush spring pressure on the stationary motor.",
    sciencePrinciple: "Uneven air gap creates unbalanced magnetic pull (force varies with square of local flux density); commutator run-out causes brush bounce and arcing; brush pressure governs contact resistance via P = F/A.",
    formula: "P = F / A",
    passFailCriteria: "Air gap balanced across 4 quadrants; commutator run-out < ~0.025mm; mica undercut 0.5-1.5mm; brush spring force 150-250 g/cm^2.",
    source: "SAIL Bhilai Industrial Report §4.1.2",
    tags: ["mechanical", "commutator", "brush", "dc", "pre-test"]
  },
  {
    id: "dc-pre-03",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Continuity Test & Cold Winding Resistance",
    description: "Measures resistance of armature, shunt field, series field, and interpole windings at ambient temperature to confirm electrical completeness and establish a baseline for later temperature-rise calculation.",
    sciencePrinciple: "Direct application of Ohm's Law (R=V/I); copper resistance varies with temperature per R_T = R_0[1+alpha(T-T0)], alpha=0.00393/degC.",
    formula: "R_T = R_0 [1 + alpha(T - T0)]",
    passFailCriteria: "Each winding within ~10% of design resistance; no open/short; parallel-path imbalance below ~5%.",
    source: "SAIL Bhilai Industrial Report §4.1.3",
    tags: ["resistance", "winding", "dc", "pre-test", "ohms-law"]
  },
  {
    id: "dc-pre-04",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Commutator Segment-to-Segment (Differential) Test",
    description: "Measures resistance between every adjacent pair of commutator segments to check integrity of each individual armature coil.",
    sciencePrinciple: "By Kirchhoff's Voltage Law, identical coils must give identical segment-to-segment readings; ~2x average indicates an open coil, near-zero indicates a shorted coil.",
    formula: null,
    passFailCriteria: "All segment-to-segment readings approximately equal around the full commutator.",
    source: "SAIL Bhilai Industrial Report §4.1.4",
    tags: ["commutator", "armature", "dc", "pre-test"]
  },
  {
    id: "dc-pre-05",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Polarity Test — Field Pole Sequence Verification",
    description: "Confirms main poles alternate N-S-N-S and interpoles carry correct relative polarity, via Ampere's Right-Hand Rule.",
    sciencePrinciple: "A reversed pole produces a cancelling rather than additive force, causing little or no net torque.",
    formula: null,
    passFailCriteria: "Correct N-S-N-S pole-by-pole map at the terminal board; interpole polarity correct relative to rotation direction.",
    source: "SAIL Bhilai Industrial Report §4.1.5",
    tags: ["polarity", "field-poles", "dc", "pre-test"]
  },
  {
    id: "dc-pre-06",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Megger Test — Insulation Resistance (IR)",
    description: "Applies a known DC test voltage between winding and frame (or between windings) and measures leakage current to determine insulation resistance; Polarization Index (10-min/1-min ratio) checked where time allows.",
    sciencePrinciple: "IR follows Ohm's Law applied to the leakage path; IR approximately halves for every 10 degC rise; low PI signals trapped moisture.",
    formula: "IR = V_test / I_leak ; IR_min(MOhm) = V_rated(kV) + 1",
    passFailCriteria: "Absolute minimum IR_min = V_rated(kV)+1 MOhm; workshop practice typically demands >100 MOhm for a freshly rewound motor.",
    source: "SAIL Bhilai Industrial Report §4.1.6",
    tags: ["insulation", "megger", "ir", "dc", "pre-test", "gate-condition"]
  },
  {
    id: "dc-pre-07",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "High Voltage (HV) Withstand Test",
    description: "Applies elevated DC test voltage for 60 seconds to confirm insulation safety margin against real-service overvoltage transients; armature and field tested separately, each to earth.",
    sciencePrinciple: "Thin spots, voids or surface contamination can pass Megger yet fail under higher voltage stress.",
    formula: "V_test = 2 x V_rated + 1000V (held 60s)",
    passFailCriteria: "No breakdown, rising leakage trend, audible discharge, or protection-relay trip during 60s hold. Must only be attempted after a passed Megger test.",
    source: "SAIL Bhilai Industrial Report §4.1.7",
    tags: ["hv-test", "insulation", "dc", "pre-test", "gate-condition"]
  },
  {
    id: "dc-pre-08",
    category: "test_procedure",
    machineType: "DC",
    testStage: "PRE_TEST",
    title: "Impulse / Surge Test — Inter-Turn Insulation",
    description: "Applies a fast-rising voltage impulse and compares the resulting ring-down waveform across identical coil groups (or around the commutator) to detect inter-turn shorts invisible to Megger and HV tests.",
    sciencePrinciple: "Coil inductance/capacitance form a resonant circuit; a shorted turn shifts ring frequency and waveform shape.",
    formula: null,
    passFailCriteria: "Waveform difference between any pair of coil groups below ~15-20% of full scale.",
    source: "SAIL Bhilai Industrial Report §4.1.8",
    tags: ["surge-test", "inter-turn", "insulation", "dc", "pre-test"]
  },
  {
    id: "dc-int-01",
    category: "test_procedure",
    machineType: "DC",
    testStage: "INTERMEDIATE",
    title: "No-Load DOL Start & Run Test",
    description: "First application of power to the assembled motor with the shaft free of load; checks direction, no-load speed, inrush-current decay, and absence of abnormal noise/vibration/sparking over a minimum 30-minute run.",
    sciencePrinciple: "At start Eb=0 so Ia=V/Ra (10-15x rated current, expected); as speed rises Eb builds and current falls to a low steady no-load value (20-40% rated). Series motors must never run at true no-load (risk of runaway) and always carry a small coupled load during this test.",
    formula: "Eb = (phi Z N P)/(60A) ; Ia = (V - Eb)/Ra",
    passFailCriteria: "Correct direction, no-load speed close to nameplate, current settles to low steady value, no abnormal sparking/vibration/noise.",
    source: "SAIL Bhilai Industrial Report §4.2.1",
    tags: ["no-load", "dc", "intermediate", "back-emf"]
  },
  {
    id: "dc-int-02",
    category: "test_procedure",
    machineType: "DC",
    testStage: "INTERMEDIATE",
    title: "Brush Gear / Magnetic Neutral Axis (MNA) Setting",
    description: "Rotates the brush rocker in small steps while observing sparking, and locks it at the position of minimum sparking under no-load conditions.",
    sciencePrinciple: "MNA is the position where rate of change of flux linkage in the commutating coil is zero (no induced EMF at that instant); at no-load this coincides with the geometric neutral axis.",
    formula: null,
    passFailCriteria: "Sparking rated 1 (minimum) on a standard 1-4 sparking scale at the locked brush rocker position.",
    source: "SAIL Bhilai Industrial Report §4.2.2",
    tags: ["mna", "brush", "commutation", "dc", "intermediate"]
  },
  {
    id: "dc-int-03",
    category: "test_procedure",
    machineType: "DC",
    testStage: "INTERMEDIATE",
    title: "Vibration Analysis (No-Load)",
    description: "Measures vibration velocity (RMS) at Drive End and Non-Drive End bearings, in vertical/horizontal/axial directions, to establish the purely-mechanical baseline before load is applied.",
    sciencePrinciple: "Rotor imbalance appears at once-per-revolution frequency, misalignment near twice that, bearing defects at non-synchronous frequencies tied to bearing geometry.",
    formula: null,
    passFailCriteria: "v_RMS < 2.8 mm/s (ISO 10816-3 Zone A, rigid mounting, >15kW).",
    source: "SAIL Bhilai Industrial Report §4.2.3",
    tags: ["vibration", "iso-10816", "dc", "intermediate"]
  },
  {
    id: "dc-int-04",
    category: "test_procedure",
    machineType: "DC",
    testStage: "INTERMEDIATE",
    title: "Bearing & Body Temperature Monitoring (No-Load)",
    description: "Records bearing (DE/NDE) and frame/winding temperature at 15, 30, 60 minutes after starting to confirm thermal stabilization before any load is applied.",
    sciencePrinciple: "Bearing temperature rise reflects friction losses and lubrication/alignment condition; winding temp rise at no-load is small but establishes the baseline for later full-load temperature-rise measurement.",
    formula: null,
    passFailCriteria: "Temperatures reach thermal equilibrium within a reasonable time rather than continuing to climb.",
    source: "SAIL Bhilai Industrial Report §4.2.4",
    tags: ["thermal", "bearing", "dc", "intermediate"]
  },
  {
    id: "dc-fin-01",
    category: "test_procedure",
    machineType: "DC",
    testStage: "FINAL",
    title: "Over-Voltage Test (130% Rated Voltage)",
    description: "With motor at no-load steady state, supply voltage is gradually raised to 130% of rated value and held ≥2 minutes while current, speed, and sparking are monitored.",
    sciencePrinciple: "Simulates realistic overvoltage transients from switching operations, load rejection, or fault clearance on the supply network.",
    formula: null,
    passFailCriteria: "No flashover, dielectric failure, or sharply worsening sparking; motor returns cleanly to normal at rated voltage.",
    source: "SAIL Bhilai Industrial Report §4.3.1",
    tags: ["over-voltage", "dc", "final"]
  },
  {
    id: "dc-fin-02",
    category: "test_procedure",
    machineType: "DC",
    testStage: "FINAL",
    title: "Load Test — Full-Load Performance",
    description: "Runs the motor at 25/50/75/100% of rated load, recording voltage, armature/field current, speed, input/output power and efficiency at each step; full-load condition sustained ~1 hour with temperature monitoring.",
    sciencePrinciple: "Total losses = armature+field copper loss (I^2R) + core loss + friction/windage + stray load loss; a well-designed shunt motor holds nearly constant speed across the load range (low speed regulation).",
    formula: "eta = P_out/P_in x 100% ; S.R. = (N_NL - N_FL)/N_FL x 100%",
    passFailCriteria: "All nameplate parameters (current, speed, efficiency, sparking grade) within tolerance at rated load.",
    source: "SAIL Bhilai Industrial Report §4.3.2",
    tags: ["load-test", "efficiency", "speed-regulation", "dc", "final"]
  },
  {
    id: "dc-fin-03",
    category: "test_procedure",
    machineType: "DC",
    testStage: "FINAL",
    title: "Final Megger Test (Post-Run IR Check)",
    description: "Repeats the insulation resistance test within ~5 minutes of shutdown, at operating temperature, and compares against the pre-test cold IR value.",
    sciencePrinciple: "Heating can raise IR (drives off residual moisture) or lower it (reveals thermally-induced weakness not visible cold); comparing the two readings distinguishes the cases.",
    formula: null,
    passFailCriteria: "Post-run IR at or above an acceptable fraction (commonly >=50%) of the pre-test value.",
    source: "SAIL Bhilai Industrial Report §4.3.3",
    tags: ["insulation", "megger", "post-run", "dc", "final", "gate-condition"]
  },
  {
    id: "ac-pre-01",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Physical Status Recording & Visual Inspection",
    description: "Records nameplate data (rated voltage, current, power, speed, frequency, Star/Delta connection, IP rating, insulation class) and the physical condition of windings and leads.",
    sciencePrinciple: "Sets the scope and numerical thresholds for every subsequent test.",
    formula: null,
    passFailCriteria: "Complete, accurate nameplate record.",
    source: "SAIL Bhilai Industrial Report §6.1.1",
    tags: ["nameplate", "visual", "ac", "pre-test"]
  },
  {
    id: "ac-pre-02",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Megger Test — Phase-to-Earth and Phase-to-Phase",
    description: "Extends the DC-style IR test to three phases: 3 phase-to-earth readings (R,Y,B) plus 3 phase-to-phase readings (R-Y, Y-B, B-R).",
    sciencePrinciple: "Same Ohm's Law leakage-path principle as the DC Megger test, applied across all phase combinations since phases must stay isolated from each other and from earth.",
    formula: "IR_min(MOhm) = V_rated(kV) + 1",
    passFailCriteria: "All six readings above minimum standard and approximately equal to one another (large variance flags a single damaged phase).",
    source: "SAIL Bhilai Industrial Report §6.1.2",
    tags: ["insulation", "megger", "three-phase", "ac", "pre-test", "gate-condition"]
  },
  {
    id: "ac-pre-03",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Continuity Test — Phase Windings",
    description: "Checks continuity/resistance of each of the 3 phase windings, comparing them to each other.",
    sciencePrinciple: "An undetected open phase can cause single-phasing in service — dangerously high current in the remaining two phases, overheating rapidly.",
    formula: null,
    passFailCriteria: "All 3 phase resistances continuous and equal within ~2%.",
    source: "SAIL Bhilai Industrial Report §6.1.3",
    tags: ["continuity", "three-phase", "ac", "pre-test"]
  },
  {
    id: "ac-pre-04",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Connection Test — Star/Delta Verification",
    description: "Physically traces terminal-box connections against the nameplate-specified Star or Delta configuration.",
    sciencePrinciple: "Delta-wound motor connected in Star under-excites it (V_line/sqrt3 per winding); Star-wound motor connected in Delta over-volts each winding by sqrt3 — destroys the winding almost immediately on power-up. Has no DC equivalent.",
    formula: null,
    passFailCriteria: "Terminal box connection matches nameplate configuration exactly.",
    source: "SAIL Bhilai Industrial Report §6.1.4",
    tags: ["star-delta", "connection", "ac", "pre-test", "ac-exclusive"]
  },
  {
    id: "ac-pre-05",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "High Voltage (HV) Test — 50Hz AC, 1 Minute",
    description: "Applies an elevated 50Hz AC test voltage for 60s, first phase-to-earth (other two phases earthed) then phase-to-phase (third phase open).",
    sciencePrinciple: "AC stress is more representative of real operating conditions and more effective at revealing surface leakage paths than the equivalent DC test.",
    formula: "V_test = 2 x V_rated + 1000V (AC, 50Hz, 60s)",
    passFailCriteria: "No breakdown/pass on each phase and phase-pair combination; performed only after a satisfactory Megger result.",
    source: "SAIL Bhilai Industrial Report §6.1.5",
    tags: ["hv-test", "insulation", "ac", "pre-test", "gate-condition"]
  },
  {
    id: "ac-pre-06",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Impulse Test — Inter-Turn Insulation",
    description: "Applies a fast-rising impulse between each pair of phase terminals (R-Y, Y-B, B-R) and compares ring-down waveforms across the three identically-wound phases.",
    sciencePrinciple: "A turn-to-turn fault in any phase changes that phase's inductance and ring frequency, producing a mismatched waveform.",
    formula: null,
    passFailCriteria: "Difference index between any two phase waveforms below ~15%.",
    source: "SAIL Bhilai Industrial Report §6.1.6",
    tags: ["surge-test", "inter-turn", "ac", "pre-test"]
  },
  {
    id: "ac-pre-07",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "PRE_TEST",
    title: "Three-Phase Supply Voltage Balance Check",
    description: "Measures the three line voltages (V_R, V_Y, V_B) and supply frequency before the motor is even switched on.",
    sciencePrinciple: "Voltage unbalance creates a negative-sequence current producing a counter-rotating field that opposes torque and adds heating; even 2% unbalance can raise current/heating by 8-10%.",
    formula: "%Unbalance = (max deviation from average / average) x 100",
    passFailCriteria: "Unbalance <= 1% typical, 2% maximum per NEMA MG1.",
    source: "SAIL Bhilai Industrial Report §6.2.1",
    tags: ["voltage-balance", "supply", "ac", "pre-test", "nema-mg1"]
  },
  {
    id: "ac-int-01",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "INTERMEDIATE",
    title: "No-Load Run — Current Balance, Speed & Direction",
    description: "First power-on of the motor itself; records phase currents (I_R,I_Y,I_B), no-load speed, direction of rotation, and current-unbalance percentage.",
    sciencePrinciple: "At no-load slip is low (1-5%); current drawn is mostly magnetising current (30-50% rated); unequal phase currents at no-load point to winding asymmetry since the magnetic circuit should be identical across phases.",
    formula: null,
    passFailCriteria: "Correct direction; near-balanced 3-phase current (unbalance <~10% of average); speed close to synchronous.",
    source: "SAIL Bhilai Industrial Report §6.2.2",
    tags: ["no-load", "current-balance", "direction", "ac", "intermediate"]
  },
  {
    id: "ac-int-02",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "INTERMEDIATE",
    title: "Number of Poles Verification",
    description: "Back-calculates pole count from measured no-load speed and known supply frequency, using data already collected in the no-load run test.",
    sciencePrinciple: "Since Ns=120f/P and no-load speed sits close to Ns at light load, pole count can be recovered from measured speed.",
    formula: "P = 120f / N_measured",
    passFailCriteria: "Calculated pole count is an even integer exactly matching the nameplate value.",
    source: "SAIL Bhilai Industrial Report §6.2.3",
    tags: ["poles", "synchronous-speed", "ac", "intermediate", "ac-exclusive"]
  },
  {
    id: "ac-int-03",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "INTERMEDIATE",
    title: "Vibration Analysis — No-Load (DE & NDE, 3 axes)",
    description: "Same purpose as the DC equivalent, with an additional AC-specific twice-supply-frequency vibration component (100/120Hz) from electromagnetic stator slot forces.",
    sciencePrinciple: "ISO 10816-3 vibration severity classification, extended to include electromagnetic excitation not present in a DC machine.",
    formula: null,
    passFailCriteria: "Within ISO 10816-3 Zone A/B limit for the machine's power/mounting class.",
    source: "SAIL Bhilai Industrial Report §6.2.4",
    tags: ["vibration", "iso-10816", "ac", "intermediate"]
  },
  {
    id: "ac-fin-01",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "FINAL",
    title: "Over-Voltage Test (130% Rated Voltage, No-Load)",
    description: "Raises supply voltage to 130% of rated at no-load, sustained >=2 minutes, monitoring 3-phase voltage/current and speed.",
    sciencePrinciple: "At 130% rated voltage the stator core can enter magnetic saturation; non-linear B-H curve behaviour causes disproportionate magnetising-current rise and higher core losses/insulation stress.",
    formula: null,
    passFailCriteria: "No insulation failure; disproportionate but stable current increase consistent with saturation is expected and acceptable.",
    source: "SAIL Bhilai Industrial Report §6.3.1",
    tags: ["over-voltage", "saturation", "ac", "final"]
  },
  {
    id: "ac-fin-02",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "FINAL",
    title: "Final Bearing & Winding Temperature Check (Under Load)",
    description: "Records bearing (DE/NDE) and winding temperature at 15min, 60min, and at thermal equilibrium under sustained rated load.",
    sciencePrinciple: "Total losses = stator copper loss (3xI^2R per phase) + rotor copper loss + core loss + friction/windage; must remain within insulation class limit (e.g. Class F permits 100degC rise above 40degC ambient).",
    formula: null,
    passFailCriteria: "Temperatures stabilise (change <1degC over final 30 min) and stay within insulation class limit.",
    source: "SAIL Bhilai Industrial Report §6.3.2",
    tags: ["thermal", "insulation-class", "load", "ac", "final"]
  },
  {
    id: "ac-fin-03",
    category: "test_procedure",
    machineType: "AC_SQIM",
    testStage: "FINAL",
    title: "Final Megger Test (Post-Run)",
    description: "Repeats the phase IR test promptly after shutdown, at operating temperature, and compares to the pre-test cold value from §6.1.2.",
    sciencePrinciple: "Same leakage-current-under-DC-test-voltage principle as the pre-test Megger, now applied hot to detect any degradation caused by the load and over-voltage tests.",
    formula: null,
    passFailCriteria: "Post-run IR not sharply reduced versus pre-test value; otherwise this is the final despatch gate.",
    source: "SAIL Bhilai Industrial Report §6.3.3",
    tags: ["insulation", "megger", "post-run", "ac", "final", "gate-condition"]
  },
  {
    id: "srim-01",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "PRE_TEST",
    title: "Rotor Winding Tests (SR-1 to SR-4)",
    description: "Additional pre-tests exclusive to Slip Ring Induction Motors: rotor Megger with slip rings connected, rotor Megger with slip rings isolated (inter-phase IR), rotor continuity check, and rotor HV test — because SRIM rotors carry an insulated wound winding unlike bare SQIM cage bars.",
    sciencePrinciple: "Same Ohm's-Law and dielectric-withstand principles as stator tests, applied to the rotor circuit.",
    formula: "V_test(rotor HV) = 2 x V_rotor(rated) + 1000V (50Hz AC, 60s)",
    passFailCriteria: "IR >= (V_rotor(kV)+1) MOhm; 3 rotor phase resistances equal within ~2%; no HV breakdown.",
    source: "SAIL Bhilai Industrial Report §7.1 (SR-1 to SR-4)",
    tags: ["srim", "rotor", "insulation", "ac", "pre-test"]
  },
  {
    id: "srim-02",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "PRE_TEST",
    title: "Slip Ring Assembly Tests (SR-5, SR-6)",
    description: "Individual ring-to-earth and ring-to-ring Megger, plus a 50Hz AC HV test on the slip-ring assembly.",
    sciencePrinciple: "The slip-ring assembly is a separate insulated component requiring independent verification from the rotor winding itself.",
    formula: "V_test = 2 x V_rotor + 1000V",
    passFailCriteria: "All Megger readings >= 100 MOhm (workshop practice); HV test passed with no breakdown.",
    source: "SAIL Bhilai Industrial Report §7.2 (SR-5, SR-6)",
    tags: ["srim", "slip-ring", "insulation", "ac", "pre-test"]
  },
  {
    id: "srim-03",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "PRE_TEST",
    title: "Brush Rocker Assembly Tests (SR-7, SR-8)",
    description: "Megger (to earth and between brush arms) and HV test of the brush rocker structure and brush holders.",
    sciencePrinciple: "Confirms insulation of the rocker structure itself, independent of the slip rings and rotor winding.",
    formula: null,
    passFailCriteria: "Passes independent Megger and HV thresholds for the rocker assembly.",
    source: "SAIL Bhilai Industrial Report §7.3 (SR-7, SR-8)",
    tags: ["srim", "brush-rocker", "insulation", "ac", "pre-test"]
  },
  {
    id: "srim-04",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "INTERMEDIATE",
    title: "Transformation Ratio Test (SR-9)",
    description: "At standstill, rated stator voltage is applied and the open-circuit rotor voltage at the slip rings is measured to compute the stator/rotor turns ratio.",
    sciencePrinciple: "Characterises the SRIM as a transformer at standstill; used to size external rotor resistance for starting and speed control.",
    formula: "k = V_stator(line) / V_rotor(open-circuit, standstill) ; V_rotor(s) = s x V_rotor(standstill)",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §7.4 (SR-9)",
    tags: ["srim", "transformation-ratio", "ac", "intermediate"]
  },
  {
    id: "srim-05",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "INTERMEDIATE",
    title: "No-Load Tests, Rotor Shorted / Rotor Open (SR-10, SR-11)",
    description: "DOL start with rotor short-circuited at slip rings (equivalent to the SQIM no-load test), and a separate run with maximum external rotor resistance in circuit to confirm starting configuration.",
    sciencePrinciple: "Verifies both the running condition and the resistance-starting scheme unique to SRIMs.",
    formula: null,
    passFailCriteria: "Normal running behaviour in both rotor configurations.",
    source: "SAIL Bhilai Industrial Report §7.4 (SR-10, SR-11)",
    tags: ["srim", "no-load", "starting", "ac", "intermediate"]
  },
  {
    id: "srim-06",
    category: "test_procedure",
    machineType: "AC_SRIM",
    testStage: "FINAL",
    title: "Over-Voltage, Vibration, Bearing & Final Clearance (SR-12 to SR-14)",
    description: "130% over-voltage test with rotor shorted (confirms stator insulation margin), vibration analysis including slip-ring assembly mass, and final bearing temperature/slip-ring surface/brush-contact inspection for despatch clearance.",
    sciencePrinciple: "Same principles as the SQIM final tests, extended to account for the added rotating mass and additional insulated components of the SRIM.",
    formula: null,
    passFailCriteria: "All SQIM final-stage criteria plus acceptable slip-ring surface condition and brush contact quality.",
    source: "SAIL Bhilai Industrial Report §7.4 (SR-12 to SR-14)",
    tags: ["srim", "over-voltage", "vibration", "final"]
  },
  {
    id: "dcgen-01",
    category: "test_procedure",
    machineType: "DC_GENERATOR",
    testStage: "REFERENCE",
    title: "Open Circuit Characteristic (OCC)",
    description: "Generator driven at rated speed with armature open-circuited; field current stepped from zero and resulting open-circuit terminal voltage recorded — the machine's magnetisation curve.",
    sciencePrinciple: "At constant speed, E0 is determined entirely by flux, which depends on field current linearly at first then with diminishing return as the core saturates.",
    formula: "E0 = (phi Z N P)/(60A) = K phi N",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §8.1",
    tags: ["generator", "occ", "magnetisation-curve", "dc", "reference"]
  },
  {
    id: "dcgen-02",
    category: "test_procedure",
    machineType: "DC_GENERATOR",
    testStage: "REFERENCE",
    title: "Short Circuit Characteristic (SCC) & Voltage Regulation",
    description: "Armature short-circuited through an ammeter; field current increased until rated armature current flows, plotted against field current. Combined with OCC, gives internal impedance and voltage regulation.",
    sciencePrinciple: "Allows calculation of synchronous/armature impedance and assessment of voltage regulation under load.",
    formula: "VR% = (V_NL - V_FL)/V_FL x 100%",
    passFailCriteria: "Well-designed generator typically shows VR below 5%.",
    source: "SAIL Bhilai Industrial Report §8.2",
    tags: ["generator", "scc", "voltage-regulation", "dc", "reference"]
  },
  {
    id: "principle-01",
    category: "equation",
    machineType: "DC",
    testStage: "REFERENCE",
    title: "Lorentz Force Law (Motor Principle)",
    description: "Basis of DC motor torque production: a current-carrying conductor in a magnetic field experiences a mechanical force, direction given by Fleming's Left-Hand Rule.",
    sciencePrinciple: null,
    formula: "F = B x I x L x sin(theta)",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §2",
    tags: ["lorentz-force", "dc", "fundamental"]
  },
  {
    id: "principle-02",
    category: "equation",
    machineType: "DC",
    testStage: "REFERENCE",
    title: "Back-EMF and Starting Current",
    description: "As the armature rotates it generates an opposing back-EMF that self-regulates armature current; explains the large-but-brief inrush current at start-up.",
    sciencePrinciple: null,
    formula: "Eb = (phi Z N P)/(60A) ; Ia = (V-Eb)/Ra",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §2.1",
    tags: ["back-emf", "starting-current", "dc", "fundamental"]
  },
  {
    id: "principle-03",
    category: "equation",
    machineType: "AC_SQIM",
    testStage: "REFERENCE",
    title: "Synchronous Speed and Slip",
    description: "Ns is the speed of the rotating magnetic field itself; slip is the fractional difference between Ns and actual rotor speed Nr — the relative motion is essential to induce rotor current and torque.",
    sciencePrinciple: null,
    formula: "Ns = 120f/P ; s = (Ns-Nr)/Ns",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §5",
    tags: ["synchronous-speed", "slip", "ac", "fundamental"]
  },
  {
    id: "principle-04",
    category: "equation",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "Copper Resistance-Temperature Relation",
    description: "Basis of the resistance method of temperature measurement, used to calculate winding temperature rise from cold and hot resistance readings.",
    sciencePrinciple: null,
    formula: "R_T = R_0[1+alpha(T-T0)], alpha=0.00393/degC ; DeltaT = (R_hot-R_cold)/(R_cold x alpha)",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §4.1.3, §11.4",
    tags: ["temperature-rise", "copper", "thermal", "fundamental"]
  },
  {
    id: "principle-05",
    category: "equation",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "Insulation Resistance & HV Test Voltage",
    description: "Ohm's Law applied to the insulation leakage path, and the standard IEC 60034-1 HV withstand test voltage formula.",
    sciencePrinciple: null,
    formula: "IR = V_test/I_leak ; IR_min(MOhm)=V_rated(kV)+1 ; V_test=2xV_rated+1000V",
    passFailCriteria: null,
    source: "SAIL Bhilai Industrial Report §11.3, IEC 60034-1",
    tags: ["insulation", "hv-test", "iec-60034", "fundamental"]
  },
  {
    id: "principle-06",
    category: "equation",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "Vibration Severity Classification",
    description: "ISO 10816-3 zones for vibration velocity, applied identically to DC and AC motors above 15kW on rigid mounting.",
    sciencePrinciple: null,
    formula: "v_RMS < 2.8 mm/s = Zone A (newly acceptable)",
    passFailCriteria: "Zone B up to 4.5mm/s acceptable for continued service; Zone C (4.5-7.1mm/s) increased monitoring; Zone D (>7.1mm/s) immediate shutdown.",
    source: "SAIL Bhilai Industrial Report §11.5, ISO 10816-3",
    tags: ["vibration", "iso-10816", "fundamental"]
  },
  {
    id: "std-01",
    category: "standard",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "ANSI/EASA AR100-2015",
    description: "Industry recommended-practice standard for the repair of induction, synchronous, and DC rotating electrical apparatus, covering recordkeeping, tests, and analysis for each stage of rewinding and rebuilding. Most repair-shop internal work instructions are built on this standard.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "ANSI/EASA AR100-2015",
    tags: ["standard", "easa", "repair", "recordkeeping"]
  },
  {
    id: "std-02",
    category: "standard",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "IEEE 43-2000",
    description: "Governs insulation resistance and Polarization Index (PI) testing frequency and interpretation. Recommends IR testing at least quarterly with a full PI test annually; IR values should be corrected to 40 degC for consistent trend comparison across tests over time.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: "Quarterly IR testing minimum; annual PI test for critical motors.",
    source: "IEEE 43-2000",
    tags: ["standard", "insulation", "polarization-index", "trending"]
  },
  {
    id: "std-03",
    category: "standard",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "IEC 60034 Series",
    description: "Base international standard for rotating electrical machines; defines HV withstand test voltage (2xV_rated+1000V), insulation resistance minimum, and insulation temperature classes (e.g. Class F permits 100degC rise above 40degC ambient).",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "IEC 60034-1",
    tags: ["standard", "iec", "insulation-class", "hv-test"]
  },
  {
    id: "std-04",
    category: "reliability_data",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "IEEE/EPRI Motor Reliability Surveys (1983-1995)",
    description: "Landmark industry-wide reliability surveys covering large industrial and utility motors. Found bearing faults, followed by winding faults, to be the most prevalent failure modes across industries; also found that repaired motors often fail sooner than expected due to poor repair practices.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "IEEE Transactions on Industry Applications / Energy Conversion, 1983-1995",
    tags: ["reliability", "failure-modes", "bearing-faults", "historical"]
  },
  {
    id: "std-05",
    category: "reliability_data",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "Maintenance Frequency vs Failure Rate (IEEE 1985 Study)",
    description: "Found that motors maintained on a cycle under 12 months had a failure rate of 0.0124 failures-per-unit-year, versus 0.0506 for 13-24 month cycles and 0.0881 for cycles beyond 25 months — a quantified case for regular test/maintenance cadence.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "IEEE Report of Large Motor Reliability Survey, 1985",
    tags: ["reliability", "maintenance-frequency", "failure-rate", "historical"]
  },
  {
    id: "std-06",
    category: "reliability_data",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "EASA Repair-vs-Replace Study",
    description: "Found that just over three-quarters (79%) of motors submitted for evaluation were found repairable, with the remainder (21%) replaced — relevant baseline for a repair/replace decision field in motor history.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "EASA / Plant Engineering study",
    tags: ["reliability", "repair-vs-replace", "easa"]
  },
  {
    id: "std-07",
    category: "reliability_data",
    machineType: "GENERAL",
    testStage: "REFERENCE",
    title: "Large HV Motor Field Study (483 units, 6135 unit-years)",
    description: "Tracked condition-monitoring methods, maintenance philosophy, and failure types across 483 high-voltage motor units over 6,135 combined unit-years, linking monitoring method to failure-initiator identification.",
    sciencePrinciple: null,
    formula: null,
    passFailCriteria: null,
    source: "IEEE Transactions, condition monitoring field study",
    tags: ["reliability", "condition-monitoring", "field-study"]
  }
];

async function main() {
  console.log("Seeding database (reference library)...");

  // 1. Clean existing records in dependency order
  // TestRecords reference TestReference, so delete TestRecords first
  await prisma.testRecord.deleteMany();
  await prisma.testReference.deleteMany();
  await prisma.job.deleteMany();
  await prisma.motor.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log("Cleared database.");

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Industrial ERS Central Shop",
    },
  });
  console.log(`Created Organization: ${org.name}`);
  const orgId = org.id;

  // 3. Create Users
  const usersToCreate = [
    {
      employeeId: "EMP-ADMIN",
      name: "Admin Manager",
      role: "ADMIN" as const,
      password: "admin123",
    },
    {
      employeeId: "EMP-ENG",
      name: "Mayank Lead Engineer",
      role: "ENGINEER" as const,
      password: "eng123",
    },
    {
      employeeId: "EMP-TECH",
      name: "Raj Technician",
      role: "TECHNICIAN" as const,
      password: "tech123",
    },
  ];

  for (const u of usersToCreate) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: {
        employeeId: u.employeeId,
        name: u.name,
        role: u.role,
        passwordHash,
        organizationId: orgId,
      },
    });
    console.log(`Created user: ${user.name} (${user.role})`);
  }

  // 4. Create Equipment
  const activeDate = new Date();
  activeDate.setFullYear(activeDate.getFullYear() + 1);

  const expiredDate = new Date();
  expiredDate.setMonth(expiredDate.getMonth() - 2);

  const equipmentToCreate = [
    {
      name: "Megger Insulation Tester (MIT525)",
      serialNumber: "MEG-10293",
      calibrationDueOn: activeDate,
    },
    {
      name: "Megger Insulation Tester (MIT525) [EXPIRED]",
      serialNumber: "MEG-EXPIRED",
      calibrationDueOn: expiredDate,
    },
    {
      name: "HV AC/DC Withstand Tester 50kV",
      serialNumber: "HV-88271",
      calibrationDueOn: activeDate,
    },
    {
      name: "HV AC/DC Withstand Tester [EXPIRED]",
      serialNumber: "HV-EXPIRED",
      calibrationDueOn: expiredDate,
    },
    {
      name: "Fluke 8845A Precision Multimeter",
      serialNumber: "MM-4491",
      calibrationDueOn: activeDate,
    },
    {
      name: "SKF CMAS 100-SL Vibration Pen",
      serialNumber: "VIB-7362",
      calibrationDueOn: activeDate,
    },
  ];

  for (const eq of equipmentToCreate) {
    await prisma.equipment.create({
      data: {
        ...eq,
        organizationId: orgId,
      },
    });
  }
  console.log("Seeded equipment.");

  // 5. Seed TestReference Table with 49 entries
  for (const ref of referencesData) {
    await prisma.testReference.create({
      data: {
        id: ref.id,
        category: ref.category,
        machineType: ref.machineType,
        testStage: ref.testStage,
        title: ref.title,
        description: ref.description,
        sciencePrinciple: ref.sciencePrinciple,
        formula: ref.formula,
        passFailCriteria: ref.passFailCriteria,
        source: ref.source,
        tags: ref.tags,
      },
    });
  }
  console.log(`Seeded ${referencesData.length} TestReferences.`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
