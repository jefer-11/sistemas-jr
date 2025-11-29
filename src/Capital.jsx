import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { TrendingUp, TrendingDown, DollarSign, Lock, ShieldCheck } from 'lucide-react';

export function Capital({ usuario }) {
  // --- 🛡️ ESCUDO DE SEGURIDAD (FIX DEL ERROR ROJO) ---
  if (!usuario) return <div style={{padding:'20px'}}>Cargando perfil...</div>;
  // ----------------------------------------------------

  // SEGURIDAD: Solo Admin
  // Ahora es seguro leer .rol porque ya verificamos que usuario existe arriba
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
    // Verificamos usuario de nuevo por si acaso antes de llamar a la BD
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
      // FILTRO DE SEGURIDAD
      const { data: validUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', usuario.id)
        .eq('password_hash', form.password)
        .single();

      if (!validUser) throw new Error("⛔ Contraseña de seguridad incorrecta.");

      // Registrar movimiento
      const { error } = await supabase.from('movimientos_capital').insert([{
        empresa_id: usuario.empresa_id,
        usuario_id: usuario.id,
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion
      }]);

      if (error) throw error;

      alert("Movimiento de capital registrado exitosamente.");
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

      {/* TARJETA DE ESTADO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>CAPITAL CIRCULANTE (En Calle)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>S/ {cartera.capitalCirculante.toFixed(2)}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>{cartera.totalCreditos} Créditos Activos</div>
        </div>

        <div style={{ backgroundColor: '#065f46', color: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>GANANCIA ESPERADA</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>S/ {cartera.gananciaProyectada.toFixed(2)}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Intereses por cobrar</div>
        </div>
      </div>

      {/* FORMULARIO */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} /> Movimiento de Capital Seguro
        </h3>
        
        <form onSubmit={procesarMovimiento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Tipo de Operación</label>
            <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" checked={form.tipo === 'INYECCION'} onChange={() => setForm({...form, tipo: 'INYECCION'})} /> 
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 Inyectar Capital</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" checked={form.tipo === 'RETIRO'} onChange={() => setForm({...form, tipo: 'RETIRO'})} /> 
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🔴 Retirar Utilidades</span>
              </label>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Monto</label>
            <input type="number" required value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} style={inputStyle} placeholder="0.00" />
          </div>

          <div>
            <label style={labelStyle}>Contraseña de Seguridad</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0 10px' }}>
              <Lock size={16} color="#6b7280" />
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inputStyle, border:'none'}} placeholder="Tu clave de Admin" />
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Motivo / Descripción</label>
            <input type="text" required value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} style={inputStyle} placeholder="Ej: Aporte socio, Retiro semanal..." />
          </div>

          <button type="submit" disabled={loading} style={{ gridColumn: '1 / -1', backgroundColor: '#1f2937', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? 'Validando...' : 'Confirmar Movimiento'}
          </button>
        </form>
      </div>

      {/* HISTORIAL */}
      <h3 style={{ marginTop: '30px', color: '#6b7280' }}>Historial de Movimientos</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <thead style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
          <tr>
            <th style={thStyle}>Fecha</th>
            <th style={thStyle}>Tipo</th>
            <th style={thStyle}>Monto</th>
            <th style={thStyle}>Motivo</th>
            <th style={thStyle}>Responsable</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map(m => (
            <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={tdStyle}>{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold', color: m.tipo === 'INYECCION' ? '#16a34a' : '#dc2626' }}>{m.tipo}</td>
              <td style={tdStyle}>S/ {m.monto}</td>
              <td style={tdStyle}>{m.descripcion}</td>
              <td style={tdStyle}>{m.usuarios?.nombre_completo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' };
const thStyle = { padding: '10px', color: '#374151' };
const tdStyle = { padding: '10px', color: '#4b5563' };