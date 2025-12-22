// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './Layout';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { Clientes } from './Clientes';
import { Creditos } from './Creditos';
import { Caja } from './Caja';
import { AdminPanel } from './AdminPanel';
import { Perfil } from './Perfil';
import { Capital } from './Capital';
import { Cobranza } from './Cobranza';
import { Liquidacion } from './Liquidacion';
import { Enrutador } from './Enrutador';
import { Consultas } from './Consultas';
import { SuperAdmin } from './SuperAdmin';

// Componente para proteger rutas privadas
function RutaPrivada({ children }) {
  const { usuario, cargandoSesion } = useAuth();
  if (cargandoSesion) return <div>Cargando...</div>;
  return usuario ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/" />} />
      
      {/* Rutas Protegidas dentro del Layout */}
      <Route element={<RutaPrivada><Layout /></RutaPrivada>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/creditos/nuevo" element={<Creditos />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/capital" element={<Capital />} />
        <Route path="/ruta-cobro" element={<Cobranza />} />
        <Route path="/liquidacion" element={<Liquidacion />} />
        <Route path="/enrutador" element={<Enrutador />} />
        <Route path="/consultas" element={<Consultas />} />
      </Route>

      {/* Ruta especial Super Admin fuera del Layout normal si quieres */}
      <Route path="/super-admin" element={<RutaPrivada><SuperAdmin /></RutaPrivada>} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;