import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Lock, User, Save, ShieldCheck, AlertCircle, Building, Phone } from 'lucide-react';

export function Perfil({ usuario }) {
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [cargando, setCargando] = useState(false);

  // Estado para el Teléfono de la Empresa (Solo Admin)
  const [telefonoEmpresa, setTelefonoEmpresa] = useState('');
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);

  const esAdmin = usuario.rol === 'ADMIN';

  useEffect(() => {
    if (esAdmin) cargarDatosEmpresa();
  }, [usuario]);

  async function cargarDatosEmpresa() {
    const { data } = await supabase
      .from('empresas')
      .select('telefono_corporativo')
      .eq('id', usuario.empresa_id)
      .single();
    
    if (data) setTelefonoEmpresa(data.telefono_corporativo || '');
  }

  async function guardarTelefono(e) {
    e.preventDefault();
    setLoadingEmpresa(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ telefono_corporativo: telefonoEmpresa })
        .eq('id', usuario.empresa_id);

      if (error) throw error;
      alert('✅ Teléfono corporativo actualizado. Los cobradores enviarán las fotos aquí.');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoadingEmpresa(false);
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (passwords.nueva.length < 4) return setMensaje({ tipo: 'error', texto: 'Mínimo 4 caracteres.' });
    if (passwords.nueva !== passwords.confirmacion) return setMensaje({ tipo: 'error', texto: 'No coinciden.' });

    setCargando(true);
    try {
      const { data: usuarioValido } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', usuario.id)
        .eq('password_hash', passwords.actual)
        .single();

      if (!usuarioValido) throw new Error('Contraseña actual incorrecta.');

      const { error } = await supabase.from('usuarios').update({ password_hash: passwords.nueva }).eq('id', usuario.id);
      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '¡Contraseña actualizada!' });
      setPasswords({ actual: '', nueva: '', confirmacion: '' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#374151', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User /> Mi Perfil
      </h2>

      {/* TARJETA USUARIO */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#dbeafe', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#2563eb', fontSize: '24px', fontWeight: 'bold' }}>
            {usuario.nombre_completo.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>{usuario.nombre_completo}</h3>
            <span style={{ backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
              {usuario.rol} @ {usuario.empresas?.nombre_empresa}
            </span>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN EXCLUSIVA ADMIN: CONFIGURACIÓN EMPRESA --- */}
      {esAdmin && (
        <div style={{ backgroundColor: '#f0fdf4', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ marginTop: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={20} /> Configuración de Empresa
          </h3>
          <p style={{ fontSize: '13px', color: '#15803d', marginBottom: '15px' }}>
            Define el número de WhatsApp donde llegarán las fotos de evidencia que tomen tus cobradores.
          </p>
          
          <form onSubmit={guardarTelefono} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Teléfono Corporativo (con código país)</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #86efac', borderRadius: '6px', padding: '10px' }}>
                <Phone size={18} color="#16a34a" style={{ marginRight: '10px' }} />
                <input 
                  type="text" 
                  value={telefonoEmpresa}
                  onChange={e => setTelefonoEmpresa(e.target.value)}
                  placeholder="Ej: 51999999999"
                  style={{ border: 'none', outline: 'none', width: '100%' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loadingEmpresa} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Save size={18} /> {loadingEmpresa ? '...' : 'Guardar'}
            </button>
          </form>
        </div>
      )}

      {/* CAMBIO DE CLAVE */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
        <h3 style={{ marginTop: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#059669" /> Seguridad Personal
        </h3>
        
        <form onSubmit={cambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Contraseña Actual</label>
            <input type="password" value={passwords.actual} onChange={e => setPasswords({...passwords, actual: e.target.value})} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Nueva Contraseña</label>
            <input type="password" value={passwords.nueva} onChange={e => setPasswords({...passwords, nueva: e.target.value})} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Confirmar Nueva</label>
            <input type="password" value={passwords.confirmacion} onChange={e => setPasswords({...passwords, confirmacion: e.target.value})} style={inputStyle} required />
          </div>

          {mensaje.texto && (
            <div style={{ padding: '10px', borderRadius: '6px', fontSize: '14px', backgroundColor: mensaje.tipo === 'error' ? '#fee2e2' : '#dcfce7', color: mensaje.tipo === 'error' ? '#dc2626' : '#16a34a' }}>
              {mensaje.texto}
            </div>
          )}

          <button type="submit" disabled={cargando} style={btnStyle}>
            {cargando ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#374151' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', boxSizing: 'border-box' };
const btnStyle = { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };