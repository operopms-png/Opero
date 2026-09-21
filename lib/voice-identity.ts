// Twilio Client identities only allow letters, numbers, =, +, / (base64-ish
// characters) -- not the full range an email or UUID can contain in every
// case, so this derives a safe, stable identity per staff member rather
// than using their raw auth id or email directly.
export function voiceIdentityFor(staffAuthId: string): string {
  return 'staff_' + staffAuthId.replace(/[^a-zA-Z0-9]/g, '')
}
