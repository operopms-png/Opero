<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Keep the guide and the AI in step with the product

Whenever you add, change or remove a feature a user can see, update the same commit's copy of both: `lib/portal-guide.ts` (the HOW_TO text Novourq Cloud AI and Novourq Voice read) and `components/settings/GuidePanel.tsx` (Settings → Guide). Say where to find it, what it does and its limits. Add the page's blue banner text in `lib/page-banners.ts`, and a line in `lib/tab-descriptions.ts` for any new Real Estate Intelligence tab.

Staff stay up to date through Staff Training. In the same commit, add a line at the top of `lib/whats-new.ts` (date, short title, one plain sentence) for every user-visible change, and for a new or changed tab add its steps to `STEPS` in `lib/tab-guides.ts` (a new tab appears there on its own with a Basic guide until you do).
