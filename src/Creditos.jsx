import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Calculator, Search, UserPlus, CheckCircle, X } from 'lucide-react';
import { useAuth } from './AuthContext'; 

export function Creditos({ usuario, clienteInicial, cambiarPantalla }) { 
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // CORRECCIÓN: Inicializamos explícitamente en null para que no sugiera a nadie
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  const [form, setForm] = useState({ monto_capital: '', modalidad: '24', frecuencia: 'DIARIO', metodo_desembolso: 'EFECTIVO' });
  const [resumen, setResumen] = useState({ interes: 0, total: 0, cuota: 0, fechaFin: '' });

  useEffect(() => { if(usuario) cargarClientes(); }, [usuario]);

  // CORRECCIÓN: Este efecto solo debe correr si HAY un clienteInicial real (redirección)
  useEffect(() => {
    if (clienteInicial && clientes.length > 0) {
      const encontrado = clientes.find(c => c.id === clienteInicial);
      if (encontrado) setClienteSeleccionado(encontrado);
    }
    // Si no hay clienteInicial, clienteSeleccionado se mantiene en null por defecto.
  }, [clienteInicial, clientes]);

  async function cargarClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre_completo, dni').eq('empresa_id', usuario.empresa_id); 
    if (data) setClientes(data);
  }

  const verificarRiesgo = async (clienteId) => {
    const { data } = await supabase.from('creditos').select('*').eq('cliente_id', clienteId).eq('empresa_id', usuario.empresa_id);
    if (!data || data.length === 0) return 'VERDE';
    const hoy = new Date();
    const tieneVencidas = data.some(c => c.estado === 'ACTIVO' && c.saldo_restante > 0 && new Date(c.fecha_fin_estimada) < hoy);
    return tieneVencidas ? 'ROJO' : 'VERDE';
  };

  useEffect(() => {
    const capital = parseFloat(form.monto_capital) || 0;
    if (capital > 0) {
      const interes = capital * 0.20;
      const total = capital + interes;
      const dias = parseInt(form.modalidad);
      const valorCuota = total / dias;
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + dias);
      setResumen({ interes: interes.toFixed(2), total: total.toFixed(2), cuota: valorCuota.toFixed(2), fechaFin: hoy.toLocaleDateString() });
    } else { setResumen({ interes: 0, total: 0, cuota: 0, fechaFin: '-' }); }
  }, [form.monto_capital, form.modalidad]);

  async function handleGuardar(e) {
    e.preventDefault();
    if (!clienteSeleccionado) return alert('Selecciona un cliente.');
    setLoading(true);
    try {
      const riesgo = await verificarRiesgo(clienteSeleccionado.id);
      if (riesgo === 'ROJO') {
          const pass = prompt("⚠️ CLIENTE CON DEUDA VENCIDA.\n\nIngrese contraseña de ADMIN para autorizar:");
          if (!pass) { setLoading(false); return; }
          const { data: admin } = await supabase.from('usuarios').select('id').eq('id', usuario.id).eq('password_hash', pass).single();
          if (!admin) throw new Error("⛔ Contraseña incorrecta.");
      }

      const { error } = await supabase.from('creditos').insert([{
        cliente_id: clienteSeleccionado.id, monto_capital: form.monto_capital, tasa_interes: 20,
        monto_interes: resumen.interes, total_a_pagar: resumen.total, saldo_restante: resumen.total,
        modalidad_dias: form.modalidad, frecuencia_pago: form.frecuencia, valor_cuota: resumen.cuota,
        metodo_desembolso: form.metodo_desembolso, fecha_fin_estimada: new Date(new Date().setDate(new Date().getDate() + parseInt(form.modalidad))),
        usuario_creador_id: usuario.id, empresa_id: usuario.empresa_id
      }]);

      if (error) throw error;
      alert('✅ Crédito desembolsado.');
      cambiarPantalla('clientes'); // Volver al listado
    } catch (error) { alert(error.message); } finally { setLoading(false); }
  }

  const clientesFiltrados = busqueda.trim().length > 0 
    ? clientes.filter(c => c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda.trim()))
    : [];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a' }}><Calculator /> Nueva Venta</h2>

      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <label style={labelStyle}>Buscar Cliente:</label>
        
        {!clienteSeleccionado ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '6px', padding: '10px', backgroundColor: '#f9fafb' }}>
              <Search size={18} color="#888" style={{ marginRight: '8px'}} />
              <input 
                type="text" placeholder="Escribe nombre o DNI..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', backgroundColor: 'transparent', fontSize:'16px' }} autoFocus
              />
            </div>

            {busqueda.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '0 0 8px 8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map(c => (
                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBusqueda(''); }}
                      style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{c.nombre_completo}</strong><span style={{color: '#666', fontSize: '13px'}}>DNI: {c.dni}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: '#666', marginBottom: '10px' }}>No se encontró a "{busqueda}"</p>
                    <button 
                      onClick={() => cambiarPantalla('crear-cliente')} 
                      style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto' }}
                    >
                      <UserPlus size={18} /> Registrar Nuevo Cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', padding: '15px', borderRadius: '8px' }}>
            <div><div style={{ fontWeight: 'bold', color: '#0369a1' }}>{clienteSeleccionado.nombre_completo}</div><div style={{ fontSize: '13px', color: '#0c4a6e' }}>DNI: {clienteSeleccionado.dni}</div></div>
            <button onClick={() => setClienteSeleccionado(null)} style={{ background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          </div>
        )}
      </div>

      {clienteSeleccionado && (
        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><label style={labelStyle}>Monto:</label><input type="number" required style={inputStyle} placeholder="Ej: 300" value={form.monto_capital} onChange={e => setForm({...form, monto_capital: e.target.value})}/></div>
            <div><label style={labelStyle}>Modalidad:</label><select style={inputStyle} value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}><option value="24">24 Días</option><option value="20">20 Días</option></select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><label style={labelStyle}>Frecuencia:</label><select style={inputStyle} value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})}><option value="DIARIO">Diario</option><option value="SEMANAL">Semanal</option></select></div>
            <div><label style={labelStyle}>Medio:</label><select style={inputStyle} value={form.metodo_desembolso} onChange={e => setForm({...form, metodo_desembolso: e.target.value})}><option value="EFECTIVO">Efectivo</option><option value="YAPE">Yape</option></select></div>
          </div>
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#16a34a', fontWeight: 'bold' }}><span>Total a Pagar:</span><span>S/ {resumen.total}</span></div>
            <div style={{ textAlign: 'center', marginTop:'5px' }}>Cuota diaria: <strong>S/ {resumen.cuota}</strong></div>
          </div>
          <button type="submit" disabled={loading} style={{ backgroundColor: '#16a34a', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Procesando...' : '💰 Desembolsar'}</button>
        </form>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#4b5563' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '15px' };