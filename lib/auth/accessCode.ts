import { randomBytes } from "crypto";

// Short, human-typeable code handed to the client on the intake slip —
// not meant to be cryptographically strong, just enough to keep the
// status lookup from being purely guessable off the job number.
export function generateAccessCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}
