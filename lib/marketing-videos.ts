// Marketing → Video library: shared lists and types (safe to import in the browser and on the server).
export const VIDEO_BUCKET = 'marketing-videos'
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024
export const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'image/jpeg', 'image/png', 'image/webp']
export const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'X', 'Snapchat', 'LinkedIn', 'YouTube'] as const
export const STATUSES = ['Draft', 'Ready', 'Scheduled', 'Posted'] as const

export type VideoStatus = typeof STATUSES[number]
export type VideoRow = {
  id: string; business_id: string; title: string; caption: string | null; hashtags: string | null
  platforms: string[]; status: VideoStatus; scheduled_for: string | null; posted_at: string | null; posted_platforms: string[]
  notes: string | null; file_path: string; file_name: string | null; mime: string | null; size_bytes: number | null
  created_by: string | null; created_at: string; updated_at: string
  url?: string | null; download_url?: string | null
}

export const isImage = (mime?: string | null) => !!mime && mime.startsWith('image/')
export const fileSize = (n?: number | null) => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'

// What gets pasted into Instagram, TikTok, X and so on: the caption followed by the hashtags.
export function postText(v: { caption?: string | null; hashtags?: string | null }) {
  const tags = String(v.hashtags ?? '').split(/[\s,]+/).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t).join(' ')
  return [String(v.caption ?? '').trim(), tags].filter(Boolean).join('\n\n')
}
