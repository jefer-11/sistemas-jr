import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Map, Users, Lock, Unlock, Plus, Activity, UserPlus, Trash2 } from 'lucide-react';

export function AdminPanel() {
  const { usuario } = useAuth();
  const [rutas, setRutas] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [vista, setVista] = useState('dashboard'); // 'dashboard', 'personal', 'mapa'
  const [loading, setLoading] = useState(false);

  // Estados para formularios
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoCobrador, setNuevoCobrador] = useState({ nombre: '', user: '', pass: '' });

  useEffect(() => {
    cargarData();
    const interval = setInterval(cargarData, 30000); // Refresco automático
    return () => clearInterval(interval);
  }, []);

  async function cargarData() {
    setLoading(true);
    try {
      // 1. Cargar Rutas
      const { data: rutasData } = await supabase
        .from('rutas')
        .select(`*, usuarios (nombre_completo)`)
        .eq('empresa_id', usuario.empresa_id);

      // 2. Cargar Cobradores
      const { data: cobradoresData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', usuario.empresa_id)
        .eq('rol', 'COBRADOR');

      setRutas(rutasData || []);
      setCobradores(cobradoresData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- GESTIÓN DE RUTAS ---
  async function crearRuta(e) {
    e.preventDefault();
    if (!nuevaRuta) return;
    
    const { error } = await supabase.from('rutas').insert([{
      empresa_id: usuario.empresa_id,
      nombre: nuevaRuta,
      estado: true
    }]);

    if (error) alert(error.message);
    else {
      setNuevaRuta('');
      cargarData();
    }
  }

  async function asignarCobrador(rutaId, usuarioId) {
    await supabase.from('rutas').update({ usuario_cobrador_id: usuarioId }).eq('id', rutaId);
    cargarData();
  }

  async function toggleBloqueoRuta(ruta) {
    await supabase.from('rutas').update({ estado: !ruta.estado }).eq('id', ruta.id);
    cargarData();
  }

  // --- GESTIÓN DE PERSONAL ---
  async function crearCobrador(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('usuarios').insert([{
        empresa_id: usuario.empresa_id,
        nombre_completo: nuevoCobrador.nombre,
        username: nuevoCobrador.user,
        password_hash: nuevoCobrador.pass,
        rol: 'COBRADOR',
        estado: true
      }]);

      if (error) throw error;
      alert("✅ Cobrador creado exitosamente.");
      setNuevoCobrador({ nombre: '', user: '', pass: '' });
      cargarData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#111827', margin: 0 }}>Panel Gerencial</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Gestiona tus Rutas y Empleados</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setVista('dashboard')} style={vista === 'dashboard' ? btnActivo : btnInactivo}>🛣️ Mis Rutas</button>
          <button onClick={() => setVista('personal')} style={vista === 'personal' ? btnActivo : btnInactivo}>👷 Personal</button>
          <button onClick={() => setVista('mapa')} style={vista === 'mapa' ? btnActivo : btnInactivo}>📍 Mapa GPS</button>
        </div>
      </div>

      {/* VISTA 1: GESTIÓN DE RUTAS */}
      {vista === 'dashboard' && (
        <div>
          {/* Formulario Rápido Crear Ruta */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Crear Nueva Ruta</h3>
            <form onSubmit={crearRuta} style={{ display: 'flex', gap: '10px' }}>
              <input 
                placeholder="Nombre de la Ruta (Ej: Ruta Centro)" 
                value={nuevaRuta}
                onChange={e => setNuevaRuta(e.target.value)}
                style={inputStyle}
                required
              />
              <button type="submit" style={btnVerde}><Plus size={18}/> Crear</button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {rutas.map(ruta => (
              <div key={ruta.id} style={{ 
                backgroundColor: 'white', padding: '20px', borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: ruta.estado ? '5px solid #10b981' : '5px solid #ef4444' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#374151' }}>{ruta.nombre}</h3>
                  <button onClick={() => toggleBloqueoRuta(ruta)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title={ruta.estado ? "Bloquear" : "Activar"}>
                    {ruta.estado ? <Unlock size={20} color="#10b981"/> : <Lock size={20} color="#ef4444"/>}
                  </button>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>Cobrador Asignado:</label>
                  <select 
                    value={ruta.usuario_cobrador_id || ''} 
                    onChange={(e) => asignarCobrador(ruta.id, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">-- Sin Asignar --</option>
                    {cobradores.map(cob => (
                      <option key={cob.id} value={cob.id}>{cob.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div style={{ backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                  {ruta.estado ? '🟢 Operativa' : '🔴 Bloqueada (Nadie puede cobrar)'}
                </div>
              </div>
            ))}
            
            {rutas.length === 0 && <div style={{ color: '#666', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>No tienes rutas creadas. ¡Crea la primera arriba!</div>}
          </div>
        </div>
      )}

      {/* VISTA 2: GESTIÓN DE PERSONAL */}
      {vista === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Formulario Crear Cobrador */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><UserPlus size={20}/> Registrar Nuevo Cobrador</h3>
            <form onSubmit={crearCobrador} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Nombre Completo" value={nuevoCobrador.nombre} onChange={e => setNuevoCobrador({...nuevoCobrador, nombre: e.target.value})} style={inputStyle} />
              <input required placeholder="Usuario para Login" value={nuevoCobrador.user} onChange={e => setNuevoCobrador({...nuevoCobrador, user: e.target.value})} style={inputStyle} />
              <input required placeholder="Contraseña" value={nuevoCobrador.pass} onChange={e => setNuevoCobrador({...nuevoCobrador, pass: e.target.value})} style={inputStyle} />
              <button type="submit" style={btnActivo}>Crear Empleado</button>
            </form>
          </div>

          {/* Lista de Empleados */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0 }}>📋 Lista de Cobradores</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cobradores.map(cob => (
                <li key={cob.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{cob.nombre_completo}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Usuario: {cob.username}</div>
                  </div>
                  <div style={{ fontSize: '12px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px' }}>
                    Activo
                  </div>
                </li>
              ))}
              {cobradores.length === 0 && <li style={{color:'#999', fontStyle:'italic'}}>No has registrado empleados aún.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* VISTA 3: MAPA (Mismo código de antes) */}
      {vista === 'mapa' && (
        <div style={{ height: '500px', backgroundColor: '#e5e7eb', borderRadius: '12px', position: 'relative', overflow: 'hidden', border: '1px solid #d1d5db' }}>
          <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', zIndex: 10 }}>
            <h4 style={{ margin: '0 0 5px 0', display:'flex', alignItems:'center', gap:'5px' }}><Activity size={16} color="#2563eb"/> Rastreo Satelital</h4>
            <div style={{ fontSize: '12px', color: '#666' }}>Actualización automática (30s)</div>
          </div>
          <div style={{ padding: '60px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {cobradores.map(cob => (
              <div key={cob.id} style={{ backgroundColor: 'white', padding: '10px 15px', borderRadius: '50px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cob.last_lat ? '#22c55e' : '#ef4444', border: '2px solid white', boxShadow: '0 0 0 2px ' + (cob.last_lat ? '#22c55e' : '#ef4444') }}></div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>{cob.nombre_completo}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {cob.last_lat ? `${cob.last_lat.toFixed(4)}, ${cob.last_lon.toFixed(4)}` : 'Sin señal GPS'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// Estilos
const btnActivo = { backgroundColor: '#111827', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnInactivo = { backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' };
const btnVerde = { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const inputStyle = { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' };