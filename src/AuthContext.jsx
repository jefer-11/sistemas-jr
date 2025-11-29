import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuarioSesion, setUsuarioSesion] = useState(null);
  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  // --- RASTREADOR GPS (Solo para Cobradores) ---
  useEffect(() => {
    let watchId;
    
    // Si hay usuario logueado Y es cobrador Y el navegador tiene GPS
    if (usuarioSesion && usuarioSesion.rol === 'COBRADOR' && 'geolocation' in navigator) {
      console.log("📡 Iniciando rastreo GPS en segundo plano...");
      
      watchId = navigator.geolocation.watchPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Enviamos la ubicación a Supabase silenciosamente
        await supabase
          .from('usuarios')
          .update({ 
            last_lat: latitude, 
            last_lon: longitude,
            last_seen: new Date()
          })
          .eq('id', usuarioSesion.id);
          
      }, (err) => console.error("Error GPS:", err), { 
        enableHighAccuracy: true, 
        maximumAge: 10000, 
        timeout: 5000 
      });
    }

    // Limpieza al cerrar sesión o desmontar
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [usuarioSesion]);
  // ---------------------------------------------

  const cerrarSesion = () => {
    setUsuarioSesion(null);
    setPantallaActual('dashboard');
  };

  const irACrearCredito = (idCliente) => {
    setClientePreseleccionado(idCliente);
    setPantallaActual('creditos');
  };

  // Login: Si no hay sesión, mostramos Login
  if (!usuarioSesion) {
    return <Login onLoginSuccess={(datos) => setUsuarioSesion(datos)} />;
  }
  
  const contextValue = {
    usuario: usuarioSesion,
    rol: usuarioSesion.rol,
    esSuperAdmin: usuarioSesion.rol === 'SUPER_ADMIN',
    esAdmin: usuarioSesion.rol === 'ADMIN' || usuarioSesion.rol === 'SUPER_ADMIN',
    pantallaActual,
    setPantallaActual,
    clientePreseleccionado,
    irACrearCredito,
    cerrarSesion
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}