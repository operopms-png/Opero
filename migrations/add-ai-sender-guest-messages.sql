-- Run this in Supabase SQL Editor (project mzjsxrlgnthelwwtfkke)
--
-- Lets an AI-generated auto-reply be recorded distinctly from a
-- human-typed staff reply in the guest message thread, for
-- transparency/audit -- rather than quietly logging AI replies as if
-- a person wrote them.

ALTER TABLE str_guest_messages DROP CONSTRAINT IF EXISTS str_guest_messages_sender_check;
ALTER TABLE str_guest_messages ADD CONSTRAINT str_guest_messages_sender_check CHECK (sender IN ('staff','guest','ai'));

NOTIFY pgrst, 'reload schema';
