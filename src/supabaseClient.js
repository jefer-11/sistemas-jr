import { createClient } from '@supabase/supabase-js';

// Estas líneas leen las llaves que guardaste en el archivo .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Aquí se crea la conexión oficial
export const supabase = createClient(supabaseUrl, supabaseKey);