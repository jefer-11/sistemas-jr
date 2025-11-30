import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, MapPin, Camera, Edit, FileText, DollarSign, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from './AuthContext';

export function Clientes({ usuario, vistaInicial = 'lista', alTerminar }) {
  const { irACrearCredito } = useAuth();
  
  const [vista, setVista] = useState(vistaInicial); 
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  
  // Control de expansión de detalles (Tabla Retro)
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [historialExpandido, setHistorialExpandido] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Formulario
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteIdEditar, setClienteIdEditar] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('inactivo'); // inactivo, buscando, exito, error
  
  const [nuevoCliente, setNuevoCliente] = useState({
    dni: '', nombre_completo: '', telefono_celular: '', 
    direccion_texto: '', barrio: '', referencia_negocio: '',
    gps_latitud: null, gps_longitud: null
  });

  useEffect(() => { if(usuario) fetchClientes(); }, [usuario]);

  // --- LÓGICA DE DATOS ---
  async function fetchClientes() {
    const { data } = await supabase.from('clientes')
      .select('*, creditos(id, estado, saldo_restante, total_a_pagar)')
      .eq('empresa_id', usuario.empresa_id)
      .order('nombre_completo', { ascending: true });
    
    if (data) {
        const procesados = data.map(c => {
            const creditoActivo = c.creditos.find(cr => cr.estado === 'ACTIVO');
            return { ...c, creditoActivo };
        });
        setClientes(procesados);
    }
  }

  const obtenerColorSemaforo = (credito) => {
    if (!credito) return 'white'; 
    const ultimaFecha = credito.fecha_ultimo_pago ? new Date(credito.fecha_ultimo_pago) : new Date(credito.created_at);
    const hoy = new Date();
    const diasSinPagar = Math.floor((hoy - ultimaFecha) / (1000 * 3600 * 24));
    if (diasSinPagar <= 1) return 'white'; 
    if (diasSinPagar <= 7) return '#fef08a'; 
    return '#fecaca'; 
  };

  // --- 🛰️ LÓGICA GPS DE ALTA PRECISIÓN (MEJORADA) ---
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) return alert("Tu dispositivo no soporta GPS.");
    
    setGpsStatus('buscando');
    
    // Opciones para forzar la mayor precisión posible
    const opcionesGPS = {
        enableHighAccuracy: true, // Usa satélites, no solo antenas
        timeout: 15000,           // Espera hasta 15 seg para obtener buena señal
        maximumAge: 0             // No uses una ubicación vieja guardada en caché
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNuevoCliente(prev => ({ 
            ...prev, 
            gps_latitud: pos.coords.latitude, 
            gps_longitud: pos.coords.longitude 
        }));
        setGpsStatus('exito');
      },
      (err) => { 
          console.error(err);
          setGpsStatus('error');
          alert("⚠️ No se pudo obtener la ubicación exacta. Verifica que el GPS esté encendido y tenga permisos."); 
      },
      opcionesGPS
    );
  };

  // --- 📸 LÓGICA WHATSAPP EVIDENCIA (RESTAURADA) ---
  const enviarFotoWhatsApp = () => {
    const telefonoJefe = usuario.empresas?.telefono_corporativo;
    
    if (!telefonoJefe) {
        return alert("⚠️ ERROR: No hay un 'Teléfono Corporativo' configurado en el Perfil del Administrador.");
    }

    // Construimos el mensaje con los datos que tenemos en el formulario en ese momento
    const datos = nuevoCliente;
    
    let mensaje = `📸 *EVIDENCIA DE CLIENTE NUEVO*\n\n`;
    mensaje += `👤 *Nombre:* ${datos.nombre_completo || '(Sin nombre)'}\n`;
    mensaje += `🆔 *DNI:* ${datos.dni || '(Sin DNI)'}\n`;
    mensaje += `📞 *Celular:* ${datos.telefono_celular || '(Sin cel)'}\n`;
    mensaje += `🏠 *Dirección:* ${datos.direccion_texto} - ${datos.barrio}\n`;
    
    if (datos.gps_latitud) {
        mensaje += `📍 *Ubicación:* https://www.google.com/maps/search/?api=1&query=${datos.gps_latitud},${datos.gps_longitud}\n`;
    } else {
        mensaje += `⚠️ *Ubicación:* No capturada aún.\n`;
    }
    
    mensaje += `\n_(Adjunto foto de la fachada a continuación)_`;

    const url = `https://wa.me/${telefonoJefe}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // --- GUARDAR CLIENTE ---
  async function guardarCliente(e) {
    e.preventDefault();
    setCargando(true);
    try {
      const datos = { ...nuevoCliente, empresa_id: usuario.empresa_id };
      
      let idFinal = null;

      if (modoEdicion) {
        await supabase.from('clientes').update(datos).eq('id', clienteIdEditar);
        alert('Cliente actualizado correctamente.');
      } else {
        const { data: existe } = await supabase.from('clientes').select('id').eq('dni', nuevoCliente.dni).single();
        if (existe) throw new Error('Este DNI ya está registrado en el sistema.');
        
        const { data, error } = await supabase.from('clientes').insert([datos]).select().single();
        if (error) throw error;
        idFinal = data.id;
        alert('Cliente creado exitosamente.');
      }
      
      // Si venimos de un atajo, devolvemos el ID
      if (alTerminar && idFinal) { 
          alTerminar(idFinal); 
          return; 
      }

      resetFormulario(); setVista('lista'); fetchClientes();
    } catch (error) { alert(error.message); } finally { setCargando(false); }
  }

  const resetFormulario = () => {
    setNuevoCliente({ dni: '', nombre_completo: '', telefono_celular: '', direccion_texto: '', barrio: '', referencia_negocio: '', gps_latitud: null, gps_longitud: null });
    setGpsStatus('inactivo'); setModoEdicion(false); setClienteIdEditar(null);
  };

  // Funciones de UI
  const cargarDatosParaEditar = (cliente) => {
    setModoEdicion(true); setClienteIdEditar(cliente.id); setNuevoCliente(cliente);
    setGpsStatus(cliente.gps_latitud ? 'exito' : 'inactivo'); setVista('formulario');
  };

  const toggleDetalles = async (clienteId) => {
      if (filaExpandida === clienteId) {
          setFilaExpandida(null); setHistorialExpandido(null);
      } else {
          setFilaExpandida(clienteId); setLoadingHistorial(true);
          const { data } = await supabase.from('creditos').select('*, pagos(*)').eq('cliente_id', clienteId).order('created_at', { ascending: false });
          setHistorialExpandido(data || []); setLoadingHistorial(false);
      }
  };

  // --- ESTILOS TABLA ---
  const tableHeader = { backgroundColor: 'blue', color: 'yellow', padding: '8px', textAlign: 'center', border: '1px solid white', fontSize:'12px' };
  const tableCell = { padding: '6px', borderBottom: '1px solid #ccc', borderRight: '1px solid #ccc', color:'#000080', fontSize:'13px' };
  const colMorada = { backgroundColor: '#800080', color: 'white', fontWeight:'bold' };
  const colVerde = { backgroundColor: '#008000', color: 'white', fontWeight:'bold' };
  const colAmarilla = { backgroundColor: '#FFFF00', color: 'black', fontWeight:'bold' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* VISTA LISTA (TABLA RETRO) */}
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
            <div style={{flex:1, display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '8px', borderRadius: '6px', border: '2px solid #000080' }}>
                <Search color="#000080" />
                <input type="text" placeholder="BUSCAR CLIENTE (NOMBRE O DNI)..." style={{ border: 'none', outline: 'none', width: '100%', marginLeft:'5px', fontWeight:'bold', color:'#000080' }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <button onClick={() => { resetFormulario(); setVista('formulario'); }} style={{backgroundColor:'#2563eb', color:'white', padding:'10px 15px', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}><Plus size={18}/> Nuevo Cliente</button>
          </div>

          <div style={{ overflowX: 'auto', border: '2px solid #000080' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily:'Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={tableHeader}>CPen</th>
                  <th style={tableHeader}>CCan</th>
                  <th style={tableHeader}>Saldo</th>
                  <th style={{...tableHeader, width:'30%', textAlign:'left'}}>Cliente / DNI</th>
                  <th style={tableHeader}>Dirección</th>
                  <th style={tableHeader}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.filter(c => c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda)).map((c, index) => {
                  const bgSemaforo = obtenerColorSemaforo(c.creditoActivo);
                  
                  // Cálculos retro
                  let cCan = 0, cPen = 0;
                  if (c.creditoActivo) {
                      const totalPagado = c.creditoActivo.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
                      cCan = Math.floor(totalPagado / c.creditoActivo.valor_cuota);
                      cPen = c.creditoActivo.modalidad_dias - cCan;
                  }

                  return (
                    <>
                      <tr key={c.id} style={{ backgroundColor: bgSemaforo }}>
                          <td style={{...tableCell, ...colMorada, textAlign:'center'}}>{cPen}</td>
                          <td style={{...tableCell, ...colVerde, textAlign:'center'}}>{cCan}</td>
                          <td style={{...tableCell, ...colAmarilla, textAlign:'center'}}>$ {c.creditoActivo ? c.creditoActivo.saldo_restante : 0}</td>
                          <td style={{...tableCell, fontWeight:'bold'}}>
                              {c.nombre_completo}
                              <div style={{fontSize:'11px', color:'#666'}}>{c.dni}</div>
                          </td>
                          <td style={tableCell}>{c.direccion_texto}<br/><span style={{fontSize:'11px', fontStyle:'italic'}}>{c.barrio}</span></td>
                          <td style={{...tableCell, textAlign:'center', padding:'4px'}}>
                              <div style={{display:'flex', justifyContent:'center', gap:'5px'}}>
                                  <button onClick={() => cargarDatosParaEditar(c)} title="Editar" style={btnMini}><Edit size={16}/></button>
                                  {c.gps_latitud ? (
                                      <a href={`https://www.google.com/maps/search/?api=1&query=${c.gps_latitud},${c.gps_longitud}`} target="_blank" rel="noreferrer" style={{...btnMini, color:'#2563eb'}}>
                                          <MapPin size={16}/>
                                      </a>
                                  ) : <button disabled style={{...btnMini, opacity:0.5}}><MapPin size={16}/></button>}
                                  <button onClick={() => irACrearCredito(c.id)} title="Prestar" style={{...btnMini, color:'#16a34a'}}><DollarSign size={16}/></button>
                                  <button onClick={() => toggleDetalles(c.id)} style={{...btnMini, color:'#000080'}}>
                                      {filaExpandida === c.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                  </button>
                              </div>
                          </td>
                      </tr>
                      {/* DETALLE EXPANDIDO */}
                      {filaExpandida === c.id && (
                          <tr>
                              <td colSpan="6" style={{backgroundColor:'white', padding:'10px', border:'2px solid #000080'}}>
                                  {loadingHistorial ? <div>Cargando...</div> : (
                                      <table style={{width:'100%', fontSize:'12px', border:'1px solid #ccc'}}>
                                          <thead><tr style={{background:'#f1f5f9'}}><th>Fecha</th><th>Monto</th><th>Saldo</th><th>Estado</th></tr></thead>
                                          <tbody>
                                              {historialExpandido.map(cred => (
                                                  <tr key={cred.id} style={{borderBottom:'1px solid #eee'}}>
                                                      <td style={{padding:'5px'}}>{new Date(cred.created_at).toLocaleDateString()}</td>
                                                      <td style={{padding:'5px', fontWeight:'bold'}}>$ {cred.total_a_pagar}</td>
                                                      <td style={{padding:'5px', color:'red'}}>$ {cred.saldo_restante}</td>
                                                      <td style={{padding:'5px'}}>{cred.estado}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  )}
                              </td>
                          </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VISTA FORMULARIO (Crear/Editar) */}
      {vista === 'formulario' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border:'2px solid #000080' }}>
          <h3 style={{color:'#000080', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>{modoEdicion ? '✏️ Editar Cliente' : '📝 Nuevo Cliente'}</h3>
          <form onSubmit={guardarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* BOTÓN EVIDENCIA (RESTAURADO) */}
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px dashed #22c55e' }}>
              <p style={{margin:'0 0 10px 0', fontSize:'13px', color:'#15803d'}}>Llena los datos abajo y luego pulsa aquí para enviar la foto y ubicación al dueño:</p>
              <button type="button" onClick={enviarFotoWhatsApp} style={{ backgroundColor: '#25D366', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', display:'inline-flex', alignItems:'center', gap:'8px', fontSize:'14px', cursor:'pointer' }}>
                <Camera size={20} /> ENVIAR EVIDENCIA (WHATSAPP)
              </button>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={labelStyle}>DNI / Cédula</label>
                    <input required value={nuevoCliente.dni} onChange={e => setNuevoCliente({...nuevoCliente, dni: e.target.value})} style={inputEstilo} placeholder="12345678" />
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={labelStyle}>Celular</label>
                    <input required type="tel" value={nuevoCliente.telefono_celular} onChange={e => setNuevoCliente({...nuevoCliente, telefono_celular: e.target.value})} style={inputEstilo} placeholder="999..." />
                </div>
            </div>

            <div style={{display:'flex', flexDirection:'column'}}>
                <label style={labelStyle}>Nombre Completo</label>
                <input required value={nuevoCliente.nombre_completo} onChange={e => setNuevoCliente({...nuevoCliente, nombre_completo: e.target.value})} style={inputEstilo} placeholder="Ej: Juan Pérez" />
            </div>

            <div style={{display:'flex', flexDirection:'column'}}>
                <label style={labelStyle}>Barrio / Sector</label>
                <input required value={nuevoCliente.barrio} onChange={e => setNuevoCliente({...nuevoCliente, barrio: e.target.value})} style={inputEstilo} placeholder="Ej: El Centro" />
            </div>

            <div style={{display:'flex', flexDirection:'column'}}>
                <label style={labelStyle}>Dirección Exacta (Casa, Puerta, Color)</label>
                <input required value={nuevoCliente.direccion_texto} onChange={e => setNuevoCliente({...nuevoCliente, direccion_texto: e.target.value})} style={inputEstilo} placeholder="Ej: Mz F Lote 12 - Casa Verde" />
            </div>

            <div style={{display:'flex', flexDirection:'column'}}>
                <label style={labelStyle}>Referencia / Negocio</label>
                <input value={nuevoCliente.referencia_negocio} onChange={e => setNuevoCliente({...nuevoCliente, referencia_negocio: e.target.value})} style={inputEstilo} placeholder="Ej: Vende frutas en la esquina" />
            </div>
            
            {/* BOTÓN CAPTURAR GPS (MEJORADO) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent:'space-between', gap: '10px', backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', border:'1px solid #bfdbfe', marginTop:'10px' }}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <MapPin size={24} color={gpsStatus === 'exito' ? '#16a34a' : '#2563eb'} />
                  <div>
                      <div style={{fontWeight:'bold', color:'#1e40af'}}>Ubicación Satelital</div>
                      <div style={{fontSize:'12px', color:'#60a5fa'}}>
                          {gpsStatus === 'inactivo' && 'No capturada'}
                          {gpsStatus === 'buscando' && 'Calibrando satélites...'}
                          {gpsStatus === 'exito' && 'Coordenadas Guardadas ✅'}
                          {gpsStatus === 'error' && 'Error de señal ❌'}
                      </div>
                  </div>
              </div>
              <button type="button" onClick={obtenerUbicacion} disabled={gpsStatus === 'buscando'} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold' }}>
                {gpsStatus === 'buscando' ? '...' : 'CAPTURAR'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', paddingTop:'15px', borderTop:'1px solid #eee' }}>
              <button type="button" onClick={() => { if(alTerminar) window.location.reload(); else { resetFormulario(); setVista('lista'); }}} style={btnEstilo.rojo}>Cancelar</button>
              <button type="submit" disabled={cargando} style={btnEstilo.verde}>{cargando ? 'Guardando...' : 'GUARDAR CLIENTE'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputEstilo = { padding: '12px', borderRadius: '6px', border: '1px solid #9ca3af', fontSize:'16px', outline:'none' };
const labelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#4b5563', marginBottom: '4px' };
const btnMini = { padding: '6px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnEstilo = {
  azul: { backgroundColor: '#2563eb', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight:'bold' },
  rojo: { backgroundColor: '#ef4444', color: 'white', padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight:'bold', fontSize:'16px' },
  verde: { backgroundColor: '#16a34a', color: 'white', padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight:'bold', fontSize:'16px' }
};