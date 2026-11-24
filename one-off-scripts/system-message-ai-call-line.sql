-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke), after migrations/add-retell-calls-portal.sql
INSERT INTO system_messages (title, body, type, published, created_at)
VALUES (
  'AI Call Line',
  'Human Intelligence Hub, Inbox has a new AI Call Line tab. Every call your Nova voice agent answers lands there with the caller, callback number, reason, a short AI summary, the full transcript, the recording and a status you can move from New to Followed up to Closed. Each company only sees its own calls: ask an admin to press Connect a number and add the Retell agent ID or phone number once.',
  'feature',
  true,
  now()
);
