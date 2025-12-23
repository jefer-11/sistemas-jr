import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, Users, Banknote, Calculator, 
  Settings, LogOut, Map, TrendingUp, UserCircle, ShieldCheck
} from 'lucide-react';

export function Layout() {
  const { usuario, cerrarSesion, esSuperAdmin, rol } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 
    { backgroundColor: '#2563eb', color: 'white' } : {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      
      {/* --- SIDEBAR (MENÚ LATERAL) --- */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#ffffff', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        height: '100%',
        zIndex: 10
      }}>
        
        {/* HEADER DEL MENÚ */}
        <div style={{ padding: '25px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#2563eb', fontSize: '22px', fontWeight: '900', letterSpacing: '-1px' }}>
            SISTEMAS JR
          </h2>
          {/* ETIQUETA DE ROL VISIBLE */}
          <div style={{ 
            marginTop: '10px', 
            display: 'inline-block', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: esSuperAdmin ? '#111827' : rol === 'ADMIN' ? '#7c3aed' : '#f59e0b',
            color: 'white'
          }}>
            {esSuperAdmin ? 'DUEÑO / SUPER ADMIN' : rol === 'ADMIN' ? 'GERENTE SUCURSAL' : 'COBRADOR'}
          </div>
        </div>

        {/* LISTA DE NAVEGACIÓN */}
        <nav style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          
          <Link to="/" style={{ ...linkStyle, ...isActive('/') }}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>

          {/* SECCIÓN OPERATIVA (Visible para Admin, Gerente y Cobradores) */}
          <Link to="/rutas-cobro" style={{ ...linkStyle, ...isActive('/rutas-cobro') }}>
            <Map size={20} /> Rutas de Cobro
          </Link>
          
          <Link to="/clientes" style={{ ...linkStyle, ...isActive('/clientes') }}>
            <Users size={20} /> Clientes
          </Link>

          {/* SECCIÓN FINANCIERA (Oculta para Cobradores) */}
          {(esSuperAdmin || rol === 'ADMIN') && (
            <>
              <div style={seccionTitulo}>FINANZAS</div>
              <Link to="/caja" style={{ ...linkStyle, ...isActive('/caja') }}>
                <Calculator size={20} /> Cierre de Caja
              </Link>
              <Link to="/capital" style={{ ...linkStyle, ...isActive('/capital') }}>
                <Banknote size={20} /> Capital & Inversión
              </Link>
              <Link to="/liquidacion" style={{ ...linkStyle, ...isActive('/liquidacion') }}>
                <TrendingUp size={20} /> Liquidación
              </Link>
            </>
          )}

          {/* SECCIÓN AVANZADA (EXCLUSIVA SUPER ADMIN - DUEÑO) */}
          {esSuperAdmin && (
            <>
              <div style={seccionTitulo}>ADMINISTRACIÓN</div>
              <Link to="/admin" style={{ ...linkStyle, ...isActive('/admin') }}>
                <ShieldCheck size={20} /> Panel Avanzado
              </Link>
              <Link to="/enrutador" style={{ ...linkStyle, ...isActive('/enrutador') }}>
                <Map size={20} /> Editor de Rutas
              </Link>
            </>
          )}

        </nav>

        {/* FOOTER - USUARIO */}
        <div style={{ padding: '20px', borderTop: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', fontWeight: 'bold' }}>
              {usuario.nombre_completo?.charAt(0) || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '140px' }}>
                {usuario.nombre_completo}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {usuario.email || 'Sin email'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '5px' }}>
             <Link to="/perfil" style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', color: '#374151', fontSize: '12px', textDecoration: 'none' }}>
                <UserCircle size={14} style={{marginBottom:'-2px'}}/> Perfil
             </Link>
             <button onClick={cerrarSesion} style={{ flex: 1, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <LogOut size={14} /> Salir
             </button>
          </div>
        </div>

      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '30px', maxWidth: '1600px' }}>
        <Outlet />
      </main>

    </div>
  );
}

// Estilos auxiliares
const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 15px',
  borderRadius: '8px',
  color: '#4b5563',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.2s'
};

const seccionTitulo = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#9ca3af',
  marginTop: '15px',
  marginBottom: '5px',
  paddingLeft: '15px',
  letterSpacing: '1px'
};