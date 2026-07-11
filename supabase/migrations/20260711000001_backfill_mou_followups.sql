-- =========================================================
-- Backfill: create an immediate manual follow-up for contacts
-- whose MoU was already sent before this system existed.
-- =========================================================

insert into public.mou_followups (lead_id, scheduled_for, cadence_step, channel, status)
select oc.id, now(), 1, 'manual', 'pending'
from public.outreach_contacts oc
where oc.mou_status = 'MoU Sent'
  and not exists (
    select 1 from public.mou_followups mf where mf.lead_id = oc.id
  );
