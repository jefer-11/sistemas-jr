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
  
  // Estados UI
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [historialExpandido, setHistorialExpandido] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Formulario
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteIdEditar, setClienteIdEditar] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('inactivo');
  const [nuevoCliente, setNuevoCliente] = useState({ dni: '', nombre_completo: '', telefono_celular: '', direccion_texto: '', barrio: '', referencia_negocio: '', gps_latitud: null, gps_longitud: null });

  useEffect(() => { if(usuario) fetchClientes(); }, [usuario]);

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

  // --- FILTRO INTELIGENTE (LA MAGIA) ---
  const filtrados = clientes.filter(c => {
      const coincideBusqueda = c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda);
      
      // REGLA: Si NO estoy buscando, solo muestro los que tienen crédito ACTIVO.
      // Si SÍ estoy buscando, muestro todo lo que coincida (para poder renovar antiguos).
      if (busqueda === '') {
          return c.creditoActivo; // Solo activos
      } else {
          return coincideBusqueda; // Todo lo que coincida
      }
  });

  // (Resto de funciones auxiliares iguales: obtenerColorSemaforo, formatearFecha, etc...)
  const obtenerColorSemaforo = (credito) => {
    if (!credito) return 'white'; 
    const ultimaFecha = credito.fecha_ultimo_pago ? new Date(credito.fecha_ultimo_pago) : new Date(credito.created_at);
    const hoy = new Date();
    const diasSinPagar = Math.floor((hoy - ultimaFecha) / (1000 * 3600 * 24));
    if (diasSinPagar <= 1) return 'white'; 
    if (diasSinPagar <= 7) return '#fef08a'; 
    return '#fecaca'; 
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "-";
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) return "-";
    return fecha.toLocaleDateString();
  };

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) return alert("Navegador sin GPS");
    setGpsStatus('buscando');
    const opcionesGPS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNuevoCliente(prev => ({ ...prev, gps_latitud: pos.coords.latitude, gps_longitud: pos.coords.longitude }));
        setGpsStatus('exito');
      },
      (err) => { console.error(err); setGpsStatus('error'); alert("⚠️ Error GPS."); },
      opcionesGPS
    );
  };

  const enviarFotoWhatsApp = () => {
    const telefonoJefe = usuario.empresas?.telefono_corporativo;
    if (!telefonoJefe) return alert("⚠️ Falta 'Teléfono Corporativo' en Perfil.");
    const datos = nuevoCliente;
    let mensaje = `📸 *REGISTRO NUEVO*\n👤 ${datos.nombre_completo}\n🆔 ${datos.dni}\n🏠 ${datos.direccion_texto}\n`;
    if (datos.gps_latitud) mensaje += `📍 https://www.google.com/maps/search/?api=1&query=${datos.gps_latitud},${datos.gps_longitud}\n`;
    const url = `https://wa.me/${telefonoJefe}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  async function guardarCliente(e) {
    e.preventDefault();
    setCargando(true);
    try {
      const datos = { ...nuevoCliente, empresa_id: usuario.empresa_id };
      let idFinal = null;
      if (modoEdicion) {
        await supabase.from('clientes').update(datos).eq('id', clienteIdEditar);
        alert('Cliente actualizado.');
      } else {
        const { data: existe } = await supabase.from('clientes').select('id').eq('dni', nuevoCliente.dni).single();
        if (existe) throw new Error('DNI ya registrado.');
        const { data, error } = await supabase.from('clientes').insert([datos]).select().single();
        if (error) throw error;
        idFinal = data.id;
        alert('Cliente creado.');
      }
      if (alTerminar && idFinal) { alTerminar(idFinal); return; }
      resetFormulario(); setVista('lista'); fetchClientes();
    } catch (error) { alert(error.message); } finally { setCargando(false); }
  }

  const resetFormulario = () => {
    setNuevoCliente({ dni: '', nombre_completo: '', telefono_celular: '', direccion_texto: '', barrio: '', referencia_negocio: '', gps_latitud: null, gps_longitud: null });
    setGpsStatus('inactivo'); setModoEdicion(false); setClienteIdEditar(null);
  };

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
  const btnAzul = { background: 'linear-gradient(to bottom, #a6c7ff 0%, #2563eb 100%)', border: '1px solid #000080', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
            <div style={{flex:1, display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '8px', borderRadius: '6px', border: '2px solid #000080' }}>
                <Search color="#000080" />
                <input type="text" placeholder="BUSCAR (VER OCULTOS)..." style={{ border: 'none', outline: 'none', width: '100%', marginLeft:'5px', fontWeight:'bold', color:'#000080' }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
                {filtrados.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>No hay clientes activos. Usa el buscador para ver el historial.</td></tr> : filtrados.map((c) => {
                  const bgSemaforo = obtenerColorSemaforo(c.creditoActivo);
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
                                  <button onClick={() => cargarDatosParaEditar(c)} title="Editar" style={{...btnAzul, background:'#e5e7eb', color:'#374151', border:'1px solid #9ca3af'}}><Edit size={14}/></button>
                                  {c.gps_latitud ? (
                                      <a href={`https://www.google.com/maps/search/?api=1&query=${c.gps_latitud},${c.gps_longitud}`} target="_blank" rel="noreferrer" style={{...btnAzul, background:'linear-gradient(to bottom, #cce5ff 0%, #2563eb 100%)', textDecoration:'none'}} title="Ver Mapa"><MapPin size={14}/></a>
                                  ) : <button disabled style={{...btnAzul, background:'#eee', color:'#999', cursor:'not-allowed'}}><MapPin size={14}/></button>}
                                  <button onClick={() => irACrearCredito(c.id)} title="Nuevo Crédito" style={{...btnAzul, background:'linear-gradient(to bottom, #d1fae5 0%, #16a34a 100%)'}}><DollarSign size={14}/></button>
                                  <button onClick={() => toggleDetalles(c.id)} style={{...btnAzul, background: filaExpandida === c.id ? '#374151' : 'linear-gradient(to bottom, #ffcccc 0%, #dc2626 100%)', width:'70px', justifyContent:'center'}}>{filaExpandida === c.id ? <><ChevronUp size={14}/> Cerrar</> : <><ChevronDown size={14}/> Detalles</>}</button>
                              </div>
                          </td>
                      </tr>
                      {/* DETALLE EXPANDIDO */}
                      {filaExpandida === c.id && (
                          <tr>
                              <td colSpan="6" style={{backgroundColor:'white', padding:'15px', borderTop:'2px solid #dc2626', borderBottom:'2px solid #000080'}}>
                                  {loadingHistorial ? <div>Cargando historial...</div> : (
                                      <div>
                                          <h4 style={{marginTop:0, color:'#000080'}}>📜 Historial de Créditos de {c.nombre_completo}</h4>
                                          {historialExpandido.length === 0 ? <p>Sin historial.</p> : (
                                              <table style={{width:'100%', fontSize:'12px', border:'1px solid #ccc', backgroundColor:'white'}}>
                                                  <thead><tr style={{background:'#e2e8f0'}}><th>Inicio</th><th>Fin (Est.)</th><th>Monto</th><th>Saldo</th><th>Estado</th><th>Pagos</th></tr></thead>
                                                  <tbody>
                                                      {historialExpandido.map(cred => (
                                                          <tr key={cred.id} style={{borderBottom:'1px solid #eee'}}>
                                                              <td style={{padding:'5px'}}>{formatearFecha(cred.created_at)}</td>
                                                              <td style={{padding:'5px'}}>{formatearFecha(cred.fecha_fin_estimada)}</td>
                                                              <td style={{padding:'5px', fontWeight:'bold'}}>$ {cred.total_a_pagar}</td>
                                                              <td style={{padding:'5px', color: cred.saldo_restante > 0 ? 'red' : 'green'}}>$ {cred.saldo_restante}</td>
                                                              <td style={{padding:'5px', fontWeight:'bold', color: cred.estado === 'ACTIVO' ? 'blue' : 'green'}}>{cred.estado}</td>
                                                              <td style={{padding:'0'}}><div style={{maxHeight:'80px', overflowY:'auto', padding:'5px', background:'#f1f5f9'}}>{cred.pagos.map(p => <div key={p.id} style={{fontSize:'10px', borderBottom:'1px dashed #ccc'}}>{formatearFecha(p.fecha_pago)} - <strong>$ {p.monto}</strong></div>)}{cred.pagos.length === 0 && '-'}</div></td>
                                                          </tr>
                                                      ))}
                                                  </tbody>
                                              </table>
                                          )}
                                      </div>
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

      {/* VISTA FORMULARIO (Se mantiene igual) */}
      {vista === 'formulario' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border:'2px solid #000080' }}>
          <h3 style={{color:'#000080', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>{modoEdicion ? '✏️ Editar Cliente' : '📝 Nuevo Cliente'}</h3>
          <form onSubmit={guardarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px dashed #22c55e', marginBottom: '10px' }}>
              <button type="button" onClick={enviarFotoWhatsApp} style={{ backgroundColor: '#25D366', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', display:'inline-flex', alignItems:'center', gap:'5px', margin:'0 auto' }}><Camera size={18}/> Enviar Foto (WhatsApp)</button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:'13px', fontWeight:'bold'}}>DNI / Cédula</label><input required value={nuevoCliente.dni} onChange={e => setNuevoCliente({...nuevoCliente, dni: e.target.value})} style={inputEstilo} placeholder="12345678" /></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:'13px', fontWeight:'bold'}}>Celular</label><input required type="tel" value={nuevoCliente.telefono_celular} onChange={e => setNuevoCliente({...nuevoCliente, telefono_celular: e.target.value})} style={inputEstilo} placeholder="999..." /></div>
            </div>
            <input required placeholder="Nombre Completo" value={nuevoCliente.nombre_completo} onChange={e => setNuevoCliente({...nuevoCliente, nombre_completo: e.target.value})} style={inputEstilo} />
            <input required placeholder="Barrio" value={nuevoCliente.barrio} onChange={e => setNuevoCliente({...nuevoCliente, barrio: e.target.value})} style={inputEstilo} />
            <input required placeholder="Dirección Exacta" value={nuevoCliente.direccion_texto} onChange={e => setNuevoCliente({...nuevoCliente, direccion_texto: e.target.value})} style={inputEstilo} />
            <input placeholder="Referencia" value={nuevoCliente.referencia_negocio} onChange={e => setNuevoCliente({...nuevoCliente, referencia_negocio: e.target.value})} style={inputEstilo} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px', border:'1px solid #bfdbfe', marginTop:'10px' }}>
              <button type="button" onClick={obtenerUbicacion} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', display:'flex', gap:'5px' }}><MapPin size={16}/> {gpsStatus === 'exito' ? 'GPS OK' : 'Capturar GPS'}</button>
              {gpsStatus === 'exito' && <span style={{fontSize: '12px', color: '#16a34a'}}>✓ Listo</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="button" onClick={() => { if(alTerminar) window.location.reload(); else { resetFormulario(); setVista('lista'); }}} style={btnEstilo.rojo}>Cancelar</button>
              <button type="submit" disabled={cargando} style={btnEstilo.verde}>{cargando ? '...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputEstilo = { padding: '12px', borderRadius: '6px', border: '2px solid #9ca3af', fontSize:'16px', outline:'none', width:'100%', boxSizing:'border-box' };
const btnMini = { padding: '6px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const btnEstilo = {
  rojo: { backgroundColor: '#ef4444', color: 'white', padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight:'bold', fontSize:'16px' },
  verde: { backgroundColor: '#16a34a', color: 'white', padding: '15px', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight:'bold', fontSize:'16px' }
};