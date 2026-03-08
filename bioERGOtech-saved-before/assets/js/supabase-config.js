/* =========================================
   bioERGOtech Foundation — Supabase Config
   =========================================
   Loaded on ALL pages for newsletter + portal.
   The full Supabase client is only created on
   pages that load the CDN (member-portal.html).
   ========================================= */

var SUPABASE_URL = 'https://xztutunjvsbjhbmegjgf.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHV0dW5qdnNiamhibWVnamdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzUxNDAsImV4cCI6MjA4NzE1MTE0MH0.9PbUiah9DPVR4uSJ91wgNvQHJRIobPPDTWU_GUQUSMU';

// Create full client only if Supabase CDN is loaded (member portal page)
var supabase;
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
