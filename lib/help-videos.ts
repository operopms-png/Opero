// Help Centre video walkthroughs (app/help/page.tsx). Each video is a file in public/help:
// <id>.mp4 and a cover image <id>.jpg. To add one, drop both files there and add a line here.
export type HelpVideo = { id: string; title: string; blurb: string; length: string }

export const HELP_VIDEOS: HelpVideo[] = [
  { id: 'getting-started', title: 'Getting started', blurb: 'The left menu, what each area is for and where to begin.', length: '0:38' },
  { id: 'real-estate-intelligence', title: 'Real Estate Intelligence', blurb: 'Properties, tenants, leases, rent, maintenance and compliance, and how the tabs work.', length: '0:40' },
  { id: 'novourq-cloud-ai', title: 'Novourq Cloud AI', blurb: 'What the AI does for you, how to switch skills on, and what always waits for your approval.', length: '0:35' },
  { id: 'human-intelligence-hub', title: 'Human Intelligence Hub', blurb: 'Your customers, team and finances in four groups, with a search across every page.', length: '0:38' },
  { id: 'map-and-3d', title: 'Map, floors and 3D walk-through', blurb: 'Every property on a map, flats by floor, floor plans and the 3D tour, plus showcasing a development.', length: '0:42' },
  { id: 'settings', title: 'Settings', blurb: 'Your account, team access, payments, AI authority, voice and privacy.', length: '0:37' },
]
