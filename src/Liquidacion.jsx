import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { User, Calculator, AlertCircle } from 'lucide-react';

export function Liquidacion() {
  const { usuario } = useAuth();
  
  // SOLO ADMIN
  if (usuario?.rol !== 'ADMIN' && usuario?.rol !== 'SUPER_ADMIN') {
      return <div style={{padding:'20px', color:'red'}}>⛔ Acceso solo para Administradores</div>;
  }

  const [cobradores, setCobradores] = useState([]);
  const [seleccionado, setSeleccionado] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCobradores();
  }, [usuario]);

  useEffect(() => {
    if (seleccionado) calcularCorte(seleccionado);
  }, [seleccionado]);

  async function cargarCobradores() {
    const { data } = await supabase.from('usuarios')
      .select('id, nombre_completo')
      .eq('empresa_id', usuario.empresa_id)
      .eq('rol', 'COBRADOR')
      .eq('estado', true);
    setCobradores(data || []);
  }

  async function calcularCorte(idCobrador) {
    setLoading(true);
    // Rango: Todo el día de HOY
    const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const hoyFin = new Date().toISOString().split('T')[0] + 'T23:59:59';

    try {
      // 1. DINERO ENTRADA (Lo que cobró)
      const { data: pagos } = await supabase.from('pagos')
        .select('monto')
        .eq('usuario_cobrador_id', idCobrador) // Importante: Filtrar por cobrador
        .gte('fecha_pago', hoyInicio)
        .lte('fecha_pago', hoyFin);

      // 2. DINERO SALIDA (Préstamos nuevos que dio él)
      const { data: creditos } = await supabase.from('creditos')
        .select('monto_capital')
        .eq('usuario_creador_id', idCobrador)
        .gte('created_at', hoyInicio)
        .lte('created_at', hoyFin);
      
      // 3. GASTOS (Si el cobrador registró gastos, ej: gasolina)
      const { data: gastos } = await supabase.from('gastos')
        .select('monto')
        .eq('usuario_id', idCobrador)
        .gte('fecha_gasto', hoyInicio)
        .is('deleted_at', null);

      const totalCobrado = pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
      const totalPrestado = creditos?.reduce((sum, c) => sum + c.monto_capital, 0) || 0;
      const totalGastos = gastos?.reduce((sum, g) => sum + g.monto, 0) || 0;

      setData({
        cobrado: totalCobrado,
        prestado: totalPrestado,
        gastos: totalGastos,
        entregar: totalCobrado - totalPrestado - totalGastos
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#111827', display:'flex', justifyContent:'center', gap:'10px' }}>
        <Calculator /> Corte de Caja Individual
      </h2>
      <p style={{textAlign:'center', color:'#6b7280', fontSize:'14px'}}>Auditoría en tiempo real por empleado</p>

      {/* SELECTOR */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '2px solid #4b5563', marginBottom: '20px' }}>
        <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Seleccionar Cobrador:</label>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <User />
            <select 
                value={seleccionado} 
                onChange={e => setSeleccionado(e.target.value)}
                style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #9ca3af', fontSize:'16px'}}
            >
                <option value="">-- Elige uno --</option>
                {cobradores.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
            </select>
        </div>
      </div>

      {/* RESULTADOS */}
      {data && (
        <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
            {/* TARJETA RESUMEN */}
            <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <div style={{fontSize:'14px', opacity:0.8, marginBottom:'5px'}}>DEBE ENTREGARTE EN MANO</div>
                <div style={{fontSize:'42px', fontWeight:'900'}}>S/ {data.entregar.toFixed(2)}</div>
                <div style={{fontSize:'12px', marginTop:'10px', fontStyle:'italic'}}>
                    (Cobrado - Prestado - Gastos)
                </div>
            </div>

            {/* DETALLE */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                <div style={cardDetalle}>
                    <div style={{color:'#16a34a', fontWeight:'bold'}}>+ Cobró</div>
                    <div>S/ {data.cobrado}</div>
                </div>
                <div style={cardDetalle}>
                    <div style={{color:'#dc2626', fontWeight:'bold'}}>- Prestó</div>
                    <div>S/ {data.prestado}</div>
                </div>
                <div style={cardDetalle}>
                    <div style={{color:'#d97706', fontWeight:'bold'}}>- Gastó</div>
                    <div>S/ {data.gastos}</div>
                </div>
            </div>

            <div style={{backgroundColor:'#f3f4f6', padding:'15px', borderRadius:'8px', fontSize:'13px', color:'#4b5563', textAlign:'center', border:'1px solid #d1d5db'}}>
                <AlertCircle size={16} style={{verticalAlign:'text-bottom'}}/> <strong>Nota:</strong> Verifica este monto físico antes de recibirlo.
            </div>
        </div>
      )}
    </div>
  );
}

const cardDetalle = { backgroundColor:'white', padding:'15px', borderRadius:'8px', textAlign:'center', border:'1px solid #e5e7eb', fontSize:'14px' };