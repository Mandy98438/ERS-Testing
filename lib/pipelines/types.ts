// The pipeline engine is config-driven: adding a new test, or a new
// motor-type pipeline, means adding an entry here — no new UI code needed.
// The dynamic form component (components/TestForm.tsx) renders any
// TestDefinition automatically.

export type Stage = "PRE" | "INTERMEDIATE" | "FINAL";

export type FieldType = "number" | "text" | "select" | "boolean";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[]; // for select
  required?: boolean;
}

export interface TestDefinition {
  id: string; // stable id, referenced by TestRecord.testId
  stage: Stage;
  order: number; // execution order within the whole pipeline
  title: string;
  purpose: string; // one-line "why this test, at this point"
  fields: FieldDef[];
  // Optional auto-calculation. Receives the raw field values for this
  // test and returns computed key/value pairs to store alongside them.
  compute?: (values: Record<string, number | string | boolean>) => Record<string, number | string>;
  // Optional pass/fail evaluator. Returns true if the entered values
  // pass the test's acceptance criteria (used to auto-suggest a status,
  // technician can still override).
  evaluate?: (
    values: Record<string, number | string | boolean>,
    computed: Record<string, number | string>
  ) => boolean;
  passCriteriaNote: string; // human-readable summary shown on the form
}

export interface PipelineConfig {
  motorType: string;
  label: string;
  tests: TestDefinition[];
}
