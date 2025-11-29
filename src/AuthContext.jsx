import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';

// Inicializamos el contexto con null para detectar errores
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  // 1. CORRECCIÓN: Inicializar explícitamente en null
  const [usuarioSesion, setUsuarioSesion] = useState(null);
  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  // --- RASTREADOR GPS (Solo para Cobradores) ---
  useEffect(() => {
    let watchId;
    
    // Usamos ?. (optional chaining) para evitar el error si usuarioSesion es null
    if (usuarioSesion?.rol === 'COBRADOR' && 'geolocation' in navigator) {
      console.log("📡 Iniciando rastreo GPS en segundo plano...");
      
      watchId = navigator.geolocation.watchPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
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

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [usuarioSesion]);
  
  // --- FUNCIONES DEL SISTEMA ---
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setUsuarioSesion(null);
    setPantallaActual('dashboard');
  };

  const irACrearCredito = (idCliente) => {
    setClientePreseleccionado(idCliente);
    setPantallaActual('creditos');
  };

  // 2. SEGURIDAD CRÍTICA:
  // Si no hay usuarioSesion, MOSTRAMOS LOGIN y detenemos la ejecución aquí.
  // Esto evita que el código de abajo intente leer propiedades de algo que no existe.
  if (!usuarioSesion) {
    return <Login onLoginSuccess={(datos) => setUsuarioSesion(datos)} />;
  }
  
  // 3. CONSTRUCCIÓN SEGURA DEL CONTEXTO:
  // Usamos ?. como doble medida de seguridad
  const contextValue = {
    usuario: usuarioSesion,
    rol: usuarioSesion?.rol, // <--- AQUÍ ESTABA EL ERROR (Agregamos ?.)
    esSuperAdmin: usuarioSesion?.rol === 'SUPER_ADMIN',
    esAdmin: usuarioSesion?.rol === 'ADMIN' || usuarioSesion?.rol === 'SUPER_ADMIN',
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