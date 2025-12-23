import { datosPrueba } from './datosPrueba';

// --- SIMULADOR DE SUPABASE (Versión Corregida Final) ---
// Soluciona: Error de 'setSession' y Error 'reading estado' (falta de empresa)

const SESSION_KEY = 'mock_session';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Constructor de Consultas Simulado
const createQueryBuilder = (table) => {
  let result = [...(datosPrueba[table] || [])];
  let singleMode = false;

  // --- LÓGICA DE JOINS AUTOMÁTICA ---
  
  // 1. Si pedimos 'usuarios', les pegamos su empresa automáticamente
  if(table === 'usuarios') {
      result = result.map(u => ({
          ...u,
          // Buscamos la empresa en datosPrueba y la adjuntamos
          empresas: datosPrueba.empresas.find(e => e.id === u.empresa_id) || {} 
      }));
  }

  // 2. Si pedimos 'creditos', les pegamos su cliente
  if(table === 'creditos') {
      result = result.map(c => ({
          ...c,
          clientes: datosPrueba.clientes.find(cli => cli.id === c.cliente_id)
      }));
  }

  // 3. Si pedimos 'rutas', les pegamos su cobrador
  if(table === 'rutas') {
      result = result.map(r => ({
          ...r,
          usuarios: datosPrueba.usuarios.find(u => u.id === r.usuario_cobrador_id)
      }));
  }

  const builder = {
    select: (query) => builder, 
    eq: (col, val) => {
      // Ignoramos filtros complejos de relaciones (ej: 'empresas.estado') para no romper
      if(col.includes('.')) return builder; 
      
      result = result.filter(item => String(item[col]) === String(val));
      return builder;
    },
    neq: (col, val) => { result = result.filter(item => item[col] != val); return builder; },
    gt: (col, val) => { result = result.filter(item => item[col] > val); return builder; },
    gte: (col, val) => { result = result.filter(item => item[col] >= val); return builder; },
    lte: (col, val) => { result = result.filter(item => item[col] <= val); return builder; },
    ilike: (col, val) => {
      if(!val) return builder;
      const search = val.replace(/%/g, '').toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(v => String(v).toLowerCase().includes(search))
      );
      return builder;
    },
    order: (col, { ascending } = { ascending: true }) => {
      result.sort((a, b) => ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1));
      return builder;
    },
    limit: (n) => { result = result.slice(0, n); return builder; },
    single: () => { singleMode = true; return builder; },
    maybeSingle: () => { singleMode = true; return builder; },
    
    // ESCRITURA (RAM)
    insert: (row) => {
      const rows = Array.isArray(row) ? row : [row];
      const inserted = rows.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() }));
      if(datosPrueba[table]) datosPrueba[table].push(...inserted);
      return { 
        data: inserted, 
        error: null, 
        select: () => ({ single: () => ({ data: inserted[0], error: null }) }) 
      };
    },
    update: (updates) => {
      result.forEach(item => {
          const original = datosPrueba[table].find(x => x.id === item.id);
          if(original) Object.assign(original, updates);
      });
      return { error: null };
    },
    delete: () => {
      const ids = result.map(i => i.id);
      datosPrueba[table] = datosPrueba[table].filter(i => !ids.includes(i.id));
      return { error: null };
    },
    
    then: async (callback) => {
      await delay(100); 
      const data = singleMode ? (result[0] || null) : result;
      return callback({ data, error: null });
    }
  };
  return builder;
};

// OBJETO SUPABASE FALSO
export const supabase = {
  from: (table) => createQueryBuilder(table),
  rpc: async () => ({ data: true, error: null }),

  auth: {
    getSession: async () => {
       const user = localStorage.getItem(SESSION_KEY);
       if(!user) return { data: { session: null }, error: null };
       return { data: { session: { user: JSON.parse(user) } }, error: null };
    },
    // Corrección crítica: Agregamos setSession
    setSession: async (sessionData) => {
        if (sessionData && sessionData.user) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData.user));
            return { data: { session: sessionData }, error: null };
        }
        return { error: { message: "Error al guardar sesión" } };
    },
    signInWithPassword: async ({ email }) => {
        const user = datosPrueba.usuarios.find(u => u.username === email || u.email === email);
        if(user) {
            const sessionUser = { id: user.id, email: user.email, role: user.rol };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            return { data: { user: sessionUser, session: { user: sessionUser } }, error: null };
        }
        return { data: null, error: { message: 'Usuario no encontrado' } };
    },
    signOut: async () => {
        localStorage.removeItem(SESSION_KEY);
        return { error: null };
    },
    onAuthStateChange: () => {
        return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};