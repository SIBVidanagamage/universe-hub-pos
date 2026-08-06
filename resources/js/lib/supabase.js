import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qgxphqkkpohzwolnzdpu.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneHBocWtrcG9oendvbG56ZHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTA4NDEsImV4cCI6MjEwMTQ4Njg0MX0.sXUFXWr77YUcUQ0zkRZe2e9j3rkPHMfmhSjVcQX3AJE';

export const supabase = createClient(supabaseUrl, supabaseKey);
