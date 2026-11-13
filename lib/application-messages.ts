// Ready-made replies to job applicants (Staff Centre → Team → Applications → open a candidate).
// Nothing is sent from here: the draft opens in the person's own email app or is copied.
export type AppReply = 'accept' | 'decline' | 'interview'

export const APP_REPLY_LABEL: Record<AppReply, string> = { accept: 'Acceptance', decline: 'Decline', interview: 'Interview invite' }

export function applicationReply(kind: AppReply, name: string, role: string, company = 'NOVOURQ'): { subject: string; body: string } {
  const n = name.trim() || 'there'
  const r = role.trim() || 'the role'
  const sign = `Best Regards,\n\n${company}`
  if (kind === 'decline') return {
    subject: `Your application for ${r} at ${company}`,
    body: `Hi ${n},\n\nThank you for your interest in the ${r} position at ${company}.\n\nUnfortunately, we will not be moving forward with your application, but we appreciate your time and interest in ${company}.\n\n${sign}`,
  }
  if (kind === 'interview') return {
    subject: `Interview for ${r} at ${company}`,
    body: `Hi ${n},\n\nThank you for applying for the ${r} position at ${company}. We would like to invite you to an interview.\n\nPlease reply with the days and times that suit you and we will confirm a slot.\n\n${sign}`,
  }
  return {
    subject: `Your application for ${r} at ${company}`,
    body: `Hi ${n},\n\nThank you for your interest in the ${r} position at ${company}.\n\nWe are pleased to let you know that your application has been successful and we would like to offer you the position. We will send the details and next steps shortly.\n\nPlease reply to confirm that you would like to go ahead.\n\n${sign}`,
  }
}
