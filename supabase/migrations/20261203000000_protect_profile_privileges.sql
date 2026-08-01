-- =========================================================
-- Migration: impedire l'auto promozione su public.profiles
--
-- La policy "Users can update own profile" (migrazione
-- 20260324000001) consente a un utente di aggiornare la propria riga:
--
--   create policy "Users can update own profile"
--     on public.profiles for update
--     using (auth.uid() = id) with check (auth.uid() = id);
--
-- Serve, perche la domanda di membership si invia scrivendo sul proprio
-- profilo. Il problema e che la RLS non sa limitare le COLONNE: la stessa
-- policy lascia passare anche
--
--   update profiles set partnership_level = 'admin' where id = auth.uid();
--
-- eseguita dal browser con la sola chiave anon. Chiunque abbia un account
-- puo quindi diventare admin, e chiudere le rotte API non basta perche
-- questa strada passa direttamente da PostgREST.
--
-- Rimedio in due strati indipendenti: i privilegi di colonna, che sono la
-- risposta dichiarativa di Postgres al problema, e un trigger che rimette a
-- posto i valori nel caso in cui un futuro `grant all` riapra i privilegi.
-- =========================================================

-- ── 1. Privilegi di colonna ────────────────────────────────────────────
-- L'utente puo continuare ad aggiornare la propria anagrafica e la propria
-- domanda, ma non le colonne che decidono che cosa gli e permesso e come la
-- domanda e stata valutata.
revoke update (partnership_level, application_status, reviewed_at, admin_notes)
  on public.profiles from authenticated, anon;

-- ── 2. Trigger di sicurezza ────────────────────────────────────────────
-- Secondo strato: se i privilegi venissero riconcessi in blocco, questo
-- continua a proteggere le colonne. Le scritture legittime del server
-- passano dal ruolo service_role (service role key) o da postgres
-- (SQL editor e migrazioni), e non vengono toccate.
-- SECURITY INVOKER (il default), non DEFINER: dentro una funzione DEFINER
-- `current_user` e il proprietario della funzione, quindi il controllo qui
-- sotto passerebbe sempre e il trigger non proteggerebbe nulla. Invocata
-- come il chiamante, `current_user` e il ruolo in cui PostgREST si e messo:
-- authenticated, anon oppure service_role.
create or replace function public.profiles_guard_privileged()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  new.partnership_level := old.partnership_level;
  new.application_status := old.application_status;
  new.reviewed_at        := old.reviewed_at;
  new.admin_notes        := old.admin_notes;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- ── 3. Verifica ────────────────────────────────────────────────────────
-- Da eseguire come utente normale autenticato: entrambe devono fallire o
-- lasciare il livello invariato.
--   update public.profiles set partnership_level = 'admin' where id = auth.uid();
--   update public.profiles set application_status = 'approved' where id = auth.uid();
--
-- Privilegi di colonna residui:
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name = 'profiles' and privilege_type = 'UPDATE'
--   order by grantee, column_name;
