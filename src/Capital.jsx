import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext'; 
import { PieChart, ShieldCheck, Lock, Activity } from 'lucide-react';

export function Capital() {
  const { usuario } = useAuth();

  // 🛡️ ESCUDO DE SEGURIDAD
  if (!usuario) return <div style={{padding:'20px'}}>Cargando perfil...</div>;
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'SUPER_ADMIN') {
      return <div style={{padding:'20px', color:'red'}}>⛔ Acceso Restringido</div>;
  }

  const [finanzas, setFinanzas] = useState({
    capitalEnCalle: 0, 
    gananciaProyectada: 0, 
    totalCreditos: 0,
    capitalInvertido: 0, 
    globalTotal: 0      
  });

  const [movimientos, setMovimientos] = useState([]);
  const [form, setForm] = useState({ tipo: 'INYECCION', monto: '', descripcion: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(usuario) cargarDatos();
  }, [usuario]);

  async function cargarDatos() {
    // 1. CARTERA (Dinero en Calle)
    const { data: creditos } = await supabase
      .from('creditos')
      .select('saldo_restante, monto_interes')
      .eq('empresa_id', usuario.empresa_id)
      .eq('estado', 'ACTIVO');

    let calle = 0;
    let ganancia = 0;

    creditos?.forEach(c => {
      calle += c.saldo_restante;
      ganancia += c.monto_interes; 
    });

    // 2. MOVIMIENTOS (Dinero Invertido vs Retirado)
    // Se usa la nueva tabla movimientos_capital
    const { data: hist } = await supabase
      .from('movimientos_capital')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('fecha_movimiento', { ascending: false });
    
    let inyecciones = 0;
    let retiros = 0;
    
    hist?.forEach(m => {
        if (m.tipo === 'INYECCION') inyecciones += m.monto;
        if (m.tipo === 'RETIRO') retiros += m.monto;
    });

    const capitalNeto = inyecciones - retiros;
    const granTotal = capitalNeto + calle;

    setFinanzas({ 
        capitalEnCalle: calle, 
        gananciaProyectada: ganancia, 
        totalCreditos: creditos?.length || 0,
        capitalInvertido: capitalNeto,
        globalTotal: granTotal
    });
    
    setMovimientos(hist || []);
  }

  async function procesarMovimiento(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // CORRECCIÓN SEGURIDAD: 
      // Llamamos a la función segura en base de datos (RPC) en vez de comparar aquí
      const { data: esValido, error: rpcError } = await supabase
        .rpc('validar_pin_seguro', { 
            p_user_id: usuario.id, 
            p_password: form.password 
        });

      if (rpcError) throw rpcError;
      if (!esValido) throw new Error("⛔ Contraseña incorrecta.");

      const { error } = await supabase.from('movimientos_capital').insert([{
        empresa_id: usuario.empresa_id,
        usuario_id: usuario.id,
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion
      }]);

      if (error) throw error;

      alert("Movimiento registrado correctamente.");
      setForm({ tipo: 'INYECCION', monto: '', descripcion: '', password: '' });
      cargarDatos(); 

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: '#111827', textAlign: 'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
        <PieChart color="#7c3aed"/> Gestión de Capital
      </h2>

      {/* --- SECCIÓN 1: EL GLOBAL --- */}
      <div style={{ backgroundColor: '#111827', color: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', marginBottom: '25px', position:'relative', overflow:'hidden' }}>
          <div style={{position:'absolute', top:'-10px', right:'-10px', opacity:0.1}}><Activity size={100}/></div>
          <div style={{ fontSize: '16px', opacity: 0.9, color:'#a78bfa', fontWeight:'bold', letterSpacing:'1px' }}>GLOBAL (MÚSCULO FINANCIERO)</div>
          <div style={{ fontSize: '48px', fontWeight: '900', margin:'10px 0' }}>S/ {finanzas.globalTotal.toLocaleString()}</div>
          <div style={{ fontSize: '13px', opacity:0.7 }}>(Capital Base + Dinero en Calle)</div>
      </div>

      {/* --- SECCIÓN 2: EL DESGLOSE --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* CAPITAL BASE */}
        <div style={{ backgroundColor: 'white', border:'2px solid #1f2937', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color:'#1f2937', fontWeight:'bold' }}>CAPITAL BASE (Caja Fuerte)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color:'#1f2937', margin:'5px 0' }}>S/ {finanzas.capitalInvertido.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color:'#6b7280' }}>Inyecciones - Retiros</div>
        </div>

        {/* EN CALLE */}
        <div style={{ backgroundColor: '#1e40af', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(30, 64, 175, 0.2)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, fontWeight:'bold' }}>DINERO EN CALLE</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin:'5px 0' }}>S/ {finanzas.capitalEnCalle.toLocaleString()}</div>
          <div style={{ fontSize: '12px', opacity:0.8 }}>{finanzas.totalCreditos} Créditos Activos</div>
        </div>

        {/* GANANCIA */}
        <div style={{ backgroundColor: '#047857', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(4, 120, 87, 0.2)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, fontWeight:'bold' }}>GANANCIA PROYECTADA</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin:'5px 0' }}>S/ {finanzas.gananciaProyectada.toLocaleString()}</div>
          <div style={{ fontSize: '12px', opacity:0.8 }}>Intereses por cobrar</div>
        </div>

      </div>

      {/* --- SECCIÓN 3: OPERACIONES --- */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px' }}>
          
          {/* FORMULARIO */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', height:'fit-content' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} /> Nuevo Movimiento
            </h3>
            
            <form onSubmit={procesarMovimiento} style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '20px', paddingBottom:'10px', borderBottom:'1px dashed #eee' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="radio" checked={form.tipo === 'INYECCION'} onChange={() => setForm({...form, tipo: 'INYECCION'})} /> 
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize:'14px' }}>🟢 Inyectar</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="radio" checked={form.tipo === 'RETIRO'} onChange={() => setForm({...form, tipo: 'RETIRO'})} /> 
                  <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize:'14px' }}>🔴 Retirar</span>
                </label>
              </div>

              <input type="number" required value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} style={inputStyle} placeholder="Monto (S/)" />
              
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0 10px' }}>
                <Lock size={16} color="#6b7280" />
                <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inputStyle, border:'none'}} placeholder="Contraseña Admin" />
              </div>

              <input type="text" required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} style={inputStyle} placeholder="Motivo (Ej: Aporte socio)" />

              <button type="submit" disabled={loading} style={{ backgroundColor: '#111827', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize:'14px' }}>
                {loading ? 'Procesando...' : 'CONFIRMAR'}
              </button>
            </form>
          </div>

          {/* HISTORIAL */}
          <div style={{backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb'}}>
              <h3 style={{ margin: '0 0 15px 0', color: '#6b7280', fontSize:'16px' }}>📜 Últimos Movimientos</h3>
              <div style={{overflowY:'auto', maxHeight:'300px'}}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                    <tr><th style={thStyle}>Fecha</th><th style={thStyle}>Tipo</th><th style={thStyle}>Monto</th><th style={thStyle}>Motivo</th></tr>
                    </thead>
                    <tbody>
                    {movimientos.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: m.tipo === 'INYECCION' ? '#16a34a' : '#dc2626' }}>{m.tipo}</td>
                        <td style={{...tdStyle, fontWeight:'bold'}}>S/ {m.monto}</td>
                        <td style={tdStyle}>{m.descripcion}</td>
                        </tr>
                    ))}
                    {movimientos.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:'10px', color:'#999'}}>Sin movimientos.</td></tr>}
                    </tbody>
                </table>
              </div>
          </div>

      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', outline:'none' };
const thStyle = { padding: '10px', color: '#374151' };
const tdStyle = { padding: '10px', color: '#4b5563' };