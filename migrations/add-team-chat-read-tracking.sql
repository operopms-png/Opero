-- Lets the merged Inbox show an accurate Unread tab for internal Team
-- Chat conversations, same as it already can for WhatsApp/SMS. One
-- timestamp per person per conversation -- updated whenever they open
-- it, compared against the conversation's most recent message.
alter table staff_conversation_members add column if not exists last_read_at timestamptz;
