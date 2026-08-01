# Migrations

Run manually against Supabase (SQL editor or `supabase db push`) — nothing here executes automatically. Files are numbered chronologically; run them in filename order.

## Navigator: which file to run

The Grant & Funding Eligibility Navigator's data has gone through a few passes. If you're setting up a **fresh** database:

1. **`20260714000000_navigator.sql`** — required first. Creates `navigator_rules`, `navigator_sessions`, and the linking columns on `outreach_contacts`.
2. **`20260714000001_navigator_seed.sql`** — ⚠️ **historical/superseded, do not run.** Illustrative placeholder rows only, kept for migration history.
3. **`20260716000000_navigator_subregion.sql`** — superseded for fresh setups by the file below, which folds in the same schema change with verified data. Safe to skip; harmless if run anyway (its `sub_region` column add is idempotent, and step 4 fully reloads the table's data regardless).
4. **`20260717000000_navigator_consolidated_authoritative.sql`** — ✅ **run this.** The real, Director-approved eligibility data as verified live in production on 17 July 2026. Supersedes step 2 entirely and includes step 3's schema change.

If you're just checking what's already live (not setting up fresh), skip straight to the verification `SELECT` at the bottom of the consolidated file.

## Profile privileges: what actually protects the columns

`20261203000000_protect_profile_privileges.sql` stops an authenticated user
from promoting themselves to admin straight through PostgREST. Two things about
it are easy to get wrong, and both cost time when verifying.

**The trigger is the only layer that works.** The migration also revokes column
level `UPDATE` on the privileged columns, and that revoke has no effect:
Supabase grants table wide `UPDATE` on `public.profiles` to `authenticated` and
`anon`, and in PostgreSQL a role's privilege on a column is the union of the
column specific grant and the whole table grant. So the column privilege query
returns 8, not 0, and that is expected. Making it effective would mean revoking
the table grant and re-granting column by column, which leaves every future
column silently unwritable until someone adds it to the grant list. The trigger
covers the same columns without that trap. The statement stays in the file
because it was run in production, and the file should record what was run.

**You cannot test the behaviour from the SQL editor.** It runs as `postgres`,
which the trigger lets through on purpose, otherwise legitimate promotions from
the admin panel would break too. An `UPDATE ... SET partnership_level` from
there succeeds, and that is correct. From the editor, check the structure
instead:

```sql
select count(*) from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and tgname = 'trg_profiles_guard_privileged';   -- must be 1
```

The behaviour can only be checked from the browser with the anon key, signed in
as an ordinary user: the update raises no error, and the level stays put.
