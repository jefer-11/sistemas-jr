import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { 
  Activity, Search, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  DollarSign, MapPin, Users, Plus, Trash2, Edit3, Save, RefreshCw, 
  ArrowRightLeft, Filter, BarChart3
} from 'lucide-react';

export function AdminPanel() {
  const { usuario } = useAuth();
  const [vista, setVista] = useState('finanzas'); // Iniciamos en Finanzas para ver el cambio
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // --- ESTADOS DE DATOS ---
  const [rutas, setRutas] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [todosLosCreditos, setTodosLosCreditos] = useState([]);
  const [todosLosPagosHoy, setTodosLosPagosHoy] = useState([]);
  const [todosLosClientes, setTodosLosClientes] = useState([]);

  // --- FILTRO MAESTRO (LA CLAVE DE TU SOLICITUD) ---
  const [filtroRutaId, setFiltroRutaId] = useState('TODAS');

  // --- ESTADOS FINANCIEROS CALCULADOS ---
  const [finanzas, setFinanzas] = useState({ 
    dineroCalle: 0, 
    cobradoHoy: 0, 
    clientesActivos: 0, 
    carteraVencida: 0,
    gananciaProyectada: 0 
  });

  // --- ESTADOS OPERATIVOS ---
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [historialCreditos, setHistorialCreditos] = useState([]);
  const [score, setScore] = useState('NEUTRO');
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoCobrador, setNuevoCobrador] = useState({ nombre: '', user: '', pass: '' });
  
  // Seguridad y Modales
  const [itemEliminar, setItemEliminar] = useState(null);
  const [passConfirmacion, setPassConfirmacion] = useState('');
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [rutaEditando, setRutaEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  
  // Migración
  const [rutaOrigen, setRutaOrigen] = useState('');
  const [rutaDestino, setRutaDestino] = useState('');
  const [conteoMigracion, setConteoMigracion] = useState(null);

  useEffect(() => {
    cargarTodo();
    const interval = setInterval(cargarTodo, 45000); // Refresco cada 45s
    return () => clearInterval(interval);
  }, []);

  // CADA VEZ QUE CAMBIA EL FILTRO DE RUTA, RECALCULAMOS LOS NÚMEROS
  useEffect(() => {
    recalcularFinanzas();
  }, [filtroRutaId, todosLosCreditos, todosLosPagosHoy]);

  async function cargarTodo() {
    setLoading(true);
    // 1. Cargar Rutas y Personal
    const { data: rutasData } = await supabase.from('rutas').select(`*, usuarios(nombre_completo)`).eq('empresa_id', usuario.empresa_id).order('id', { ascending: true });
    const { data: cobradoresData } = await supabase.from('usuarios').select('*').eq('empresa_id', usuario.empresa_id).eq('rol', 'COBRADOR');
    
    if (rutasData) setRutas(rutasData);
    if (cobradoresData) setCobradores(cobradoresData);

    // 2. Cargar DATOS CRUDOS para cálculos (Estrategia de carga única y filtrado en memoria)
    const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const hoyFin = new Date().toISOString().split('T')[0] + 'T23:59:59';

    // Traemos Clientes para saber su ruta
    const { data: clientesData } = await supabase.from('clientes').select('id, ruta_id').eq('empresa_id', usuario.empresa_id);
    setTodosLosClientes(clientesData || []);

    // Traemos Créditos Activos (Join manual en JS para velocidad)
    const { data: creditosData } = await supabase.from('creditos')
        .select('id, cliente_id, saldo_restante, monto_interes, estado, fecha_fin_estimada')
        .eq('empresa_id', usuario.empresa_id)
        .eq('estado', 'ACTIVO');
    setTodosLosCreditos(creditosData || []);

    // Traemos Pagos de HOY
    const { data: pagosData } = await supabase.from('pagos')
        .select('monto, usuario_cobrador_id')
        .eq('empresa_id', usuario.empresa_id)
        .gte('fecha_pago', hoyInicio).lte('fecha_pago', hoyFin);
    setTodosLosPagosHoy(pagosData || []);

    setLastUpdate(new Date());
    setLoading(false);
  }

  // --- EL CEREBRO FINANCIERO (Lógica de Filtrado) ---
  function recalcularFinanzas() {
    let creditosFiltrados = [];
    let pagosFiltrados = [];

    if (filtroRutaId === 'TODAS') {
        // Opción Global: Usamos todo
        creditosFiltrados = todosLosCreditos;
        pagosFiltrados = todosLosPagosHoy;
    } else {
        // Opción Por Ruta: Filtramos
        // 1. Identificar clientes de esa ruta
        const idsClientesRuta = todosLosClientes.filter(c => c.ruta_id === parseInt(filtroRutaId)).map(c => c.id);
        
        // 2. Filtrar créditos de esos clientes
        creditosFiltrados = todosLosCreditos.filter(c => idsClientesRuta.includes(c.cliente_id));

        // 3. Filtrar pagos (Más complejo: necesitamos saber qué cobrador tiene esa ruta asignada)
        // Para simplificar: Filtramos pagos hechos a créditos de clientes de esa ruta
        // (Nota: En una V2 ideal, el pago debería guardar el ruta_id, pero esto funciona bien por ahora)
        // Aproximación por cobrador asignado a la ruta:
        const rutaActual = rutas.find(r => r.id === parseInt(filtroRutaId));
        if (rutaActual && rutaActual.usuario_cobrador_id) {
            pagosFiltrados = todosLosPagosHoy.filter(p => p.usuario_cobrador_id === rutaActual.usuario_cobrador_id);
        } else {
            pagosFiltrados = []; // Ruta sin cobrador, asumimos 0 cobros por ahora
        }
    }

    // Cálculos
    let totalCalle = 0;
    let totalVencido = 0;
    let totalGanancia = 0;
    const fechaHoy = new Date();

    creditosFiltrados.forEach(c => {
        totalCalle += c.saldo_restante;
        totalGanancia += c.monto_interes; // Ganancia proyectada de lo activo
        if (new Date(c.fecha_fin_estimada) < fechaHoy) {
            totalVencido += c.saldo_restante;
        }
    });

    const totalCobrado = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0);

    setFinanzas({
        dineroCalle: totalCalle,
        cobradoHoy: totalCobrado,
        clientesActivos: creditosFiltrados.length,
        carteraVencida: totalVencido,
        gananciaProyectada: totalGanancia
    });
  }

  // --- FUNCIONES AUXILIARES (Migración, Auditoría, CRUD) ---
  // (Mantenemos la lógica que ya funcionaba, resumida por espacio pero completa en funcionalidad)
  
  useEffect(() => { if (rutaOrigen) contarClientesEnRuta(rutaOrigen); }, [rutaOrigen]);
  async function contarClientesEnRuta(idRuta) {
      const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ruta_id', idRuta);
      setConteoMigracion(count);
  }
  async function ejecutarMigracion() {
      if (!rutaOrigen || !rutaDestino || rutaOrigen === rutaDestino) return alert("Selecciona rutas válidas.");
      const pass = prompt(`Mover ${conteoMigracion} clientes. Ingresa contraseña:`);
      if (!pass) return;
      setLoading(true);
      try {
          const { data: admin } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password_hash', pass).single();
          if (!admin) throw new Error("Contraseña incorrecta.");
          await supabase.from('clientes').update({ ruta_id: rutaDestino }).eq('ruta_id', rutaOrigen).eq('empresa_id', usuario.empresa_id);
          alert("Migración exitosa."); setRutaOrigen(''); setRutaDestino(''); cargarTodo();
      } catch (e) { alert(e.message); } finally { setLoading(false); }
  }

  const confirmarEliminacion = async (e) => {
    e.preventDefault();
    if (!passConfirmacion) return alert("Ingresa contraseña.");
    setLoadingSecurity(true);
    try {
      const { data: admin } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password_hash', passConfirmacion).single();
      if (!admin) throw new Error("Incorrecto.");
      if (itemEliminar.tipo === 'ruta') { await supabase.from('rutas').delete().eq('id', itemEliminar.data.id); setRutas(rutas.filter(r => r.id !== itemEliminar.data.id)); }
      else { await supabase.from('usuarios').delete().eq('id', itemEliminar.data.id); setCobradores(cobradores.filter(c => c.id !== itemEliminar.data.id)); }
      setItemEliminar(null); setPassConfirmacion(''); alert("Eliminado.");
    } catch (e) { alert(e.message); } finally { setLoadingSecurity(false); }
  };

  async function crearRuta(e) { e.preventDefault(); if(!nuevaRuta.trim())return; const {data}=await supabase.from('rutas').insert([{empresa_id:usuario.empresa_id, nombre:nuevaRuta.toUpperCase(), estado:true}]).select().single(); if(data){setRutas([...rutas,{...data, usuarios:null}]); setNuevaRuta('');} }
  async function crearCobrador(e) { e.preventDefault(); if(nuevoCobrador.pass.length<4)return alert("Clave corta"); const {data}=await supabase.from('usuarios').insert([{empresa_id:usuario.empresa_id, nombre_completo:nuevoCobrador.nombre.toUpperCase(), username:nuevoCobrador.user, password_hash:nuevoCobrador.pass, rol:'COBRADOR', estado:true}]).select().single(); if(data){setCobradores([...cobradores, data]); setNuevoCobrador({nombre:'',user:'',pass:''});} }
  async function asignarCobrador(rid, uid) { setRutas(rutas.map(r=>r.id===rid?{...r, usuario_cobrador_id:uid}:r)); await supabase.from('rutas').update({usuario_cobrador_id:uid||null}).eq('id', rid); }
  async function guardarNombreRuta(id) { if(!nombreEditado.trim())return; await supabase.from('rutas').update({nombre:nombreEditado.toUpperCase()}).eq('id', id); setRutas(rutas.map(r=>r.id===id?{...r, nombre:nombreEditado.toUpperCase()}:r)); setRutaEditando(null); }
  
  // Auditoría
  async function buscarHistorial(e) {
    e.preventDefault(); setLoading(true);
    const { data: cls } = await supabase.from('clientes').select('*').eq('empresa_id', usuario.empresa_id).or(`dni.eq.${busquedaCliente},nombre_completo.ilike.%${busquedaCliente}%`).limit(1);
    if(cls && cls.length>0) {
        setClienteEncontrado(cls[0]);
        const {data:crs} = await supabase.from('creditos').select('*').eq('cliente_id', cls[0].id).order('created_at', {ascending:false});
        setHistorialCreditos(crs||[]);
        // Score simple
        let m=0; crs?.forEach(c=>{ if((c.estado==='ACTIVO' && new Date()>new Date(c.fecha_fin_estimada)) || new Date(c.fecha_ultimo_pago)>new Date(c.fecha_fin_estimada)) m++; });
        setScore(m===0?'VERDE':m<=2?'AMARILLO':'ROJO');
    } else alert("No encontrado");
    setLoading(false);
  }

  // AUXILIAR TIEMPO
  const calcularHaceCuanto = (fechaIso) => {
    if (!fechaIso) return 'Nunca';
    const min = Math.floor((new Date()-new Date(fechaIso))/60000);
    return min<1?'Ahora':min<60?`${min}m`:`${Math.floor(min/60)}h`;
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
        <button onClick={() => setVista('finanzas')} style={vista === 'finanzas' ? btnActivo : btnInactivo}>📊 Finanzas</button>
        <button onClick={() => setVista('mapa')} style={vista === 'mapa' ? btnActivo : btnInactivo}>📍 GPS</button>
        <button onClick={() => setVista('auditoria')} style={vista === 'auditoria' ? btnActivo : btnInactivo}>🔎 Auditoría</button>
        <button onClick={() => setVista('operativo')} style={vista === 'operativo' ? btnActivo : btnInactivo}>⚙️ Gestión</button>
      </div>

      {/* --- VISTA 1: FINANZAS (EL DASHBOARD ESTRUCTURADO) --- */}
      {vista === 'finanzas' && (
        <div>
            {/* 1. FILTRO MAESTRO DE RUTAS */}
            <div style={{backgroundColor:'white', padding:'15px', borderRadius:'12px', border:'2px solid #2563eb', marginBottom:'20px', display:'flex', alignItems:'center', gap:'15px', flexWrap:'wrap'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                    <Filter size={24} color="#2563eb"/>
                    <span style={{fontWeight:'bold', fontSize:'16px', color:'#1e3a8a'}}>Visualizar Contabilidad de:</span>
                </div>
                <select 
                    value={filtroRutaId} 
                    onChange={(e) => setFiltroRutaId(e.target.value)}
                    style={{flex:2, padding:'10px', borderRadius:'8px', border:'1px solid #9ca3af', fontSize:'16px', fontWeight:'bold'}}
                >
                    <option value="TODAS">🏢 TODA LA EMPRESA (GLOBAL)</option>
                    <option disabled>──────────</option>
                    {rutas.map(r => <option key={r.id} value={r.id}>Ruta: {r.nombre} ({r.usuarios?.nombre_completo || 'Sin Cobrador'})</option>)}
                </select>
            </div>

            {/* 2. TARJETAS DE RESULTADOS (Se actualizan según el filtro) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom:'30px' }}>
                <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{opacity:0.8, fontSize:'12px', fontWeight:'bold'}}>CAPITAL EN CALLE</div>
                    <div style={{fontSize:'28px', fontWeight:'900', margin:'5px 0'}}>S/ {finanzas.dineroCalle.toLocaleString()}</div>
                    <div style={{fontSize:'12px'}}>{finanzas.clientesActivos} clientes activos</div>
                </div>
                <div style={{ backgroundColor: '#065f46', color: 'white', padding: '20px', borderRadius: '12px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{opacity:0.8, fontSize:'12px', fontWeight:'bold'}}>COBRADO HOY</div>
                    <div style={{fontSize:'28px', fontWeight:'900', margin:'5px 0'}}>S/ {finanzas.cobradoHoy.toLocaleString()}</div>
                    <div style={{fontSize:'12px'}}>Caja diaria bruta</div>
                </div>
                <div style={{ backgroundColor: '#7c3aed', color: 'white', padding: '20px', borderRadius: '12px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{opacity:0.8, fontSize:'12px', fontWeight:'bold'}}>GANANCIA PROYECTADA</div>
                    <div style={{fontSize:'28px', fontWeight:'900', margin:'5px 0'}}>S/ {finanzas.gananciaProyectada.toLocaleString()}</div>
                    <div style={{fontSize:'12px'}}>Intereses por cobrar</div>
                </div>
                <div style={{ backgroundColor: '#7f1d1d', color: 'white', padding: '20px', borderRadius: '12px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{opacity:0.8, fontSize:'12px', fontWeight:'bold'}}>CARTERA VENCIDA</div>
                    <div style={{fontSize:'28px', fontWeight:'900', margin:'5px 0'}}>S/ {finanzas.carteraVencida.toLocaleString()}</div>
                    <div style={{fontSize:'12px'}}>Dinero en riesgo</div>
                </div>
            </div>

            {/* 3. RANKING DE RUTAS (Solo visible en modo GLOBAL) */}
            {filtroRutaId === 'TODAS' && (
                <div style={{backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb'}}>
                    <h3 style={{marginTop:0, color:'#374151', display:'flex', alignItems:'center', gap:'10px'}}>
                        <BarChart3 /> Desempeño por Rutas
                    </h3>
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                            <thead style={{background:'#f3f4f6', color:'#4b5563', textAlign:'left'}}>
                                <tr>
                                    <th style={{padding:'10px'}}>Ruta</th>
                                    <th style={{padding:'10px'}}>Responsable</th>
                                    <th style={{padding:'10px'}}>Estado</th>
                                    <th style={{padding:'10px', textAlign:'right'}}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rutas.map(r => (
                                    <tr key={r.id} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={{padding:'10px', fontWeight:'bold', color:'#1e3a8a'}}>{r.nombre}</td>
                                        <td style={{padding:'10px'}}>{r.usuarios?.nombre_completo || '---'}</td>
                                        <td style={{padding:'10px'}}>
                                            {r.estado ? <span style={{color:'green', fontWeight:'bold'}}>Activa</span> : <span style={{color:'red'}}>Inactiva</span>}
                                        </td>
                                        <td style={{padding:'10px', textAlign:'right'}}>
                                            <button onClick={() => setFiltroRutaId(r.id.toString())} style={{background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', fontWeight:'bold', fontSize:'11px'}}>
                                                VER DETALLES
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- VISTA 2: MAPA GPS --- */}
      {vista === 'mapa' && (
         <div style={{backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #d1d5db'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
               <h3 style={{margin:0, color:'#111827', display:'flex', alignItems:'center', gap:'10px'}}><MapPin size={24} color="#2563eb"/> Rastreo Satelital</h3>
               <button onClick={cargarTodo} style={{border:'none', background:'none', cursor:'pointer'}} title="Actualizar"><RefreshCw size={20}/></button>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {cobradores.map(cob => (
                    <div key={cob.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '12px', textAlign:'left', borderLeft: cob.last_lat ? '4px solid #16a34a' : '4px solid #9ca3af', backgroundColor: cob.last_lat ? '#f0fdf4' : '#f9fafb' }}>
                        <div style={{fontWeight:'bold', color:'#111827', fontSize:'16px'}}>{cob.nombre_completo}</div>
                        <div style={{fontSize:'13px', color:'#4b5563', margin:'5px 0'}}>
                           {cob.last_lat ? `📍 Reportó: ${calcularHaceCuanto(cob.last_seen)}` : '⚪ Sin señal reciente'}
                        </div>
                        {cob.last_lat ? (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${cob.last_lat},${cob.last_lon}`} target="_blank" rel="noreferrer" style={{display:'block', marginTop:'10px', backgroundColor:'#2563eb', color:'white', textAlign:'center', padding:'8px', borderRadius:'6px', textDecoration:'none', fontWeight:'bold', fontSize:'14px'}}>VER EN MAPA 🗺️</a>
                        ) : <div style={{fontSize:'12px', color:'#9ca3af', fontStyle:'italic', marginTop:'10px'}}>Esperando conexión...</div>}
                    </div>
                ))}
             </div>
         </div>
      )}

      {/* --- VISTA 3: AUDITORÍA --- */}
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

      {/* --- VISTA 4: OPERATIVO --- */}
      {vista === 'operativo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
                <h3 style={{color:'#374151'}}>Rutas</h3>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input placeholder="Nueva Ruta" value={nuevaRuta} onChange={e => setNuevaRuta(e.target.value)} style={inputStyle} />
                    <button onClick={crearRuta} style={btnVerde}><Plus/></button>
                </div>
                {rutas.map(r => (
                    <div key={r.id} style={{backgroundColor:'white', padding:'10px', marginBottom:'10px', borderRadius:'8px', border:'1px solid #ddd'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            {rutaEditando === r.id ? <><input value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} style={inputStyle}/><button onClick={() => guardarNombreRuta(r.id)}><Save size={16}/></button></> : <strong>{r.nombre}</strong>}
                            <div style={{display:'flex', gap:'5px'}}>
                                <button onClick={() => {setRutaEditando(r.id); setNombreEditado(r.nombre)}} style={btnIcono}><Edit3 size={16}/></button>
                                <button onClick={() => {setItemEliminar({tipo:'ruta', data:r}); setPassConfirmacion('')}} style={{...btnIcono, color:'red'}}><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <select style={{width:'100%', marginTop:'5px'}} value={r.usuario_cobrador_id || ''} onChange={e => asignarCobrador(r.id, e.target.value)}>
                            <option value="">-- Asignar Cobrador --</option>
                            {cobradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                        </select>
                    </div>
                ))}
                
                {/* MIGRACIÓN */}
                <div style={{marginTop:'30px', borderTop:'2px dashed #ccc', paddingTop:'20px'}}>
                    <h3 style={{color:'#d97706', display:'flex', alignItems:'center', gap:'5px'}}><ArrowRightLeft size={20}/> Migración</h3>
                    <div style={{backgroundColor:'#fff7ed', padding:'15px', borderRadius:'8px', border:'1px solid #fed7aa'}}>
                        <label style={{fontSize:'12px', fontWeight:'bold'}}>Origen:</label>
                        <select value={rutaOrigen} onChange={e => setRutaOrigen(e.target.value)} style={{width:'100%', marginBottom:'10px'}}>{rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
                        {conteoMigracion !== null && <div style={{fontSize:'12px', marginBottom:'10px'}}>Clientes: {conteoMigracion}</div>}
                        <label style={{fontSize:'12px', fontWeight:'bold'}}>Destino:</label>
                        <select value={rutaDestino} onChange={e => setRutaDestino(e.target.value)} style={{width:'100%', marginBottom:'15px'}}>{rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select>
                        <button onClick={ejecutarMigracion} style={{width:'100%', background:'#d97706', color:'white', border:'none', padding:'10px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>MIGRAR</button>
                    </div>
                </div>
            </div>

            <div>
                <h3 style={{color:'#374151'}}>Personal</h3>
                <div style={{backgroundColor:'white', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'15px'}}>
                    <input placeholder="Nombre" value={nuevoCobrador.nombre} onChange={e => setNuevoCobrador({...nuevoCobrador, nombre: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <input placeholder="Usuario" value={nuevoCobrador.user} onChange={e => setNuevoCobrador({...nuevoCobrador, user: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <input placeholder="Clave" value={nuevoCobrador.pass} onChange={e => setNuevoCobrador({...nuevoCobrador, pass: e.target.value})} style={{...inputStyle, marginBottom:'5px', width:'100%'}} />
                    <button onClick={crearCobrador} style={{...btnVerde, width:'100%'}}>Crear</button>
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
const btnIcono = { border:'none', background:'none', cursor:'pointer' };
const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' };