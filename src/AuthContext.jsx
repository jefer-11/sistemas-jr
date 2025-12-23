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

  useEffect(() => {
    async function recuperarSesion() {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data?.session?.user) {
          const userId = data.session.user.id;
          
          // Buscamos el usuario completo en nuestra "BD"
          const { data: usuarioBD, error } = await supabase
            .from('usuarios')
            .select(`*, empresas ( id, nombre_empresa, estado )`)
            .eq('id', userId)
            .single();

          if (!error && usuarioBD) {
            // AUDITORÍA: Validación robusta. Si empresa es undefined, no rompe la app.
            const empresaActiva = usuarioBD.empresas?.estado ?? true; // Asumimos true en mock si falta
            const esSuperAdmin = usuarioBD.rol === 'SUPER_ADMIN';

            if (usuarioBD.estado && (esSuperAdmin || empresaActiva)) {
               setUsuarioSesion(usuarioBD);
            } else {
               console.warn("Usuario inactivo o empresa suspendida");
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

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setUsuarioSesion(null);
    setPantallaActual('dashboard');
  };

  const irACrearCredito = (idCliente) => {
    setClientePreseleccionado(idCliente);
    setPantallaActual('creditos');
  };

  if (cargandoSesion) return <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Cargando Sistema...</div>;

  if (!usuarioSesion) return <Login onLoginSuccess={(datos) => setUsuarioSesion(datos)} />;
  
  const contextValue = {
    usuario: usuarioSesion,
    rol: usuarioSesion?.rol,
    esSuperAdmin: usuarioSesion?.rol === 'SUPER_ADMIN',
    esAdmin: usuarioSesion?.rol === 'ADMIN' || usuarioSesion?.rol === 'SUPER_ADMIN',
    nombreEmpresa: usuarioSesion?.empresas?.nombre_empresa || 'Empresa Demo',
    pantallaActual,
    setPantallaActual,
    clientePreseleccionado,
    irACrearCredito,
    cerrarSesion
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}