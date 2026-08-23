// ============================================================
// LEAD VALIDATION — shared between the public form (real-time
// input restriction as someone types) and /api/leads (the actual
// enforcement boundary — client-side checks are just UX, never
// trust them alone).
// ============================================================

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())
}

// US phone numbers only for now — 10 digits, optionally with a
// leading 1 (11 digits). Extend this if/when international leads
// become relevant.
export function isValidPhone(phone) {
  const d = digitsOnly(phone)
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}

export function isValidZip(zip) {
  return /^\d{5}$/.test(digitsOnly(zip))
}
