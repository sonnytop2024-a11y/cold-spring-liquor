/** Auto-format US phone number as user types: (512) 123-4567 */
export function formatPhoneUS(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** True only when all 10 digits are entered */
export function isValidPhoneUS(value: string): boolean {
  return value.replace(/\D/g, "").length === 10;
}

/** Strip formatting → E.164 for Twilio */
export function toE164(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
}
