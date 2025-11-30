import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, DollarSign, MapPin, MessageCircle, Lock, Eye, Trash2, X } from 'lucide-react';
import { useAuth } from './AuthContext';

// FÓRMULA HAVERSINE (Distancia)
function getDistanciaMetros(lat1, lon1, lat2, lon2) {
    if(!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

const obtenerEstiloEstado = (fechaUltimoPago, fechaInicio) => {
  const ultimaFecha = fechaUltimoPago ? new Date(fechaUltimoPago) : new Date(fechaInicio);
  const hoy = new Date();
  const dias = Math.floor((hoy - ultimaFecha) / (1000 * 3600 * 24)); 
  if (dias <= 1) return { bg: 'white', color: '#000000', border: '#9ca3af' }; 
  if (dias <= 2) return { bg: '#fef08a', color: '#000000', border: '#eab308' }; 
  if (dias <= 7) return { bg: '#fdba74', color: '#000000', border: '#f97316' }; 
  return { bg: '#fecaca', color: '#7f1d1d', border: '#dc2626' }; 
};

export function Cobranza() {
  const { usuario } = useAuth();
  const [creditos, setCreditos] = useState([]);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState(''); // Estado del buscador
  const [montosRapidos, setMontosRapidos] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reciboListo, setReciboListo] = useState(null);
  const [verPagosDe, setVerPagosDe] = useState(null);
  const [listaPagosHoy, setListaPagosHoy] = useState([]);

  useEffect(() => {
    if(usuario) {
        fetchCreditosActivos();
        iniciarGPS();
    }
  }, [usuario]);

  const iniciarGPS = () => {
    if('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            (pos) => setMiUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => console.error("Error GPS", err),
            { enableHighAccuracy: true }
        );
    }
  };

  async function fetchCreditosActivos() {
    setCargando(true);
    const { data } = await supabase
      .from('creditos')
      .select(`*, clientes ( nombre_completo, barrio, direccion_texto, telefono_celular, gps_latitud, gps_longitud )`)
      .eq('empresa_id', usuario.empresa_id)
      .gt('saldo_restante', 0)
      .eq('estado', 'ACTIVO')
      .order('orden_ruta', { foreignTable: 'clientes', ascending: true });

    if (data) setCreditos(data);
    setCargando(false);
  }

  const cobrarRapido = async (credito) => {
    const montoStr = montosRapidos[credito.id];
    const monto = montoStr ? parseFloat(montoStr) : credito.valor_cuota;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    if (!window.confirm(`¿Cobrar S/ ${monto} a ${credito.clientes.nombre_completo}?`)) return;

    setProcesandoId(credito.id);
    try {
      const { error: errPago } = await supabase.from('pagos').insert([{
        credito_id: credito.id, monto: monto, metodo_pago: 'EFECTIVO', usuario_cobrador_id: usuario.id, empresa_id: usuario.empresa_id, fecha_pago: new Date()
      }]);
      if (errPago) throw errPago;

      const nuevoSaldo = (parseFloat(credito.saldo_restante) - monto).toFixed(2);
      const nuevoEstado = nuevoSaldo <= 0 ? 'FINALIZADO' : 'ACTIVO';
      await supabase.from('creditos').update({ saldo_restante: nuevoSaldo, fecha_ultimo_pago: new Date(), estado: nuevoEstado }).eq('id', credito.id);

      let telefono = credito.clientes.telefono_celular?.replace(/\D/g, '') || '';
      if (telefono.length === 9) telefono = '51' + telefono;
      const mensaje = `Hola *${credito.clientes.nombre_completo}*! 👋 Pago recibido: *S/ ${monto}*. 📉 Saldo: *S/ ${nuevoSaldo}*.`;
      const link = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
      
      setReciboListo({ link, mensaje, nuevoSaldo, telefono });
      setModalVisible(true);
      setMontosRapidos({ ...montosRapidos, [credito.id]: '' });
      fetchCreditosActivos();

    } catch (error) { alert(error.message); } finally { setProcesandoId(null); }
  };

  const abrirHistorialPagos = async (creditoId) => {
      if (verPagosDe === creditoId) { setVerPagosDe(null); return; }
      setVerPagosDe(creditoId);
      const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
      const { data } = await supabase.from('pagos').select('*').eq('credito_id', creditoId).gte('fecha_pago', hoyInicio).order('fecha_pago', { ascending: false });
      setListaPagosHoy(data || []);
  };

  const eliminarPago = async (pago, credito) => {
      if (!window.confirm(`⚠️ ¿Borrar pago de S/ ${pago.monto}?`)) return;
      try {
          await supabase.from('pagos').delete().eq('id', pago.id);
          const nuevoSaldo = parseFloat(credito.saldo_restante) + parseFloat(pago.monto);
          await supabase.from('creditos').update({ saldo_restante: nuevoSaldo, estado: 'ACTIVO' }).eq('id', credito.id);
          alert("Pago eliminado.");
          setVerPagosDe(null);
          fetchCreditosActivos();
      } catch (error) { alert("Error: " + error.message); }
  };

  const handleMontoChange = (id, val) => setMontosRapidos(p => ({ ...p, [id]: val }));
  
  // --- FILTRO DE BÚSQUEDA CORREGIDO ---
  const listaFiltrada = creditos.filter(c => 
    c.clientes.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.clientes.barrio?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ color: '#111827', textAlign: 'center' }}>📋 Ruta de Cobro</h2>
      
      <div style={{textAlign:'center', marginBottom:'15px', fontSize:'12px', color: miUbicacion ? '#16a34a' : '#dc2626'}}>
         {miUbicacion ? `📡 GPS Activo` : `⚠️ Buscando señal GPS...`}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #4b5563' }}>
        <Search color="#111827" />
        <input 
            type="text" 
            placeholder="BUSCAR CLIENTE..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }} 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {listaFiltrada.map((credito, index) => {
          const estilo = obtenerEstiloEstado(credito.fecha_ultimo_pago, credito.fecha_inicio);
          const montoInput = montosRapidos[credito.id] !== undefined ? montosRapidos[credito.id] : '';
          
          let distancia = 0;
          let lejos = false;
          if (miUbicacion && credito.clientes.gps_latitud) {
              distancia = getDistanciaMetros(miUbicacion.lat, miUbicacion.lon, credito.clientes.gps_latitud, credito.clientes.gps_longitud);
              lejos = distancia > 150;
          }
          
          return (
            <div key={credito.id} style={{ backgroundColor: estilo.bg, color: estilo.color, padding: '15px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: `2px solid ${estilo.border}`, borderLeft: '8px solid #2563eb', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, backgroundColor: '#2563eb', color: 'white', padding: '4px 10px', borderRadius: '8px 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>#{index + 1}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingTop: '15px' }}>
                <div style={{flex:1}}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800' }}>{credito.clientes.nombre_completo}</h3>
                  <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} /> 
                    {credito.clientes.gps_latitud ? (
                        lejos ? <span style={{color:'#d97706'}}>A {Math.round(distancia)}m (Lejos)</span> : <span style={{color:'#16a34a'}}>En Zona ({Math.round(distancia)}m)</span>
                    ) : <span style={{color:'#6b7280'}}>Sin GPS</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '90px' }}>
                  <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '15px' }}>Deuda: S/ {credito.saldo_restante}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#111827', fontWeight: 'bold' }}>S/</span>
                  <input type="number" placeholder={credito.valor_cuota} value={montoInput} onChange={(e) => handleMontoChange(credito.id, e.target.value)} style={{ width: '100%', padding: '12px 10px 12px 35px', borderRadius: '8px', border: '2px solid #4b5563', fontSize: '18px', fontWeight: 'bold', color: 'black', backgroundColor: 'white' }} />
                </div>
                <button 
                  onClick={() => cobrarRapido(credito)}
                  disabled={procesandoId === credito.id}
                  style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  <DollarSign size={20}/> COBRAR
                </button>
              </div>

              <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px dashed #9ca3af', textAlign:'center'}}>
                  <button onClick={() => abrirHistorialPagos(credito.id)} style={{background:'none', border:'none', color:'#4b5563', fontSize:'13px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', width:'100%'}}>
                      {verPagosDe === credito.id ? <X size={14}/> : <Eye size={14}/>} 
                      {verPagosDe === credito.id ? 'Cerrar Historial' : 'Ver/Corregir Pagos de Hoy'}
                  </button>
                  {verPagosDe === credito.id && (
                      <div style={{marginTop:'10px', backgroundColor:'#f3f4f6', borderRadius:'8px', padding:'10px'}}>
                          {listaPagosHoy.length === 0 ? <span style={{fontSize:'12px'}}>No hay pagos hoy.</span> : (
                              listaPagosHoy.map(p => (
                                  <div key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #ddd', padding:'8px 0'}}>
                                      <span style={{fontWeight:'bold'}}>S/ {p.monto}</span>
                                      <span style={{fontSize:'11px'}}>{new Date(p.created_at).toLocaleTimeString()}</span>
                                      <button onClick={() => eliminarPago(p, credito)} style={{background:'#fee2e2', color:'red', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer'}}><Trash2 size={14}/> Borrar</button>
                                  </div>
                              ))
                          )}
                      </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
      
      {modalVisible && reciboListo && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
          <div style={{background:'white', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'350px', textAlign:'center'}}>
             <div style={{fontSize:'40px'}}>✅</div>
             <h3 style={{color:'#16a34a', margin:'10px 0'}}>¡Cobro Exitoso!</h3>
             <p>Nuevo Saldo: <strong>S/ {reciboListo.nuevoSaldo}</strong></p>
             {reciboListo.telefono && (<a href={reciboListo.link} target="_blank" rel="noreferrer" style={{display:'block', background:'#25D366', color:'white', padding:'10px', borderRadius:'8px', textDecoration:'none', fontWeight:'bold', marginTop:'15px'}}>Enviar WhatsApp</a>)}
             <button onClick={() => setModalVisible(false)} style={{width:'100%', padding:'10px', marginTop:'10px', background:'#4b5563', color:'white', border:'none', borderRadius:'6px'}}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}