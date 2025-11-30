import React from 'react';
import { useAuth } from './AuthContext'; 
import { Clientes } from './Clientes';
import { Creditos } from './Creditos';
import { Caja } from './Caja';
import { AdminPanel } from './AdminPanel';
import { Perfil } from './Perfil';
import { SuperAdmin } from './SuperAdmin';
import { Capital } from './Capital';
import { Cobranza } from './Cobranza';
import { Liquidacion } from './Liquidacion';
import { Enrutador } from './Enrutador';
import { Consultas } from './Consultas';
import { LogOut, Users, Banknote, Wallet, LayoutGrid, Table, UserCircle, Shield, TrendingUp, Map, Calculator, Navigation, Search } from 'lucide-react';

// --- COMPONENTE DE BOTÓN OPTIMIZADO PARA MÓVIL ---
function BotonMenu({ icon, titulo, desc, onClick, esAdmin, resaltado }) {
    const btnEstilo = {
        backgroundColor: 'white', 
        padding: '20px 10px', // Más espacio vertical para el dedo
        borderRadius: '16px', // Bordes más redondeados tipo Android 13
        textAlign: 'center', 
        cursor: 'pointer', 
        boxShadow: resaltado ? '0 0 0 3px #2563eb' : '0 4px 10px rgba(0,0,0,0.08)', 
        border: esAdmin ? '2px dashed #000080' : '1px solid #e5e7eb', 
        position: 'relative', 
        transition: 'all 0.2s ease',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%', // Ocupar toda la altura de la celda
        minHeight: '130px' // Altura mínima garantizada
    };
    
    const adminTagEstilo = { 
        position: 'absolute', top: '8px', right: '8px', 
        backgroundColor: '#e0e7ff', color: '#000080', 
        fontSize: '9px', padding: '2px 6px', borderRadius: '4px', 
        fontWeight: 'bold', letterSpacing: '0.5px' 
    };

    return (
        <div 
            onClick={onClick} 
            style={btnEstilo}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {esAdmin && <span style={adminTagEstilo}>ADMIN</span>}
            <div style={{ marginBottom: '12px' }}>{icon}</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111827', fontWeight: '700', lineHeight: '1.2' }}>{titulo}</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px', lineHeight: '1.3' }}>{desc}</p>
        </div>
    );
}

export function Dashboard() {
    const { 
        usuario, rol, esSuperAdmin, esAdmin, 
        pantallaActual, setPantallaActual, cerrarSesion,
        clientePreseleccionado 
    } = useAuth();
    
    if (rol === 'SUPER_ADMIN') {
        return (
            <div>
                <nav style={{ backgroundColor: '#7c3aed', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{fontWeight:'bold', display:'flex', gap:'10px'}}><Shield/> PANEL DUEÑO PLATAFORMA</div>
                    <button onClick={cerrarSesion} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>Salir</button>
                </nav>
                <SuperAdmin />
            </div>
        );
    }
    
    const colorBarra = rol === 'ADMIN' ? '#111827' : '#2563eb';
    const nombreEmpresa = usuario.empresas?.nombre_empresa || 'Empresa';
    const tituloRol = rol === 'ADMIN' ? 'ADMINISTRADOR' : 'COBRADOR';

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom:'20px' }}>
            
            <nav style={{ backgroundColor: colorBarra, color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setPantallaActual('dashboard')}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}><LayoutGrid size={24} /></div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '16px', lineHeight: '1.2' }}>Sistema Créditos</h2>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', letterSpacing: '0.5px' }}>{nombreEmpresa.toUpperCase()}</span>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>{tituloRol}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setPantallaActual('perfil')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <UserCircle size={28} />
                    </button>
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                    <button onClick={cerrarSesion} title="Cerrar Sesión" style={{ backgroundColor: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}><LogOut size={20}/></button>
                </div>
            </nav>

            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {pantallaActual === 'dashboard' && (
                    <div>
                        <h2 style={{ color: '#4b5563', marginBottom: '20px', fontWeight: 'normal', fontSize:'18px' }}>
                            Panel de Control <strong style={{color:'#111827'}}>{nombreEmpresa}</strong>
                        </h2>
                        
                        {/* --- GRID RESPONSIVO OPTIMIZADO PARA ANDROID --- */}
                        <div style={{ 
                            display: 'grid', 
                            // minmax(135px) asegura 2 columnas en pantallas pequeñas (320px+)
                            gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', 
                            gap: '15px',
                            paddingBottom: '20px'
                        }}>
                            {esAdmin ? (
                                <>
                                    <BotonMenu icon={<Map size={36} color="#7c3aed"/>} titulo="Panel Gerencial" desc="Control Total" onClick={() => setPantallaActual('admin-panel')} resaltado={true} esAdmin={true} />
                                    <BotonMenu icon={<Calculator size={36} color="#dc2626"/>} titulo="Liquidación" desc="Corte Caja" onClick={() => setPantallaActual('liquidacion')} esAdmin={true} />
                                    <BotonMenu icon={<Navigation size={36} color="#f59e0b"/>} titulo="Enrutador GPS" desc="Logística" onClick={() => setPantallaActual('enrutador')} esAdmin={true} />
                                    <BotonMenu icon={<TrendingUp size={36} color="#065f46"/>} titulo="Capital" desc="Inversión" onClick={() => setPantallaActual('capital')} esAdmin={true} />
                                </>
                            ) : (
                                <>
                                    <BotonMenu icon={<Table size={36} color="#000080"/>} titulo="Mi Ruta" desc="Cobrar GPS" onClick={() => setPantallaActual('listado')} />
                                    <BotonMenu icon={<Navigation size={36} color="#f59e0b"/>} titulo="Enrutador" desc="Organizar Ruta" onClick={() => setPantallaActual('enrutador')} />
                                </>
                            )}
                            
                            <BotonMenu icon={<Banknote size={36} color="#16a34a"/>} titulo="Vender" desc="Nuevo Crédito" onClick={() => setPantallaActual('creditos')} />
                            <BotonMenu icon={<Users size={36} color="#2563eb"/>} titulo="Clientes" desc="Cartera Total" onClick={() => setPantallaActual('clientes')} />
                            <BotonMenu icon={<Wallet size={36} color="#d97706"/>} titulo="Caja Diaria" desc="Mi Cierre" onClick={() => setPantallaActual('caja')} />
                            <BotonMenu icon={<Search size={36} color="#4b5563"/>} titulo="Buró" desc="Consultas" onClick={() => setPantallaActual('consultas')} />
                        </div>
                    </div>
                )}

                {/* --- RENDERIZADO DE PANTALLAS --- */}
                {pantallaActual === 'admin-panel' && esAdmin && <AdminPanel />}
                {pantallaActual === 'clientes' && <Clientes usuario={usuario} />}
                {pantallaActual === 'crear-cliente' && <Clientes usuario={usuario} vistaInicial="formulario" alTerminar={(idNuevo) => setPantallaActual('creditos')} />}
                {pantallaActual === 'creditos' && <Creditos usuario={usuario} clienteInicial={clientePreseleccionado} cambiarPantalla={setPantallaActual} />}
                {pantallaActual === 'caja' && <Caja usuario={usuario} />}
                {pantallaActual === 'listado' && <Cobranza />}
                {pantallaActual === 'perfil' && <Perfil usuario={usuario} />}
                {pantallaActual === 'capital' && esAdmin && <Capital usuario={usuario} />}
                {pantallaActual === 'liquidacion' && esAdmin && <Liquidacion />}
                {pantallaActual === 'enrutador' && <Enrutador />}
                {pantallaActual === 'consultas' && <Consultas />}
            </div>
        </div>
    );
}