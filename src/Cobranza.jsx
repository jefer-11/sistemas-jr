// sistemas-jr/src/Cobranza.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, DollarSign, MapPin, MessageCircle } from 'lucide-react';
import { useAuth } from './AuthContext'; // <-- Importar el Hook de Contexto

// --- LÓGICA SEMÁFORO DE COBRANZA ---
const obtenerColorEstado = (fechaUltimoPago, fechaInicio) => {
  const ultimaFecha = fechaUltimoPago ? new Date(fechaUltimoPago) : new Date(fechaInicio);
  const hoy = new Date();
  const dias = Math.floor((hoy - ultimaFecha) / (1000 * 3600 * 24)); 
  if (dias <= 1) return 'white'; 
  if (dias <= 2) return '#fef08a'; // Amarillo
  if (dias <= 7) return '#fdba74'; // Naranja
  return '#fca5a5'; // Rojo
};

export function Cobranza() {
  const { usuario } = useAuth(); // <-- Usar el Contexto para obtener el usuario
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
      .order('orden_ruta', { foreignTable: 'clientes', ascending: true }); // <-- CORRECCIÓN: Ordenar por ruta

    if (data) setCreditos(data);
    setCargando(false);
  }

  const handleMontoChange = (id, valor) => {
    setMontosRapidos(prev => ({ ...prev, [id]: valor }));
  };

  // --- COBRO RÁPIDO DIRECTO ---
  const cobrarRapido = async (credito) => {
    const montoStr = montosRapidos[credito.id];
    const monto = montoStr ? parseFloat(montoStr) : credito.valor_cuota;

    if (!monto || monto <= 0) return alert("Ingresa un monto válido.");
    
    const confirmar = window.confirm(`¿Cobrar S/ ${monto} a ${credito.clientes.nombre_completo}?`);
    if (!confirmar) return;

    setProcesandoId(credito.id);

    try {
      // 1. Registrar Pago (Método por defecto: EFECTIVO, ya que es "cobro en ruta")
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

      // 3. Preparar Recibo WhatsApp
      let telefono = credito.clientes.telefono_celular?.replace(/\D/g, '') || '';
      if (telefono.length === 9) telefono = '51' + telefono;
      
      const mensaje = `Hola *${credito.clientes.nombre_completo}*! 👋 Pago recibido: *S/ ${monto}*. 📉 Saldo: *S/ ${nuevoSaldo}*.`;
      const link = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

      // 4. Limpiar y mostrar Modal
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

  // Filtrado
  const listaFiltrada = creditos.filter(c => 
    c.clientes.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.clientes.barrio.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ color: '#333' }}>📋 Ruta de Cobro</h2>

      {/* Buscador */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <Search color="#888" />
        <input 
          type="text" placeholder="Buscar cliente..." 
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px' }}
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {listaFiltrada.map((credito, index) => {
          const colorFondo = obtenerColorEstado(credito.fecha_ultimo_pago, credito.fecha_inicio);
          const montoInput = montosRapidos[credito.id] !== undefined ? montosRapidos[credito.id] : '';
          
          return (
            <div key={credito.id} style={{ 
                backgroundColor: colorFondo, 
                padding: '15px', 
                borderRadius: '10px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                border: '1px solid #ccc',
                borderLeft: '5px solid #2563eb',
                position: 'relative'
              }}>
              
              {/* Etiqueta de Orden de Ruta */}
              <div style={{
                position: 'absolute', top: 0, left: 0, 
                backgroundColor: '#2563eb', color: 'white', 
                padding: '3px 8px', borderRadius: '10px 0 0 0',
                fontSize: '11px', fontWeight: 'bold'
              }}>
                RUTA #{index + 1}
              </div>
              
              {/* Parte Superior: Datos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingTop: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '16px' }}>{credito.clientes.nombre_completo}</h3>
                  <div style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={12} /> {credito.clientes.barrio}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#dc2626' }}>Saldo: S/ {credito.saldo_restante}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>Cuota: S/ {credito.valor_cuota}</div>
                </div>
              </div>

              {/* Parte Inferior: CAJA RÁPIDA */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontWeight: 'bold' }}>S/</span>
                  <input 
                    type="number" 
                    placeholder={credito.valor_cuota} 
                    value={montoInput}
                    onChange={(e) => handleMontoChange(credito.id, e.target.value)}
                    style={{ 
                      width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', 
                      border: '1px solid #9ca3af', fontSize: '16px', fontWeight: 'bold',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <button 
                  onClick={() => cobrarRapido(credito)}
                  disabled={procesandoId === credito.id}
                  style={{ 
                    backgroundColor: '#16a34a', color: 'white', border: 'none', 
                    padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', 
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  {procesandoId === credito.id ? '...' : <><DollarSign size={18}/> COBRAR</>}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL SOLO PARA RECIBO EXITOSO (Opcional si se quiere enviar WhatsApp) */}
      {modalVisible && reciboListo && (
        <div style={estiloModalFondo}>
          <div style={estiloModalCaja}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '50px', marginBottom: '10px' }}>✅</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>¡Cobro Exitoso!</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>Nuevo saldo: S/ {reciboListo.nuevoSaldo}</p>
              
              {reciboListo.telefono ? (
                <a href={reciboListo.link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: '#25D366', color: 'white', textDecoration: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
                  <MessageCircle size={24} /> Enviar Recibo WhatsApp
                </a>
              ) : (<p style={{color: 'red'}}>Sin celular registrado.</p>)}

              <button onClick={() => setModalVisible(false)} style={{...estiloBtn, backgroundColor: '#6b7280', width: '100%', marginTop: '15px'}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const estiloBtn = { flex: 1, padding: '12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const estiloModalFondo = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const estiloModalCaja = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '350px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' };