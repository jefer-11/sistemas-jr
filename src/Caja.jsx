import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { Lock, PlusCircle, Trash2, Calculator } from 'lucide-react';

export function Caja() {
  const { usuario } = useAuth();
  if (!usuario) return <div style={{padding:'20px'}}>Cargando Caja...</div>;

  const [loading, setLoading] = useState(false);
  
  // INPUTS MANUALES
  const [baseInicial, setBaseInicial] = useState('');
  const [depositosRecibidos, setDepositosRecibidos] = useState('');
  const [entregaFinal, setEntregaFinal] = useState('');
  
  // DATOS AUTOMÁTICOS DB
  const [autoCobros, setAutoCobros] = useState(0); // Total cobrado (Pagos)
  const [autoPrestamos, setAutoPrestamos] = useState(0); // Total prestado (Creditos)

  // LISTA DINÁMICA DE GASTOS
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'alimentacion', monto: '' });

  // TIPOS DE GASTO
  const tiposGasto = [
      {id: 'almuerzo', label: 'almuerzo'},
      {id: 'combustible', label: 'Combustible'},
      {id: 'mantenimiento', label: 'Mantenimiento'},
      {id: 'aceite', label: 'aceite'},
      {id: 'despinchada', label: 'despinchada'},
      {id: 'otros', label: 'Otros'}
  ];

  useEffect(() => { if(usuario) cargarDatosAuto(); }, [usuario]);

  async function cargarDatosAuto() {
    setLoading(true);
    const hoyInicio = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const hoyFin = new Date().toISOString().split('T')[0] + 'T23:59:59';

    // 1. Total Cobros (Ingresos Auto)
    const { data: pagos } = await supabase.from('pagos').select('monto')
        .eq('usuario_cobrador_id', usuario.id) // Solo lo que cobró este usuario
        .gte('fecha_pago', hoyInicio).lte('fecha_pago', hoyFin);
    
    // 2. Total Préstamos (Egresos Auto)
    const { data: creditos } = await supabase.from('creditos').select('monto_capital')
        .eq('usuario_creador_id', usuario.id) // Solo lo que prestó este usuario
        .gte('created_at', hoyInicio).lte('created_at', hoyFin);

    setAutoCobros(pagos?.reduce((sum, p) => sum + p.monto, 0) || 0);
    setAutoPrestamos(creditos?.reduce((sum, c) => sum + c.monto_capital, 0) || 0);
    setLoading(false);
  }

  // --- LÓGICA GASTOS ---
  const agregarGasto = () => {
      if(!nuevoGasto.monto || parseFloat(nuevoGasto.monto) <= 0) return;
      setGastos([...gastos, { ...nuevoGasto, id: Date.now() }]); // ID temporal
      setNuevoGasto({ ...nuevoGasto, monto: '' });
  };
  const eliminarGasto = (id) => setGastos(gastos.filter(g => g.id !== id));

  // --- CÁLCULOS MATEMÁTICOS (TU FÓRMULA) ---
  const valBase = parseFloat(baseInicial) || 0;
  const valDepRecibidos = parseFloat(depositosRecibidos) || 0;
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
  
  const INGRESOS = valBase + autoCobros + valDepRecibidos;
  const EGRESOS = autoPrestamos + totalGastos;
  
  const SALDO_TEORICO = INGRESOS - EGRESOS;
  const valEntrega = parseFloat(entregaFinal) || 0;
  const DIFERENCIA = valEntrega - SALDO_TEORICO;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ textAlign:'center', color: '#111827', display:'flex', justifyContent:'center', gap:'10px' }}>
        <Calculator /> Liquidación Diaria
      </h2>

      {/* SECCIÓN A: INGRESOS (Verde) */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderTop: '5px solid #16a34a', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#16a34a' }}>A. INGRESOS (Entradas)</h3>
        
        <div style={fila}>
            <label>Base Inicial:</label>
            <input type="number" placeholder="0.00" value={baseInicial} onChange={e => setBaseInicial(e.target.value)} style={input} />
        </div>
        <div style={fila}>
            <label>Cobros (Automático):</label>
            <div style={{fontWeight:'bold'}}>S/ {autoCobros.toFixed(2)}</div>
        </div>
        <div style={fila}>
            <label>Depósitos Recibidos:</label>
            <input type="number" placeholder="0.00" value={depositosRecibidos} onChange={e => setDepositosRecibidos(e.target.value)} style={input} />
        </div>
        <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #eee', textAlign:'right', fontWeight:'bold', color:'#16a34a'}}>
            TOTAL INGRESOS: S/ {INGRESOS.toFixed(2)}
        </div>
      </div>

      {/* SECCIÓN B: EGRESOS (Rojo) */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderTop: '5px solid #dc2626', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#dc2626' }}>B. EGRESOS (Salidas)</h3>
        
        <div style={fila}>
            <label>Préstamos Dados (Auto):</label>
            <div style={{fontWeight:'bold'}}>S/ {autoPrestamos.toFixed(2)}</div>
        </div>

        {/* LISTA GASTOS */}
        <div style={{backgroundColor:'#fef2f2', padding:'10px', borderRadius:'8px', marginTop:'10px'}}>
            <div style={{fontWeight:'bold', marginBottom:'5px', fontSize:'14px', color:'#991b1b'}}>Registro de Gastos:</div>
            <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                <select value={nuevoGasto.tipo} onChange={e => setNuevoGasto({...nuevoGasto, tipo: e.target.value})} style={{flex:1, padding:'8px', borderRadius:'6px'}}>
                    {tiposGasto.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input type="number" placeholder="Monto" value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} style={{width:'80px', padding:'8px', borderRadius:'6px'}} />
                <button onClick={agregarGasto} style={{background:'#dc2626', color:'white', border:'none', borderRadius:'6px', padding:'0 10px'}}><PlusCircle/></button>
            </div>
            {gastos.map(g => (
                <div key={g.id} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #fca5a5', padding:'5px 0', fontSize:'13px'}}>
                    <span>{g.tipo.toUpperCase()}</span>
                    <span>S/ {g.monto} <Trash2 size={14} color="red" style={{cursor:'pointer', marginLeft:'5px'}} onClick={() => eliminarGasto(g.id)}/></span>
                </div>
            ))}
        </div>

        <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #eee', textAlign:'right', fontWeight:'bold', color:'#dc2626'}}>
            TOTAL EGRESOS: S/ {EGRESOS.toFixed(2)}
        </div>
      </div>

      {/* SECCIÓN C: RESULTADO FINAL */}
      <div style={{ backgroundColor: '#111827', color: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{fontSize:'14px', opacity:0.8}}>SALDO TEÓRICO (Deberías tener)</div>
        <div style={{fontSize:'36px', fontWeight:'900', marginBottom:'15px'}}>S/ {SALDO_TEORICO.toFixed(2)}</div>
        
        <div style={{backgroundColor:'rgba(255,255,255,0.1)', padding:'15px', borderRadius:'8px'}}>
            <label style={{display:'block', marginBottom:'5px', fontSize:'14px'}}>¿Cuánto entregas físicamente?</label>
            <input 
                type="number" 
                value={entregaFinal} 
                onChange={e => setEntregaFinal(e.target.value)} 
                style={{width:'100%', padding:'10px', borderRadius:'6px', border:'none', textAlign:'center', fontSize:'20px', fontWeight:'bold', color:'black'}} 
                placeholder="0.00"
            />
        </div>

        <div style={{marginTop:'15px', fontSize:'18px', fontWeight:'bold', color: DIFERENCIA === 0 ? '#4ade80' : DIFERENCIA > 0 ? '#facc15' : '#f87171'}}>
            {DIFERENCIA === 0 ? '✅ CUADRADO PERFECTO' : DIFERENCIA > 0 ? `⚠️ SOBRAN S/ ${DIFERENCIA.toFixed(2)}` : `⛔ FALTAN S/ ${Math.abs(DIFERENCIA).toFixed(2)}`}
        </div>
      </div>

    </div>
  );
}

const fila = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', fontSize:'15px' };
const input = { width:'100px', padding:'5px', borderRadius:'4px', border:'1px solid #ccc', textAlign:'right' };