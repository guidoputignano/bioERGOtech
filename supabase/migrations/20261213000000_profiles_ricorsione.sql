-- =========================================================
-- Ricorsione infinita nelle policy di `profiles`
--
-- Leggere `profiles` come utente autenticato falliva cosi:
--
--     ERROR:  infinite recursion detected in policy for relation "profiles"
--
-- La causa e nella policy "Admins can view all profiles", nata con la
-- primissima migrazione del progetto:
--
--     (auth.uid() = id) or exists (
--       select 1 from profiles p2
--       where p2.id = auth.uid() and p2.partnership_level = 'admin'
--     )
--
-- Per decidere se si puo leggere `profiles` la policy legge `profiles`,
-- e quella lettura richiama la stessa policy. PostgreSQL se ne accorge e
-- interrompe con 42P17.
--
-- Non riguarda solo `profiles`. Lo stesso controllo "sono un admin?" e
-- ripetuto in diciotto policy su dodici tabelle, tutte quelle con una
-- policy "Admins can view all ...": bando_applications,
-- event_registrations, tutte le licei_* e tutte le universita_*. Ognuna
-- di quelle, per rispondere, legge `profiles`, e cade nella ricorsione.
-- Bastava pero rompere il ciclo alla radice: sistemate le due policy di
-- `profiles`, tutte le altre tornano a funzionare senza essere toccate.
--
-- Sul sito il problema era latente, non visibile: le rotte server usano
-- la chiave service_role, che non passa da RLS. RLS era la seconda linea
-- di difesa, quella che deve reggere se la prima cede, ed era rotta.
--
-- La cura e un helper `security definer`: gira con i privilegi del
-- proprietario, quindi la sua lettura di `profiles` non riattiva le
-- policy, e il ciclo si spezza. E lo stesso rimedio gia usato per
-- `universita_squadra_di` nella migrazione 20261211000000.
-- =========================================================

create or replace function public.e_admin()
returns boolean
language sql
stable
security definer
-- `search_path` fissato: una funzione `security definer` gira con i
-- privilegi del proprietario, e senza questo vincolo un utente potrebbe
-- anteporre uno schema con una tabella `profiles` di sua fattura e farsi
-- dichiarare admin.
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and partnership_level = 'admin'
  );
$$;

comment on function public.e_admin() is
  'Dice se chi sta interrogando e un admin. SECURITY DEFINER apposta: serve a rompere la ricorsione delle policy di profiles. Non revocare EXECUTE ad authenticated, le policy sono valutate con i privilegi di chi interroga.';

-- Le policy la chiamano, e le policy girano con i privilegi di chi
-- interroga: senza questo grant ogni lettura protetta fallisce.
grant execute on function public.e_admin() to authenticated, anon, service_role;

-- ── Le due policy che contenevano il ciclo ────────────────────────────

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (auth.uid() = id or public.e_admin());

drop policy if exists "Admins can update partnership level" on public.profiles;
create policy "Admins can update partnership level"
  on public.profiles for update
  using (public.e_admin());
