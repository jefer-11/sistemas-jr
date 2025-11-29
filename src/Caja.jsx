import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext'; // <--- IMPORTACIÓN CLAVE
import { Lock } from 'lucide-react';

export function Caja() {
  const { usuario } = useAuth(); // <--- OBTENEMOS USUARIO DIRECTAMENTE

  // 🛡️ ESCUDO DE SEGURIDAD
  if (!usuario) return <div style={{padding:'20px'}}>Cargando Caja...</div>;

  const horaActual = new Date().getHours();
  const esTarde = horaActual >= 22; 
  const esAdmin = usuario.rol === 'ADMIN' || usuario.rol === 'SUPER_ADMIN';

  if (esTarde && !esAdmin) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', color: '#dc2626' }}>
        <Lock size={64} />
        <h1>SISTEMA CERRADO</h1>
        <p>Corte automático 10:00 PM.</p>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState('');
  const [depositos, setDepositos] = useState('');
  const [automatico, setAutomatico] = useState({ cobros: 0, prestamos: 0, gastosRegistrados: 0 });
  const [listaGastos, setListaGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto: '' });

  useEffect(() => {
    if(usuario) cargarDatosDelDia();
  }, [usuario]);

  async function cargarDatosDelDia() {
    setLoading(true);
    const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const hoyFin = new Date().toISOString().split('T')[0] + 'T23:59:59';

    try {
      const { data: pagos } = await supabase.from('pagos').select('monto').eq('empresa_id', usuario.empresa_id).gte('fecha_pago', hoyInicio).lte('fecha_pago', hoyFin);
      const { data: creditos } = await supabase.from('creditos').select('monto_capital').eq('empresa_id', usuario.empresa_id).gte('created_at', hoyInicio).lte('created_at', hoyFin);
      const { data: gastos } = await supabase.from('gastos').select('*').eq('empresa_id', usuario.empresa_id).gte('fecha_gasto', hoyInicio).is('deleted_at', null);

      const totalCobros = pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
      const totalPrestamos = creditos?.reduce((sum, c) => sum + c.monto_capital, 0) || 0;
      const totalGastos = gastos?.reduce((sum, g) => sum + g.monto, 0) || 0;

      setAutomatico({ cobros: totalCobros, prestamos: totalPrestamos, gastosRegistrados: totalGastos });
      setListaGastos(gastos || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function agregarGasto(e) {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.monto) return;
    await supabase.from('gastos').insert([{
      concepto: nuevoGasto.concepto, monto: parseFloat(nuevoGasto.monto),
      fecha_gasto: new Date(), usuario_id: usuario.id, empresa_id: usuario.empresa_id
    }]);
    setNuevoGasto({ concepto: '', monto: '' });
    cargarDatosDelDia();
  }

  async function borrarGasto(id) {
    if(!window.confirm("¿Borrar gasto?")) return;
    await supabase.from('gastos').update({ deleted_at: new Date() }).eq('id', id);
    cargarDatosDelDia();
  }

  const totalBase = parseFloat(base) || 0;
  const totalDepositos = parseFloat(depositos) || 0;
  const totalIngresos = totalBase + totalDepositos + automatico.cobros;
  const totalSalidas = automatico.gastosRegistrados + automatico.prestamos;
  const totalEntregar = totalIngresos - totalSalidas;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '50px' }}>
      <h2 style={{ textAlign:'center', color: '#111827' }}>Cierre Diario</h2>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>1. Entradas</h3>
        <div style={filaInput}>
          <label>Base Inicial:</label>
          <input type="number" placeholder="0.00" value={base} onChange={e => setBase(e.target.value)} style={inputStyle} />
        </div>
        <div style={filaInput}>
          <label>Depósitos:</label>
          <input type="number" placeholder="0.00" value={depositos} onChange={e => setDepositos(e.target.value)} style={inputStyle} />
        </div>
        <div style={filaResumen}><span>+ Cobros (Auto):</span><strong>S/ {automatico.cobros.toFixed(2)}</strong></div>
        <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold', color: '#16a34a' }}>Total Entradas: S/ {totalIngresos.toFixed(2)}</div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>2. Salidas</h3>
        <div style={filaResumen}><span>- Préstamos (Auto):</span><strong>S/ {automatico.prestamos.toFixed(2)}</strong></div>
        <div style={{ backgroundColor: '#fff1f2', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
          <div style={{fontSize:'13px', fontWeight:'bold', marginBottom:'5px', color:'#991b1b'}}>Gasto:</div>
          <form onSubmit={agregarGasto} style={{display:'flex', gap:'5px'}}>
            <input placeholder="Concepto" value={nuevoGasto.concepto} onChange={e => setNuevoGasto({...nuevoGasto, concepto: e.target.value})} style={{...inputSmall, flex:2}} />
            <input type="number" placeholder="Monto" value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} style={{...inputSmall, flex:1}} />
            <button type="submit" style={btnSmall}>+</button>
          </form>
          <ul style={{ paddingLeft: '15px', marginTop: '10px', fontSize: '12px', color: '#666' }}>
            {listaGastos.map(g => (
              <li key={g.id} style={{marginBottom:'3px'}}>
                {g.concepto}: S/ {g.monto} <span onClick={() => borrarGasto(g.id)} style={{color:'red', cursor:'pointer', fontWeight:'bold'}}>(x)</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ textAlign: 'right', marginTop: '10px', fontWeight: 'bold', color: '#dc2626' }}>Total Salidas: S/ {totalSalidas.toFixed(2)}</div>
      </div>

      <div style={{ backgroundColor: '#111827', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>DINERO A ENTREGAR</div>
        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>S/ {totalEntregar.toFixed(2)}</div>
      </div>
    </div>
  );
}

const filaInput = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' };
const filaResumen = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '14px' };
const inputStyle = { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: '100px', textAlign: 'right', fontWeight: 'bold' };
const inputSmall = { padding: '5px', borderRadius: '4px', border: '1px solid #fca5a5' };
const btnSmall = { backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };