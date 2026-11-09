// Electricity limit on furnished properties: the company covers up to a set amount per bill, the tenant pays anything above it.
export function limitSplit(amount: number, limit: number | null | undefined) {
  if (limit == null || !(limit >= 0)) return null
  const covered = Math.min(amount, limit), over = Math.max(0, Math.round((amount - limit) * 100) / 100)
  return { covered, over }
}
