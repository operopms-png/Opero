import { createHmac } from 'crypto'
import { SITE_URL } from '@/lib/brand'
// CVs sit in a private bucket. Staff get a link that is signed so it can't be guessed; opening it
// redirects to a short-lived download of the file (app/api/cv).
const sig = (p: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'x').update(p).digest('hex').slice(0, 32)
export const cvLink = (path: string) => `${SITE_URL}/api/cv?p=${encodeURIComponent(path)}&s=${sig(path)}`
export const cvValid = (path: string, s: string) => !!path && s === sig(path)
