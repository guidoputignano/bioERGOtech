# Migrations

Run manually against Supabase (SQL editor or `supabase db push`) — nothing here executes automatically. Files are numbered chronologically; run them in filename order.

## Navigator: which file to run

The Grant & Funding Eligibility Navigator's data has gone through a few passes. If you're setting up a **fresh** database:

1. **`20260714000000_navigator.sql`** — required first. Creates `navigator_rules`, `navigator_sessions`, and the linking columns on `outreach_contacts`.
2. **`20260714000001_navigator_seed.sql`** — ⚠️ **historical/superseded, do not run.** Illustrative placeholder rows only, kept for migration history.
3. **`20260716000000_navigator_subregion.sql`** — superseded for fresh setups by the file below, which folds in the same schema change with verified data. Safe to skip; harmless if run anyway (its `sub_region` column add is idempotent, and step 4 fully reloads the table's data regardless).
4. **`20260717000000_navigator_consolidated_authoritative.sql`** — ✅ **run this.** The real, Director-approved eligibility data as verified live in production on 17 July 2026. Supersedes step 2 entirely and includes step 3's schema change.

If you're just checking what's already live (not setting up fresh), skip straight to the verification `SELECT` at the bottom of the consolidated file.
