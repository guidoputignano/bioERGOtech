/* =========================================
   bioERGOtech Foundation — Supabase Config
   =========================================
   Replace the placeholders below with your
   Supabase project URL and anon (public) key.
   Find them at: Supabase Dashboard > Settings > API
   ========================================= */

var SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Initialise client (loaded via CDN in HTML)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
