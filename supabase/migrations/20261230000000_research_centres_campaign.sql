-- =========================================================
-- Migration: Research Centres campaigns (first campaign:
-- "US Research Student Collaboration – August 2027").
--
-- What it adds
--   rc_campaigns         one row per campaign: sender, campaign facts used
--                        in the e-mails, follow-up schedule, sending switch
--   rc_templates         editable e-mail templates (versioned)
--   rc_institutions      prospective hosts: research, score, pipeline stage,
--                        engagement record
--   rc_contacts          people or department channels, with referrals
--   rc_messages          every outbound and inbound message, with thread ids
--   rc_reply_labels      reviewable classification of inbound replies
--   rc_tasks             follow-ups, calls, meetings, quotations
--   rc_costs             itemised quotations
--   rc_suppressions      addresses and domains never to contact again
--   rc_events            audit trail
--
-- Independence from the Outreach & MoU Pipeline
--   Nothing here references outreach_contacts, outreach_sends or mou_*,
--   and nothing there references these. /api/cron/check-replies and
--   /api/cron/mou-followup only read their own tables, so they can never
--   pick up or e-mail a research-centre contact.
--
-- Who writes
--   Only the server, through the service role key, behind requireAdmin()
--   or CRON_SECRET. RLS on, no policies, privileges revoked from anon and
--   authenticated.
--
-- Safe to re-run. Additive only.
-- =========================================================

-- ── 1. Campaigns ──────────────────────────────────────────────────────
create table if not exists public.rc_campaigns (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        not null unique,
  name               text        not null,
  description        text,
  status             text        not null default 'draft'
                     check (status in ('draft','approved','active','paused','closed')),
  -- Sender. The send path only accepts an address also listed in the
  -- RC_ALLOWED_SENDERS environment variable.
  sender_name        text,
  sender_email       text,
  reply_to           text,
  sender_provider    text        not null default 'gmail' check (sender_provider in ('resend','gmail')),
  reply_mailbox      text,
  -- Campaign facts used in the e-mails. Null = not confirmed: a message
  -- that needs one cannot be approved.
  selection_status   text,        -- e.g. "are being selected" / "have been selected"
  age_range          text,        -- e.g. "16 to 18"
  chaperone          text,        -- e.g. "a member of Foundation staff"
  -- Follow-ups, counted from the INITIAL e-mail.
  schedule_mode      text        not null default 'business' check (schedule_mode in ('business','calendar')),
  followup1_days     int         not null default 3 check (followup1_days between 1 and 30),
  followup2_days     int         not null default 7 check (followup2_days between 2 and 45),
  no_response_after_days int     not null default 3 check (no_response_after_days between 0 and 30),
  -- Recipient-local sending window (hours, 24 h).
  send_window_start  int         not null default 8  check (send_window_start between 0 and 23),
  send_window_end    int         not null default 17 check (send_window_end between 1 and 24),
  -- Master switch. Off by default.
  sending_enabled    boolean     not null default false,
  daily_send_cap     int         not null default 8 check (daily_send_cap between 0 and 100),
  approved_by        uuid        references auth.users on delete set null,
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (followup2_days > followup1_days),
  check (send_window_end > send_window_start)
);

-- ── 2. Templates ──────────────────────────────────────────────────────
create table if not exists public.rc_templates (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        not null references public.rc_campaigns on delete cascade,
  key                text        not null check (key in ('initial','followup1','followup2','coordinator')),
  label              text        not null,
  subject            text        not null,
  body               text        not null,
  version            int         not null default 1,
  updated_by         uuid        references auth.users on delete set null,
  updated_at         timestamptz not null default now(),
  unique (campaign_id, key)
);

-- ── 3. Institutions ───────────────────────────────────────────────────
create table if not exists public.rc_institutions (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        not null references public.rc_campaigns on delete cascade,
  ref_code           text,
  name               text        not null,
  domain             text,
  website            text,
  city               text,
  state              text,
  country            text        not null default 'United States',
  cluster            text,
  institution_type   text,
  specialisations    text,
  programme_evidence text,
  formats            text,
  eligibility_notes  text,
  fees_published     text,
  august_availability text,
  key_unknowns       text,
  score_outreach     int not null default 0 check (score_outreach between 0 and 30),
  score_international int not null default 0 check (score_international between 0 and 20),
  score_capacity     int not null default 0 check (score_capacity between 0 and 15),
  score_relevance    int not null default 0 check (score_relevance between 0 and 10),
  score_august       int not null default 0 check (score_august between 0 and 10),
  score_cost         int not null default 0 check (score_cost between 0 and 10),
  score_contact      int not null default 0 check (score_contact between 0 and 5),
  priority           text check (priority in ('A','B','C')),
  ineligible_reason  text,
  -- Pipeline: Discovered → Verified → Approved → Initial Email Sent →
  -- Follow-Up Due → Replied → Qualified → Meeting Requested → Negotiation
  -- → Hosting Confirmed / Closed, plus No Response, Not Eligible,
  -- Declined, Paused.
  status             text        not null default 'discovered'
                     check (status in ('discovered','verified','approved','contacted','followup_due',
                                       'responded','qualified','meeting','negotiating','confirmed','closed',
                                       'no_response','ineligible','declined','paused')),
  followups_paused   boolean     not null default false,
  previous_outreach  text,
  owner              text,
  last_activity_at   timestamptz,
  next_action        text,
  next_action_due    date,
  source_url         text,
  checked_on         date,
  notes              text,
  -- Engagement record (filled from replies)
  eng_contact_role   text,
  eng_interest       text,
  eng_duration       text,
  eng_activities     text,
  eng_eligibility    text,
  eng_dates          text,
  eng_participants   text,
  eng_supervision_insurance text,
  eng_fees_conditions text,
  eng_documents      text,
  eng_meeting        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists rc_institutions_campaign_domain
  on public.rc_institutions (campaign_id, domain) where domain is not null;
create unique index if not exists rc_institutions_campaign_name
  on public.rc_institutions (campaign_id, lower(name));
create index if not exists rc_institutions_status on public.rc_institutions (campaign_id, status);

-- ── 4. Contacts ───────────────────────────────────────────────────────
create table if not exists public.rc_contacts (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        not null references public.rc_campaigns on delete cascade,
  institution_id     uuid        not null references public.rc_institutions on delete cascade,
  department         text,
  person_name        text,
  person_title       text,
  email              text,
  phone_e164         text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  timezone           text,
  contact_form_url   text,
  source_url         text,
  verified_on        date,
  verification       text        not null default 'unverified'
                     check (verification in ('unverified','verified_named','verified_department','form_only','provided_by_institution')),
  role_assessment    text        not null default 'unknown' check (role_assessment in ('unknown','appropriate','not_appropriate')),
  referred_by_contact_id uuid    references public.rc_contacts on delete set null,
  referred_in_message_id uuid,   -- set to the reply that named them (no FK: messages table comes later)
  is_primary         boolean     not null default false,
  followups_paused   boolean     not null default false,
  approved_for_contact boolean   not null default false,
  approved_by        uuid        references auth.users on delete set null,
  approved_at        timestamptz,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists rc_contacts_campaign_email
  on public.rc_contacts (campaign_id, lower(email)) where email is not null;
create index if not exists rc_contacts_institution on public.rc_contacts (institution_id);

-- ── 5. Messages ───────────────────────────────────────────────────────
create table if not exists public.rc_messages (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        not null references public.rc_campaigns on delete cascade,
  institution_id     uuid        not null references public.rc_institutions on delete cascade,
  contact_id         uuid        references public.rc_contacts on delete set null,
  direction          text        not null check (direction in ('outbound','inbound')),
  step               text        not null default 'custom'
                     check (step in ('initial','followup1','followup2','coordinator','reply','custom','inbound')),
  parent_message_id  uuid        references public.rc_messages on delete set null,
  template_key       text,
  template_version   int,
  historical         boolean     not null default false,   -- logged from before the platform; never triggers anything
  personalisation_source text,   -- URL backing the {{research_connection}} sentence
  from_email         text,
  to_email           text,
  subject            text,
  body               text,
  state              text        not null default 'draft'
                     check (state in ('draft','in_review','approved','sending','sent','failed','cancelled','received')),
  -- Approved + scheduled_for set = queued: the daily job sends it on or
  -- after that time, inside the recipient's sending window.
  scheduled_for      timestamptz,
  approved_by        uuid        references auth.users on delete set null,
  approved_at        timestamptz,
  idempotency_key    text        unique,
  provider           text,
  provider_message_id text,
  rfc_message_id     text,
  in_reply_to        text,
  thread_id          text,
  delivery_status    text,
  error_message      text,
  attempts           int         not null default 0,
  sent_at            timestamptz,
  received_at        timestamptz,
  created_by         uuid        references auth.users on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists rc_messages_institution on public.rc_messages (institution_id, created_at);
create index if not exists rc_messages_state on public.rc_messages (campaign_id, state);
create index if not exists rc_messages_due on public.rc_messages (state, scheduled_for) where scheduled_for is not null;
create unique index if not exists rc_messages_provider_id
  on public.rc_messages (provider, provider_message_id) where provider_message_id is not null;
create index if not exists rc_messages_rfc on public.rc_messages (rfc_message_id) where rfc_message_id is not null;
create index if not exists rc_messages_thread on public.rc_messages (thread_id) where thread_id is not null;
-- One live sequence per institution: never two initials or two of the
-- same follow-up, whatever a cron retry or a double click does.
create unique index if not exists rc_messages_one_sequence_step
  on public.rc_messages (institution_id, step)
  where direction = 'outbound' and not historical and step in ('initial','followup1','followup2') and state <> 'cancelled';

-- ── 6. Reply labels ───────────────────────────────────────────────────
create table if not exists public.rc_reply_labels (
  id                 uuid        primary key default gen_random_uuid(),
  message_id         uuid        not null references public.rc_messages on delete cascade,
  label              text        not null check (label in (
                       'interested','more_info','meeting_requested','fee_request','referred',
                       'requests_coordinator','not_eligible','not_interested','out_of_office',
                       'auto_ack','unclear')),
  source             text        not null check (source in ('model','keywords','human')),
  confidence         numeric,
  rationale          text,
  opt_out            boolean     not null default false,
  return_date        date,       -- out-of-office return date, when stated
  confirmed_by       uuid        references auth.users on delete set null,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists rc_reply_labels_message on public.rc_reply_labels (message_id, created_at);

-- ── 7. Tasks ──────────────────────────────────────────────────────────
create table if not exists public.rc_tasks (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        not null references public.rc_campaigns on delete cascade,
  institution_id     uuid        not null references public.rc_institutions on delete cascade,
  contact_id         uuid        references public.rc_contacts on delete set null,
  related_message_id uuid        references public.rc_messages on delete set null,
  task_type          text        not null check (task_type in ('call','meeting','quote','reply','referral','other')),
  status             text        not null default 'open' check (status in ('open','done','cancelled')),
  due_date           date,
  objective          text,
  calling_window     text,
  call_outcome       text check (call_outcome is null or call_outcome in (
                       'connected','voicemail','referred','direct_contact','written_info_requested','declined','follow_up_agreed','no_answer')),
  outcome            text,
  cancelled_reason   text,
  assigned_to        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists rc_tasks_open on public.rc_tasks (campaign_id, status, due_date);

-- ── 8. Costs ──────────────────────────────────────────────────────────
create table if not exists public.rc_costs (
  id                 uuid        primary key default gen_random_uuid(),
  institution_id     uuid        not null references public.rc_institutions on delete cascade,
  category           text        not null check (category in (
                       'hosting_fee','lab_access','insurance_safety','materials','administrative',
                       'travel_accommodation','other')),
  amount             numeric,
  currency           text        not null default 'USD',
  basis              text check (basis in ('per_student','per_group','per_day','other')),
  description        text,
  quote_reference    text,
  created_at         timestamptz not null default now()
);

-- ── 9. Suppressions ───────────────────────────────────────────────────
create table if not exists public.rc_suppressions (
  id                 uuid        primary key default gen_random_uuid(),
  value              text        not null,
  kind               text        not null check (kind in ('email','domain')),
  reason             text        not null check (reason in ('bounce','complaint','declined','no_further_contact','manual')),
  source_message_id  uuid        references public.rc_messages on delete set null,
  created_at         timestamptz not null default now()
);
create unique index if not exists rc_suppressions_value on public.rc_suppressions (kind, value);

-- ── 10. Audit trail ───────────────────────────────────────────────────
create table if not exists public.rc_events (
  id                 uuid        primary key default gen_random_uuid(),
  campaign_id        uuid        references public.rc_campaigns on delete cascade,
  institution_id     uuid        references public.rc_institutions on delete cascade,
  actor              text        not null default 'system',
  action             text        not null,
  detail             jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists rc_events_institution on public.rc_events (institution_id, created_at);

-- ── 11. Lock down: server (service role) only ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['rc_campaigns','rc_templates','rc_institutions','rc_contacts','rc_messages',
                           'rc_reply_labels','rc_tasks','rc_costs','rc_suppressions','rc_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- ── 12. The first campaign (draft, sending off) ───────────────────────
insert into public.rc_campaigns (slug, name, description, status, sender_name, sender_email, reply_to, reply_mailbox, sending_enabled)
values ('us-research-2027',
        'US Research Student Collaboration – August 2027',
        'One-week educational research visit in August 2027 for five Italian upper-secondary school students (initiative "Biotechnology and Artificial Intelligence").',
        'draft', 'Olufemi Yusuf – bioERGOtech Foundation', 'olufemi.yusuf@bioergotech.org',
        'olufemi.yusuf@bioergotech.org', 'olufemi.yusuf@bioergotech.org', false)
on conflict (slug) do nothing;

-- ── 13. The four approved templates (editable in the portal) ──────────
-- Placeholders: {{greeting}} {{institution}} {{research_connection}}
-- {{selection_status}} {{age_range}} {{chaperone}} {{original_subject}}.
insert into public.rc_templates (campaign_id, key, label, subject, body)
select c.id, t.key, t.label, t.subject, t.body
from public.rc_campaigns c
cross join (values
  ('initial', 'Template 1: Initial enquiry',
   'Research Collaboration Enquiry | Italian Student Visit, August 2027',
$t1$Dear {{greeting}},

My name is Olufemi Yusuf, and I am the Scientific Projects Lead at bioERGOtech Foundation, a nonprofit organisation based in Taranto, Italy, dedicated to advancing healthcare innovation, biotechnology, artificial intelligence and scientific education.

As part of our educational initiative, "Biotechnology and Artificial Intelligence," we are organising an international research exposure experience for five Italian upper-secondary school students. The students {{selection_status}} through a merit-based process overseen by a scientific committee comprising university professors and medical professionals. They will be aged {{age_range}} and accompanied by {{chaperone}}.

We are reaching out to explore whether {{institution}} would be interested in hosting these students for a one-week educational and scientific experience in August 2027, ideally without institutional hosting fees.

Given your institution's work in {{research_connection}}, we believe there may be an opportunity to introduce the students to an active scientific research environment.

The proposed experience would be flexible and adapted to your institution's availability and policies. Possible activities include guided laboratory visits, interactions with researchers, scientific seminars, technology demonstrations and discussions about careers in biomedical research.

Beyond this initial programme, we would welcome the opportunity to explore a longer-term institutional collaboration involving scientific exchanges, educational initiatives and future research partnerships between your organisation and our Foundation in Puglia, Italy.

If this opportunity aligns with your institution's interests, we would be delighted to arrange a brief virtual meeting to discuss the proposed visit and share further information.

Alternatively, we would appreciate being directed to the appropriate person or department responsible for educational outreach or visiting-student programmes.

Thank you for considering our proposal. We look forward to the possibility of collaborating with your institution.

Kind regards,

Olufemi Yusuf
Scientific Projects Lead
bioERGOtech Foundation
Taranto, Italy
olufemi.yusuf@bioergotech.org
https://www.bioergotech.org$t1$),
  ('followup1', 'Template 2: First follow-up (Day 3)',
   'Re: {{original_subject}}',
$t2$Dear {{greeting}},

I hope you are doing well.

I am following up on my earlier email regarding a potential educational collaboration between bioERGOtech Foundation and {{institution}}.

We are exploring opportunities for five Italian upper-secondary school students to gain research exposure through a short, one-week educational visit in August 2027.

We would be grateful to know whether your institution might consider such an arrangement, subject to your existing educational programmes and availability.

If this enquiry would be better directed to another department or colleague, I would greatly appreciate your guidance.

Thank you for your time and consideration.

Kind regards,

Olufemi Yusuf
Scientific Projects Lead
bioERGOtech Foundation
olufemi.yusuf@bioergotech.org
https://www.bioergotech.org$t2$),
  ('followup2', 'Template 3: Final follow-up (Day 7)',
   'Re: {{original_subject}}',
$t3$Dear {{greeting}},

I hope this message finds you well.

I wanted to make one final follow-up regarding our proposal for a short educational research visit involving five students from Italy in August 2027.

We understand that your team may have other priorities, and we would be happy to explore a flexible arrangement that fits your existing schedule and institutional requirements.

Even a brief opportunity for the students to interact with researchers, attend scientific presentations or visit suitable research facilities would be greatly appreciated.

If hosting a student group is not currently possible, we would be grateful for a referral to another relevant programme, department or institution.

Thank you again for considering our enquiry. We hope there may be an opportunity to collaborate in the future.

Warm regards,

Olufemi Yusuf
Scientific Projects Lead
bioERGOtech Foundation
olufemi.yusuf@bioergotech.org
https://www.bioergotech.org$t3$),
  ('coordinator', 'Template 4: Ask for the responsible person',
   'Re: {{original_subject}}',
$t4$Dear {{greeting}},

Thank you for your response and for taking the time to consider our enquiry.

We appreciate the opportunity to explore a potential educational collaboration with {{institution}}.

To help us coordinate the next steps effectively, could you kindly let us know who would be the most appropriate person to discuss the proposed student visit with?

This could be someone responsible for educational outreach, research training, international collaborations or visiting-student programmes.

If possible, we would appreciate their name, position and direct email address so that we can communicate with them regarding the proposed activities, eligibility requirements, availability and any necessary arrangements.

We would also be happy to schedule a brief virtual meeting at a convenient time to introduce our Foundation and discuss the proposed programme in more detail.

Thank you once again. We look forward to continuing the conversation.

Kind regards,

Olufemi Yusuf
Scientific Projects Lead
bioERGOtech Foundation
olufemi.yusuf@bioergotech.org
https://www.bioergotech.org$t4$)
) as t(key, label, subject, body)
where c.slug = 'us-research-2027'
on conflict (campaign_id, key) do nothing;
