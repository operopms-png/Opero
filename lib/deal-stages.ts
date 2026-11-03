// Pipeline stages for a saved deal, in order. Rejected sits outside the path.
export const DEAL_STAGES = ['Found', 'Screened', 'Offer', 'Due diligence', 'Completed', 'Rejected'] as const
export type DealStage = typeof DEAL_STAGES[number]
export const STAGE_COLOR: Record<string, string> = { Found: '#579BFC', Screened: '#9D50DD', Offer: '#FDAB3D', 'Due diligence': '#E2A03F', Completed: '#00C875', Rejected: '#DF2F4A' }
