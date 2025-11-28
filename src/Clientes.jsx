import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, MapPin, Camera, Edit } from 'lucide-react';

// CORRECCIÓN: La palabra 'export' es vital aquí.
export function Clientes({ usuario, alTerminar }) {
  const [vista, setVista] = useState('lista'); 
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteIdEditar, setClienteIdEditar] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('inactivo');

  const [nuevoCliente, setNuevoCliente] = useState({
    dni: '', nombre_completo: '', telefono_celular: '', 
    direccion_texto: '', barrio: '', referencia_negocio: '',
    gps_latitud: null, gps_longitud: null
  });

  useEffect(() => { 
    if(usuario) fetchClientes(); 
  }, [usuario]);

  async function fetchClientes() {
    // FILTRO SAAS: Solo clientes de tu empresa
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('created_at', { ascending: false });
    if (data) setClientes(data);
  }

  const cargarDatosParaEditar = (cliente) => {
    setModoEdicion(true);
    setClienteIdEditar(cliente.id);
    setNuevoCliente({
      dni: cliente.dni,
      nombre_completo: cliente.nombre_completo,
      telefono_celular: cliente.telefono_celular,
      direccion_texto: cliente.direccion_texto,
      barrio: cliente.barrio,
      referencia_negocio: cliente.referencia_negocio || '',
      gps_latitud: cliente.gps_latitud,
      gps_longitud: cliente.gps_longitud
    });
    setGpsStatus(cliente.gps_latitud ? 'exito' : 'inactivo');
    setVista('formulario');
  };

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) return alert("Navegador sin GPS");
    setGpsStatus('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNuevoCliente({ ...nuevoCliente, gps_latitud: pos.coords.latitude, gps_longitud: pos.coords.longitude });
        setGpsStatus('exito');
      },
      (err) => { alert("Error GPS: " + err.message); setGpsStatus('error'); },
      { enableHighAccuracy: true }
    );
  };

  // FOTO POR WHATSAPP
  const enviarFotoWhatsApp = () => {
    const telefonoJefe = usuario.empresas?.telefono_corporativo;
    
    if (!telefonoJefe) {
      return alert("⚠️ La empresa no tiene configurado un 'Teléfono Corporativo'.");
    }

    const mensaje = `📸 EVIDENCIA CLIENTE\n\nNombre: ${nuevoCliente.nombre_completo || 'Nuevo'}\nDNI: ${nuevoCliente.dni}\n\n(Adjunto la foto a continuación...)`;
    const url = `https://wa.me/${telefonoJefe}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  async function guardarCliente(e) {
    e.preventDefault();
    setCargando(true);
    try {
      const datosAGuardar = { 
        ...nuevoCliente, 
        empresa_id: usuario.empresa_id // SAAS
      };

      if (modoEdicion) {
        // UPDATE
        const { error } = await supabase
          .from('clientes')
          .update(datosAGuardar)
          .eq('id', clienteIdEditar)
          .eq('empresa_id', usuario.empresa_id);
          
        if (error) throw error;
        alert('Cliente actualizado. ✅');

      } else {
        // INSERT
        const { data: existe } = await supabase
          .from('clientes')
          .select('id')
          .eq('dni', nuevoCliente.dni)
          .eq('empresa_id', usuario.empresa_id)
          .single();

        if (existe) throw new Error('DNI ya registrado en esta empresa.');

        const { data, error } = await supabase
          .from('clientes')
          .insert([datosAGuardar])
          .select()
          .single();

        if (error) throw error;

        alert('Cliente guardado. ✅');
        if (alTerminar) { alTerminar(data.id); return; }
      }
      resetFormulario();
      setVista('lista');
      fetchClientes();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  }

  const resetFormulario = () => {
    setNuevoCliente({ dni: '', nombre_completo: '', telefono_celular: '', direccion_texto: '', barrio: '', referencia_negocio: '', gps_latitud: null, gps_longitud: null });
    setGpsStatus('inactivo');
    setModoEdicion(false);
    setClienteIdEditar(null);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>👥 Cartera de Clientes</h2>
            <button onClick={() => { resetFormulario(); setVista('formulario'); }} style={btnEstilo.azul}><Plus size={18}/> Nuevo Cliente</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <Search color="#888" />
            <input type="text" placeholder="Buscar..." style={{ border: 'none', outline: 'none', width: '100%' }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {clientes.filter(c => c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || c.dni.includes(busqueda)).map(cliente => (
              <div key={cliente.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{cliente.nombre_completo}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>🆔 {cliente.dni} | 📞 {cliente.telefono_celular}</p>
                  <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px' }}>📍 {cliente.barrio}</p>
                </div>
                <button onClick={() => cargarDatosParaEditar(cliente)} style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px', borderRadius: '6px', cursor:'pointer' }} title="Editar">
                    <Edit size={18} color="#4b5563" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {vista === 'formulario' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <h3>{modoEdicion ? '✏️ Editar Cliente' : '📝 Nuevo Cliente'}</h3>
          <form onSubmit={guardarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px dashed #22c55e', marginBottom: '10px' }}>
              <div style={{ color: '#15803d', fontSize: '14px', marginBottom: '10px' }}>
                📸 <strong>Evidencia:</strong> Envía la foto de la casa al Whatsapp de la empresa.
              </div>
              <button type="button" onClick={enviarFotoWhatsApp} style={{ backgroundColor: '#25D366', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Camera size={18} /> Abrir Cámara en WhatsApp
              </button>
            </div>

            <input required placeholder="DNI / Cédula" value={nuevoCliente.dni} onChange={e => setNuevoCliente({...nuevoCliente, dni: e.target.value})} style={inputEstilo} />
            <input required placeholder="Nombre Completo" value={nuevoCliente.nombre_completo} onChange={e => setNuevoCliente({...nuevoCliente, nombre_completo: e.target.value})} style={inputEstilo} />
            <input required placeholder="Celular" type="tel" value={nuevoCliente.telefono_celular} onChange={e => setNuevoCliente({...nuevoCliente, telefono_celular: e.target.value})} style={inputEstilo} />
            <input required placeholder="Barrio" value={nuevoCliente.barrio} onChange={e => setNuevoCliente({...nuevoCliente, barrio: e.target.value})} style={inputEstilo} />
            <input required placeholder="Dirección Exacta" value={nuevoCliente.direccion_texto} onChange={e => setNuevoCliente({...nuevoCliente, direccion_texto: e.target.value})} style={inputEstilo} />
            <input placeholder="Descripción Negocio" value={nuevoCliente.referencia_negocio} onChange={e => setNuevoCliente({...nuevoCliente, referencia_negocio: e.target.value})} style={inputEstilo} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px' }}>
              <button type="button" onClick={obtenerUbicacion} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={16} /> {gpsStatus === 'exito' ? 'Actualizar GPS' : 'Obtener GPS'}
              </button>
              {gpsStatus === 'exito' && <span style={{fontSize: '12px', color: '#16a34a'}}>✓ Listo</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => {resetFormulario(); setVista('lista')}} style={btnEstilo.rojo}>Cancelar</button>
              <button type="submit" disabled={cargando} style={btnEstilo.verde}>{cargando ? 'Guardando...' : (modoEdicion ? 'Guardar Cambios' : 'Crear Cliente')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputEstilo = { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' };
const btnEstilo = {
  azul: { backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  rojo: { backgroundColor: '#ef4444', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', flex: 1 },
  verde: { backgroundColor: '#16a34a', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', flex: 1 }
};