import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { 
  Activity, Search, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  DollarSign, MapPin, Users, Plus, Trash2, Edit3, Save, RefreshCw, 
  ArrowRightCircle, ArrowRightLeft 
} from 'lucide-react';

export function AdminPanel() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState('mapa'); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // --- ESTADOS AUDITORÍA Y FINANZAS ---
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [historialCreditos, setHistorialCreditos] = useState([]);
  const [score, setScore] = useState('NEUTRO');
  const [finanzas, setFinanzas] = useState({ dineroCalle: 0, cobradoHoy: 0, clientesActivos: 0, carteraVencida: 0 });

  // --- ESTADOS OPERATIVOS ---
  const [rutas, setRutas] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoCobrador, setNuevoCobrador] = useState({ nombre: '', user: '', pass: '' });
  
  // --- ESTADOS MIGRACIÓN (NUEVO) ---
  const [rutaOrigen, setRutaOrigen] = useState('');
  const [rutaDestino, setRutaDestino] = useState('');
  const [conteoMigracion, setConteoMigracion] = useState(null);

  // --- SEGURIDAD ---
  const [itemEliminar, setItemEliminar] = useState(null);
  const [passConfirmacion, setPassConfirmacion] = useState('');
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [rutaEditando, setRutaEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => {
    cargarTodo();
    const interval = setInterval(cargarTodo, 30000);
    return () => clearInterval(interval);
  }, []);

  async function cargarTodo() {
    await cargarFinanzasGlobales();
    await cargarDatosOperativos();
    setLastUpdate(new Date());
  }

  // --- CARGA DE DATOS ---
  async function cargarFinanzasGlobales() {
    const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const hoyFin = new Date().toISOString().split('T')[0] + 'T23:59:59';

    const { data: creditos } = await supabase.from('creditos').select('saldo_restante, estado, fecha_fin_estimada').eq('empresa_id', usuario.empresa_id).eq('estado', 'ACTIVO');
    const { data: pagos } = await supabase.from('pagos').select('monto').eq('empresa_id', usuario.empresa_id).gte('fecha_pago', hoyInicio).lte('fecha_pago', hoyFin);
    
    let totalCalle = 0;
    let totalVencido = 0;
    const fechaHoy = new Date();

    creditos?.forEach(c => {
      totalCalle += c.saldo_restante;
      if (new Date(c.fecha_fin_estimada) < fechaHoy) totalVencido += c.saldo_restante;
    });

    setFinanzas({
      dineroCalle: totalCalle,
      cobradoHoy: pagos?.reduce((sum, p) => sum + p.monto, 0) || 0,
      clientesActivos: creditos?.length || 0,
      carteraVencida: totalVencido
    });
  }

  async function cargarDatosOperativos() {
    const { data: rutasData } = await supabase.from('rutas').select(`*, usuarios (nombre_completo)`).eq('empresa_id', usuario.empresa_id).order('id', { ascending: true });
    const { data: cobradoresData } = await supabase.from('usuarios').select('*').eq('empresa_id', usuario.empresa_id).eq('rol', 'COBRADOR').order('nombre_completo', { ascending: true });
    if (rutasData) setRutas(rutasData);
    if (cobradoresData) setCobradores(cobradoresData);
  }

  // --- LÓGICA MIGRACIÓN (NUEVO) ---
  useEffect(() => {
      if (rutaOrigen) contarClientesEnRuta(rutaOrigen);
  }, [rutaOrigen]);

  async function contarClientesEnRuta(idRuta) {
      const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ruta_id', idRuta);
      setConteoMigracion(count);
  }

  async function ejecutarMigracion() {
      if (!rutaOrigen || !rutaDestino) return alert("Selecciona ambas rutas.");
      if (rutaOrigen === rutaDestino) return alert("Las rutas deben ser diferentes.");
      
      const pass = prompt(`⚠️ ATENCIÓN: Vas a mover ${conteoMigracion} clientes.\nEsta acción cambiará su ruta pero mantendrá sus deudas y pagos.\n\nIngresa tu contraseña para confirmar:`);
      if (!pass) return;

      setLoading(true);
      try {
          // 1. Validar Password
          const { data: admin } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password_hash', pass).single();
          if (!admin) throw new Error("Contraseña incorrecta.");

          // 2. Ejecutar cambio masivo
          // Importante: No tocamos creditos ni pagos, ellos siguen al cliente
          const { error } = await supabase.from('clientes')
            .update({ ruta_id: rutaDestino }) // Movemos al cliente
            .eq('ruta_id', rutaOrigen)
            .eq('empresa_id', usuario.empresa_id);

          if (error) throw error;

          alert(`✅ ÉXITO: ${conteoMigracion} clientes fueron migrados a la nueva ruta.`);
          setRutaOrigen('');
          setRutaDestino('');
          setConteoMigracion(null);
          cargarDatosOperativos(); // Refrescar

      } catch (error) {
          alert("Error: " + error.message);
      } finally {
          setLoading(false);
      }
  }

  // --- LÓGICA AUDITORÍA ---
  async function buscarHistorial(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: clientes } = await supabase.from('clientes').select('*').eq('empresa_id', usuario.empresa_id).or(`dni.eq.${busquedaCliente},nombre_completo.ilike.%${busquedaCliente}%`).limit(1);
      if (clientes && clientes.length > 0) {
        const cliente = clientes[0];
        setClienteEncontrado(cliente);
        const { data: creditos } = await supabase.from('creditos').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false });
        setHistorialCreditos(creditos || []);
        calcularScore(creditos || []);
      } else { alert("Cliente no encontrado."); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  const calcularScore = (creditos) => {
    if (creditos.length === 0) return setScore('NEUTRO');
    let malos = 0;
    creditos.forEach(c => {
        const finEstimado = new Date(c.fecha_fin_estimada);
        const ultimoPago = c.fecha_ultimo_pago ? new Date(c.fecha_ultimo_pago) : new Date();
        if (ultimoPago > finEstimado || (c.estado === 'ACTIVO' && new Date() > finEstimado)) malos++;
    });
    if (malos === 0) setScore('VERDE'); else if (malos <= 2) setScore('AMARILLO'); else setScore('ROJO');
  };

  // --- LÓGICA OPERATIVA GENERAL ---
  const confirmarEliminacion = async (e) => {
    e.preventDefault();
    if (!passConfirmacion) return alert("Ingresa contraseña.");
    setLoadingSecurity(true);
    try {
      const { data: adminValido } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password_hash', passConfirmacion).single();
      if (!adminValido) throw new Error("⛔ Contraseña incorrecta.");

      if (itemEliminar.tipo === 'ruta') {
        await supabase.from('rutas').delete().eq('id', itemEliminar.data.id);
        setRutas(rutas.filter(r => r.id !== itemEliminar.data.id));
      } else {
        await supabase.from('usuarios').delete().eq('id', itemEliminar.data.id);
        setCobradores(cobradores.filter(c => c.id !== itemEliminar.data.id));
      }
      setItemEliminar(null); setPassConfirmacion('');
      alert("✅ Eliminado correctamente.");
    } catch (error) { alert(error.message); } finally { setLoadingSecurity(false); }
  };

  async function crearRuta(e) {
    e.preventDefault();
    if (!nuevaRuta.trim()) return;
    const { data } = await supabase.from('rutas').insert([{ empresa_id: usuario.empresa_id, nombre: nuevaRuta.toUpperCase(), estado: true }]).select().single();
    if (data) { setRutas([...rutas, { ...data, usuarios: null }]); setNuevaRuta(''); }
  }

  async function crearCobrador(e) {
    e.preventDefault();
    if (nuevoCobrador.pass.length < 4) return alert("Clave muy corta");
    const { data: existe } = await supabase.from('usuarios').select('id').eq('username', nuevoCobrador.user).single();
    if (existe) return alert("Usuario ya existe");
    const { data } = await supabase.from('usuarios').insert([{ empresa_id: usuario.empresa_id, nombre_completo: nuevoCobrador.nombre.toUpperCase(), username: nuevoCobrador.user, password_hash: nuevoCobrador.pass, rol: 'COBRADOR', estado: true }]).select().single();
    if (data) { setCobradores([...cobradores, data]); setNuevoCobrador({ nombre: '', user: '', pass: '' }); alert("Cobrador creado"); }
  }

  async function asignarCobrador(rutaId, userId) {
    setRutas(rutas.map(r => r.id === rutaId ? { ...r, usuario_cobrador_id: userId } : r));
    await supabase.from('rutas').update({ usuario_cobrador_id: userId || null }).eq('id', rutaId);
  }
  async function guardarNombreRuta(id) {
    if(!nombreEditado.trim()) return;
    await supabase.from('rutas').update({ nombre: nombreEditado.toUpperCase() }).eq('id', id);
    setRutas(rutas.map(r => r.id === id ? { ...r, nombre: nombreEditado.toUpperCase() } : r));
    setRutaEditando(null);
  }

  // AUXILIAR TIEMPO
  const calcularHaceCuanto = (fechaIso) => {
    if (!fechaIso) return 'Nunca';
    const diferencia = new Date() - new Date(fechaIso);
    const minutos = Math.floor(diferencia / 60000);
    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} min`;
    return `Hace ${Math.floor(minutos/60)} horas`;
  };

  return (
    <div style={{ padding: '10px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '15px' }}>
        <h2 style={{ color: '#111827', margin: 0, display:'flex', alignItems:'center', gap:'10px' }}>
             <Activity color="#7c3aed" size={28}/> Centro de Control
        </h2>
      </div>

      {/* MENÚ PESTAÑAS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX:'auto' }}>
        <button onClick={() => setVista('mapa')} style={vista === 'mapa' ? btnActivo : btnInactivo}>📍 GPS ubicacion cobradores</button>
        <button onClick={() => setVista('auditoria')} style={vista === 'auditoria' ? btnActivo : btnInactivo}>🔎 consultar datos de clientes</button>
        <button onClick={() => setVista('finanzas')} style={vista === 'finanzas' ? btnActivo : btnInactivo}>📊 estado de cartera</button>
        <button onClick={() => setVista('operativo')} style={vista === 'operativo' ? btnActivo : btnInactivo}>⚙️ Gestión</button>
      </div>

      {/* VISTA 0: MAPA GPS */}
      {vista === 'mapa' && (
         <div style={{backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #d1d5db'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <MapPin size={24} color="#2563eb" />
                  <div>
                    <h3 style={{margin:0, color:'#111827'}}>Rastreo Satelital</h3>
                    <span style={{fontSize:'12px', color:'#666'}}>Actualizado: {lastUpdate.toLocaleTimeString()}</span>
                  </div>
               </div>
               <button onClick={cargarTodo} style={{border:'none', background:'none', cursor:'pointer'}} title="Actualizar"><RefreshCw size={20}/></button>
             </div>
             
             {cobradores.length === 0 ? <p>No hay cobradores registrados.</p> : (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                    {cobradores.map(cob => (
                        <div key={cob.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '12px', textAlign:'left', borderLeft: cob.last_lat ? '4px solid #16a34a' : '4px solid #9ca3af', backgroundColor: cob.last_lat ? '#f0fdf4' : '#f9fafb' }}>
                            <div style={{fontWeight:'bold', color:'#111827', fontSize:'16px'}}>{cob.nombre_completo}</div>
                            <div style={{fontSize:'13px', color:'#4b5563', margin:'5px 0'}}>
                               {cob.last_lat ? `📍 Reportó: ${calcularHaceCuanto(cob.last_seen)}` : '⚪ Sin señal reciente'}
                            </div>
                            
                            {cob.last_lat ? (
                                <a 
                                  href={`http://googleusercontent.com/maps.google.com/search/?api=1&query=${cob.last_lat},${cob.last_lon}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{display:'block', marginTop:'10px', backgroundColor:'#2563eb', color:'white', textAlign:'center', padding:'8px', borderRadius:'6px', textDecoration:'none', fontWeight:'bold', fontSize:'14px'}}
                                >
                                  VER EN MAPA 🗺️
                                </a>
                            ) : <div style={{fontSize:'12px', color:'#9ca3af', fontStyle:'italic', marginTop:'10px'}}>Esperando conexión...</div>}
                        </div>
                    ))}
                 </div>
             )}
         </div>
      )}

      {/* VISTA 1: AUDITORÍA */}
      {vista === 'auditoria' && (
        <div>
           <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border:'1px solid #d1d5db', marginBottom:'20px' }}>
              <form onSubmit={buscarHistorial} style={{display:'flex', gap:'10px'}}>
                  <input placeholder="DNI o Nombre..." value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} style={inputStyle} />
                  <button type="submit" disabled={loading} style={btnVerde}><Search size={18} /></button>
              </form>
           </div>
           {clienteEncontrado && (
             <div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: `8px solid ${score === 'VERDE' ? '#16a34a' : score === 'AMARILLO' ? '#eab308' : '#dc2626'}`, marginBottom: '20px' }}>
                    <h2 style={{margin:0}}>{clienteEncontrado.nombre_completo}</h2>
                    <div style={{color:'#6b7280'}}>Récord: <strong>{score}</strong></div>
                </div>
                <table style={{width:'100%', borderCollapse:'collapse', backgroundColor:'white'}}>
                    <thead><tr style={{textAlign:'left'}}><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
                    <tbody>
                        {historialCreditos.map(c => (
                            <tr key={c.id} style={{borderTop:'1px solid #eee'}}>
                                <td style={{padding:'10px'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                                <td>S/ {c.total_a_pagar}</td>
                                <td>{c.estado}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
           )}
        </div>
      )}

      {/* VISTA 2: FINANZAS */}
      {vista === 'finanzas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px' }}>
                <div style={{opacity:0.8, fontSize:'12px'}}>CAPITAL EN CALLE</div>
                <div style={{fontSize:'32px', fontWeight:'bold'}}>S/ {finanzas.dineroCalle}</div>
            </div>
            <div style={{ backgroundColor: '#065f46', color: 'white', padding: '20px', borderRadius: '12px' }}>
                <div style={{opacity:0.8, fontSize:'12px'}}>COBRADO HOY</div>
                <div style={{fontSize:'32px', fontWeight:'bold'}}>S/ {finanzas.cobradoHoy}</div>
            </div>
            <div style={{ backgroundColor: '#7f1d1d', color: 'white', padding: '20px', borderRadius: '12px' }}>
                <div style={{opacity:0.8, fontSize:'12px'}}>CARTERA VENCIDA</div>
                <div style={{fontSize:'32px', fontWeight:'bold'}}>S/ {finanzas.carteraVencida}</div>
            </div>
        </div>
      )}

      {/* VISTA 3: OPERATIVO */}
      {vista === 'operativo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* GESTIÓN RUTAS */}
            <div>
                <h3 style={{color:'#374151'}}>Rutas</h3>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input placeholder="Nueva Ruta" value={nuevaRuta} onChange={e => setNuevaRuta(e.target.value)} style={inputStyle} />
                    <button onClick={crearRuta} style={btnVerde}><Plus/></button>
                </div>
                {rutas.map(r => (
                    <div key={r.id} style={{backgroundColor:'white', padding:'10px', marginBottom:'10px', borderRadius:'8px', border:'1px solid #ddd'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            {rutaEditando === r.id ? 
                                <><input value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} style={inputStyle}/><button onClick={() => guardarNombreRuta(r.id)}><Save size={16}/></button></> :
                                <strong>{r.nombre}</strong>
                            }
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => {setRutaEditando(r.id); setNombreEditado(r.nombre)}} style={{border:'none', background:'none'}}><Edit3 size={16}/></button>
                                <button onClick={() => {setItemEliminar({tipo:'ruta', data:r}); setPassConfirmacion('')}} style={{border:'none', background:'none', color:'red'}}><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <select style={{width:'100%', marginTop:'5px'}} value={r.usuario_cobrador_id || ''} onChange={e => asignarCobrador(r.id, e.target.value)}>
                            <option value="">-- Asignar Cobrador --</option>
                            {cobradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                        </select>
                    </div>
                ))}

                {/* --- SECCIÓN NUEVA: MIGRACIÓN --- */}
                <div style={{marginTop:'30px', borderTop:'2px dashed #ccc', paddingTop:'20px'}}>
                    <h3 style={{color:'#d97706', display:'flex', alignItems:'center', gap:'5px'}}>
                        <ArrowRightLeft size={20}/> Migración Masiva
                    </h3>
                    <div style={{backgroundColor:'#fff7ed', padding:'15px', borderRadius:'8px', border:'1px solid #fed7aa'}}>
                        <p style={{fontSize:'12px', color:'#9a3412', margin:'0 0 10px 0'}}>Mover todos los clientes de una ruta a otra.</p>
                        
                        <label style={{fontSize:'12px', fontWeight:'bold'}}>Origen (Sacar de):</label>
                        <select value={rutaOrigen} onChange={e => setRutaOrigen(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}>
                            <option value="">-- Seleccionar --</option>
                            {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>

                        {conteoMigracion !== null && <div style={{fontSize:'12px', marginBottom:'10px', color:'blue'}}>Clientes encontrados: <strong>{conteoMigracion}</strong></div>}

                        <label style={{fontSize:'12px', fontWeight:'bold'}}>Destino (Mover a):</label>
                        <select value={rutaDestino} onChange={e => setRutaDestino(e.target.value)} style={{width:'100%', marginBottom:'15px', padding:'8px'}}>
                            <option value="">-- Seleccionar --</option>
                            {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>

                        <button onClick={ejecutarMigracion} style={{width:'100%', background:'#d97706', color:'white', border:'none', padding:'10px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>
                            EJECUTAR MIGRACIÓN
                        </button>
                    </div>
                </div>

            </div>

            {/* GESTIÓN PERSONAL */}
            <div>
                <h3 style={{color:'#374151'}}>Personal</h3>
                <div style={{backgroundColor:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'15px'}}>
                    <input placeholder="Nombre" value={nuevoCobrador.nombre} onChange={e => setNuevoCobrador({...nuevoCobrador, nombre: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <input placeholder="Usuario" value={nuevoCobrador.user} onChange={e => setNuevoCobrador({...nuevoCobrador, user: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <input placeholder="Clave" value={nuevoCobrador.pass} onChange={e => setNuevoCobrador({...nuevoCobrador, pass: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <button onClick={crearCobrador} style={{...btnVerde, width:'100%'}}>Crear Cobrador</button>
                </div>
                {cobradores.map(c => (
                    <div key={c.id} style={{backgroundColor:'white', padding:'10px', marginBottom:'5px', borderRadius:'8px', border:'1px solid #ddd', display:'flex', justifyContent:'space-between'}}>
                        <div>{c.nombre_completo} <br/><small style={{color:'#666'}}>{c.username}</small></div>
                        <button onClick={() => {setItemEliminar({tipo:'cobrador', data:c}); setPassConfirmacion('')}} style={{color:'red', border:'none', background:'none'}}><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {itemEliminar && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center'}}>
            <div style={{backgroundColor:'white', padding:'20px', borderRadius:'10px', width:'300px', textAlign:'center'}}>
                <h3>Confirmar con Clave</h3>
                <input type="password" value={passConfirmacion} onChange={e => setPassConfirmacion(e.target.value)} style={{...inputStyle, width:'100%', marginBottom:'10px'}} autoFocus />
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={() => setItemEliminar(null)} style={{flex:1, padding:'10px'}}>Cancelar</button>
                    <button onClick={confirmarEliminacion} style={{flex:1, padding:'10px', background:'red', color:'white', border:'none'}}>Eliminar</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

const btnActivo = { backgroundColor: '#111827', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const btnInactivo = { backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' };
const btnVerde = { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' };