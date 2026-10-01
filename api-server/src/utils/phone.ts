import { parsePhoneNumber } from 'libphonenumber-js';

// Normalizes to E.164 (e.g. "+919876543210") so the same number always maps
// to the same DB row regardless of how the user typed it (spaces, no country
// code, etc). Falls through unchanged on parse failure — validation catches that.
export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const parsed = parsePhoneNumber(value, 'IN');
    return parsed?.isValid() ? parsed.format('E.164') : value;
  } catch {
    return value;
  }
}
