import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Map, Users, Lock, Unlock, Plus, Activity, UserPlus, Trash2, MapPin, AlertTriangle, Edit3, Save, XCircle } from 'lucide-react';

export function AdminPanel() {
  const { usuario } = useAuth();
  const [rutas, setRutas] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [vista, setVista] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Estados para formularios
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoCobrador, setNuevoCobrador] = useState({ nombre: '', user: '', pass: '' });

  // --- ESTADOS PARA EDICIÓN Y SEGURIDAD ---
  const [itemEliminar, setItemEliminar] = useState(null); 
  const [passConfirmacion, setPassConfirmacion] = useState('');
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  
  // Estado para editar nombre de ruta
  const [rutaEditando, setRutaEditando] = useState(null); 
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    cargarData();
    const interval = setInterval(cargarData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function cargarData() {
    try {
      const { data: rutasData } = await supabase.from('rutas').select(`*, usuarios (nombre_completo)`).eq('empresa_id', usuario.empresa_id).order('id', { ascending: true });
      const { data: cobradoresData } = await supabase.from('usuarios').select('*').eq('empresa_id', usuario.empresa_id).eq('rol', 'COBRADOR').order('nombre_completo', { ascending: true });
      if (rutasData) setRutas(rutasData);
      if (cobradoresData) setCobradores(cobradoresData);
    } catch (error) { console.error(error); }
  }

  // --- LÓGICA DE ELIMINACIÓN SEGURA ---
  const solicitarEliminacion = (tipo, data) => {
    setItemEliminar({ tipo, data });
    setPassConfirmacion('');
  };

  const cancelarEliminacion = () => {
    setItemEliminar(null);
    setPassConfirmacion('');
  };

  const confirmarEliminacion = async (e) => {
    e.preventDefault();
    if (!passConfirmacion) return alert("Ingresa tu contraseña para confirmar.");
    
    setLoadingSecurity(true);
    try {
      // VERIFICAR CONTRASEÑA DEL ADMIN
      const { data: adminValido } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', usuario.id)
        .eq('password_hash', passConfirmacion)
        .single();

      if (!adminValido) throw new Error("⛔ Contraseña incorrecta. Permiso denegado.");

      // BORRAR
      if (itemEliminar.tipo === 'ruta') {
        const { error } = await supabase.from('rutas').delete().eq('id', itemEliminar.data.id);
        if (error) throw error;
        setRutas(rutas.filter(r => r.id !== itemEliminar.data.id));
        alert("✅ Ruta eliminada.");
      } 
      else if (itemEliminar.tipo === 'cobrador') {
        const { error } = await supabase.from('usuarios').delete().eq('id', itemEliminar.data.id);
        if (error) throw error;
        setCobradores(cobradores.filter(c => c.id !== itemEliminar.data.id));
        alert("✅ Usuario eliminado correctamente.");
      }
      cancelarEliminacion();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingSecurity(false);
    }
  };

  // --- LÓGICA RUTAS Y COBRADORES (Crear/Editar) ---
  async function crearRuta(e) {
    e.preventDefault();
    if (!nuevaRuta.trim()) return alert("Falta el nombre de la ruta.");
    setLoading(true);
    const { data, error } = await supabase.from('rutas').insert([{ empresa_id: usuario.empresa_id, nombre: nuevaRuta.toUpperCase(), estado: true }]).select().single();
    setLoading(false);
    if (!error) {
      setNuevaRuta('');
      setRutas([...rutas, { ...data, usuarios: null }]);
    }
  }

  const iniciarEdicionRuta = (ruta) => { setRutaEditando(ruta.id); setNombreEditado(ruta.nombre); };
  
  async function guardarNombreRuta(id) {
    if (!nombreEditado.trim()) return;
    const { error } = await supabase.from('rutas').update({ nombre: nombreEditado.toUpperCase() }).eq('id', id);
    if (!error) {
      setRutas(rutas.map(r => r.id === id ? { ...r, nombre: nombreEditado.toUpperCase() } : r));
      setRutaEditando(null);
    }
  }

  async function asignarCobrador(rutaId, usuarioId) {
    setRutas(rutas.map(r => r.id === rutaId ? { ...r, usuario_cobrador_id: usuarioId } : r));
    await supabase.from('rutas').update({ usuario_cobrador_id: usuarioId ? usuarioId : null }).eq('id', rutaId);
  }

  async function toggleBloqueoRuta(ruta) {
    const nuevoEstado = !ruta.estado;
    setRutas(rutas.map(r => r.id === ruta.id ? { ...r, estado: nuevoEstado } : r));
    await supabase.from('rutas').update({ estado: nuevoEstado }).eq('id', ruta.id);
  }

  async function crearCobrador(e) {
    e.preventDefault();
    if (nuevoCobrador.pass.length < 4) return alert("Contraseña muy corta.");
    setLoading(true);
    try {
      const { data: existe } = await supabase.from('usuarios').select('id').eq('username', nuevoCobrador.user).single();
      if (existe) throw new Error("⛔ Usuario ya existe.");

      const { data, error } = await supabase.from('usuarios').insert([{
        empresa_id: usuario.empresa_id,
        nombre_completo: nuevoCobrador.nombre.toUpperCase(),
        username: nuevoCobrador.user,
        password_hash: nuevoCobrador.pass,
        rol: 'COBRADOR',
        estado: true
      }]).select().single();

      if (error) throw error;
      setNuevoCobrador({ nombre: '', user: '', pass: '' });
      setCobradores([...cobradores, data]);
      alert("✅ Cobrador creado.");
    } catch (error) { alert(error.message); } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: '10px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#111827', margin: 0, display:'flex', alignItems:'center', gap:'10px' }}>
             <Activity color="#7c3aed"/> Panel Gerencial
        </h2>
        <div style={{ display: 'flex', gap: '5px', backgroundColor:'white', padding:'5px', borderRadius:'8px', border:'1px solid #e5e7eb' }}>
          <button onClick={() => setVista('dashboard')} style={vista === 'dashboard' ? btnActivo : btnInactivo}>🛣️ Rutas</button>
          <button onClick={() => setVista('personal')} style={vista === 'personal' ? btnActivo : btnInactivo}>👷 Personal</button>
          <button onClick={() => setVista('mapa')} style={vista === 'mapa' ? btnActivo : btnInactivo}>📍 GPS</button>
        </div>
      </div>

      {/* VISTA 1: RUTAS */}
      {vista === 'dashboard' && (
        <div>
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', display:'flex', gap:'10px', alignItems:'center', border:'1px solid #e5e7eb' }}>
            <input placeholder="Nombre Nueva Ruta" value={nuevaRuta} onChange={e => setNuevaRuta(e.target.value)} style={inputStyle} />
            <button onClick={crearRuta} disabled={loading} style={btnVerde}>{loading ? '...' : <><Plus size={18}/> Crear</>}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {rutas.map(ruta => (
              <div key={ruta.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', borderLeft: ruta.estado ? '5px solid #10b981' : '5px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                  {rutaEditando === ruta.id ? (
                    <div style={{display:'flex', gap:'5px', flex:1, marginRight:'10px'}}>
                      <input value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} style={{...inputStyle, padding:'5px'}} autoFocus />
                      <button onClick={() => guardarNombreRuta(ruta.id)} style={{...btnVerde, padding:'5px'}}><Save size={16}/></button>
                    </div>
                  ) : (
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <h3 style={{ margin: 0, color: '#374151', fontSize:'16px' }}>{ruta.nombre}</h3>
                      <button onClick={() => iniciarEdicionRuta(ruta)} style={{background:'none', border:'none', cursor:'pointer', color:'#9ca3af'}} title="Editar Nombre"><Edit3 size={14}/></button>
                    </div>
                  )}

                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => toggleBloqueoRuta(ruta)} style={btnIcono} title={ruta.estado ? "Bloquear" : "Desbloquear"}>{ruta.estado ? <Unlock size={18} color="#10b981"/> : <Lock size={18} color="#ef4444"/>}</button>
                    {/* BOTÓN ELIMINAR RUTA */}
                    <button onClick={() => solicitarEliminacion('ruta', ruta)} style={{...btnIcono, backgroundColor: '#fee2e2', borderRadius: '4px'}}>
                        <Trash2 size={18} color="#dc2626"/>
                    </button>
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight:'bold' }}>COBRADOR:</label>
                  <select value={ruta.usuario_cobrador_id || ''} onChange={(e) => asignarCobrador(ruta.id, e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="">-- Sin Asignar --</option>
                    {cobradores.map(cob => (<option key={cob.id} value={cob.id}>{cob.nombre_completo}</option>))}
                  </select>
                </div>
                {!ruta.estado && <div style={{fontSize:'12px', color:'red', textAlign:'center', fontWeight:'bold'}}>🚫 BLOQUEADA</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: PERSONAL (AQUÍ ESTÁ EL BOTÓN QUE PEDISTE) */}
      {vista === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', height: 'fit-content', border:'1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize:'16px' }}><UserPlus size={20} color="#2563eb"/> Nuevo Cobrador</h3>
            <form onSubmit={crearCobrador} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required placeholder="Nombre Completo" value={nuevoCobrador.nombre} onChange={e => setNuevoCobrador({...nuevoCobrador, nombre: e.target.value})} style={inputStyle} />
              <input required placeholder="Usuario (Login)" value={nuevoCobrador.user} onChange={e => setNuevoCobrador({...nuevoCobrador, user: e.target.value})} style={inputStyle} />
              <input required placeholder="Contraseña" value={nuevoCobrador.pass} onChange={e => setNuevoCobrador({...nuevoCobrador, pass: e.target.value})} style={inputStyle} />
              <button type="submit" disabled={loading} style={btnActivo}>{loading ? 'Guardando...' : 'Crear Empleado'}</button>
            </form>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border:'1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, fontSize:'16px' }}>📋 Plantilla</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cobradores.map(cob => (
                <li key={cob.id} style={{ padding: '15px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color:'#374151', fontSize:'15px' }}>{cob.nombre_completo}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop:'2px' }}>
                        Usuario: <strong style={{color:'#374151'}}>{cob.username}</strong>
                    </div>
                  </div>
                  
                  {/* BOTÓN ELIMINAR GRANDE Y CLARO */}
                  <button 
                    onClick={() => solicitarEliminacion('cobrador', cob)} 
                    style={{
                        backgroundColor: '#fee2e2', 
                        color: '#b91c1c', 
                        border: '1px solid #fecaca', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontSize: '12px'
                    }}
                  >
                    <Trash2 size={16}/> ELIMINAR
                  </button>
                </li>
              ))}
              {cobradores.length === 0 && <li style={{color:'#888'}}>No hay cobradores.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* VISTA 3: MAPA */}
      {vista === 'mapa' && (
         <div style={{backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb', textAlign:'center', color:'#666'}}>
             <MapPin size={48} color="#2563eb" />
             <p>Mapa GPS activo.</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop:'20px' }}>
                {cobradores.map(cob => (
                    <div key={cob.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px', textAlign:'left' }}>
                        <strong>{cob.nombre_completo}</strong><br/>
                        <span style={{fontSize:'12px'}}>{cob.last_lat ? '🟢 GPS Activo' : '⚪ Sin señal'}</span>
                        {cob.last_lat && (
                            <a href={`http://googleusercontent.com/maps.google.com/search/?api=1&query=${cob.last_lat},${cob.last_lon}`} target="_blank" style={{display:'block', marginTop:'5px', color:'#2563eb', fontSize:'12px', fontWeight:'bold'}}>Ver en Mapa</a>
                        )}
                    </div>
                ))}
             </div>
         </div>
      )}

      {/* --- MODAL DE SEGURIDAD --- */}
      {itemEliminar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <div style={{backgroundColor:'#fee2e2', width:'50px', height:'50px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px auto'}}>
                <AlertTriangle color="#dc2626" size={24} />
              </div>
              <h3 style={{ margin: 0, color: '#111827' }}>Confirmar Eliminación</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>
                Vas a eliminar a <strong>{itemEliminar.data.nombre || itemEliminar.data.nombre_completo}</strong>.<br/>
                Para confirmar, ingresa tu contraseña de Administrador.
              </p>
            </div>
            <form onSubmit={confirmarEliminacion}>
              <input 
                type="password" autoFocus placeholder="Tu contraseña..."
                value={passConfirmacion} onChange={e => setPassConfirmacion(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '20px', fontSize:'16px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={cancelarEliminacion} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight:'bold' }}>Cancelar</button>
                <button type="submit" disabled={loadingSecurity} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight:'bold' }}>{loadingSecurity ? '...' : 'ELIMINAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const btnActivo = { backgroundColor: '#111827', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize:'13px' };
const btnInactivo = { backgroundColor: 'white', color: '#374151', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize:'13px' };
const btnVerde = { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const btnIcono = { background: 'none', border: 'none', cursor: 'pointer', padding:'5px' };
const inputStyle = { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' };