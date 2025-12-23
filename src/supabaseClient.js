import { datosPrueba } from './datosPrueba';

// --- SIMULADOR DE SUPABASE (Auditoría: Versión Final) ---
// Corrige: Persistencia de sesión y Relaciones (Joins) automáticos.

const SESSION_KEY = 'mock_session_v2'; // Cambié la key para limpiar basura anterior
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createQueryBuilder = (table) => {
  // 1. Clonamos los datos para no mutar el original directamente en lectura
  let result = [...(datosPrueba[table] || [])];
  let singleMode = false;

  // --- AUTO-RELACIONES (Joins Simulados) ---
  // Esto evita el error "cannot read property X of undefined" en la UI
  if(table === 'usuarios') {
      result = result.map(u => ({
          ...u,
          empresas: datosPrueba.empresas.find(e => e.id === u.empresa_id) || {} 
      }));
  }
  if(table === 'creditos') {
      result = result.map(c => ({
          ...c,
          clientes: datosPrueba.clientes.find(cli => cli.id === c.cliente_id) || {},
          pagos: datosPrueba.pagos.filter(p => p.credito_id === c.id) || []
      }));
  }
  if(table === 'rutas') {
      result = result.map(r => ({
          ...r,
          usuarios: datosPrueba.usuarios.find(u => u.id === r.usuario_cobrador_id) || {}
      }));
  }

  const builder = {
    select: (query) => builder, // Ignoramos qué columnas pide, damos todo
    
    eq: (col, val) => {
      if(col.includes('.')) return builder; // Ignoramos filtros complejos por ahora
      result = result.filter(item => String(item[col]) === String(val));
      return builder;
    },
    // Implementación de otros filtros...
    neq: (col, val) => { result = result.filter(item => item[col] != val); return builder; },
    gt: (col, val) => { result = result.filter(item => item[col] > val); return builder; },
    gte: (col, val) => { result = result.filter(item => item[col] >= val); return builder; },
    lte: (col, val) => { result = result.filter(item => item[col] <= val); return builder; },
    ilike: (col, val) => {
      if(!val) return builder;
      const term = val.replace(/%/g, '').toLowerCase();
      result = result.filter(item => JSON.stringify(item).toLowerCase().includes(term));
      return builder;
    },
    order: (col, { ascending } = { ascending: true }) => {
      result.sort((a, b) => ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1));
      return builder;
    },
    limit: (n) => { result = result.slice(0, n); return builder; },
    single: () => { singleMode = true; return builder; },
    maybeSingle: () => { singleMode = true; return builder; },

    // --- ESCRITURA ---
    insert: (row) => {
      const rows = Array.isArray(row) ? row : [row];
      const inserted = rows.map(r => ({ ...r, id: crypto.randomUUID(), created_at: new Date().toISOString() }));
      if(datosPrueba[table]) datosPrueba[table].push(...inserted);
      return { data: inserted, error: null, select: () => ({ single: () => ({ data: inserted[0], error: null }) }) };
    },
    update: (updates) => {
      result.forEach(item => {
          const original = datosPrueba[table].find(x => x.id === item.id);
          if(original) Object.assign(original, updates);
      });
      return { error: null };
    },
    delete: () => {
      const idsToDelete = result.map(i => i.id);
      datosPrueba[table] = datosPrueba[table].filter(x => !idsToDelete.includes(x.id));
      return { error: null };
    },

    then: async (callback) => {
      await delay(50); // Latencia mínima
      const data = singleMode ? (result[0] || null) : result;
      return callback({ data, error: null });
    }
  };
  return builder;
};

export const supabase = {
  from: (table) => createQueryBuilder(table),
  rpc: async () => ({ data: true, error: null }), // Bypass de seguridad RPC

  auth: {
    // Recuperar sesión al recargar
    getSession: async () => {
       const stored = localStorage.getItem(SESSION_KEY);
       if(!stored) return { data: { session: null }, error: null };
       const session = JSON.parse(stored);
       return { data: { session }, error: null };
    },
    // Guardar sesión al loguear
    setSession: async (sessionData) => {
        if (sessionData) {
            // Normalizamos la estructura de la sesión
            const session = { 
                access_token: 'mock_token', 
                user: sessionData.user || sessionData 
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            return { data: { session }, error: null };
        }
        return { error: { message: "Datos de sesión inválidos" } };
    },
    signInWithPassword: async ({ email }) => {
        // Busca por username O email para facilitar pruebas
        const user = datosPrueba.usuarios.find(u => u.username === email || u.email === email);
        if(user) {
            const sessionUser = { id: user.id, email: user.email, role: user.rol, app_metadata: {}, user_metadata: {} };
            const session = { access_token: 'mock_token', user: sessionUser };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            return { data: { user: sessionUser, session }, error: null };
        }
        return { data: null, error: { message: 'Credenciales incorrectas (Mock)' } };
    },
    signOut: async () => {
        localStorage.removeItem(SESSION_KEY);
        return { error: null };
    },
    onAuthStateChange: (callback) => {
        // Disparar evento inicial
        const stored = localStorage.getItem(SESSION_KEY);
        if(stored) callback('SIGNED_IN', JSON.parse(stored));
        return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};