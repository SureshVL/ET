// Normalises Indian phone numbers to strict 10-digit format
// Handles: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function validatePhone(raw: string): boolean {
  return /^\d{10}$/.test(normalisePhone(raw));
}

export function validatePincode(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return /^\d{6}$/.test(digits);
}

export function normalisePincode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}
