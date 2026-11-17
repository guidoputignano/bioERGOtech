-- =========================================================
-- Migration: Research Centres campaign, people in copy (Cc)
--
-- Institutions often answer with colleagues in copy ("I have copied our
-- Director of Field Trips"). Replies from the portal must keep them in the
-- conversation, as "Reply all" does.
--
-- rc_messages.cc_emails:
--  - inbound: everyone on the reply's To and Cc lines except us and the
--    sender, read by the reply sync. NULL = not read yet (the sync fills it
--    for recent replies on its next run; an empty list = nobody in copy);
--  - outbound: the addresses the e-mail is copied to. A reply drafted in
--    the portal starts with the people on the institution's last message,
--    and can be edited before approval.
-- Nullable, no default: existing rows stay NULL; nothing else changes.
-- =========================================================

alter table public.rc_messages add column if not exists cc_emails text[];

comment on column public.rc_messages.cc_emails is
  'Inbound: other people on the To/Cc lines (NULL = not read yet). Outbound: addresses in Cc.';
