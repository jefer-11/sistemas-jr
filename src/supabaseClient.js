// sistemas-jr/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// **ASEGÚRATE QUE TUS VALORES REALES ESTÉN AQUÍ ABAJO Y ENTRE COMILLAS**
// (Tomado de tu proyecto: kpdcpnridowptpreqxpsf)
const supabaseUrl = "https://kpdcpnridowptprexgsf.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZGNwbnJpZG93cHRwcmV4Z3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDkzMzksImV4cCI6MjA3OTgyNTMzOX0.fYDN8fyrjpgt6bJMgrvJWdLN0h3ukOI92x8OTzL9V5I"; // ¡Completa tu clave aquí!

// Inicializa el cliente
export const supabase = createClient(supabaseUrl, supabaseKey);