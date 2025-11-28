// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ESTO LEE LAS VARIABLES VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializa el cliente con las variables leídas
export const supabase = createClient(supabaseUrl, supabaseKey);