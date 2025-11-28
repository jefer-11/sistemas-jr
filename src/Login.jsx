import { useState } from 'react';
import { supabase } from './supabaseClient';
import { User, Lock, LogIn, Building2 } from 'lucide-react';

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
      // 1. Buscamos el usuario Y los datos de su empresa
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          empresas ( id, nombre_empresa, estado, fecha_vencimiento )
        `)
        .eq('username', username)
        .eq('password_hash', password)
        .single();

      if (error || !data) throw new Error('Usuario o contraseña incorrectos');
      
      // 2. Validaciones de Seguridad SaaS
      if (!data.estado) throw new Error('Tu usuario ha sido desactivado.');
      if (!data.empresas.estado) throw new Error('El servicio de tu empresa está suspendido por falta de pago.');
      
      const hoy = new Date();
      const vencimiento = new Date(data.empresas.fecha_vencimiento);
      if (hoy > vencimiento) throw new Error('La licencia de tu empresa ha vencido.');

      // 3. Login Exitoso
      onLoginSuccess(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#e5e7eb' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#dbeafe', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
             <Building2 size={30} color="#2563eb" />
          </div>
          <h2 style={{ color: '#1f2937', margin: 0 }}>Acceso SaaS</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Sistema Multi-Empresa</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Usuario</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
              <User size={20} color="#666" style={{ marginRight: '10px' }} />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ej: admin"
                style={{ border: 'none', outline: 'none', width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Contraseña</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
              <Lock size={20} color="#666" style={{ marginRight: '10px' }} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••"
                style={{ border: 'none', outline: 'none', width: '100%' }}
              />
            </div>
          </div>

          {error && <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '5px', textAlign: 'center', fontSize: '14px' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            {loading ? 'Validando Licencia...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}