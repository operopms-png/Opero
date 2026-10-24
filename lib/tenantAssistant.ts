// Tenant portal assistant: rules that decide what the AI may answer itself and what
// always goes to a person.
//
// Answers: only the approved answers below. The AI picks which approved topic a
// tenant's message is about; it never writes the reply text itself.
// Anything that matches a safety/money/legal keyword, or where the tenant asks for a
// person, or where no approved answer fits, goes to a person with an alert.

export type ApprovedAnswer = { id: string; topic: string; answer: string }

// Add approved answers here. Until you add some, every message goes to a person.
// Example (do not use as is):
// { id: 'bins', topic: 'Bin collection day', answer: 'Bins go out on Tuesday evening for Wednesday collection.' },
export const APPROVED_ANSWERS: ApprovedAnswer[] = []

const ESCALATE_PATTERNS: { reason: string; pattern: RegExp }[] = [
  { reason: 'money', pattern: /\b(deposit|refund|rent (owed|arrears|increase)|arrears|overcharg|charged|deduct|deduction|fee|invoice|bill|payment|pay(ed|ing)? (late|twice)|money)\b/i },
  { reason: 'notice or eviction', pattern: /\b(notice|evict|eviction|section 21|section 8|court|bailiff|leave the (flat|property|house)|kick(ed)? out|tenancy end|end (my|the) tenancy)\b/i },
  { reason: 'right to rent', pattern: /\b(right to rent|visa|passport|immigration|share code|brp)\b/i },
  { reason: 'complaint', pattern: /\b(complain|complaint|unhappy|angry|disgusted|unacceptable|ombudsman|solicitor|lawyer|legal action|sue)\b/i },
  { reason: 'safety', pattern: /\b(gas|smell|leak|leaking|flood|flooding|fire|smoke|electric|sparks?|shock|burn|injur|hurt|emergency|collapsed|mould|mold|carbon monoxide|co alarm|danger|unsafe)\b/i },
  { reason: 'asked for a person', pattern: /\b(speak to (a |someone|somebody|a person|a human)|talk to (a |someone|somebody|a person|a human)|real person|human|person please|manager|call me|ring me)\b/i },
]

// Returns the reason a message must go to a person, or null if the rules allow an answer.
export function escalationReason(text: string): string | null {
  for (const rule of ESCALATE_PATTERNS) {
    if (rule.pattern.test(text)) return rule.reason
  }
  return null
}

export const HOLDING_REPLY = 'Thank you for your message. A member of our team has been told and will reply as soon as they can.'
