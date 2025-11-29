import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext'; // <--- IMPORTACIÓN CLAVE
import { TrendingUp, TrendingDown, DollarSign, Lock, ShieldCheck } from 'lucide-react';

export function Capital() {
  const { usuario } = useAuth(); // <--- OBTENEMOS USUARIO DIRECTAMENTE AQUÍ

  // 🛡️ ESCUDO DE SEGURIDAD
  if (!usuario) return <div style={{padding:'20px'}}>Cargando perfil...</div>;
  
  // SEGURIDAD: Solo Admin
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'SUPER_ADMIN') {
      return <div>Acceso Restringido</div>;
  }

  const [cartera, setCartera] = useState({
    capitalCirculante: 0, 
    gananciaProyectada: 0, 
    totalCreditos: 0
  });

  const [movimientos, setMovimientos] = useState([]);
  const [form, setForm] = useState({ tipo: 'INYECCION', monto: '', descripcion: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(usuario) cargarDatos();
  }, [usuario]);

  async function cargarDatos() {
    // 1. Calcular Cartera Global
    const { data: creditos } = await supabase
      .from('creditos')
      .select('saldo_restante, monto_interes')
      .eq('empresa_id', usuario.empresa_id)
      .eq('estado', 'ACTIVO');

    let circulante = 0;
    let ganancia = 0;

    creditos?.forEach(c => {
      circulante += c.saldo_restante;
      ganancia += c.monto_interes; 
    });

    setCartera({ capitalCirculante: circulante, gananciaProyectada: ganancia, totalCreditos: creditos?.length || 0 });

    // 2. Cargar Historial
    const { data: hist } = await supabase
      .from('movimientos_capital')
      .select('*, usuarios(nombre_completo)')
      .eq('empresa_id', usuario.empresa_id)
      .order('fecha_movimiento', { ascending: false });
    
    setMovimientos(hist || []);
  }

  async function procesarMovimiento(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: validUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', usuario.id)
        .eq('password_hash', form.password)
        .single();

      if (!validUser) throw new Error("⛔ Contraseña incorrecta.");

      const { error } = await supabase.from('movimientos_capital').insert([{
        empresa_id: usuario.empresa_id,
        usuario_id: usuario.id,
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion
      }]);

      if (error) throw error;

      alert("Movimiento registrado.");
      setForm({ tipo: 'INYECCION', monto: '', descripcion: '', password: '' });
      cargarDatos();

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#111827', textAlign: 'center' }}>💰 Gestión de Capital y Cartera</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>CAPITAL CIRCULANTE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>S/ {cartera.capitalCirculante.toFixed(2)}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>{cartera.totalCreditos} Créditos Activos</div>
        </div>
        <div style={{ backgroundColor: '#065f46', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>GANANCIA ESPERADA</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>S/ {cartera.gananciaProyectada.toFixed(2)}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Intereses por cobrar</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} /> Movimiento Seguro
        </h3>
        <form onSubmit={procesarMovimiento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="radio" checked={form.tipo === 'INYECCION'} onChange={() => setForm({...form, tipo: 'INYECCION'})} /> 
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 Inyectar</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="radio" checked={form.tipo === 'RETIRO'} onChange={() => setForm({...form, tipo: 'RETIRO'})} /> 
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🔴 Retirar</span>
            </label>
          </div>
          <input type="number" required value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} style={inputStyle} placeholder="Monto" />
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0 10px' }}>
            <Lock size={16} color="#6b7280" />
            <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inputStyle, border:'none'}} placeholder="Clave Admin" />
          </div>
          <input type="text" style={{gridColumn:'1/-1', ...inputStyle}} required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Motivo" />
          <button type="submit" disabled={loading} style={{ gridColumn: '1 / -1', backgroundColor: '#1f2937', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? '...' : 'Confirmar'}
          </button>
        </form>
      </div>

      <h3 style={{ marginTop: '30px', color: '#6b7280' }}>Historial</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'white', borderRadius: '8px' }}>
        <thead style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
          <tr><th style={thStyle}>Fecha</th><th style={thStyle}>Tipo</th><th style={thStyle}>Monto</th><th style={thStyle}>Motivo</th></tr>
        </thead>
        <tbody>
          {movimientos.map(m => (
            <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold', color: m.tipo === 'INYECCION' ? '#16a34a' : '#dc2626' }}>{m.tipo}</td>
              <td style={tdStyle}>S/ {m.monto}</td>
              <td style={tdStyle}>{m.descripcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' };
const thStyle = { padding: '10px', color: '#374151' };
const tdStyle = { padding: '10px', color: '#4b5563' };