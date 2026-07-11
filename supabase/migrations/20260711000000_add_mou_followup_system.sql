-- =========================================================
-- Migration: MoU structured follow-up system
-- =========================================================

-- 1. New columns on outreach_contacts
alter table public.outreach_contacts
  add column if not exists funnel_stage        text not null default 'cold_sent',
  add column if not exists mou_sent_at         timestamptz,
  add column if not exists mou_champion_name   text,
  add column if not exists mou_champion_email  text;

-- 2. Backfill funnel_stage for existing rows
update public.outreach_contacts set funnel_stage = 'mou_signed'
  where mou_status = 'Signed';

update public.outreach_contacts set funnel_stage = 'mou_sent', mou_sent_at = updated_at
  where mou_status = 'MoU Sent';

update public.outreach_contacts set funnel_stage = 'warm_response'
  where email_status = 'Replied'
    and mou_status is distinct from 'MoU Sent'
    and mou_status is distinct from 'Signed';

update public.outreach_contacts set funnel_stage = 'call_completed'
  where call_status is not null
    and mou_status is distinct from 'MoU Sent'
    and mou_status is distinct from 'Signed'
    and email_status is distinct from 'Replied';

-- everything else keeps the column default of 'cold_sent'

-- 3. Follow-up schedule table
create table if not exists public.mou_followups (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.outreach_contacts(id) on delete cascade,
  scheduled_for  timestamptz not null,
  cadence_step   int not null check (cadence_step in (1, 2, 3)),
  channel        text not null default 'email' check (channel in ('email', 'call', 'manual')),
  status         text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'responded')),
  sent_at        timestamptz,
  notes          text,
  created_at     timestamptz default now()
);

create index if not exists idx_mou_followups_lead_id on public.mou_followups(lead_id);
create index if not exists idx_mou_followups_status_scheduled on public.mou_followups(status, scheduled_for);

-- 4. Follow-up activity log table
create table if not exists public.mou_followup_log (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.outreach_contacts(id) on delete cascade,
  followup_id      uuid references public.mou_followups(id) on delete set null,
  actor            text not null default 'system',
  message_summary  text,
  created_at       timestamptz default now()
);

create index if not exists idx_mou_followup_log_lead_id on public.mou_followup_log(lead_id);

-- 5. Trigger function: react to funnel_stage transitions on outreach_contacts
create or replace function public.handle_mou_funnel_stage_change()
returns trigger
language plpgsql
as $$
begin
  -- Entering 'mou_sent' from any other stage: schedule the 3-step cadence
  if new.funnel_stage = 'mou_sent' and old.funnel_stage is distinct from 'mou_sent' then
    insert into public.mou_followups (lead_id, scheduled_for, cadence_step, channel, status)
    values
      (new.id, now() + interval '7 days',  1, 'email',  'pending'),
      (new.id, now() + interval '21 days', 2, 'email',  'pending'),
      (new.id, now() + interval '45 days', 3, 'manual', 'pending');
  end if;

  -- Leaving 'mou_sent' for 'mou_signed' or 'warm_response': cancel pending followups
  if old.funnel_stage = 'mou_sent'
     and new.funnel_stage in ('mou_signed', 'warm_response')
     and new.funnel_stage is distinct from old.funnel_stage then
    update public.mou_followups
       set status = 'responded'
     where lead_id = new.id
       and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mou_funnel_stage_change on public.outreach_contacts;
create trigger trg_mou_funnel_stage_change
  after update of funnel_stage on public.outreach_contacts
  for each row
  execute function public.handle_mou_funnel_stage_change();
