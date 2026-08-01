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
-- Rimedio: un trigger che rimette a posto i valori a ogni update che non
-- arrivi dal server. E l'unico strato che protegge davvero. Sotto c'e anche
-- una revoca dei privilegi di colonna, che pero NON ha effetto: perche, e
-- che cosa servirebbe per renderla efficace, e spiegato al punto 1.
-- =========================================================

-- ── 1. Privilegi di colonna: INEFFICACE, e va saputo ───────────────────
-- Questa revoca non toglie niente, ed e rimasta qui perche e stata eseguita
-- in produzione: toglierla dal file farebbe raccontare alla migrazione una
-- storia diversa da quella vera.
--
-- Il motivo. Supabase concede `update` a livello di TABELLA su public.profiles
-- ad authenticated e anon. In PostgreSQL i permessi effettivi su una colonna
-- sono l'unione di quelli specifici della colonna e di quelli dell'intera
-- tabella, quindi finche il grant di tabella resta in piedi, revocare colonna
-- per colonna non cambia nulla. Si verifica cosi, e restituisce 8 invece di 0:
--
--   select count(*) from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and privilege_type = 'UPDATE' and grantee in ('authenticated', 'anon')
--     and column_name in ('partnership_level', 'application_status',
--                         'reviewed_at', 'admin_notes');
--
-- Per renderla efficace servirebbe togliere l'update di tabella e
-- riconcederlo colonna per colonna su quelle lecite. Non e stato fatto per
-- una ragione precisa: ogni colonna aggiunta in futuro a profiles nascerebbe
-- senza grant, e la scrittura fallirebbe con un "permission denied for
-- column" che salta fuori mesi dopo, lontano dalla causa. Il trigger protegge
-- le stesse colonne senza quella trappola.
revoke update (partnership_level, application_status, reviewed_at, admin_notes)
  on public.profiles from authenticated, anon;

-- ── 2. Trigger di sicurezza: e questo che protegge ─────────────────────
-- Le scritture legittime del server passano dal ruolo service_role (service
-- role key) o da postgres (SQL editor e migrazioni), e non vengono toccate.
-- Per disattivare il trigger servirebbe possedere la tabella, e authenticated
-- non la possiede.
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
-- ATTENZIONE: dall'SQL editor di Supabase si gira come `postgres`, e il
-- trigger lascia passare `postgres` di proposito, altrimenti bloccherebbe
-- anche le promozioni legittime dal pannello admin. Quindi questa, da li,
-- FUNZIONA, ed e il comportamento corretto, non un difetto:
--
--   update public.profiles set partnership_level = 'admin' where id = '<uuid>';
--
-- Dall'editor si verifica quindi la struttura, non il comportamento. Deve
-- rispondere 1: il trigger e al suo posto.
--
--   select count(*) from pg_trigger
--   where tgrelid = 'public.profiles'::regclass
--     and tgname = 'trg_profiles_guard_privileged';
--
-- La verifica del comportamento si fa solo dal browser, con la chiave anon,
-- loggati come utente normale: dopo l'update il livello deve essere quello
-- di prima. L'update non solleva errore, il trigger riscrive i valori in
-- silenzio.
