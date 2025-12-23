import { useState } from 'react';
import { supabase } from './supabaseClient';
import { User, Lock, Building2 } from 'lucide-react';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Buscamos el usuario en la BD Mockeada
      const { data: usuarioBD, error: errBusqueda } = await supabase
        .from('usuarios')
        .select(`*, empresas ( id, nombre_empresa, estado )`)
        .eq('username', username)
        .eq('password_hash', password)
        .single();

      if (errBusqueda || !usuarioBD) throw new Error('Usuario o contraseña incorrectos');
      
      // 2. Validaciones de Negocio (con seguridad anti-crash ?.)
      if (!usuarioBD.estado) throw new Error('Usuario desactivado.');
      
      const esSuperAdmin = usuarioBD.rol === 'SUPER_ADMIN';
      const empresaActiva = usuarioBD.empresas?.estado ?? true; // En mock, asumimos activo si falta info
      
      if (!esSuperAdmin && !empresaActiva) {
        throw new Error('Empresa suspendida.');
      }

      // 3. Guardar Sesión (Ahora sí funciona setSession en el mock)
      const { error: errSession } = await supabase.auth.setSession({
        user: {
          id: usuarioBD.id,
          email: usuarioBD.email || 'mock@email.com',
          role: usuarioBD.rol
        }
      });

      if (errSession) throw errSession;
      
      // 4. Éxito
      onLoginSuccess(usuarioBD);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#e5e7eb', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', width: '100%', maxWidth: '400px', border: '1px solid #9ca3af' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ backgroundColor: '#eff6ff', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', border: '2px solid #2563eb' }}>
             <Building2 size={35} color="#2563eb" />
          </div>
          <h2 style={{ color: '#000000', margin: 0, fontSize: '24px', fontWeight: '800' }}>ACCESO SISTEMA</h2>
          <p style={{ color: '#374151', fontSize: '15px', fontWeight: '600', margin: '5px 0 0 0' }}>Modo Diseño (Sin BD)</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '800', marginBottom: '8px', color: '#111827', fontSize: '13px' }}>USUARIO</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #4b5563', borderRadius: '8px', padding: '10px', backgroundColor: 'white' }}>
              <User size={22} color="#111827" style={{ marginRight: '10px' }} />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ej: admin" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px', fontWeight: '600', color: 'black' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '800', marginBottom: '8px', color: '#111827', fontSize: '13px' }}>CONTRASEÑA</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #4b5563', borderRadius: '8px', padding: '10px', backgroundColor: 'white' }}>
              <Lock size={22} color="#111827" style={{ marginRight: '10px' }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ej: 123456" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px', fontWeight: '600', color: 'black' }} />
            </div>
          </div>

          {error && <div style={{ color: '#7f1d1d', backgroundColor: '#fca5a5', padding: '12px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', border: '2px solid #ef4444', fontSize: '14px' }}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={{ backgroundColor: '#2563eb', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>
            {loading ? 'VALIDANDO...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  );
}