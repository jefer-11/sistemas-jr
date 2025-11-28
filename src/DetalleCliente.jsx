import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, MapPin, Phone, AlertTriangle, CheckCircle } from 'lucide-react';

export function DetalleCliente({ creditoId, alVolver }) {
  const [data, setData] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalles();
  }, [creditoId]);

  async function cargarDetalles() {
    setLoading(true);
    // 1. Traemos la info del crédito + cliente
    const { data: credito } = await supabase
      .from('creditos')
      .select(`
        *,
        clientes (*)
      `)
      .eq('id', creditoId)
      .single();

    if (credito) {
      setData(credito);
      
      // 2. Traemos el historial de pagos de este crédito
      const { data: listaPagos } = await supabase
        .from('pagos')
        .select('*')
        .eq('credito_id', creditoId)
        .order('fecha_pago', { ascending: false });

      setPagos(listaPagos || []);
    }
    setLoading(false);
  }

  // Cálculos de Récord
  const calcularFallas = () => {
    if (!data) return 0;
    const ultimoPago = data.fecha_ultimo_pago ? new Date(data.fecha_ultimo_pago) : new Date(data.fecha_inicio);
    const hoy = new Date();
    const diasDiferencia = Math.floor((hoy - ultimoPago) / (1000 * 3600 * 24));
    return diasDiferencia > 1 ? diasDiferencia - 1 : 0; 
  };

  const calcularProgreso = () => {
    if (!data) return 0;
    const pagado = data.total_a_pagar - data.saldo_restante;
    return ((pagado / data.total_a_pagar) * 100).toFixed(0);
  };

  if (loading) return <div style={{padding:'20px', textAlign:'center'}}>Cargando historial...</div>;
  if (!data) return <div style={{padding:'20px'}}>No se encontró información.</div>;

  const fallas = calcularFallas();

  // URL INTELIGENTE DE GOOGLE MAPS
  // Usamos el formato universal "search/?api=1&query=LAT,LON"
  // Esto obliga al celular a buscar esa coordenada exacta.
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${data.clientes.gps_latitud},${data.clientes.gps_longitud}`;

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '10px' }}>
      
      {/* Botón Volver */}
      <button onClick={alVolver} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '15px', padding: '10px', border: 'none', backgroundColor: '#374151', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
        <ArrowLeft size={18} /> Volver al Listado
      </button>

      {/* TARJETA DEL CLIENTE */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Lado Izquierdo: Datos Personales */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
             {/* FOTO DEL CLIENTE */}
             <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e5e7eb', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #2563eb' }}>
                {data.clientes.foto_url ? (
                  <img src={data.clientes.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px' }}>👤</span>
                )}
             </div>
             <div>
                <h2 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>{data.clientes.nombre_completo}</h2>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>DNI: {data.clientes.dni}</div>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#4b5563', marginTop: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Phone size={16}/> <a href={`tel:${data.clientes.telefono_celular}`} style={{color: '#2563eb', textDecoration:'none'}}>{data.clientes.telefono_celular}</a>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={16}/> {data.clientes.direccion_texto} ({data.clientes.barrio})</span>
          </div>
          
          {/* BOTÓN GOOGLE MAPS */}
          {data.clientes.gps_latitud ? (
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '15px', backgroundColor: '#2563eb', color: 'white', 
                padding: '12px', borderRadius: '8px', textDecoration: 'none', 
                fontWeight: 'bold', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)' 
              }}
            >
              <MapPin size={18} /> Ir a la Ubicación (Google Maps)
            </a>
          ) : (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f3f4f6', color: '#666', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
              ⚠️ Cliente sin ubicación GPS registrada.
            </div>
          )}
        </div>

        {/* Lado Derecho: Estadísticas */}
        <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <h3 style={{ marginTop: 0, color: '#1e40af' }}>Estado del Crédito</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div>
              <small>Deuda Total:</small>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>S/ {data.total_a_pagar}</div>
            </div>
            <div>
              <small>Saldo Pendiente:</small>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>S/ {data.saldo_restante}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: fallas > 0 ? '#fee2e2' : '#dcfce7', borderRadius: '5px', border: fallas > 0 ? '1px solid #fca5a5' : '1px solid #86efac' }}>
            {fallas > 0 ? <AlertTriangle color="#dc2626"/> : <CheckCircle color="#16a34a"/>}
            <div>
              <strong>Récord Actual:</strong>
              <div>{fallas > 0 ? `Tiene ${fallas} días de atraso` : 'Excelente pagador'}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '15px' }}>
            <small>Progreso de Pago: {calcularProgreso()}%</small>
            <div style={{ width: '100%', backgroundColor: '#d1d5db', height: '10px', borderRadius: '5px', marginTop: '5px' }}>
              <div style={{ width: `${calcularProgreso()}%`, backgroundColor: '#16a34a', height: '100%', borderRadius: '5px' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial */}
      <h3 style={{ marginLeft: '10px' }}>📜 Historial de Pagos</h3>
      <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ backgroundColor: '#374151', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>Monto</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>Método</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding: '12px 15px' }}>{new Date(p.fecha_pago).toLocaleDateString()}</td>
                <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#16a34a' }}>S/ {p.monto}</td>
                <td style={{ padding: '12px 15px' }}>{p.metodo_pago}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}