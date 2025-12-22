// src/Layout.jsx
import { useAuth } from './AuthContext';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, UserCircle, LogOut, Shield } from 'lucide-react';

export function Layout() {
  const { usuario, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const colorBarra = rol === 'ADMIN' ? '#111827' : '#2563eb';
  const nombreEmpresa = usuario?.empresas?.nombre_empresa || 'Empresa';
  const tituloRol = rol === 'ADMIN' ? 'ADMINISTRADOR' : 'COBRADOR';

  const handleLogout = async () => {
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom:'20px' }}>
      
      {/* --- NAVBAR FIJA --- */}
      <nav style={{ backgroundColor: colorBarra, color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        
        {/* Logo / Home */}
        <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}><LayoutGrid size={24} /></div>
            <div>
                <h2 style={{ margin: 0, fontSize: '16px', lineHeight: '1.2' }}>Sistema Créditos</h2>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', letterSpacing: '0.5px' }}>{nombreEmpresa.toUpperCase()}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{tituloRol}</span>
                </div>
            </div>
        </Link>

        {/* Acciones Derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Link to="/perfil" style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                <UserCircle size={28} />
            </Link>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
            <button onClick={handleLogout} title="Cerrar Sesión" style={{ backgroundColor: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><LogOut size={20}/></button>
        </div>
      </nav>

      {/* --- AQUÍ SE RENDERIZAN LAS PÁGINAS (Hijos) --- */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </div>

    </div>
  );
}