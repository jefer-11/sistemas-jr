import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, DollarSign, MapPin, MessageCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

// --- LÓGICA SEMÁFORO MEJORADA (Alto Contraste) ---
const obtenerEstiloEstado = (fechaUltimoPago, fechaInicio) => {
  const ultimaFecha = fechaUltimoPago ? new Date(fechaUltimoPago) : new Date(fechaInicio);
  const hoy = new Date();
  const dias = Math.floor((hoy - ultimaFecha) / (1000 * 3600 * 24)); 
  
  // Retorna objeto con: Fondo, ColorTexto, ColorBorde
  if (dias <= 1) return { bg: 'white', color: '#000000', border: '#9ca3af' }; // Al día
  if (dias <= 2) return { bg: '#fef08a', color: '#000000', border: '#eab308' }; // Amarillo (Texto Negro)
  if (dias <= 7) return { bg: '#fdba74', color: '#000000', border: '#f97316' }; // Naranja (Texto Negro)
  return { bg: '#fecaca', color: '#7f1d1d', border: '#dc2626' }; // Rojo (Texto Rojo oscuro)
};

export function Cobranza() {
  const { usuario } = useAuth();
  const [creditos, setCreditos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const [montosRapidos, setMontosRapidos] = useState({});
  const [procesandoId, setProcesandoId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [reciboListo, setReciboListo] = useState(null);

  useEffect(() => {
    if(usuario) fetchCreditosActivos();
  }, [usuario]);

  async function fetchCreditosActivos() {
    setCargando(true);
    const { data } = await supabase
      .from('creditos')
      .select(`
        *, 
        clientes ( nombre_completo, barrio, direccion_texto, telefono_celular, orden_ruta )
      `)
      .eq('empresa_id', usuario.empresa_id)
      .gt('saldo_restante', 0)
      .eq('estado', 'ACTIVO')
      .order('orden_ruta', { foreignTable: 'clientes', ascending: true });

    if (data) setCreditos(data);
    setCargando(false);
  }

  const handleMontoChange = (id, valor) => {
    setMontosRapidos(prev => ({ ...prev, [id]: valor }));
  };

  const cobrarRapido = async (credito) => {
    const montoStr = montosRapidos[credito.id];
    const monto = montoStr ? parseFloat(montoStr) : credito.valor_cuota;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    
    // Confirmación más simple para celular
    if (!window.confirm(`¿Cobrar S/ ${monto}?`)) return;

    setProcesandoId(credito.id);

    try {
      // 1. Registrar Pago
      const { error: errPago } = await supabase.from('pagos').insert([{
        credito_id: credito.id,
        monto: monto,
        metodo_pago: 'EFECTIVO',
        usuario_cobrador_id: usuario.id,
        empresa_id: usuario.empresa_id
      }]);
      if (errPago) throw errPago;

      // 2. Actualizar Crédito
      const nuevoSaldo = (parseFloat(credito.saldo_restante) - monto).toFixed(2);
      const nuevoEstado = nuevoSaldo <= 0 ? 'FINALIZADO' : 'ACTIVO';
      
      const { error: errCredito } = await supabase
        .from('creditos')
        .update({ 
          saldo_restante: nuevoSaldo, 
          fecha_ultimo_pago: new Date(),
          estado: nuevoEstado
        })
        .eq('id', credito.id);

      if (errCredito) throw errCredito;

      // 3. Recibo WhatsApp
      let telefono = credito.clientes.telefono_celular?.replace(/\D/g, '') || '';
      if (telefono.length === 9) telefono = '51' + telefono;
      
      const mensaje = `Hola *${credito.clientes.nombre_completo}*! 👋 Pago recibido: *S/ ${monto}*. 📉 Saldo: *S/ ${nuevoSaldo}*.`;
      const link = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

      setReciboListo({ link, mensaje, nuevoSaldo, telefono });
      setModalVisible(true);
      
      const nuevosMontos = { ...montosRapidos };
      delete nuevosMontos[credito.id];
      setMontosRapidos(nuevosMontos);
      
      fetchCreditosActivos();

    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const listaFiltrada = creditos.filter(c => 
    c.clientes.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.clientes.barrio.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ color: '#111827', textAlign: 'center' }}>📋 Ruta de Cobro</h2>

      {/* Buscador Alto Contraste */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #4b5563' }}>
        <Search color="#111827" />
        <input 
          type="text" placeholder="BUSCAR CLIENTE..." 
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {listaFiltrada.map((credito, index) => {
          const estilo = obtenerEstiloEstado(credito.fecha_ultimo_pago, credito.fecha_inicio);
          const montoInput = montosRapidos[credito.id] !== undefined ? montosRapidos[credito.id] : '';
          
          return (
            <div key={credito.id} style={{ 
                backgroundColor: estilo.bg, 
                color: estilo.color,
                padding: '15px', 
                borderRadius: '10px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                border: `2px solid ${estilo.border}`, 
                borderLeft: '8px solid #2563eb', // Indicador azul fijo
                position: 'relative'
              }}>
              
              {/* Etiqueta RUTA */}
              <div style={{
                position: 'absolute', top: 0, left: 0, 
                backgroundColor: '#2563eb', color: 'white', 
                padding: '4px 10px', borderRadius: '8px 0 8px 0',
                fontSize: '12px', fontWeight: 'bold'
              }}>
                #{index + 1}
              </div>
              
              {/* Datos Cliente */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingTop: '15px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800' }}>{credito.clientes.nombre_completo}</h3>
                  <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.9 }}>
                    <MapPin size={14} /> {credito.clientes.barrio}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '90px' }}>
                  <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '15px' }}>Deuda: S/ {credito.saldo_restante}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8 }}>Cuota: S/ {credito.valor_cuota}</div>
                </div>
              </div>

              {/* CAJA RÁPIDA (Inputs Grandes) */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#111827', fontWeight: 'bold' }}>S/</span>
                  <input 
                    type="number" 
                    placeholder={credito.valor_cuota} 
                    value={montoInput}
                    onChange={(e) => handleMontoChange(credito.id, e.target.value)}
                    style={{ 
                      width: '100%', padding: '12px 10px 12px 35px', borderRadius: '8px', 
                      border: '2px solid #4b5563', fontSize: '18px', fontWeight: 'bold',
                      color: 'black', backgroundColor: 'white'
                    }}
                  />
                </div>
                
                <button 
                  onClick={() => cobrarRapido(credito)}
                  disabled={procesandoId === credito.id}
                  style={{ 
                    backgroundColor: '#16a34a', color: 'white', border: 'none', 
                    padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', 
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {procesandoId === credito.id ? '...' : <><DollarSign size={20}/> COBRAR</>}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL RECIBO */}
      {modalVisible && reciboListo && (
        <div style={estiloModalFondo}>
          <div style={estiloModalCaja}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '50px', marginBottom: '10px' }}>✅</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#16a34a', fontSize: '24px' }}>¡Cobro Exitoso!</h3>
              <p style={{ color: '#111827', marginBottom: '20px', fontSize: '16px', fontWeight: '500' }}>
                Nuevo saldo: <strong>S/ {reciboListo.nuevoSaldo}</strong>
              </p>
              
              {reciboListo.telefono ? (
                <a href={reciboListo.link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: '#25D366', color: 'white', textDecoration: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                  <MessageCircle size={24} /> Enviar Recibo WhatsApp
                </a>
              ) : (<p style={{color: 'red', fontWeight:'bold'}}>Sin celular registrado.</p>)}

              <button onClick={() => setModalVisible(false)} style={{...estiloBtn, backgroundColor: '#4b5563', width: '100%', marginTop: '15px'}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const estiloBtn = { flex: 1, padding: '12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };
const estiloModalFondo = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const estiloModalCaja = { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #9ca3af' };