// The company's own time zone (Settings → Currency), used to decide what "today" is on the server.
export const TIMEZONES = [
  { v: 'Europe/London', l: 'UK (London)' },
  { v: 'Europe/Dublin', l: 'Ireland (Dublin)' },
  { v: 'Europe/Paris', l: 'Central Europe (Paris, Berlin, Madrid)' },
  { v: 'Asia/Dubai', l: 'UAE (Dubai)' },
  { v: 'America/Jamaica', l: 'Jamaica' },
  { v: 'America/New_York', l: 'US Eastern (New York)' },
  { v: 'America/Chicago', l: 'US Central (Chicago)' },
  { v: 'America/Denver', l: 'US Mountain (Denver)' },
  { v: 'America/Los_Angeles', l: 'US Pacific (Los Angeles)' },
  { v: 'America/Toronto', l: 'Canada Eastern (Toronto)' },
  { v: 'America/Vancouver', l: 'Canada Pacific (Vancouver)' },
]
export const DEFAULT_TZ = 'Europe/London'
export const isTz = (v: any) => TIMEZONES.some(t => t.v === v)
export const todayIn = (tz?: string | null) => new Intl.DateTimeFormat('en-CA', { timeZone: tz || DEFAULT_TZ }).format(new Date())
