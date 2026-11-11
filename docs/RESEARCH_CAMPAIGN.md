# Research Centres campaign

First campaign: **US Research Student Collaboration – August 2027**: a one-week educational research visit for five Italian upper-secondary school students.
Admin portal → Outreach → **US Research Centres 2027** (switch at the top of the section).

It runs inside the existing platform (same app, admin login, Resend account, Gmail OAuth client, classifier) but keeps its own data:

| | Outreach & MoU Pipeline | Research Centres |
|---|---|---|
| Tables | `outreach_contacts`, `outreach_sends`, `mou_*` | `rc_*` (10 tables) |
| Routes | `/api/admin/outreach/*` | `/api/admin/research/*` |
| Daily job | `/api/cron/check-replies` | `/api/cron/research-replies` (weekdays 17:00 UTC) |
| Delivery webhook | `/api/webhooks/resend` | `/api/webhooks/resend-research` |

Why separate data: `/api/cron/check-replies` auto-sends a partnership follow-up signed by Guido Putignano to every `outreach_contacts` row in status "Sent". Research institutions must never be in that table.

## Workflow

1. **Research → Verify → Approve contact.** Import or add institutions; add only published channels with their source page; a contact must be verified before it can be approved. Imports never approve anything.
2. **Draft the sequence.** In an institution's Correspondence tab, write the verified research connection and its source URL. This drafts Template 1 and its two follow-ups (Templates 2 and 3) from the editable templates. Not possible once any correspondence exists (use a contextual reply), and only after confirmation where earlier outreach is recorded.
3. **Approve once per institution.** Approving the initial e-mail approves its two follow-ups. Nothing with an unfilled `{{placeholder}}` or `[prompt]` can be approved; the student facts (selection status, ages, chaperone) come from Settings and stay blank until confirmed.
4. **Send.** Select approved initial e-mails and press Send. Outside the recipient's local 08:00–17:00 on weekdays, a message is queued for the next daily run.
5. **Daily job (17:00 UTC = office hours in every continental US zone).** In order: reply sync; due follow-ups (Day 3 and Day 7 counted from the initial, business days by default); queued messages; No Response after Day 7 + 3 days, with a call task for priority A/B institutions that have a phone.
6. **Replies.** Stored in full, matched by Gmail thread, then In-Reply-To/References, then address, then domain (flagged). Classified into the brief's classes as a suggestion; the stage changes only when a person confirms. Template 4 is suggested, never sent automatically. Referrals create a linked contact.

### Stop conditions (checked immediately before every follow-up)
Any meaningful reply (all classes except out-of-office and automatic acknowledgement); opt-out (do-not-contact list); bounce or complaint (do-not-contact list); manual pause on the contact or institution; institution beyond "Initial email sent" (someone is handling it); campaign paused or sending switched off. Out-of-office moves follow-ups to the business day after the stated return date. **If the reply sync is not configured or fails, follow-ups are held**, never sent blind.

### No duplicates
One live message per sequence step per institution (database constraint); each send is claimed atomically (`approved → sending`) and carries an idempotency key; re-running the daily job finds nothing to claim.

## Setup (owner steps, in order)

1. **Apply the migration** `supabase/migrations/20261230000000_research_centres_campaign.sql` in the Supabase SQL editor (additive, re-runnable). Check:
   ```sql
   select slug, status, sending_enabled, followup1_days, followup2_days from public.rc_campaigns;
   -- us-research-2027 | draft | false | 3 | 7
   select key, version from public.rc_templates order by key;
   -- coordinator, followup1, followup2, initial — all version 1
   select count(*) from pg_class where relname like 'rc\_%' and relkind = 'r' and relrowsecurity;
   -- 10
   ```
2. **DNS** for `bioergotech.org`: root SPF `v=spf1 include:_spf.google.com ~all`; Google Workspace DKIM (`google._domainkey`); DMARC with a report address. Then a test send to two controlled mailboxes, checking SPF/DKIM/DMARC pass.
3. **Vercel environment variables** (Production):

   | Variable | Value |
   |---|---|
   | `RC_ALLOWED_SENDERS` | `olufemi.yusuf@bioergotech.org` |
   | `RC_GMAIL_REFRESH_TOKEN` | refresh token for that mailbox, scopes `gmail.send` + `gmail.readonly`, obtained while signed in as the sender. Paste only into Vercel. |
   | `RC_GMAIL_USER` | `olufemi.yusuf@bioergotech.org` |
   | `RC_RESEND_WEBHOOK_SECRET` | only if the provider is Resend |
   | `RC_CLASSIFIER_MODEL` | optional, default `claude-haiku-5-5` |

   Reused: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. Do not use `outreach@`: the Outreach pipeline's job reads that mailbox and marks messages as read.
4. **Deploy** after review.
5. **Portal:** Settings → confirm selection status, ages and chaperone → import `02_CANDIDATES.csv` and `02b_CANDIDATES_EXPANSION.csv` (dry run first) → verify and approve contacts → approve the campaign → activate → switch sending on.

## Tests

```bash
npm run test:research
```

27 tests: import and dedup; scoring; CSV; the send gate (approval, sender allow-list, suppression, caps, placeholders, pauses, stages, historical messages); Day 3 / Day 7 from the initial in business and calendar days, across US holidays; the 17:00 UTC run inside office hours in every continental zone in winter and summer; stop/continue/postpone decisions; out-of-office return dates; opt-out detection; Template 4 suggestion; reply matching; dashboard counts. The migration was also applied twice to PGlite and probed (19 checks: constraints, one-sequence rule, seeded templates, RLS, privileges, no reference to the Outreach tables).

## Data retention

Contact data is kept for the campaign only. When it closes, export (Settings → Export), then delete contacts that did not lead to a collaboration. Do-not-contact entries are kept.
