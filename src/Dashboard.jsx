// src/Dashboard.jsx
import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Map, Calculator, Navigation, TrendingUp, Table, Banknote, Users, Wallet, Search } from 'lucide-react';

// Reutilizamos tu componente de botón
function BotonMenu({ icon, titulo, desc, onClick, esAdmin, resaltado }) {
    // ... (Mantén tu código de estilo del botón aquí igual que antes) ...
    // Solo copiaré la estructura básica para brevedad, pero usa tu código original de estilo
    const btnEstilo = {
        backgroundColor: 'white', padding: '20px 10px', borderRadius: '16px', textAlign: 'center', 
        cursor: 'pointer', boxShadow: resaltado ? '0 0 0 3px #2563eb' : '0 4px 10px rgba(0,0,0,0.08)', 
        border: esAdmin ? '2px dashed #000080' : '1px solid #e5e7eb', position: 'relative', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px'
    };
    return (
        <div onClick={onClick} style={btnEstilo}>
            <div style={{ marginBottom: '12px' }}>{icon}</div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111827', fontWeight: '700' }}>{titulo}</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>{desc}</p>
        </div>
    );
}

export function Dashboard() {
    const { usuario, esAdmin, nombreEmpresa } = useAuth();
    const navigate = useNavigate(); // Hook para navegar

    return (
        <div>
            <h2 style={{ color: '#4b5563', marginBottom: '20px', fontWeight: 'normal', fontSize:'18px' }}>
                Panel de Control <strong>{nombreEmpresa}</strong>
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '15px', paddingBottom: '20px' }}>
                {esAdmin ? (
                    <>
                        <BotonMenu icon={<Map size={36} color="#7c3aed"/>} titulo="Panel Gerencial" desc="Control Total" onClick={() => navigate('/admin')} resaltado={true} esAdmin={true} />
                        <BotonMenu icon={<Calculator size={36} color="#dc2626"/>} titulo="Liquidación" desc="Corte Caja" onClick={() => navigate('/liquidacion')} esAdmin={true} />
                        <BotonMenu icon={<Navigation size={36} color="#f59e0b"/>} titulo="Enrutador GPS" desc="Logística" onClick={() => navigate('/enrutador')} esAdmin={true} />
                        <BotonMenu icon={<TrendingUp size={36} color="#065f46"/>} titulo="Capital" desc="Inversión" onClick={() => navigate('/capital')} esAdmin={true} />
                    </>
                ) : (
                    <>
                        <BotonMenu icon={<Table size={36} color="#000080"/>} titulo="Mi Ruta" desc="Cobrar GPS" onClick={() => navigate('/ruta-cobro')} />
                        <BotonMenu icon={<Navigation size={36} color="#f59e0b"/>} titulo="Enrutador" desc="Organizar Ruta" onClick={() => navigate('/enrutador')} />
                    </>
                )}
                
                <BotonMenu icon={<Banknote size={36} color="#16a34a"/>} titulo="Vender" desc="Nuevo Crédito" onClick={() => navigate('/creditos/nuevo')} />
                <BotonMenu icon={<Users size={36} color="#2563eb"/>} titulo="Clientes" desc="Cartera Total" onClick={() => navigate('/clientes')} />
                <BotonMenu icon={<Wallet size={36} color="#d97706"/>} titulo="Caja Diaria" desc="Mi Cierre" onClick={() => navigate('/caja')} />
                <BotonMenu icon={<Search size={36} color="#4b5563"/>} titulo="Buró" desc="Consultas" onClick={() => navigate('/consultas')} />
            </div>
        </div>
    );
}