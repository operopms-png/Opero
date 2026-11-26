<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Keep the guide and the AI in step with the product

Whenever you add, change or remove a feature a user can see, update the same commit's copy of both: `lib/portal-guide.ts` (the HOW_TO text Novourq Cloud AI and Novourq Voice read) and `components/settings/GuidePanel.tsx` (Settings → Guide). Say where to find it, what it does and its limits. Add the page's blue banner text in `lib/page-banners.ts`, and a line in `lib/tab-descriptions.ts` for any new Real Estate Intelligence tab.

Staff stay up to date through Staff Training. In the same commit, add a line at the top of `lib/whats-new.ts` (date, short title, one plain sentence) for every user-visible change, and for a new or changed tab add its steps to `STEPS` in `lib/tab-guides.ts` (a new tab appears there on its own with a Basic guide until you do).

# Everything new must link to everything relevant

Nothing is built on its own. When you create a feature, table or page, connect it to every part of the portal it touches, in the same commit, and say what you linked and what you could not:

- **Records:** link to the related records (CRM contact and deal, Client Properties, Landlord Leads, Property Management and Estate Agency homes, tasks, documents). Changes should flow both ways, and one real-world thing must be counted once, never as two records.
- **Numbers:** feed the Dashboard, the KPI Tracker and Road to 100 where the new data belongs, from the same source of truth, not a second copy.
- **AI:** give Novourq Cloud AI (Ask AI `portalContext` and `[[…]]` actions in `lib/ask-ai.ts`) and Novourq Voice (`lib/voice-agent.ts` tools) a way to see and use it, with the same access the owner has.
- **Guide:** `lib/portal-guide.ts`, `components/settings/GuidePanel.tsx`, `lib/page-banners.ts`, `lib/tab-guides.ts`, `lib/whats-new.ts` (see above).
- **Companies:** keep it per company (`business_id` / `user_id`), with the same RLS pattern including the view-only restrictive policies.
- **Freshness:** screens that show shared numbers refresh themselves; do not rely on a manual reload.
