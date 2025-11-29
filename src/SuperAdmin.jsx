import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Building, Power, Trash2, Shield, Calendar, PlusCircle, AlertTriangle, Search, UserPlus } from 'lucide-react';

export function SuperAdmin() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState('lista'); // 'lista' o 'nueva_empresa'
  const [busqueda, setBusqueda] = useState('');

  // Estado para formulario de nueva empresa
  const [nuevaEmpresa, setNuevaEmpresa] = useState({
    nombre: '',
    plan: 'BASICO',
    vencimiento: '',
    adminNombre: '',
    adminUser: '',
    adminPass: ''
  });

  useEffect(() => {
    cargarEmpresas();
  }, []);

  async function cargarEmpresas() {
    setLoading(true);
    try {
      // Traemos las empresas y contamos cuántos usuarios tiene cada una
      const { data, error } = await supabase
        .from('empresas')
        .select('*, usuarios(count)')
        .order('id', { ascending: true });

      if (error) throw error;
      setEmpresas(data);
    } catch (error) {
      alert('Error cargando empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 1. FUNCIÓN CREAR EMPRESA Y DUEÑO ---
  async function crearEmpresa(e) {
    e.preventDefault();
    
    // Validaciones básicas
    if (!nuevaEmpresa.nombre || !nuevaEmpresa.adminUser || !nuevaEmpresa.adminPass) {
      return alert("Por favor completa todos los campos obligatorios.");
    }

    setLoading(true);
    try {
      console.log("Iniciando creación de empresa:", nuevaEmpresa.nombre);

      // A. Crear la Empresa
      const { data: emp, error: errEmp } = await supabase
        .from('empresas')
        .insert([{
          nombre_empresa: nuevaEmpresa.nombre,
          plan_suscripcion: nuevaEmpresa.plan,
          fecha_vencimiento: nuevaEmpresa.vencimiento,
          estado: true
        }])
        .select()
        .single();

      if (errEmp) throw new Error("Error creando empresa: " + errEmp.message);
      console.log("Empresa creada con ID:", emp.id);

      // B. Crear el Usuario Admin vinculado a esa empresa
      const { error: errUser } = await supabase
        .from('usuarios')
        .insert([{
          empresa_id: emp.id, // ¡CRÍTICO! Vinculamos al ID de la nueva empresa
          nombre_completo: nuevaEmpresa.adminNombre,
          username: nuevaEmpresa.adminUser,
          password_hash: nuevaEmpresa.adminPass,
          rol: 'ADMIN', // Rol de dueño
          estado: true
        }]);

      if (errUser) {
        // Si falla el usuario, sería ideal borrar la empresa huérfana, pero por ahora solo avisamos.
        throw new Error("La empresa se creó, pero falló al crear el usuario: " + errUser.message);
      }

      alert(`✅ ¡Éxito! \n\nEmpresa: ${nuevaEmpresa.nombre}\nUsuario: ${nuevaEmpresa.adminUser}\nContraseña: ${nuevaEmpresa.adminPass}`);
      
      setVista('lista');
      setNuevaEmpresa({ nombre: '', plan: 'BASICO', vencimiento: '', adminNombre: '', adminUser: '', adminPass: '' });
      cargarEmpresas();

    } catch (error) {
      console.error(error);
      alert('❌ Ocurrió un error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 2. FUNCIÓN SUSPENDER/ACTIVAR ---
  async function toggleEstado(empresa) {
    if (empresa.id === 1) return alert("⛔ No puedes suspender tu propia empresa matriz.");

    const nuevoEstado = !empresa.estado;
    const { error } = await supabase
      .from('empresas')
      .update({ estado: nuevoEstado })
      .eq('id', empresa.id);

    if (error) alert("Error: " + error.message);
    else cargarEmpresas();
  }

  // --- 3. FUNCIÓN ELIMINAR EMPRESA (PELIGROSO) ---
  async function eliminarEmpresa(empresa) {
    if (empresa.id === 1) return alert("⛔ IMPOSIBLE eliminar la empresa matriz del sistema.");

    const confirmacion = prompt(`⚠️ PELIGRO: Estás a punto de eliminar "${empresa.nombre_empresa}".\n\nSe borrarán TODOS sus datos.\n\nPara confirmar, escribe el nombre exacto de la empresa:`);

    if (confirmacion !== empresa.nombre_empresa) {
      return alert("Cancelado: El nombre no coincide.");
    }

    setLoading(true);
    // Al borrar la empresa, el 'ON DELETE CASCADE' de la DB borrará usuarios, clientes, etc.
    const { error } = await supabase.from('empresas').delete().eq('id', empresa.id);
    
    if (error) alert("Error al eliminar: " + error.message);
    else {
      alert("🗑️ Empresa eliminada permanentemente.");
      cargarEmpresas();
    }
    setLoading(false);
  }

  // --- 4. FUNCIÓN RENOVAR SUSCRIPCIÓN ---
  async function agregarTiempo(empresa, meses) {
    let fechaBase = new Date();
    // Si aún no vence, sumamos a la fecha de vencimiento actual
    if (new Date(empresa.fecha_vencimiento) > fechaBase) {
        fechaBase = new Date(empresa.fecha_vencimiento);
    }

    fechaBase.setMonth(fechaBase.getMonth() + meses);
    const nuevaFecha = fechaBase.toISOString().split('T')[0];

    const { error } = await supabase
      .from('empresas')
      .update({ fecha_vencimiento: nuevaFecha })
      .eq('id', empresa.id);

    if (error) alert("Error: " + error.message);
    else {
      alert(`📅 Licencia extendida hasta: ${nuevaFecha}`);
      cargarEmpresas();
    }
  }

  // Filtro de búsqueda
  const empresasFiltradas = empresas.filter(e => 
    e.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      
      {/* HEADER DEL PANEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ color: '#7c3aed', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={32} /> Panel Dueño (SaaS)
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Gestiona tus clientes y licencias</p>
        </div>
        
        {vista === 'lista' && (
          <button onClick={() => setVista('nueva_empresa')} style={btnPrimario}>
            <PlusCircle size={20} /> Nueva Empresa Cliente
          </button>
        )}
      </div>

      {vista === 'lista' ? (
        <>
          {/* BUSCADOR */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <Search color="#9ca3af" />
            <input 
              type="text" 
              placeholder="Buscar empresa..." 
              style={{ border: 'none', outline: 'none', width: '100%', marginLeft: '10px', fontSize: '16px' }}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* GRILLA DE EMPRESAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {empresasFiltradas.map(emp => (
              <div key={emp.id} style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
                borderLeft: emp.estado ? '5px solid #10b981' : '5px solid #dc2626',
                opacity: emp.estado ? 1 : 0.8
              }}>
                
                {/* Cabecera Tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1f2937' }}>{emp.nombre_empresa}</h3>
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      PLAN {emp.plan_suscripcion}
                    </span>
                    {emp.id === 1 && <span style={{marginLeft:'5px', backgroundColor:'#fef3c7', color:'#d97706', fontSize:'10px', padding:'2px 5px', borderRadius:'4px'}}>MATRIZ</span>}
                  </div>
                  
                  {/* Switch On/Off */}
                  <button 
                    onClick={() => toggleEstado(emp)}
                    title={emp.estado ? "Suspender Servicio" : "Reactivar Servicio"}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: emp.estado ? '#16a34a' : '#9ca3af' }}
                  >
                    <Power size={24} />
                  </button>
                </div>
                
                {/* Info */}
                <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <Calendar size={14}/> Vence: <strong>{emp.fecha_vencimiento}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserPlus size={14}/> Usuarios registrados: <strong>{emp.usuarios[0]?.count || 0}</strong>
                  </div>
                  {!emp.estado && <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '5px' }}>⛔ SERVICIO SUSPENDIDO</div>}
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => agregarTiempo(emp, 1)} title="+1 Mes" style={btnMini}>+1 Mes</button>
                    <button onClick={() => agregarTiempo(emp, 12)} title="+1 Año" style={btnMini}>+1 Año</button>
                  </div>
                  
                  <button 
                    onClick={() => eliminarEmpresa(emp)} 
                    title="Eliminar Empresa" 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.7 }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </>
      ) : (
        // FORMULARIO NUEVA EMPRESA
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginTop: 0, textAlign: 'center', color: '#374151' }}>🚀 Alta de Nuevo Cliente</h2>
          <form onSubmit={crearEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            
            <div style={{padding:'15px', backgroundColor:'#f9fafb', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
              <label style={labelStyle}>Datos de Facturación</label>
              <input required placeholder="Nombre de la Empresa" value={nuevaEmpresa.nombre} onChange={e => setNuevaEmpresa({...nuevaEmpresa, nombre: e.target.value})} style={inputStyle} />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <select style={inputStyle} value={nuevaEmpresa.plan} onChange={e => setNuevaEmpresa({...nuevaEmpresa, plan: e.target.value})}>
                  <option value="BASICO">Plan Básico</option>
                  <option value="PRO">Plan Pro</option>
                  <option value="EMPRESARIAL">Empresarial</option>
                </select>
                <input required type="date" value={nuevaEmpresa.vencimiento} onChange={e => setNuevaEmpresa({...nuevaEmpresa, vencimiento: e.target.value})} style={inputStyle} />
              </div>
            </div>

            <div style={{padding:'15px', backgroundColor:'#f0fdf4', borderRadius:'8px', border:'1px solid #bbf7d0'}}>
              <label style={{...labelStyle, color: '#166534'}}>Cuenta de Dueño (Admin)</label>
              <input required placeholder="Nombre del Dueño" value={nuevaEmpresa.adminNombre} onChange={e => setNuevaEmpresa({...nuevaEmpresa, adminNombre: e.target.value})} style={inputStyle} />
              <input required placeholder="Usuario de Acceso (Único)" value={nuevaEmpresa.adminUser} onChange={e => setNuevaEmpresa({...nuevaEmpresa, adminUser: e.target.value})} style={{...inputStyle, marginTop: '10px'}} />
              <input required placeholder="Contraseña Temporal" value={nuevaEmpresa.adminPass} onChange={e => setNuevaEmpresa({...nuevaEmpresa, adminPass: e.target.value})} style={{...inputStyle, marginTop: '10px'}} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setVista('lista')} style={btnSecundario}>Cancelar</button>
              <button type="submit" disabled={loading} style={btnPrimario}>{loading ? 'Procesando...' : 'Crear Empresa'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// Estilos CSS
const btnPrimario = { backgroundColor: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', justifyContent: 'center', flex: 1 };
const btnSecundario = { backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1 };
const btnMini = { backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', padding: '4px 8px', color: '#4b5563', fontWeight: 'bold' };
const inputStyle = { padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', boxSizing: 'border-box', fontSize: '14px' };
const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: '8px' };