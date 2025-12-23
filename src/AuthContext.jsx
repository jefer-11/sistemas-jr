import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Login } from './Login';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuarioSesion, setUsuarioSesion] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true); 
  const [pantallaActual, setPantallaActual] = useState('dashboard');
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  // --- 1. EFECTO DE PERSISTENCIA ---
  useEffect(() => {
    async function recuperarSesion() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          console.log("Sesión recuperada, buscando datos del usuario...");
          
          const { data: usuarioBD, error } = await supabase
            .from('usuarios')
            .select(`
              *,
              empresas ( id, nombre_empresa, estado, fecha_vencimiento, telefono_corporativo )
            `)
            .eq('id', session.user.id)
            .single();

          if (!error && usuarioBD) {
            // CORRECCIÓN AQUÍ: Uso de ?. para evitar crash si empresa es null
            if (usuarioBD.estado && (usuarioBD.rol === 'SUPER_ADMIN' || usuarioBD.empresas?.estado)) {
               setUsuarioSesion(usuarioBD);
            } else {
               await supabase.auth.signOut(); 
            }
          }
        }
      } catch (error) {
        console.error("Error recuperando sesión:", error);
      } finally {
        setCargandoSesion(false);
      }
    }

    recuperarSesion();
  }, []);

  // --- RASTREADOR GPS (Solo para Cobradores) ---
  useEffect(() => {
    let watchId;
    if (usuarioSesion?.rol === 'COBRADOR' && 'geolocation' in navigator) {
      const opcionesGPS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
      
      watchId = navigator.geolocation.watchPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        await supabase.from('usuarios').update({ last_lat: latitude, last_lon: longitude, last_seen: new Date() }).eq('id', usuarioSesion.id);
      }, (err) => console.error("Error GPS:", err), opcionesGPS);
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
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

  // --- RENDERIZADO ---
  if (cargandoSesion) {
    return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#666'}}>Recuperando sesión...</div>;
  }

  if (!usuarioSesion) {
    return <Login onLoginSuccess={(datos) => setUsuarioSesion(datos)} />;
  }
  
  const contextValue = {
    usuario: usuarioSesion,
    rol: usuarioSesion?.rol,
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