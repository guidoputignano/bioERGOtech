/* =========================================
   bioERGOtech Foundation — Supabase Config
   =========================================
   Replace the placeholders below with your
   Supabase project URL and anon (public) key.
   Find them at: Supabase Dashboard > Settings > API
   ========================================= */

var SUPABASE_URL = 'https://xztutunjvsbjhbmegjgf.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHV0dW5qdnNiamhibWVnamdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzUxNDAsImV4cCI6MjA4NzE1MTE0MH0.9PbUiah9DPVR4uSJ91wgNvQHJRIobPPDTWU_GUQUSMU';

// Initialise client (loaded via CDN in HTML)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
