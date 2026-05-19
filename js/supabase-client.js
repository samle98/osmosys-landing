// supabase-client.js — instancia compartida del cliente Supabase.
// Debe cargarse después del UMD de @supabase/supabase-js.

const { createClient } = supabase;

const supa = createClient(
  'https://aqsgihkcbbnmpnnlciak.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxc2dpaGtjYmJubXBubmxjaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTYyNjMsImV4cCI6MjA5NDczMjI2M30.8FMxdgB9tXAWcSCS9iwmWBYi_GSEpK6ED_X4_zoeQgU'
);
